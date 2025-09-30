/**
 * Genesis Engine SDK - Pluggable Simulation Engine
 * 
 * A unified interface for running ecosystem simulations across multiple
 * simulation frameworks: Mesa (Python), Agents.jl (Julia), and MASON (Java).
 * 
 * @example
 * ```typescript
 * import { GenesisEngine } from '@ecosysx/genx-engine';
 * 
 * const engine = new GenesisEngine();
 * const config = GenesisEngine.createDefaultConfig();
 * 
 * await engine.start(config, { provider: 'mesa' });
 * await engine.step(10);
 * const snapshot = await engine.snapshot();
 * await engine.stop();
 * ```
 */

// Main engine class
export { GenesisEngine as default } from './engine.js';
export { GenesisEngine } from './engine.js';

// Type definitions
export type {
  Engine,
  EngineOptions,
  EngineProvider,
  EngineConfigV1,
  Snapshot,
  AgentState,
  EnvironmentState,
  SimulationMetrics,
  ProviderInfo,
  RPCRequest,
  RPCResponse
} from './types.js';

// Provider implementations
export { MesaProvider } from './providers/mesa.js';
export { AgentsProvider } from './providers/agents.js';
export { MasonProvider } from './providers/mason.js';
export { SidecarTransport } from './providers/sidecar.js';

// Import for utility functions
import { GenesisEngine } from './engine.js';

// Utility functions
export const createDefaultConfig = () => GenesisEngine.createDefaultConfig();
export const getAvailableProviders = () => GenesisEngine.getAvailableProviders();
export const getProviderComparison = () => GenesisEngine.getProviderComparison();

// Version information
export const VERSION = '1.0.0';
export const SCHEMA_VERSION = 'GENX_CFG_V1';
export const SNAPSHOT_VERSION = 'GENX_SNAP_V1';
export const TIME_MODEL = 'TIME_V1';