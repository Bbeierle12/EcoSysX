/**
 * Mock Provider - Simple in-memory simulation for testing
 * 
 * No external dependencies, runs entirely in Node.js process
 */

import type { EngineProvider, EngineConfigV1, Snapshot, ProviderInfo } from '../types.js';

export class MockProvider implements EngineProvider {
  private initialized = false;
  private currentTick = 0;
  private config: EngineConfigV1 | null = null;
  private population = 0;
  private susceptible = 0;
  private infected = 0;
  private recovered = 0;

  async init(cfg: EngineConfigV1, masterSeed: bigint): Promise<void> {
    if (this.initialized) {
      throw new Error('Provider already initialized');
    }

    this.config = cfg;
    this.currentTick = 0;
    this.population = cfg.simulation.populationSize;
    this.susceptible = Math.floor(this.population * (1 - cfg.disease.initialInfectionRate));
    this.infected = this.population - this.susceptible;
    this.recovered = 0;
    this.initialized = true;
  }

  async step(n: number): Promise<number> {
    this.ensureInitialized();

    for (let i = 0; i < n; i++) {
      this.currentTick++;
      
      // Simple SIR dynamics simulation
      if (this.infected > 0 && this.susceptible > 0) {
        const newInfections = Math.floor(
          this.infected * this.susceptible * 0.001 // Simple contact model
        );
        const newRecoveries = Math.floor(this.infected * 0.05); // 5% recovery rate
        
        this.susceptible = Math.max(0, this.susceptible - newInfections);
        this.recovered += newRecoveries;
        this.infected = this.population - this.susceptible - this.recovered;
      }
    }

    return this.currentTick;
  }

  async snapshot(kind?: "full" | "metrics"): Promise<Snapshot> {
    this.ensureInitialized();

    const metrics = {
      pop: this.population,
      energyMean: 75 + Math.random() * 20, // Random energy 75-95
      sir: {
        S: this.susceptible,
        I: this.infected,
        R: this.recovered
      }
    };

    const providerInfo: ProviderInfo = {
      name: 'mock',
      version: '1.0.0',
      license: 'MIT'
    };

    const baseSnapshot = {
      schema: "GENX_SNAP_V1" as const,
      timeModel: "TIME_V1" as const,
      tick: this.currentTick,
      buildHash: 'mock-build-001',
      rngDigest: '0'.repeat(64), // Mock BLAKE3 hash
      simDigest: '0'.repeat(64), // Mock BLAKE3 hash
      metrics,
      provider: providerInfo
    };

    if (kind === 'full') {
      // Generate simple agent states
      const agents = Array.from({ length: Math.min(this.population, 100) }, (_, i) => ({
        id: `agent-${i}`,
        position: {
          x: Math.random() * (this.config?.simulation.worldSize || 50),
          y: Math.random() * (this.config?.simulation.worldSize || 50)
        },
        velocity: { dx: 0, dy: 0 },
        energy: 75 + Math.random() * 20,
        sirState: (i < this.susceptible ? 0 : i < this.susceptible + this.infected ? 1 : 2) as 0 | 1 | 2,
        daysInState: Math.floor(Math.random() * 10),
        ageTicks: this.currentTick
      }));

      return {
        ...baseSnapshot,
        state: {
          agents,
          environment: {
            resourceGrid: new Float32Array(100),
            tick: this.currentTick
          }
        }
      };
    }

    return baseSnapshot;
  }

  async stop(): Promise<void> {
    this.initialized = false;
    this.currentTick = 0;
    this.config = null;
  }

  async info(): Promise<ProviderInfo> {
    return {
      name: 'mock',
      version: '1.0.0',
      license: 'MIT'
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Provider not initialized');
    }
  }
}

export default MockProvider;
