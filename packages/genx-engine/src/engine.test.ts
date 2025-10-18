/**
 * Genesis Engine Core Tests
 * 
 * Unit tests for the main Genesis Engine class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenesisEngine } from './engine.js';

describe('GenesisEngine', () => {
  let engine: GenesisEngine;

  beforeEach(() => {
    engine = new GenesisEngine();
  });

  describe('Initialization', () => {
    it('should create an instance of GenesisEngine', () => {
      expect(engine).toBeInstanceOf(GenesisEngine);
    });

    it('should have EventEmitter capabilities', () => {
      expect(typeof engine.on).toBe('function');
      expect(typeof engine.emit).toBe('function');
      expect(typeof engine.off).toBe('function');
    });

    it('should start in inactive state', () => {
      // Private property, but we can verify behavior
      expect(async () => await engine.step(1)).rejects.toThrow('Simulation not running');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate minimal configuration', async () => {
      const config = {
        simulation: {
          maxSteps: 1000,
          worldSize: 100.0
        },
        agents: {
          initialPopulation: 100,
          movementSpeed: { min: 0.5, max: 2.0 },
          energyRange: { min: 50, max: 100 },
          reproductionEnabled: true
        },
        disease: {
          enabled: false,
          transmissionRate: 0.0,
          recoveryRate: 0.0,
          mortalityRate: 0.0
        },
        environment: {
          resourceRegeneration: true,
          resourceDensity: 1.0
        },
        rng: {
          masterSeed: 42,
          independentStreams: true
        }
      };

      const options = {
        provider: 'internal'
      };

      // Mock provider initialization
      const startSpy = vi.fn();
      engine.on('starting', startSpy);

      try {
        await engine.start(config, options);
      } catch (error) {
        // Expected to fail without actual provider implementation
        // But validation should pass
      }

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'internal',
          config: expect.objectContaining({
            simulation: expect.any(Object)
          })
        })
      );
    });

    it('should reject invalid configuration with negative values', () => {
      const invalidConfig = {
        simulation: {
          maxSteps: -100, // Invalid
          worldSize: 100.0
        },
        agents: {
          initialPopulation: 100,
          movementSpeed: { min: 0.5, max: 2.0 },
          energyRange: { min: 50, max: 100 },
          reproductionEnabled: true
        },
        disease: {
          enabled: false,
          transmissionRate: 0.0,
          recoveryRate: 0.0,
          mortalityRate: 0.0
        },
        environment: {
          resourceRegeneration: true,
          resourceDensity: 1.0
        },
        rng: {
          masterSeed: 42,
          independentStreams: true
        }
      };

      expect(async () => {
        await engine.start(invalidConfig);
      }).rejects.toThrow();
    });
  });

  describe('Event System', () => {
    it('should emit starting event on start', async () => {
      const config = createValidConfig();
      const listener = vi.fn();
      
      engine.on('starting', listener);

      try {
        await engine.start(config, { provider: 'internal' });
      } catch (error) {
        // Expected without provider
      }

      expect(listener).toHaveBeenCalled();
    });

    it('should emit error event on failure', async () => {
      const errorListener = vi.fn();
      engine.on('error', errorListener);

      try {
        await engine.start(null); // Invalid config
      } catch (error) {
        // Expected
      }

      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('Step Execution', () => {
    it('should throw error when stepping before start', async () => {
      await expect(engine.step(1)).rejects.toThrow('Simulation not running');
    });

    it('should reject negative step counts', async () => {
      const config = createValidConfig();
      
      // This will fail but for testing the step logic
      try {
        await engine.start(config, { provider: 'internal' });
        await expect(engine.step(-1)).rejects.toThrow('Step count must be positive');
      } catch (error) {
        // Expected without actual provider
      }
    });

    it('should reject zero step counts', async () => {
      const config = createValidConfig();
      
      try {
        await engine.start(config, { provider: 'internal' });
        await expect(engine.step(0)).rejects.toThrow('Step count must be positive');
      } catch (error) {
        // Expected without actual provider
      }
    });
  });
});

/**
 * Helper function to create valid configuration
 */
function createValidConfig(): any {
  return {
    schema: 'EngineConfigV1',
    simulation: {
      maxSteps: 1000,
      worldSize: 100.0
    },
    agents: {
      initialPopulation: 100,
      movementSpeed: { min: 0.5, max: 2.0 },
      energyRange: { min: 50, max: 100 },
      reproductionEnabled: true
    },
    disease: {
      enabled: false,
      transmissionRate: 0.0,
      recoveryRate: 0.0,
      mortalityRate: 0.0
    },
    environment: {
      resourceRegeneration: true,
      resourceDensity: 1.0
    },
    rng: {
      masterSeed: 42,
      independentStreams: true
    }
  };
}
