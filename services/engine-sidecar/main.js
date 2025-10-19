#!/usr/bin/env node

/**
 * Genesis Engine GUI Sidecar
 * 
 * JSON-RPC bridge service between Qt GUI and Genesis Engine
 * Communicates via stdin/stdout using line-delimited JSON
 * 
 * Supported Operations:
 * - init: Initialize simulation with configuration
 * - step: Advance simulation by N steps
 * - snapshot: Get current simulation state (metrics or full)
 * - stop: Terminate simulation
 * - ping: Health check
 */

import { GenesisEngine, createDefaultConfig } from '../../packages/genx-engine/dist/index.js';
import * as readline from 'readline';

class GUISidecar {
  constructor() {
    this.engine = new GenesisEngine();
    this.isRunning = false;
    this.currentTick = 0;
    
    // Setup event handlers
    this.setupEngineEvents();
    
    // Setup stdin/stdout communication
    this.setupCommunication();
    
    // Log startup
    this.log('info', 'GUI Sidecar started, waiting for commands...');
  }
  
  setupEngineEvents() {
    this.engine.on('started', ({ provider, tick }) => {
      this.log('info', `Engine started with ${provider} provider at tick ${tick}`);
      this.isRunning = true;
    });
    
    this.engine.on('stepped', ({ newTick }) => {
      this.currentTick = newTick;
    });
    
    this.engine.on('error', ({ phase, error }) => {
      this.log('error', `Engine error in ${phase}: ${error.message}`);
    });
    
    this.engine.on('stopped', () => {
      this.log('info', 'Engine stopped');
      this.isRunning = false;
      this.currentTick = 0;
    });
  }
  
  setupCommunication() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    
    rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        const response = await this.handleRequest(request);
        this.sendResponse(response);
      } catch (error) {
        this.sendResponse({
          success: false,
          error: error.message,
          stack: error.stack
        });
      }
    });
    
    rl.on('close', async () => {
      this.log('info', 'Stdin closed, shutting down...');
      if (this.isRunning) {
        await this.engine.stop();
      }
      process.exit(0);
    });
  }
  
  async handleRequest(request) {
    const { op, data = {} } = request;
    
    switch (op) {
      case 'ping':
        return this.handlePing();
        
      case 'init':
        return await this.handleInit(data);
        
      case 'step':
        return await this.handleStep(data);
        
      case 'snapshot':
        return await this.handleSnapshot(data);
        
      case 'stop':
        return await this.handleStop();
        
      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  }
  
  handlePing() {
    return {
      success: true,
      op: 'ping',
      data: {
        status: this.isRunning ? 'running' : 'idle',
        ready: this.isRunning,  // Explicit ready flag for health checks
        tick: this.currentTick,
        version: '1.0.0'
      }
    };
  }
  
  async handleInit(data) {
    if (this.isRunning) {
      throw new Error('Simulation already running. Stop current simulation first.');
    }
    
    const { config, provider = 'mock' } = data;  // Changed default from 'mesa' to 'mock'
    
    // Use provided config or create default
    // Handle cases where config is provided but incomplete
    let engineConfig;
    if (!config || typeof config !== 'object' || !config.schema) {
      this.log('info', 'No valid config provided, using default configuration');
      engineConfig = createDefaultConfig();
    } else {
      // Merge with defaults to fill in any missing fields
      const defaults = createDefaultConfig();
      engineConfig = {
        schema: config.schema || defaults.schema,
        simulation: { ...defaults.simulation, ...(config.simulation || {}) },
        agents: { ...defaults.agents, ...(config.agents || {}) },
        disease: { ...defaults.disease, ...(config.disease || {}) },
        environment: { ...defaults.environment, ...(config.environment || {}) },
        rng: { ...defaults.rng, ...(config.rng || {}) }
      };
      this.log('info', 'Using provided config merged with defaults');
    }
    
    this.log('info', `Initializing with ${provider} provider...`);
    
    try {
      await this.engine.start(engineConfig, { provider });
      
      // Get initial snapshot
      const snapshot = await this.engine.snapshot('metrics');
      
      return {
        success: true,
        op: 'init',
        data: {
          tick: snapshot.tick,
          metrics: snapshot.metrics,
          provider: snapshot.providerInfo
        }
      };
    } catch (error) {
      this.log('error', `Init failed: ${error.message}`);
      throw error;
    }
  }
  
  async handleStep(data) {
    if (!this.isRunning) {
      throw new Error('Simulation not running. Call init first.');
    }
    
    const { steps = 1 } = data;
    
    if (steps <= 0) {
      throw new Error('Step count must be positive');
    }
    
    try {
      const newTick = await this.engine.step(steps);
      
      // Get updated metrics
      const snapshot = await this.engine.snapshot('metrics');
      
      return {
        success: true,
        op: 'step',
        data: {
          tick: newTick,
          metrics: snapshot.metrics
        }
      };
    } catch (error) {
      this.log('error', `Step failed: ${error.message}`);
      throw error;
    }
  }
  
  async handleSnapshot(data) {
    if (!this.isRunning) {
      throw new Error('Simulation not running. Call init first.');
    }
    
    const { kind = 'metrics' } = data;
    
    if (kind !== 'metrics' && kind !== 'full') {
      throw new Error('Snapshot kind must be "metrics" or "full"');
    }
    
    try {
      const snapshot = await this.engine.snapshot(kind);
      
      return {
        success: true,
        op: 'snapshot',
        data: {
          snapshot: snapshot,
          kind: kind
        }
      };
    } catch (error) {
      this.log('error', `Snapshot failed: ${error.message}`);
      throw error;
    }
  }
  
  async handleStop() {
    if (!this.isRunning) {
      return {
        success: true,
        op: 'stop',
        data: {
          message: 'Simulation already stopped'
        }
      };
    }
    
    try {
      await this.engine.stop();
      
      const response = {
        success: true,
        op: 'stop',
        data: {
          message: 'Simulation stopped successfully'
        }
      };
      
      // Exit the process after sending response and flushing stdout
      // This ensures Qt client sees clean exit instead of timeout+kill
      setImmediate(() => {
        this.log('info', 'Exiting process after clean stop');
        process.exit(0);
      });
      
      return response;
    } catch (error) {
      this.log('error', `Stop failed: ${error.message}`);
      throw error;
    }
  }
  
  sendResponse(response) {
    // Send as line-delimited JSON
    console.log(JSON.stringify(response));
  }
  
  log(level, message) {
    // Log to stderr so it doesn't interfere with JSON-RPC on stdout
    console.error(`[${level.toUpperCase()}] ${new Date().toISOString()} - ${message}`);
  }
}

// Start the sidecar
const sidecar = new GUISidecar();

// Handle process termination
process.on('SIGINT', async () => {
  console.error('[INFO] Received SIGINT, shutting down gracefully...');
  if (sidecar.isRunning) {
    await sidecar.engine.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[INFO] Received SIGTERM, shutting down gracefully...');
  if (sidecar.isRunning) {
    await sidecar.engine.stop();
  }
  process.exit(0);
});
