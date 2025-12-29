/**
 * GenesisX Core Engine - Configuration Types
 *
 * Unified configuration system combining:
 * - EcoSysX's provider-based backend abstraction
 * - Tale-Weaver's World configuration
 * - digital-organisms' simulation parameters
 */

// ============================================================================
// Core Type Definitions
// ============================================================================

/**
 * Simulation state enumeration
 */
export enum SimulationState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  STEPPING = 'stepping',
  ERROR = 'error'
}

/**
 * Backend provider types for different compute strategies
 */
export enum ProviderType {
  CPU = 'cpu',
  WEBGL = 'webgl',
  WEBGPU = 'webgpu',
  WASM = 'wasm',
  WORKER = 'worker'
}

/**
 * Event types emitted by the engine
 */
export enum EngineEventType {
  // Lifecycle events
  INIT = 'engine:init',
  START = 'engine:start',
  STOP = 'engine:stop',
  PAUSE = 'engine:pause',
  RESUME = 'engine:resume',
  RESET = 'engine:reset',
  DESTROY = 'engine:destroy',

  // Simulation events
  STEP_START = 'sim:step:start',
  STEP_END = 'sim:step:end',
  TICK = 'sim:tick',

  // State events
  STATE_CHANGE = 'state:change',
  SNAPSHOT_CREATED = 'state:snapshot:created',
  SNAPSHOT_RESTORED = 'state:snapshot:restored',

  // Error events
  ERROR = 'engine:error',
  WARNING = 'engine:warning',

  // Entity events
  ENTITY_SPAWNED = 'entity:spawned',
  ENTITY_DIED = 'entity:died',
  ENTITY_UPDATED = 'entity:updated',

  // World events
  WORLD_UPDATED = 'world:updated',
  GRID_UPDATED = 'grid:updated'
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * World dimensions configuration
 */
export interface WorldDimensions {
  width: number;
  height: number;
  depth?: number;
}

/**
 * Grid layer configuration
 */
export interface GridLayerConfig {
  name: string;
  type: 'float32' | 'uint8' | 'int32' | 'uint32';
  defaultValue?: number;
  min?: number;
  max?: number;
  wrapEdges?: boolean;
}

/**
 * World configuration
 */
export interface WorldConfig {
  dimensions: WorldDimensions;
  cellSize?: number;
  layers?: GridLayerConfig[];
  wrapEdges?: boolean;
  seed?: number;
}

/**
 * Timing configuration for deterministic simulation
 */
export interface TimingConfig {
  deltaTime: number;
  targetStepsPerSecond: number;
  maxStepsPerFrame: number;
  useFixedTimestep: boolean;
  timeScale: number;
}

/**
 * Provider/Backend configuration
 */
export interface ProviderConfig {
  type: ProviderType;
  fallback?: ProviderType;
  options?: Record<string, unknown>;
}

/**
 * Snapshot configuration for state management
 */
export interface SnapshotConfig {
  autoSnapshot: boolean;
  snapshotInterval: number;
  maxSnapshots: number;
  compress: boolean;
}

/**
 * Debug and logging configuration
 */
export interface DebugConfig {
  enabled: boolean;
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  showPerformanceMetrics: boolean;
  trackEntityHistory: boolean;
  validateStateIntegrity: boolean;
}

/**
 * Main Engine Configuration
 */
export interface EngineConfig {
  id?: string;
  world: WorldConfig;
  timing: TimingConfig;
  provider: ProviderConfig;
  snapshot: SnapshotConfig;
  debug: DebugConfig;
  seed?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_TIMING_CONFIG: TimingConfig = {
  deltaTime: 16.667,
  targetStepsPerSecond: 60,
  maxStepsPerFrame: 4,
  useFixedTimestep: true,
  timeScale: 1.0
};

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  type: ProviderType.CPU,
  fallback: ProviderType.CPU
};

export const DEFAULT_SNAPSHOT_CONFIG: SnapshotConfig = {
  autoSnapshot: false,
  snapshotInterval: 100,
  maxSnapshots: 10,
  compress: false
};

export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  enabled: false,
  logLevel: 'warn',
  showPerformanceMetrics: false,
  trackEntityHistory: false,
  validateStateIntegrity: false
};

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  dimensions: { width: 100, height: 100 },
  cellSize: 1,
  wrapEdges: true
};

/**
 * Creates a complete engine configuration with defaults
 */
export function createEngineConfig(partial: Partial<EngineConfig> = {}): EngineConfig {
  return {
    id: partial.id ?? `engine-${Date.now()}`,
    world: { ...DEFAULT_WORLD_CONFIG, ...partial.world },
    timing: { ...DEFAULT_TIMING_CONFIG, ...partial.timing },
    provider: { ...DEFAULT_PROVIDER_CONFIG, ...partial.provider },
    snapshot: { ...DEFAULT_SNAPSHOT_CONFIG, ...partial.snapshot },
    debug: { ...DEFAULT_DEBUG_CONFIG, ...partial.debug },
    seed: partial.seed,
    metadata: partial.metadata
  };
}

// ============================================================================
// Engine Statistics Types
// ============================================================================

export interface PerformanceMetrics {
  stepsPerSecond: number;
  avgStepDuration: number;
  maxStepDuration: number;
  minStepDuration: number;
  memoryUsage: number;
  frameTimeAccumulator: number;
}

export interface EngineStats {
  totalSteps: number;
  simulationTime: number;
  realTime: number;
  state: SimulationState;
  performance: PerformanceMetrics;
  entityCount: number;
  snapshotCount: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface EngineEvent<T = unknown> {
  type: EngineEventType;
  timestamp: number;
  step: number;
  data?: T;
}

export interface StateChangeEventData {
  previousState: SimulationState;
  newState: SimulationState;
  reason?: string;
}

export interface StepEventData {
  step: number;
  deltaTime: number;
  duration: number;
}

export interface SnapshotEventData {
  snapshotId: string;
  step: number;
  size: number;
}

export interface ErrorEventData {
  error: Error;
  context?: string;
  recoverable: boolean;
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface IProvider {
  readonly type: ProviderType;
  readonly isInitialized: boolean;
  initialize(config: ProviderConfig): Promise<void>;
  destroy(): Promise<void>;
  isSupported(): boolean;
  getCapabilities(): ProviderCapabilities;
}

export interface ProviderCapabilities {
  supportsParallelCompute: boolean;
  supportsSharedMemory: boolean;
  maxGridSize: number;
  maxEntityCount: number;
  estimatedSpeedup: number;
}

// ============================================================================
// Serialization Types
// ============================================================================

export interface SerializedEngineState {
  version: string;
  timestamp: number;
  step: number;
  simulationTime: number;
  config: EngineConfig;
  worldState: SerializedWorldState;
  entityState: SerializedEntityState;
  rngState: SerializedRNGState;
}

export interface SerializedWorldState {
  dimensions: WorldDimensions;
  grids: Record<string, ArrayBuffer>;
  metadata: Record<string, unknown>;
}

export interface SerializedEntityState {
  entities: ArrayBuffer;
  count: number;
  idCounter: number;
}

export interface SerializedRNGState {
  seed: number;
  state: number[];
}
