// Determinism Tests for Genesis Engine Providers
import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { GenesisEngine } from '../src/engine.js';
import { Snapshot, EngineConfigV1 } from '../src/types.js';

const PROVIDER_IMAGE = process.env.PROVIDER_IMAGE || 'genx-test-sidecar:latest';
const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '60000');

// Standard test configuration for determinism validation
const DETERMINISM_CONFIG: EngineConfigV1 = {
  schema: "GENX_CFG_V1",
  simulation: {
    populationSize: 25,
    worldSize: 50,
    maxSteps: 100,
    enableDisease: true,
    enableReproduction: false,
    enableEnvironment: true
  },
  agents: {
    initialEnergy: { min: 75, max: 75 }, // Fixed for determinism
    energyConsumption: { min: 2, max: 2 }, // Fixed for determinism
    reproductionThreshold: 80,
    deathThreshold: 0,
    movementSpeed: { min: 1.0, max: 1.0 } // Fixed for determinism
  },
  disease: {
    initialInfectionRate: 0.2, // 20% initial infection
    transmissionRate: 0.15,
    recoveryTime: 15,
    contactRadius: 1.5
  },
  environment: {
    resourceDensity: 0.4,
    resourceRegenRate: 0.03,
    enableSeasons: false,
    enableWeather: false
  },
  rng: {
    masterSeed: "determinism-test-seed-2024",
    streams: {
      movement: true,
      disease: true,
      births: true,
      mutation: true,
      llm: false
    }
  }
};

