/**
 * Sidecar Transport - JSON-RPC over stdio
 * 
 * Handles communication with external simulation providers via
 * newline-delimited JSON over child process stdio.
 */

import { spawn, ChildProcess } from 'child_process';
import EventEmitter from 'eventemitter3';
import type { EngineConfigV1, Snapshot, ProviderInfo, RPCRequest, RPCResponse } from '../types.js';

export interface SidecarOptions {
  /** Docker image to run */
  image: string;
  /** Command arguments (if not using Docker) */
  command?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout for operations (ms) */
  timeout?: number;
  /** Use Docker (default: true) */
  useDocker?: boolean;
  /** Docker run options */
  dockerOptions?: string[];
}

export class SidecarTransport extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = '';
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (response: RPCResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private options: Required<SidecarOptions>;
  private started = false;

  constructor(options: SidecarOptions) {
    super();
    
    this.options = {
      timeout: 30000,
      useDocker: true,
      dockerOptions: ['--rm', '--network=none'],
      env: {},
      command: [],
      ...options
    };
  }

  /**
   * Start the sidecar process
   */
  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Sidecar already started');
    }

    const { command, args } = this.buildCommand();
    
    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...this.options.env }
    });

    this.setupProcessHandlers();
    
    // Wait for process to be ready
    await this.waitForReady();
    this.started = true;
  }

  /**
   * Stop the sidecar process
   */
  async stop(): Promise<void> {
    if (!this.started || !this.process) {
      return;
    }

    // Send stop request first
    try {
      await this.request({ op: 'stop' });
    } catch (error) {
      // Ignore errors during graceful shutdown
    }

    // Kill process if still running
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }

    this.started = false;
    this.process = null;
    
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Sidecar stopped'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Send initialization request
   */
  async init(cfg: EngineConfigV1, masterSeed: bigint): Promise<void> {
    const response = await this.request({
      op: 'init',
      cfg,
      seed: masterSeed.toString()
    });

    if (!response.ok) {
      throw new Error(`Init failed: ${response.error || 'Unknown error'}`);
    }
  }

  /**
   * Send step request
   */
  async step(n: number): Promise<number> {
    const response = await this.request({
      op: 'step',
      n
    });

    if (response.tick === undefined) {
      throw new Error(`Step failed: ${response.error || 'No tick returned'}`);
    }

    return response.tick;
  }

  /**
   * Send snapshot request
   */
  async snapshot(kind?: "full" | "metrics"): Promise<Snapshot> {
    const response = await this.request({
      op: 'snapshot',
      kind
    });

    if (!response.snapshot) {
      throw new Error(`Snapshot failed: ${response.error || 'No snapshot returned'}`);
    }

    return response.snapshot;
  }

  /**
   * Get provider info
   */
  async info(): Promise<ProviderInfo> {
    const response = await this.request({
      op: 'info'
    });

    if (!response.provider) {
      throw new Error(`Info failed: ${response.error || 'No provider info returned'}`);
    }

    return response.provider;
  }

  /**
   * Send a JSON-RPC request
   */
  private async request(req: RPCRequest): Promise<RPCResponse> {
    if (!this.process || !this.started) {
      throw new Error('Sidecar not started');
    }

    const id = ++this.requestId;
    const message = JSON.stringify({ ...req, id }) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      if (!this.process!.stdin!.write(message)) {
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(new Error('Failed to write to sidecar stdin'));
      }
    });
  }

  /**
   * Build command and arguments for sidecar
   */
  private buildCommand(): { command: string; args: string[] } {
    if (this.options.useDocker) {
      return {
        command: 'docker',
        args: [
          'run',
          '-i',
          ...this.options.dockerOptions,
          ...Object.entries(this.options.env).map(([k, v]) => ['-e', `${k}=${v}`]).flat(),
          this.options.image
        ]
      };
    } else {
      return {
        command: this.options.command[0] || 'node',
        args: this.options.command.slice(1) || []
      };
    }
  }

  /**
   * Set up process event handlers
   */
  private setupProcessHandlers(): void {
    if (!this.process) return;

    // Handle stdout (responses)
    this.process.stdout!.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processMessages();
    });

    // Handle stderr (logging)
    this.process.stderr!.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        this.emit('log', message);
      }
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      this.emit('exit', { code, signal });
      this.started = false;
      
      // Reject all pending requests
      for (const [id, request] of this.pendingRequests) {
        clearTimeout(request.timeout);
        request.reject(new Error(`Sidecar exited with code ${code}, signal ${signal}`));
      }
      this.pendingRequests.clear();
    });

    // Handle process errors
    this.process.on('error', (error) => {
      this.emit('error', error);
      this.started = false;
    });
  }

  /**
   * Process incoming messages from stdout
   */
  private processMessages(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep partial line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse message: ${line}`));
        }
      }
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    if (typeof message.id === 'number' && this.pendingRequests.has(message.id)) {
      // Response to a request
      const request = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      clearTimeout(request.timeout);
      request.resolve(message);
    } else {
      // Unsolicited message (log, event, etc.)
      this.emit('message', message);
    }
  }

  /**
   * Wait for sidecar to be ready
   */
  private async waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sidecar failed to start within timeout'));
      }, this.options.timeout);

      const checkReady = () => {
        if (this.process && !this.process.killed) {
          clearTimeout(timeout);
          resolve();
        }
      };

      // Check immediately
      if (this.process) {
        setTimeout(checkReady, 100);
      }
    });
  }

  /**
   * Check if sidecar is running
   */
  isRunning(): boolean {
    return this.started && this.process !== null && !this.process.killed;
  }
}

export default SidecarTransport;