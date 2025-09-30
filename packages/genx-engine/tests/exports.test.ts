import { describe, it, expect } from 'vitest';
import { 
  createDefaultConfig,
  getAvailableProviders,
  getProviderComparison,
  VERSION,
  SCHEMA_VERSION,
  SNAPSHOT_VERSION,
  TIME_MODEL
} from '../src/index.js';

describe('SDK Exports', () => {
  describe('Configuration Utilities', () => {
    it('should export createDefaultConfig function', () => {
      expect(createDefaultConfig).toBeDefined();
      expect(typeof createDefaultConfig).toBe('function');
      
      const config = createDefaultConfig();
      expect(config.schema).toBe('GENX_CFG_V1');
    });
    
    it('should export getAvailableProviders function', () => {
      expect(getAvailableProviders).toBeDefined();
      expect(typeof getAvailableProviders).toBe('function');
      
      const providers = getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });
    
    it('should export getProviderComparison function', () => {
      expect(getProviderComparison).toBeDefined();
      expect(typeof getProviderComparison).toBe('function');
      
      const comparison = getProviderComparison();
      expect(typeof comparison).toBe('object');
      expect(comparison).toHaveProperty('mesa');
      expect(comparison).toHaveProperty('agentsjl');
      expect(comparison).toHaveProperty('mason');
    });
  });
  
  describe('Version Information', () => {
    it('should export version constants', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
      
      expect(SCHEMA_VERSION).toBe('GENX_CFG_V1');
      expect(SNAPSHOT_VERSION).toBe('GENX_SNAP_V1');
      expect(TIME_MODEL).toBe('TIME_V1');
    });
  });
  
  describe('Provider Classes', () => {
    it('should export provider classes', async () => {
      const { MesaProvider, AgentsProvider, MasonProvider } = await import('../src/index.js');
      
      expect(MesaProvider).toBeDefined();
      expect(AgentsProvider).toBeDefined();
      expect(MasonProvider).toBeDefined();
      
      expect(typeof MesaProvider).toBe('function');
      expect(typeof AgentsProvider).toBe('function');
      expect(typeof MasonProvider).toBe('function');
    });
  });
  
  describe('Type Definitions', () => {
    it('should provide comprehensive type exports', async () => {
      // This is more of a compilation test - if TypeScript compiles,
      // the types are properly exported
      const module = await import('../src/index.js');
      
      expect(module.GenesisEngine).toBeDefined();
      expect(module.SidecarTransport).toBeDefined();
    });
  });
});