describe.each(['mesa', 'agents', 'mason'] as const)('Determinism Tests - %s', (provider) => {
  test(`should produce identical runs with same seed for ${provider}`, async () => {
    const snapshots1: Snapshot[] = [];
    const snapshots2: Snapshot[] = [];
    
    // First run
    const engine1 = new GenesisEngine();
    try {
      await engine1.start(DETERMINISM_CONFIG, {
        provider: provider as any,
        sidecarImages: { [provider]: PROVIDER_IMAGE }
      });
      
      for (let i = 0; i < 20; i++) {
        await engine1.step();
        const snapshot = await engine1.snapshot('full');
        snapshots1.push(snapshot);
      }
    } finally {
      await engine1.stop();
    }
    
    // Second run with same configuration
    const engine2 = new GenesisEngine();
    try {
      await engine2.start(DETERMINISM_CONFIG, {
        provider: provider as any,
        sidecarImages: { [provider]: PROVIDER_IMAGE }
      });
      
      for (let i = 0; i < 20; i++) {
        await engine2.step();
        const snapshot = await engine2.snapshot('full');
        snapshots2.push(snapshot);
      }
    } finally {
      await engine2.stop();
    }
    
    // Compare snapshots
    expect(snapshots1.length).toBe(snapshots2.length);
    
    for (let i = 0; i < snapshots1.length; i++) {
      const snap1 = snapshots1[i];
      const snap2 = snapshots2[i];
      
      // Core simulation properties must match
      expect(snap1.tick).toBe(snap2.tick);
      expect(snap1.timeModel).toBe(snap2.timeModel);
      
      // Simulation digests should be identical (deterministic state)
      expect(snap1.simDigest).toBe(snap2.simDigest);
      expect(snap1.rngDigest).toBe(snap2.rngDigest);
      
      // Metrics should be identical
      expect(snap1.metrics.pop).toBe(snap2.metrics.pop);
      expect(snap1.metrics.sir.S).toBe(snap2.metrics.sir.S);
      expect(snap1.metrics.sir.I).toBe(snap2.metrics.sir.I);
      expect(snap1.metrics.sir.R).toBe(snap2.metrics.sir.R);
      
      // Full state comparison (when available)
      if (snap1.state && snap2.state) {
        expect(snap1.state.agents.length).toBe(snap2.state.agents.length);
        
        // Agent-by-agent comparison
        for (let j = 0; j < snap1.state.agents.length; j++) {
          const agent1 = snap1.state.agents[j];
          const agent2 = snap2.state.agents[j];
          
          expect(agent1.id).toBe(agent2.id);
          expect(agent1.position.x).toBeCloseTo(agent2.position.x, 10);
          expect(agent1.position.y).toBeCloseTo(agent2.position.y, 10);
          expect(agent1.sirState).toBe(agent2.sirState);
          expect(agent1.energy).toBe(agent2.energy);
        }
      }
    }
  }, TEST_TIMEOUT);

  test(`should produce different outputs with different seeds for ${provider}`, async () => {
    const config1 = { ...DETERMINISM_CONFIG };
    config1.rng.masterSeed = "seed-run-1";
    
    const config2 = { ...DETERMINISM_CONFIG };
    config2.rng.masterSeed = "seed-run-2";
    
    const snapshots1: Snapshot[] = [];
    const snapshots2: Snapshot[] = [];
    
    // First run with seed 1
    const engine1 = new GenesisEngine();
    try {
      await engine1.start(config1, {
        provider: provider as any,
        sidecarImages: { [provider]: PROVIDER_IMAGE }
      });
      
      for (let i = 0; i < 15; i++) {
        await engine1.step();
        const snapshot = await engine1.snapshot();
        snapshots1.push(snapshot);
      }
    } finally {
      await engine1.stop();
    }
    
    // Second run with seed 2
    const engine2 = new GenesisEngine();
    try {
      await engine2.start(config2, {
        provider: provider as any,
        sidecarImages: { [provider]: PROVIDER_IMAGE }
      });
      
      for (let i = 0; i < 15; i++) {
        await engine2.step();
        const snapshot = await engine2.snapshot();
        snapshots2.push(snapshot);
      }
    } finally {
      await engine2.stop();
    }
    
    // Should have differences due to different seeds
    let foundDifference = false;
    
    for (let i = 0; i < Math.min(snapshots1.length, snapshots2.length); i++) {
      const snap1 = snapshots1[i];
      const snap2 = snapshots2[i];
      
      if (snap1.simDigest !== snap2.simDigest || 
          snap1.rngDigest !== snap2.rngDigest ||
          snap1.metrics.sir.I !== snap2.metrics.sir.I) {
        foundDifference = true;
        break;
      }
    }
    
    expect(foundDifference).toBe(true);
  }, TEST_TIMEOUT);

  test(`should maintain determinism across step restarts for ${provider}`, async () => {
    // Run continuous simulation
    const continuousSnapshots: Snapshot[] = [];
    const engine1 = new GenesisEngine();
    
    try {
      await engine1.start(DETERMINISM_CONFIG, {
        provider: provider as any,
        sidecarImages: { [provider]: PROVIDER_IMAGE }
      });
      
      for (let i = 0; i < 30; i++) {
        await engine1.step();
        if (i % 3 === 0) { // Sample every 3rd step
          const snapshot = await engine1.snapshot();
          continuousSnapshots.push(snapshot);
        }
      }
    } finally {
      await engine1.stop();
    }
    
    // Run with multiple restarts
    const restartSnapshots: Snapshot[] = [];
    let engine2 = new GenesisEngine();
    
    try {
      await engine2.start(DETERMINISM_CONFIG, {
        provider: provider as any,
        sidecarImages: { [provider]: PROVIDER_IMAGE }
      });
      
      for (let batch = 0; batch < 10; batch++) {
        // Run 3 steps
        for (let i = 0; i < 3; i++) {
          await engine2.step();
        }
        
        // Take snapshot
        const snapshot = await engine2.snapshot();
        restartSnapshots.push(snapshot);
        
        // Restart provider (except last iteration)
        if (batch < 9) {
          await engine2.stop();
          
          // Create new engine for restart
          const newEngine = new GenesisEngine();
          
          // Resume from snapshot
          await newEngine.start(DETERMINISM_CONFIG, {
            provider: provider as any,
            sidecarImages: { [provider]: PROVIDER_IMAGE }
          });
          
          // Fast-forward to current tick
          for (let skip = 0; skip < (batch + 1) * 3; skip++) {
            await newEngine.step();
          }
          
          // Replace engine reference
          await engine2.stop();
          engine2 = newEngine;
        }
      }
    } finally {
      await engine2.stop();
    }
    
    // Compare final states
    expect(continuousSnapshots.length).toBe(restartSnapshots.length);
    
    for (let i = 0; i < continuousSnapshots.length; i++) {
      const continuous = continuousSnapshots[i];
      const restarted = restartSnapshots[i];
      
      expect(continuous.tick).toBe(restarted.tick);
      expect(continuous.simDigest).toBe(restarted.simDigest);
      expect(continuous.metrics.pop).toBe(restarted.metrics.pop);
    }
  }, TEST_TIMEOUT);

  test(`should validate hash consistency for ${provider}`, async () => {
    const engine = new GenesisEngine();
    const hashHistory: string[] = [];
    
    try {
      await engine.start(DETERMINISM_CONFIG, {
        provider: provider as any,
        sidecarImages: { [provider]: PROVIDER_IMAGE }
      });
      
      // Collect hash progression
      for (let i = 0; i < 25; i++) {
        await engine.step();
        const snapshot = await engine.snapshot();
        hashHistory.push(snapshot.simDigest);
      }
    } finally {
      await engine.stop();
    }
    
    // Validate hash properties
    expect(hashHistory.length).toBe(25);
    
    // All hashes should be valid hex strings
    for (const hash of hashHistory) {
      expect(hash).toMatch(/^[0-9a-f]+$/i);
      expect(hash.length).toBeGreaterThan(0);
    }
    
    // Hashes should change over time (simulation evolves)
    const uniqueHashes = new Set(hashHistory);
    expect(uniqueHashes.size).toBeGreaterThan(1);
    
    // But progression should be deterministic
    const engine2 = new GenesisEngine();
    const hashHistory2: string[] = [];
    
    try {
      await engine2.start(DETERMINISM_CONFIG, {
        provider: provider as any,
        sidecarImages: { [provider]: PROVIDER_IMAGE }
      });
      
      for (let i = 0; i < 25; i++) {
        await engine2.step();
        const snapshot = await engine2.snapshot();
        hashHistory2.push(snapshot.simDigest);
      }
    } finally {
      await engine2.stop();
    }
    
    // Hash sequences should be identical
    expect(hashHistory).toEqual(hashHistory2);
  }, TEST_TIMEOUT);
});

