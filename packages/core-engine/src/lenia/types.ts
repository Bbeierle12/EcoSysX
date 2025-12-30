/**
 * types.ts - Flow-Lenia cellular substrate types
 *
 * Based on Flow-Lenia (INRIA/DeepMind, 2023) - continuous cellular automaton
 * with mass conservation and flow dynamics.
 */

// ============================================================================
// Kernel Types
// ============================================================================

/**
 * Kernel function types for Lenia convolutions
 */
export type KernelType =
  | 'gaussian'      // Standard Gaussian kernel
  | 'polynomial'    // Polynomial kernel (Lenia original)
  | 'exponential'   // Exponential decay
  | 'donut'         // Ring/donut shaped
  | 'custom';       // User-defined kernel

/**
 * Configuration for a Lenia kernel
 */
export interface LeniaKernelConfig {
  type: KernelType;
  radius: number;           // Kernel radius in cells
  peaks: number;            // Number of peaks (for multi-ring kernels)
  beta: number[];           // Peak positions [0-1] for each ring
  alpha: number;            // Kernel sharpness parameter
  weights?: Float32Array;   // Pre-computed weights (for custom kernels)
}

export const DEFAULT_KERNEL_CONFIG: LeniaKernelConfig = {
  type: 'gaussian',
  radius: 13,
  peaks: 1,
  beta: [0.5],
  alpha: 4,
};

// ============================================================================
// Growth Function Types
// ============================================================================

/**
 * Growth function types that determine cell state transitions
 */
export type GrowthFunctionType =
  | 'gaussian'      // Bell curve around target value
  | 'polynomial'    // Polynomial growth function
  | 'step';         // Step function (classic Game of Life)

/**
 * Configuration for growth function
 */
export interface GrowthFunctionConfig {
  type: GrowthFunctionType;
  mu: number;       // Center of growth function [0-1]
  sigma: number;    // Width of growth function
  amplitude: number; // Scaling factor for growth
}

export const DEFAULT_GROWTH_CONFIG: GrowthFunctionConfig = {
  type: 'gaussian',
  mu: 0.15,
  sigma: 0.015,
  amplitude: 1.0,
};

// ============================================================================
// Flow Field Types (Flow-Lenia extension)
// ============================================================================

/**
 * Flow field configuration for mass-conserving dynamics
 */
export interface FlowFieldConfig {
  enabled: boolean;
  viscosity: number;        // Flow viscosity [0-1]
  diffusion: number;        // Mass diffusion rate
  advectionStrength: number; // How much flow affects state
  velocityDecay: number;    // Velocity field decay rate
}

export const DEFAULT_FLOW_CONFIG: FlowFieldConfig = {
  enabled: true,
  viscosity: 0.1,
  diffusion: 0.01,
  advectionStrength: 0.5,
  velocityDecay: 0.95,
};

// ============================================================================
// Channel Types
// ============================================================================

/**
 * Standard channel indices for multi-channel Lenia
 */
export enum LeniaChannel {
  DENSITY = 0,      // Primary mass/density channel
  PHEROMONE_A = 1,  // Agent-deposited pheromone type A
  PHEROMONE_B = 2,  // Agent-deposited pheromone type B
  NUTRIENTS = 3,    // Environmental nutrients
  WASTE = 4,        // Waste/toxin channel
  VELOCITY_X = 5,   // Flow velocity X component
  VELOCITY_Y = 6,   // Flow velocity Y component
}

/**
 * Channel configuration
 */
export interface ChannelConfig {
  name: string;
  decayRate: number;        // Natural decay per tick [0-1]
  diffusionRate: number;    // Spreading rate [0-1]
  minValue: number;
  maxValue: number;
  kernelIndex: number;      // Which kernel to use for this channel
  growthIndex: number;      // Which growth function to use
}

export const DEFAULT_CHANNEL_CONFIGS: ChannelConfig[] = [
  { name: 'density', decayRate: 0, diffusionRate: 0.01, minValue: 0, maxValue: 1, kernelIndex: 0, growthIndex: 0 },
  { name: 'pheromone_a', decayRate: 0.01, diffusionRate: 0.05, minValue: 0, maxValue: 1, kernelIndex: 0, growthIndex: 0 },
  { name: 'pheromone_b', decayRate: 0.01, diffusionRate: 0.05, minValue: 0, maxValue: 1, kernelIndex: 0, growthIndex: 0 },
];

