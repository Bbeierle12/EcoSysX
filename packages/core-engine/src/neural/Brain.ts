/**
 * Brain.ts - Brain Interface for GenesisX
 *
 * Defines the common interface that all brain types must implement.
 * Enables a pluggable architecture for different decision-making systems.
 */

// ============================================================================
// Types
// ============================================================================

export interface SensoryInput {
  front: number;
  frontLeft: number;
  frontRight: number;
  left: number;
  right: number;
  energy: number;
  bias: number;
}

export interface BrainOutput {
  moveForward: number;
  rotate: number;
  action: number;
}

export interface BrainConfig {
  inputSize?: number;
  hiddenSize?: number;
  outputSize?: number;
  mutationRate?: number;
  mutationStrength?: number;
  label?: string;
}

export interface BrainState {
  type: string;
  version: number;
  config: BrainConfig;
  data: unknown;
}

// ============================================================================
// Brain Interface
// ============================================================================

export interface Brain {
  readonly type: string;
  readonly label?: string;

  think(inputs: SensoryInput): BrainOutput;
  mutate(mutationRate?: number, mutationStrength?: number): Brain;
  clone(): Brain;
  crossover(other: Brain): Brain;
  serialize(): BrainState;
  getComplexity(): number;
}

// ============================================================================
// Brain Registry
// ============================================================================

export type BrainFactory = (state: BrainState) => Brain;

export class BrainRegistry {
  private static factories: Map<string, BrainFactory> = new Map();

  static register(type: string, factory: BrainFactory): void {
    BrainRegistry.factories.set(type, factory);
  }

  static deserialize(state: BrainState): Brain {
    const factory = BrainRegistry.factories.get(state.type);
    if (!factory) {
      throw new Error(`Unknown brain type: ${state.type}`);
    }
    return factory(state);
  }

  static has(type: string): boolean {
    return BrainRegistry.factories.has(type);
  }

  static getTypes(): string[] {
    return Array.from(BrainRegistry.factories.keys());
  }
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_SENSORY_INPUT: SensoryInput = {
  front: 0,
  frontLeft: 0,
  frontRight: 0,
  left: 0,
  right: 0,
  energy: 0.5,
  bias: 1.0,
};

export const DEFAULT_BRAIN_OUTPUT: BrainOutput = {
  moveForward: 0,
  rotate: 0,
  action: 0,
};