// Cross-provider determinism comparison
describe('Cross-Provider Determinism', () => {
  test('providers should have different but internally consistent behavior', async () => {
    const providerResults: Record<string, Snapshot[]> = {};
    
    // Run same scenario on all providers
    for (const provider of ['mesa', 'agents', 'mason'] as const) {
      const engine = new GenesisEngine();
      const snapshots: Snapshot[] = [];
      
      try {
        await engine.start(DETERMINISM_CONFIG, {
          provider: provider as any,
          sidecarImages: { [provider]: PROVIDER_IMAGE }
        });
        
        for (let i = 0; i < 20; i++) {
          await engine.step();
          const snapshot = await engine.snapshot();
          snapshots.push(snapshot);
        }
        
        providerResults[provider] = snapshots;
      } finally {
        await engine.stop();
      }
    }
    
    // Each provider should have consistent results
    const providers = Object.keys(providerResults);
    expect(providers.length).toBe(3);
    
    // Compare between providers
    const mesa = providerResults.mesa;
    const agents = providerResults.agents;
    const mason = providerResults.mason;
    
    // All should complete the same number of steps
    expect(mesa.length).toBe(agents.length);
    expect(agents.length).toBe(mason.length);
    
    // All should maintain population count
    for (let i = 0; i < mesa.length; i++) {
      expect(mesa[i].metrics.pop).toBe(DETERMINISM_CONFIG.simulation.populationSize);
      expect(agents[i].metrics.pop).toBe(DETERMINISM_CONFIG.simulation.populationSize);
      expect(mason[i].metrics.pop).toBe(DETERMINISM_CONFIG.simulation.populationSize);
    }
    
    // Providers should produce different specific outcomes
    let foundProviderDifferences = false;
    for (let i = 0; i < mesa.length; i++) {
      if (mesa[i].simDigest !== agents[i].simDigest ||
          agents[i].simDigest !== mason[i].simDigest ||
          mesa[i].metrics.sir.I !== agents[i].metrics.sir.I) {
        foundProviderDifferences = true;
        break;
      }
    }
    
    expect(foundProviderDifferences).toBe(true);
  }, TEST_TIMEOUT * 3);
});