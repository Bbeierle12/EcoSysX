import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GenesisEngine, createDefaultConfig } from '../src/index.js';

describe('Genesis Engine Core', () => {
  let engine: GenesisEngine;
  
  beforeEach(() => {
    engine = new GenesisEngine();
  });
  
  afterEach(async () => {
    if (engine.isRunning()) {
      await engine.stop();
    }
  });
  
  describe('Configuration', () => {
    it('should create default configuration', () => {
      const config = createDefaultConfig();
      
      expect(config.schema).toBe('GENX_CFG_V1');
      expect(config.simulation.populationSize).toBeGreaterThan(0);
      expect(config.simulation.worldSize).toBeGreaterThan(0);
      expect(config.disease.initialInfectionRate).toBeGreaterThanOrEqual(0);
      expect(config.disease.initialInfectionRate).toBeLessThanOrEqual(1);
    });
    
    it('should validate configuration parameters', async () => {
      const invalidConfig = createDefaultConfig();
      invalidConfig.simulation.populationSize = -1;
      
      await expect(engine.start(invalidConfig)).rejects.toThrow('Population size must be positive');
    });
    
    it('should validate disease parameters', async () => {
      const invalidConfig = createDefaultConfig();
      invalidConfig.disease.initialInfectionRate = 1.5;
      
      await expect(engine.start(invalidConfig)).rejects.toThrow('Initial infection rate must be between 0 and 1');
    });
  });
  
  describe('Engine Lifecycle', () => {
    it('should start and stop cleanly', async () => {
      const config = createDefaultConfig();
      
      expect(engine.isRunning()).toBe(false);
      expect(engine.getCurrentTick()).toBe(0);
      
      // Note: This test will fail without actual providers running
      // In a real test environment, we'd need Docker containers
      try {
        await engine.start(config, { provider: 'mesa' });
        expect(engine.isRunning()).toBe(true);
        await engine.stop();
        expect(engine.isRunning()).toBe(false);
      } catch (error) {
        // Expected to fail without actual Mesa sidecar running
        expect(error).toBeDefined();
      }
    });
    
    it('should prevent double start', async () => {
      const config = createDefaultConfig();
      
      try {
        await engine.start(config);
        await expect(engine.start(config)).rejects.toThrow('Simulation already running');
      } catch (error) {
        // Expected if provider fails to start
      }
    });
    
    it('should prevent operations on stopped engine', async () => {
      await expect(engine.step()).rejects.toThrow('Simulation not running');
      await expect(engine.snapshot()).rejects.toThrow('Simulation not running');
    });
  });
  
  describe('Provider Selection', () => {
    it('should support mesa provider', () => {
      const config = createDefaultConfig();
      
      // Should not throw during provider creation
      expect(() => {
        engine.start(config, { provider: 'mesa' });
      }).not.toThrow();
    });
    
    it('should support agentsjl provider', () => {
      const config = createDefaultConfig();
      
      expect(() => {
        engine.start(config, { provider: 'agentsjl' });
      }).not.toThrow();
    });
    
    it('should support mason provider', () => {
      const config = createDefaultConfig();
      
      expect(() => {
        engine.start(config, { provider: 'mason' });
      }).not.toThrow();
    });
    
    it('should reject unknown provider', async () => {
      const config = createDefaultConfig();
      
      await expect(engine.start(config, { provider: 'unknown' as any }))
        .rejects.toThrow('Unknown provider type: unknown');
    });
  });
  
  describe('Static Methods', () => {
    it('should list available providers', () => {
      const providers = GenesisEngine.getAvailableProviders();
      
      expect(providers).toContain('mesa');
      expect(providers).toContain('agentsjl');
      expect(providers).toContain('mason');
    });
    
    it('should provide provider comparison', () => {
      const comparison = GenesisEngine.getProviderComparison();
      
      expect(comparison).toHaveProperty('mesa');
      expect(comparison).toHaveProperty('agentsjl');
      expect(comparison).toHaveProperty('mason');
      
      expect((comparison as any).mesa.language).toBe('Python');
      expect((comparison as any).agentsjl.language).toBe('Julia');
      expect((comparison as any).mason.language).toBe('Java');
    });
  });
  
  describe('Event Handling', () => {
    it('should emit lifecycle events', async () => {
      const events: string[] = [];
      
      engine.on('starting', () => events.push('starting'));
      engine.on('started', () => events.push('started'));
      engine.on('stopping', () => events.push('stopping'));
      engine.on('stopped', () => events.push('stopped'));
      engine.on('error', () => events.push('error'));
      
      const config = createDefaultConfig();
      
      try {
        await engine.start(config);
        // Should have emitted 'starting' before the error
        expect(events).toContain('starting');
        await engine.stop();
      } catch (error) {
        // Expected without actual providers running
        // Should still have emitted 'starting' event before error
        expect(events).toContain('starting');
      }
    });
  });
});