// ============================================================================
// Substrate Configuration
// ============================================================================

/**
 * Main configuration for the Lenia substrate
 */
export interface LeniaSubstrateConfig {
  // Grid settings
  width: number;            // Width in cells
  height: number;           // Height in cells
  resolution: number;       // Cells per world unit (default 4)

  // Time stepping
  dt: number;               // Time step size (default 0.1)
  stepsPerTick: number;     // Lenia steps per simulation tick

  // Channels
  channelCount: number;     // Number of state channels (default 3)
  channels: ChannelConfig[];

  // Kernels and growth
  kernels: LeniaKernelConfig[];
  growthFunctions: GrowthFunctionConfig[];

  // Flow dynamics
  flow: FlowFieldConfig;

  // Performance
  useGPU: boolean;          // Use WebGPU for computation
  wrapBoundary: boolean;    // Toroidal boundary conditions
}

export const DEFAULT_LENIA_CONFIG: LeniaSubstrateConfig = {
  width: 256,
  height: 256,
  resolution: 4,

  dt: 0.1,
  stepsPerTick: 1,

  channelCount: 3,
  channels: DEFAULT_CHANNEL_CONFIGS,

  kernels: [DEFAULT_KERNEL_CONFIG],
  growthFunctions: [DEFAULT_GROWTH_CONFIG],

  flow: DEFAULT_FLOW_CONFIG,

  useGPU: false,
  wrapBoundary: true,
};

// ============================================================================
// Substrate State
// ============================================================================

/**
 * State of a single cell across all channels
 */
export interface CellState {
  channels: number[];
  velocityX: number;
  velocityY: number;
}

/**
 * Sensory reading from the substrate at a position
 */
export interface SubstrateSensing {
  position: { x: number; y: number };
  channels: number[];       // Values for each channel at position
  gradient: {               // Gradient direction for each channel
    x: number[];
    y: number[];
  };
  flowVelocity: { x: number; y: number };
}

/**
 * Agent deposit configuration
 */
export interface DepositConfig {
  channel: number;          // Which channel to deposit to
  amount: number;           // Amount to deposit [0-1]
  radius: number;           // Deposit radius in cells
  falloff: 'linear' | 'gaussian' | 'constant';
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Substrate statistics for monitoring
 */
export interface SubstrateStats {
  totalMass: number[];      // Total mass per channel
  maxValue: number[];       // Max value per channel
  avgValue: number[];       // Average value per channel
  flowEnergy: number;       // Total kinetic energy in flow field
  updateTimeMs: number;     // Last update computation time
  tickCount: number;        // Number of ticks processed
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialized substrate state for save/load
 */
export interface SerializedSubstrate {
  config: LeniaSubstrateConfig;
  channels: number[][];     // Flattened channel data
  velocityX?: number[];     // Flow velocity X
  velocityY?: number[];     // Flow velocity Y
  stats: SubstrateStats;
}

// ============================================================================
// Presets
// ============================================================================

export type LeniaPreset =
  | 'empty'           // Empty substrate
  | 'noise'           // Random noise initialization
  | 'blob'            // Central blob
  | 'orbium'          // Classic Lenia Orbium pattern
  | 'geminium';       // Geminium (dividing pattern)

export const LENIA_PRESETS: Record<LeniaPreset, Partial<LeniaSubstrateConfig>> = {
  empty: {},
  noise: {},
  blob: {},
  orbium: {
    kernels: [{
      type: 'polynomial',
      radius: 13,
      peaks: 1,
      beta: [0.5],
      alpha: 4,
    }],
    growthFunctions: [{
      type: 'gaussian',
      mu: 0.15,
      sigma: 0.015,
      amplitude: 1.0,
    }],
  },
  geminium: {
    kernels: [{
      type: 'polynomial',
      radius: 10,
      peaks: 2,
      beta: [0.25, 0.75],
      alpha: 4,
    }],
    growthFunctions: [{
      type: 'gaussian',
      mu: 0.27,
      sigma: 0.02,
      amplitude: 1.0,
    }],
  },
};
