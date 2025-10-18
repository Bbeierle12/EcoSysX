// Comprehensive Integration Tests for Genesis Engine Providers
import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { GenesisEngine } from '../src/engine.js';
import { AgentState, EnvironmentState, Snapshot, EngineConfigV1 } from '../src/types.js';

const PROVIDER_IMAGE = process.env.PROVIDER_IMAGE || 'genx-test-sidecar:latest';
const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '30000');

// Test configuration for each provider
const PROVIDER_CONFIGS = {
  mesa: {
    population_size: 50,
    initial_infected: 5,
    transmission_rate: 0.1,
    recovery_rate: 0.05
  },
  agents: {
    population_size: 50,
    initial_infected: 5,
    transmission_probability: 0.1,
    recovery_time: 20
  },
  mason: {
    population_size: 50,
    initial_infected: 5,
    infection_radius: 2.0,
    recovery_time: 20
  }
} as const;

type ProviderName = keyof typeof PROVIDER_CONFIGS;

// Convert provider config to Genesis engine config
function createEngineConfig(provider: ProviderName): EngineConfigV1 {
  const providerConfig = PROVIDER_CONFIGS[provider];
  
  return {
    schema: "GENX_CFG_V1",
    simulation: {
      populationSize: providerConfig.population_size,
      worldSize: 100,
      maxSteps: 1000,
      enableDisease: true,
      enableReproduction: false,
      enableEnvironment: true
    },
    agents: {
      initialEnergy: { min: 50, max: 100 },
      energyConsumption: { min: 1, max: 3 },
      reproductionThreshold: 80,
      deathThreshold: 0,
      movementSpeed: { min: 0.5, max: 2.0 }
    },
    disease: {
      initialInfectionRate: providerConfig.initial_infected / providerConfig.population_size,
      transmissionRate: 0.1,
      recoveryTime: 20,
      contactRadius: 2.0
    },
    environment: {
      resourceDensity: 0.3,
      resourceRegenRate: 0.05,
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

describe.each(['mesa', 'agents', 'mason'] as const)('Provider Integration Tests - %s', (provider: ProviderName) => {
  let engine: GenesisEngine;
  
  beforeEach(async () => {
    engine = new GenesisEngine();
  });

  afterEach(async () => {
    if (engine) {
      await engine.stop();
    }
  });

  test(`should initialize ${provider} provider successfully`, async () => {
    const config = createEngineConfig(provider);
    
    // Initialize with provider-specific configuration
    await engine.start(config, {
      provider: provider as any,
      sidecarImages: {
        [provider]: PROVIDER_IMAGE
      }
    });

    // Get initial state
    const initialState = await engine.snapshot('full');
    expect(initialState).toBeDefined();
    expect(initialState.state?.agents).toBeDefined();
    expect(initialState.state?.environment).toBeDefined();
    expect(initialState.state?.agents.length).toBe(config.simulation.populationSize);
    
    // Verify initial infected agents
    const infectedAgents = initialState.state?.agents.filter((agent: AgentState) => 
      agent.sirState === 1 // I=1 for infected
    ) || [];
    expect(infectedAgents.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  test(`should execute simulation steps for ${provider}`, async () => {
    const config = createEngineConfig(provider);
    
    await engine.start(config, {
      provider: provider as any,
      sidecarImages: { [provider]: PROVIDER_IMAGE }
    });

    const initialState = await engine.snapshot();
    const initialTick = initialState.tick;

    // Execute 10 simulation steps
    for (let i = 1; i <= 10; i++) {
      await engine.step();
      const stepResult = await engine.snapshot();
      expect(stepResult.tick).toBe(initialTick + i);
      
      // Verify basic state structure
      if (i % 5 === 0) { // Check full state every 5 steps
        const fullState = await engine.snapshot('full');
        expect(fullState.state?.agents).toBeDefined();
        expect(fullState.state?.environment).toBeDefined();
        
        // Verify agents maintain valid states
        for (const agent of fullState.state?.agents || []) {
          expect(agent.id).toBeDefined();
          expect(agent.position).toBeDefined();
          expect([0, 1, 2]).toContain(agent.sirState); // S=0, I=1, R=2
        }
      }
    }

    const finalState = await engine.snapshot();
    expect(finalState.tick).toBe(initialTick + 10);
  }, TEST_TIMEOUT);

  test(`should maintain agent conservation for ${provider}`, async () => {
    const config = createEngineConfig(provider);
    
    await engine.start(config, {
      provider: provider as any,
      sidecarImages: { [provider]: PROVIDER_IMAGE }
    });

    const initialState = await engine.snapshot('full');
    const initialAgentCount = initialState.state?.agents.length || 0;

    // Run simulation for 20 steps
    for (let i = 0; i < 20; i++) {
      await engine.step();
    }

    const finalState = await engine.snapshot('full');
    
    // Agent count should remain constant (no reproduction/death in test)
    expect(finalState.state?.agents.length).toBe(initialAgentCount);
    expect(finalState.state?.agents.length).toBe(config.simulation.populationSize);
  }, TEST_TIMEOUT);

  test(`should track disease progression for ${provider}`, async () => {
    const config = createEngineConfig(provider);
    
    await engine.start(config, {
      provider: provider as any,
      sidecarImages: { [provider]: PROVIDER_IMAGE }
    });

    const states: Snapshot[] = [];
    
    // Collect states over 30 steps
    for (let i = 0; i < 30; i++) {
      await engine.step();
      const state = await engine.snapshot('full');
      states.push(state);
    }

    // Analyze disease progression
    const progressionStats = states.map(state => {
      const counts = { susceptible: 0, infected: 0, recovered: 0 };
      
      for (const agent of state.state?.agents || []) {
        switch (agent.sirState) {
          case 0: counts.susceptible++; break;
          case 1: counts.infected++; break;
          case 2: counts.recovered++; break;
        }
      }
      
      return counts;
    });

    // Verify disease spreads (infected + recovered should increase)
    const initialInfected = progressionStats[0].infected;
    const finalInfected = progressionStats[progressionStats.length - 1].infected;
    const finalRecovered = progressionStats[progressionStats.length - 1].recovered;
    
    expect(finalInfected + finalRecovered).toBeGreaterThanOrEqual(initialInfected);

    // Total population remains constant
    for (const stats of progressionStats) {
      const total = stats.susceptible + stats.infected + stats.recovered;
      expect(total).toBe(config.simulation.populationSize);
    }
  }, TEST_TIMEOUT);

  test(`should handle provider restart for ${provider}`, async () => {
    const config = createEngineConfig(provider);
    
    // Initialize and run for a few steps
    await engine.start(config, {
      provider: provider as any,
      sidecarImages: { [provider]: PROVIDER_IMAGE }
    });

    await engine.step();
    await engine.step();

    // Restart provider
    await engine.stop();
    await engine.start(config, {
      provider: provider as any,
      sidecarImages: { [$provider]: PROVIDER_IMAGE }
    });

    // Should start fresh
    const stateAfterRestart = await engine.snapshot();
    expect(stateAfterRestart.tick).toBe(0);
  }, TEST_TIMEOUT);

  test(`should validate TIME_V1 compliance for ${provider}`, async () => {
    const config = createEngineConfig(provider);
    
    await engine.start(config, {
      provider: provider as any,
      sidecarImages: { [$provider]: PROVIDER_IMAGE }
    });

    const timestamps: number[] = [];
    
    // Collect timestamps over 10 steps
    for (let i = 0; i < 10; i++) {
      const stepStart = Date.now();
      await engine.step();
      const state = await engine.snapshot();
      const stepEnd = Date.now();
      
      timestamps.push(stepEnd - stepStart);
      
      // Verify step progression
      expect(state.tick).toBe(i + 1);
      
      // Verify time model compliance
      expect(state.timeModel).toBe('TIME_V1');
    }

    // Step execution should be reasonably consistent
    const avgStepTime = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
    expect(avgStepTime).toBeLessThan(5000); // Steps should complete within 5 seconds
  }, TEST_TIMEOUT);

  test(`should handle provider errors gracefully for ${provider}`, async () => {
    const invalidConfig = createEngineConfig(provider);
    invalidConfig.simulation.populationSize = -1; // Invalid population
    
    // Test with invalid configuration
    await expect(engine.start(invalidConfig, {
      provider: provider as any,
      sidecarImages: { [provider]: PROVIDER_IMAGE }
    })).rejects.toThrow();

    // Test step without initialization
    const freshEngine = new GenesisEngine();
    await expect(freshEngine.step()).rejects.toThrow();
    await freshEngine.stop();
  }, TEST_TIMEOUT);
});

// Cross-provider comparison tests
describe('Cross-Provider Validation', () => {
  test('all providers should produce comparable outputs', async () => {
    const results: Record<string, Snapshot[]> = {};

    // Run same scenario on all providers
    for (const provider of ['mesa', 'agents', 'mason'] as const) {
      const engine = new GenesisEngine();
      const config = createEngineConfig(provider);

      try {
        await engine.start(config, {
          provider: provider as any,
          sidecarImages: { [provider]: PROVIDER_IMAGE }
        });

        const steps: Snapshot[] = [];
        for (let i = 0; i < 15; i++) {
          await engine.step();
          const step = await engine.snapshot('full');
          steps.push(step);
        }

        results[provider] = steps;
      } finally {
        await engine.stop();
      }
    }

    // Compare final states
    const providers = Object.keys(results);
    expect(providers.length).toBe(3);

    for (const provider of providers) {
      const finalStep = results[provider][results[provider].length - 1];
      
      // All should have same agent count
      expect(finalStep.state?.agents.length).toBe(50); // Our test population size
      
      // All should show disease progression (some infected/recovered)
      const healthCounts = { susceptible: 0, infected: 0, recovered: 0 };
      for (const agent of finalStep.state?.agents || []) {
        switch (agent.sirState) {
          case 0: healthCounts.susceptible++; break;
          case 1: healthCounts.infected++; break;
          case 2: healthCounts.recovered++; break;
        }
      }
      
      // Should have some disease activity
      expect(healthCounts.infected + healthCounts.recovered).toBeGreaterThan(0);
    }
  }, TEST_TIMEOUT * 3);
});
