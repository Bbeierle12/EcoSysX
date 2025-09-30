import { EngineProvider, EngineConfigV1, Snapshot, ProviderInfo } from '../types.js';
import { SidecarTransport } from './sidecar.js';

/**
 * Agents.jl Provider Implementation
 * 
 * Provides integration with the Agents.jl simulation framework through
 * a Julia sidecar process. Supports agent-based modeling with spatial
 * grids, disease dynamics, and genetic algorithms.
 * 
 * Features:
 * - Agent-based ecosystem simulation
 * - SIR disease model
 * - Spatial resource grids
 * - Genetic inheritance with mutation
 * - Deterministic Julia RNG seeding
 * - JSON+Base64 snapshot serialization
 */
export class AgentsProvider implements EngineProvider {
  private transport: SidecarTransport;
  private initialized: boolean = false;
  
  constructor() {
    this.transport = new SidecarTransport({
      image: 'genx-agents-sidecar:latest',
      timeout: 30000, // Julia startup can be slow
      dockerOptions: ['--rm', '--network=none', '--memory=1g', '--cpus=1.0']
    });
  }
  
  async init(cfg: EngineConfigV1, masterSeed: bigint): Promise<void> {
    // Start Julia sidecar container
    await this.transport.start();
    
    // Send initialization request
    await this.transport.init(cfg, masterSeed);
    
    this.initialized = true;
  }
  
  async step(n: number): Promise<number> {
    if (!this.initialized) {
      throw new Error('Agents.jl provider not initialized');
    }
    
    return await this.transport.step(n);
  }
  
  async snapshot(kind?: "full" | "metrics"): Promise<Snapshot> {
    if (!this.initialized) {
      throw new Error('Agents.jl provider not initialized');
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
    if (config.simulation.worldSize < 10 || config.simulation.worldSize > 200) {
      errors.push('World size must be between 10 and 200 for Agents.jl');
    }
    
    // Population validation
    if (config.simulation.populationSize < 10 || config.simulation.populationSize > 10000) {
      errors.push('Population size must be between 10 and 10000 for Agents.jl');
    }
    
    // Disease model validation
    if (config.disease.initialInfectionRate < 0 || config.disease.initialInfectionRate > 1) {
      errors.push('Initial infection rate must be between 0 and 1');
    }
    if (config.disease.transmissionRate < 0 || config.disease.transmissionRate > 1) {
      errors.push('Transmission rate must be between 0 and 1');
    }
    
    return errors;
  }
}