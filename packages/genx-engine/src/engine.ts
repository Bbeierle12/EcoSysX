import { Engine, EngineOptions, EngineConfigV1, Snapshot, ProviderInfo } from './types.js';
import { MesaProvider } from './providers/mesa.js';
import { AgentsProvider } from './providers/agents.js';
import { MasonProvider } from './providers/mason.js';
import { MockProvider } from './providers/mock.js';
import { EngineProvider } from './types.js';
import EventEmitter from 'eventemitter3';

/**
 * Genesis Engine - Pluggable Simulation Engine SDK
 * 
 * Provides a unified interface for running ecosystem simulations
 * across multiple simulation frameworks: Mesa (Python), Agents.jl (Julia),
 * and MASON (Java).
 * 
 * Features:
 * - Provider abstraction for seamless framework switching
 * - Deterministic execution with reproducible snapshots
 * - JSON-RPC sidecar communication for language interop
 * - TIME_V1 temporal model (1 step = 1 simulation hour)
 * - Comprehensive configuration validation
 * - Event-driven progress monitoring
 */
export class GenesisEngine extends EventEmitter implements Engine {
  private provider: EngineProvider | null = null;
  private currentTick: number = 0;
  private isActive: boolean = false;
  private config: EngineConfigV1 | null = null;
  private options: EngineOptions | null = null;
  
  constructor() {
    super();
  }
  
  /**
   * Start simulation with configuration
   */
  async start(cfg: EngineConfigV1, options: EngineOptions = {}): Promise<void> {
    if (this.isActive) {
      throw new Error('Simulation already running. Stop current simulation first.');
    }
    
    // Validate configuration
    this.validateConfiguration(cfg, options);
    
    // Create provider
    this.provider = this.createProvider(options.provider || 'internal', options);
    
    // Generate master seed from RNG configuration
    const masterSeed = this.generateMasterSeed(cfg.rng.masterSeed);
    
    // Initialize provider
    this.emit('starting', { provider: options.provider, config: cfg });
    
    try {
      await this.provider.init(cfg, masterSeed);
      
      this.config = cfg;
      this.options = options;
      this.currentTick = 0;
      this.isActive = true;
      
      this.emit('started', { provider: options.provider, tick: 0 });
    } catch (error) {
      this.emit('error', { phase: 'start', error });
      throw error;
    }
  }
  
  /**
   * Step simulation forward
   */
  async step(n: number = 1): Promise<number> {
    if (!this.isActive || !this.provider) {
      throw new Error('Simulation not running. Call start() first.');
    }
    
    if (n <= 0) {
      throw new Error('Step count must be positive');
    }
    
    this.emit('stepping', { steps: n, currentTick: this.currentTick });
    
    try {
      const newTick = await this.provider.step(n);
      this.currentTick = newTick;
      
      this.emit('stepped', { steps: n, newTick: this.currentTick });
      
      // Check for max steps limit
      if (this.config?.simulation.maxSteps && 
          this.currentTick >= this.config.simulation.maxSteps) {
        this.emit('completed', { reason: 'max_steps_reached', tick: this.currentTick });
      }
      
      return this.currentTick;
    } catch (error) {
      this.emit('error', { phase: 'step', error, tick: this.currentTick });
      throw error;
    }
  }
  
  /**
   * Get simulation snapshot
   */
  async snapshot(kind: "full" | "metrics" = "metrics"): Promise<Snapshot> {
    if (!this.isActive || !this.provider) {
      throw new Error('Simulation not running. Call start() first.');
    }
    
    this.emit('snapshotting', { kind, tick: this.currentTick });
    
    try {
      const snapshot = await this.provider.snapshot(kind);
      
      this.emit('snapshotted', { 
        kind, 
        tick: this.currentTick, 
        size: snapshot.state ? 'full' : 'metrics'
      });
      
      return snapshot;
    } catch (error) {
      this.emit('error', { phase: 'snapshot', error, tick: this.currentTick });
      throw error;
    }
  }
  
  /**
   * Stop simulation
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return; // Already stopped
    }
    
    this.emit('stopping', { tick: this.currentTick });
    
    try {
      if (this.provider) {
        await this.provider.stop();
        this.provider = null;
      }
      
      this.isActive = false;
      this.currentTick = 0;
      this.config = null;
      this.options = null;
      
      this.emit('stopped');
    } catch (error) {
      this.emit('error', { phase: 'stop', error });
      throw error;
    }
  }
  
  /**
   * Get current simulation tick
   */
  getCurrentTick(): number {
    return this.currentTick;
  }
  
  /**
   * Check if simulation is running
   */
  isRunning(): boolean {
    return this.isActive;
  }
  
  /**
   * Get provider information
   */
  async getProviderInfo(): Promise<ProviderInfo | null> {
    if (!this.provider || !this.isActive) {
      return null;
    }
    
    try {
      if (this.provider.info) {
        return await this.provider.info();
      }
      return null;
    } catch (error) {
      this.emit('error', { phase: 'info', error });
      return null;
    }
  }
  
