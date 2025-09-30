/**
 * Mesa (Python) Provider
 * 
 * Connects to Mesa simulation engine via sidecar
 */

import SidecarTransport from './sidecar.js';
import type { EngineProvider, EngineConfigV1, Snapshot, ProviderInfo } from '../types.js';

export interface MesaProviderOptions {
  /** Docker image tag */
  image?: string;
  /** Timeout for operations (ms) */
  timeout?: number;
  /** Additional Docker options */
  dockerOptions?: string[];
  /** Environment variables */
  env?: Record<string, string>;
}

export class MesaProvider implements EngineProvider {
  private transport: SidecarTransport;
  private initialized = false;

  constructor(options: MesaProviderOptions = {}) {
    const {
      image = 'ecosysx/mesa-sidecar:dev',
      timeout = 30000,
      dockerOptions = ['--rm', '--network=none', '--memory=1g'],
      env = {},
      ...rest
    } = options;

    this.transport = new SidecarTransport({
      image,
      timeout,
      dockerOptions,
      env: {
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: '/app',
        ...env
      },
      ...rest
    });

    this.setupEventHandlers();
  }

  async init(cfg: EngineConfigV1, masterSeed: bigint): Promise<void> {
    if (this.initialized) {
      throw new Error('Provider already initialized');
    }

    await this.transport.start();
    await this.transport.init(cfg, masterSeed);
    this.initialized = true;
  }

  async step(n: number): Promise<number> {
    this.ensureInitialized();
    return await this.transport.step(n);
  }

  async snapshot(kind?: "full" | "metrics"): Promise<Snapshot> {
    this.ensureInitialized();
    return await this.transport.snapshot(kind);
  }

  async stop(): Promise<void> {
    if (this.initialized) {
      await this.transport.stop();
      this.initialized = false;
    }
  }

  async info(): Promise<ProviderInfo> {
    return await this.transport.info();
  }

  private setupEventHandlers(): void {
    this.transport.on('log', (message) => {
      console.log(`[Mesa] ${message}`);
    });

    this.transport.on('error', (error) => {
      console.error(`[Mesa Error] ${error.message}`);
    });

    this.transport.on('exit', ({ code, signal }) => {
      console.warn(`[Mesa] Process exited with code ${code}, signal ${signal}`);
      this.initialized = false;
    });
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Provider not initialized. Call init() first.');
    }
  }

  isRunning(): boolean {
    return this.initialized && this.transport.isRunning();
  }
}

export default MesaProvider;