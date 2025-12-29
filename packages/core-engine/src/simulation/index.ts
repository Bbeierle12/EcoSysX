/**
 * Simulation module exports
 */

// Food system
export {
  Food,
  FoodManager,
  DEFAULT_FOOD_CONFIG,
  DEFAULT_FOOD_MANAGER_CONFIG,
} from './Food';

export type {
  FoodConfig,
  FoodState,
  FoodManagerConfig,
} from './Food';

// Agent management
export {
  AgentManager,
  DEFAULT_AGENT_MANAGER_CONFIG,
} from './AgentManager';

export type {
  AgentManagerConfig,
  SpawnOptions,
} from './AgentManager';

// Interaction system
export {
  InteractionSystem,
  DEFAULT_INTERACTION_CONFIG,
} from './InteractionSystem';

export type {
  InteractionConfig,
  InteractionResult,
} from './InteractionSystem';

// Statistics
export {
  Statistics,
  DEFAULT_STATISTICS_CONFIG,
} from './Statistics';

export type {
  PopulationStats,
  FoodStats,
  PerformanceStats,
  TickSnapshot,
  StatisticsConfig,
} from './Statistics';

// Simulation Engine
export {
  SimulationEngine,
  DEFAULT_SIMULATION_CONFIG,
  createSimulation,
} from './SimulationEngine';

export type {
  SimulationConfig,
  SimulationSnapshot,
  SimulationCallbacks,
} from './SimulationEngine';

// Simulation Builder
export {
  SimulationBuilder,
  createSimulationBuilder,
  quickStart,
} from './SimulationBuilder';

// Headless Runner
export {
  runHeadless,
  runHeadlessSync,
  computeStateHash,
  compareResults,
  verifyDeterminism,
  DEFAULT_HEADLESS_CONFIG,
} from './HeadlessRunner';

export type {
  HeadlessConfig,
  HeadlessProgress,
  HeadlessResult,
} from './HeadlessRunner';

// Serialization
export {
  serializeSimulation,
  simulationToJSON,
  parseSimulationJSON,
  createSaveFile,
  generateSaveFilename,
  exportSnapshot,
  exportStatisticsCSV,
  loadSimulation,
  loadSimulationFromJSON,
  loadSimulationFromFile,
} from './Serialization';

export type {
  SerializedSimulation,
  SerializedAgent,
  SerializedFood,
  ExportedSnapshot,
} from './Serialization';
