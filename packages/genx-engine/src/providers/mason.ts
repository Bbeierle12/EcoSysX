import { EngineProvider, EngineConfigV1, Snapshot, ProviderInfo } from '../types.js';
import { SidecarTransport } from './sidecar.js';

/**
 * MASON Provider Implementation
 * 
 * Provides integration with the MASON simulation framework through
 * a Java sidecar process. Supports agent-based modeling with continuous
 * space, discrete events, and complex agent behaviors.
 * 
 * Features:
 * - Agent-based ecosystem simulation
 * - SIR disease model
 * - Continuous spatial positioning
 * - Behavioral state machines
 * - Deterministic Java RNG seeding
 * - SHA-256 snapshot verification
 */
export class MasonProvider implements EngineProvider {
  private transport: SidecarTransport;
  private initialized: boolean = false;
  
  constructor() {
    this.transport = new SidecarTransport({
      image: 'genx-mason-sidecar:latest',
      timeout: 45000, // Java startup can be slow
      dockerOptions: ['--rm', '--network=none', '--memory=1g', '--cpus=1.0']
    });
  }
  
  async init(cfg: EngineConfigV1, masterSeed: bigint): Promise<void> {
    // Start Java sidecar container
    await this.transport.start();
    
    // Send initialization request
    await this.transport.init(cfg, masterSeed);
    
    this.initialized = true;
  }
  
  async step(n: number): Promise<number> {
    if (!this.initialized) {
      throw new Error('MASON provider not initialized');
    }
    
    return await this.transport.step(n);
  }
  
  async snapshot(kind?: "full" | "metrics"): Promise<Snapshot> {
    if (!this.initialized) {
      throw new Error('MASON provider not initialized');
    }
    
    return await this.transport.snapshot(kind);
  }
  
  async stop(): Promise<void> {
    if (this.initialized) {
      this.initialized = false;
    }
    
    await this.transport.stop();
  }
  
  async info(): Promise<ProviderInfo> {
    return await this.transport.info();
  }
  
  /**
   * Provider-specific configuration validation
   */
  static validateConfig(config: EngineConfigV1): string[] {
    const errors: string[] = [];
    
    // Grid size validation
    if (config.simulation.worldSize < 10 || config.simulation.worldSize > 500) {
      errors.push('World size must be between 10 and 500 for MASON');
    }
    
    // Population validation
    if (config.simulation.populationSize < 10 || config.simulation.populationSize > 50000) {
      errors.push('Population size must be between 10 and 50000 for MASON');
    }
    
    // Disease model validation
    if (config.disease.initialInfectionRate < 0 || config.disease.initialInfectionRate > 1) {
      errors.push('Initial infection rate must be between 0 and 1');
    }
    if (config.disease.transmissionRate < 0 || config.disease.transmissionRate > 1) {
      errors.push('Transmission rate must be between 0 and 1');
    }
    
    // Performance warnings
    if (config.simulation.populationSize > 10000) {
      errors.push('Warning: Large population sizes may impact MASON performance');
    }
    
    return errors;
  }
  
  /**
   * Get provider-specific capabilities
   */
  static getCapabilities(): string[] {
    return [
      'continuous-space',
      'discrete-events',
      'agent-scheduling',
      'behavioral-state-machines',
      'spatial-queries',
      'deterministic-rng',
      'snapshot-verification'
    ];
  }
  
  /**
   * Get performance characteristics
   */
  static getPerformanceInfo(): object {
    return {
      framework: 'MASON',
      language: 'Java',
      strengths: [
        'Mature and stable framework',
        'Excellent performance for large populations',
        'Rich spatial modeling capabilities',
        'Built-in visualization tools'
      ],
      limitations: [
        'JVM startup overhead',
        'Memory usage scales with population',
        'Complex setup for custom behaviors'
      ],
      recommendedUsage: {
        populationSize: '100-10000 agents',
        worldSize: '50-200 units',
        stepComplexity: 'Medium to High'
      }
    };
  }
}