  /**
   * Run simulation for specified number of steps with progress callbacks
   */
  async run(steps: number, progressCallback?: (tick: number, progress: number) => void): Promise<Snapshot> {
    if (!this.isActive) {
      throw new Error('Simulation not running. Call start() first.');
    }
    
    const startTick = this.currentTick;
    const targetTick = startTick + steps;
    
    for (let i = 0; i < steps; i++) {
      await this.step(1);
      
      if (progressCallback) {
        const progress = (i + 1) / steps;
        progressCallback(this.currentTick, progress);
      }
      
      // Yield control periodically for long-running simulations
      if (i % 100 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    return await this.snapshot();
  }
  
  /**
   * Create provider instance based on type
   */
  private createProvider(providerType: string, options: EngineOptions): EngineProvider {
    switch (providerType) {
      case 'mesa':
        return new MesaProvider();
      case 'agentsjl':
      case 'agents':
        return new AgentsProvider();
      case 'mason':
        return new MasonProvider();
      case 'mock':
      case 'internal':
        return new MockProvider();
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }
  
  /**
   * Validate configuration and options
   */
  private validateConfiguration(cfg: EngineConfigV1, options: EngineOptions): void {
    // Schema validation
    if (cfg.schema !== 'GENX_CFG_V1') {
      throw new Error(`Unsupported configuration schema: ${cfg.schema}`);
    }
    
    // Basic parameter validation
    if (cfg.simulation.populationSize <= 0) {
      throw new Error('Population size must be positive');
    }
    
    if (cfg.simulation.worldSize <= 0) {
      throw new Error('World size must be positive');
    }
    
    if (cfg.agents.initialEnergy.min < 0 || cfg.agents.initialEnergy.max < 0) {
      throw new Error('Initial energy values must be non-negative');
    }
    
    if (cfg.agents.initialEnergy.min > cfg.agents.initialEnergy.max) {
      throw new Error('Initial energy min must not exceed max');
    }
    
    // Disease model validation
    if (cfg.disease.initialInfectionRate < 0 || cfg.disease.initialInfectionRate > 1) {
      throw new Error('Initial infection rate must be between 0 and 1');
    }
    
    if (cfg.disease.transmissionRate < 0 || cfg.disease.transmissionRate > 1) {
      throw new Error('Transmission rate must be between 0 and 1');
    }
    
    // Provider-specific validation
    const providerType = options.provider || 'internal';
    let providerErrors: string[] = [];
    
    switch (providerType) {
      case 'mesa':
        // MesaProvider validation would go here
        break;
      case 'agentsjl':
        // AgentsProvider validation would go here
        break;
      case 'mason':
        // MasonProvider validation would go here
        break;
    }
    
    if (providerErrors.length > 0) {
      throw new Error(`Provider validation failed: ${providerErrors.join(', ')}`);
    }
  }
  
  /**
   * Generate master seed from string
   */
  private generateMasterSeed(seedStr: string): bigint {
    // Simple hash function to convert string to bigint
    let hash = 0n;
    for (let i = 0; i < seedStr.length; i++) {
      const char = BigInt(seedStr.charCodeAt(i));
      hash = ((hash << 5n) - hash) + char;
      hash = hash & ((1n << 32n) - 1n); // Keep it 32-bit
    }
    return hash;
  }
  
  /**
   * Create default configuration for testing
   */
  static createDefaultConfig(): EngineConfigV1 {
    return {
      schema: "GENX_CFG_V1",
      simulation: {
        populationSize: 100,
        worldSize: 50,
        maxSteps: 1000,
        enableDisease: true,
        enableReproduction: true,
        enableEnvironment: true
      },
      agents: {
        initialEnergy: { min: 80, max: 120 },
        energyConsumption: { min: 0.5, max: 1.5 },
        reproductionThreshold: 150,
        deathThreshold: 0,
        movementSpeed: { min: 0.5, max: 2.0 }
      },
      disease: {
        initialInfectionRate: 0.05,
        transmissionRate: 0.1,
        recoveryTime: 14,
        contactRadius: 2.0
      },
      environment: {
        resourceRegenRate: 0.01,
        resourceDensity: 1.0,
        enableSeasons: false,
        enableWeather: false
      },
      rng: {
        masterSeed: "12345",
        streams: {
          movement: true,
          disease: true,
          births: true,
          mutation: true,
          llm: false
        }
      }
    };
  }
  
  /**
   * Get available providers
   */
  static getAvailableProviders(): string[] {
    return ['mesa', 'agentsjl', 'mason'];
  }
  
  /**
   * Get provider capabilities comparison
   */
  static getProviderComparison(): object {
    return {
      mesa: {
        language: 'Python',
        strengths: ['Easy to use', 'Rich ecosystem', 'Scientific computing'],
        limitations: ['Performance', 'GIL constraints'],
        capabilities: ['agent-based-modeling', 'grid-space', 'network-analysis']
      },
      agentsjl: {
        language: 'Julia',
        strengths: ['High performance', 'Scientific computing', 'Type system'],
        limitations: ['Smaller ecosystem', 'Compilation time'],
        capabilities: ['agent-based-modeling', 'spatial-grids', 'deterministic-rng']
      },
      mason: {
        language: 'Java',
        strengths: ['Mature framework', 'Performance', 'Stability'],
        limitations: ['JVM overhead', 'Complexity'],
        capabilities: ['continuous-space', 'discrete-events', 'agent-scheduling']
      }
    };
  }
}

// Export the main engine class as default
export default GenesisEngine;