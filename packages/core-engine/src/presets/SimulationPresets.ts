/**
 * SimulationPresets.ts - Pre-configured simulation settings
 *
 * Ready-to-use configurations for common simulation scenarios.
 */

import { SimulationConfig } from '../simulation/SimulationEngine';

/**
 * Small test simulation - quick iterations, low resource usage
 * Good for: Unit tests, rapid prototyping, debugging
 */
export const PRESET_TEST: SimulationConfig = {
  engine: {
    world: {
      dimensions: { width: 100, height: 100 },
      wrapEdges: true,
    },
    timing: {
      deltaTime: 16.667,
      targetStepsPerSecond: 60,
      maxStepsPerFrame: 1,
      useFixedTimestep: true,
      timeScale: 1.0,
    },
  },
  agents: {
    initialPopulation: 5,
    maxPopulation: 20,
    minPopulation: 2,
    autoRespawn: true,
    networkLayers: [7, 8, 3],
  },
  food: {
    initialCount: 10,
    maxCount: 30,
    spawnRate: 0.05,
    clusteringFactor: 0.2,
  },
  interaction: {
    eatRadius: 8,
    mateRadius: 12,
    collisionRadius: 4,
  },
  sensory: {
    visionRange: 50,
  },
  statistics: {
    historyLength: 100,
    snapshotInterval: 10,
  },
};

/**
 * Small ecosystem - balanced for observation
 * Good for: Learning, demos, small-scale experiments
 */
export const PRESET_SMALL: SimulationConfig = {
  engine: {
    world: {
      dimensions: { width: 400, height: 300 },
      wrapEdges: true,
    },
    timing: {
      deltaTime: 16.667,
      targetStepsPerSecond: 60,
      maxStepsPerFrame: 2,
      useFixedTimestep: true,
      timeScale: 1.0,
    },
  },
  agents: {
    initialPopulation: 15,
    maxPopulation: 50,
    minPopulation: 5,
    autoRespawn: true,
    networkLayers: [7, 12, 3],
  },
  food: {
    initialCount: 30,
    maxCount: 80,
    spawnRate: 0.1,
    clusteringFactor: 0.3,
    foodConfig: {
      energyValue: 25,
      respawnDelay: 100,
      decayRate: 0,
    },
  },
  interaction: {
    eatRadius: 10,
    mateRadius: 15,
    collisionRadius: 5,
  },
  sensory: {
    visionRange: 80,
  },
  statistics: {
    historyLength: 500,
    snapshotInterval: 5,
  },
};

/**
 * Medium ecosystem - standard simulation
 * Good for: General use, evolution experiments
 */
export const PRESET_MEDIUM: SimulationConfig = {
  engine: {
    world: {
      dimensions: { width: 800, height: 600 },
      wrapEdges: true,
    },
    timing: {
      deltaTime: 16.667,
      targetStepsPerSecond: 60,
      maxStepsPerFrame: 4,
      useFixedTimestep: true,
      timeScale: 1.0,
    },
  },
  agents: {
    initialPopulation: 30,
    maxPopulation: 150,
    minPopulation: 10,
    autoRespawn: true,
    networkLayers: [7, 16, 8, 3],
    agentConfig: {
      maxEnergy: 100,
      maxSpeed: 2.5,
      rotationSpeed: Math.PI / 4,
      sensorRange: 120,
      energyCostPerTick: 0.1,
      energyCostMove: 0.4,
      energyCostRotate: 0.1,
      energyCostReproduce: 35,
      reproductionThreshold: 65,
      matureAge: 80,
    },
  },
  food: {
    initialCount: 60,
    maxCount: 200,
    spawnRate: 0.15,
    clusteringFactor: 0.4,
    foodConfig: {
      energyValue: 20,
      respawnDelay: 80,
      decayRate: 0.01,
    },
  },
  interaction: {
    eatRadius: 12,
    mateRadius: 18,
    collisionRadius: 6,
  },
  sensory: {
    visionRange: 100,
    foodWeight: 1.0,
    agentWeight: 0.5,
  },
  statistics: {
    historyLength: 1000,
    snapshotInterval: 5,
  },
};

/**
 * Large ecosystem - many agents, complex dynamics
 * Good for: Large-scale evolution, research, benchmarks
 */
export const PRESET_LARGE: SimulationConfig = {
  engine: {
    world: {
      dimensions: { width: 1600, height: 1200 },
      wrapEdges: true,
    },
    timing: {
      deltaTime: 16.667,
      targetStepsPerSecond: 60,
      maxStepsPerFrame: 8,
      useFixedTimestep: true,
      timeScale: 1.0,
    },
  },
  agents: {
    initialPopulation: 100,
    maxPopulation: 500,
    minPopulation: 20,
    autoRespawn: true,
    networkLayers: [7, 24, 12, 3],
    agentConfig: {
      maxEnergy: 120,
      maxSpeed: 3,
      rotationSpeed: Math.PI / 3,
      sensorRange: 150,
      energyCostPerTick: 0.12,
      energyCostMove: 0.35,
      energyCostRotate: 0.08,
      energyCostReproduce: 40,
      reproductionThreshold: 70,
      matureAge: 60,
    },
  },
  food: {
    initialCount: 200,
    maxCount: 600,
    spawnRate: 0.3,
    clusteringFactor: 0.5,
    foodConfig: {
      energyValue: 18,
      respawnDelay: 60,
      decayRate: 0.02,
    },
  },
  interaction: {
    eatRadius: 15,
    mateRadius: 20,
    collisionRadius: 7,
  },
  sensory: {
    visionRange: 120,
    foodWeight: 1.0,
    agentWeight: 0.6,
  },
  statistics: {
    historyLength: 2000,
    snapshotInterval: 10,
  },
};

/**
 * Survival mode - scarce resources, high competition
 * Good for: Testing selection pressure, survival strategies
 */
export const PRESET_SURVIVAL: SimulationConfig = {
  engine: {
    world: {
      dimensions: { width: 600, height: 600 },
      wrapEdges: true,
    },
    timing: {
      deltaTime: 16.667,
      targetStepsPerSecond: 60,
      maxStepsPerFrame: 4,
      useFixedTimestep: true,
      timeScale: 1.0,
    },
  },
  agents: {
    initialPopulation: 40,
    maxPopulation: 100,
    minPopulation: 5,
    autoRespawn: false, // No auto respawn - survival of the fittest
    networkLayers: [7, 16, 8, 3],
    agentConfig: {
      maxEnergy: 80,
      maxSpeed: 2,
      rotationSpeed: Math.PI / 4,
      sensorRange: 100,
      energyCostPerTick: 0.15, // Higher metabolism
      energyCostMove: 0.5,
      energyCostRotate: 0.12,
      energyCostReproduce: 30,
      reproductionThreshold: 55,
      matureAge: 50,
    },
  },
  food: {
    initialCount: 20, // Scarce food
    maxCount: 40,
    spawnRate: 0.03, // Slow spawn
    clusteringFactor: 0.6, // Highly clustered
    foodConfig: {
      energyValue: 30, // Valuable when found
      respawnDelay: 200,
      decayRate: 0.05, // Food decays
    },
  },
  interaction: {
    eatRadius: 8,
    mateRadius: 12,
    collisionRadius: 5,
  },
  sensory: {
    visionRange: 100,
    foodWeight: 1.2, // Prioritize food finding
    agentWeight: 0.3,
  },
  statistics: {
    historyLength: 500,
    snapshotInterval: 5,
  },
};

/**
 * Abundant mode - plentiful resources, focus on reproduction
 * Good for: Testing breeding strategies, neural evolution
 */
export const PRESET_ABUNDANT: SimulationConfig = {
  engine: {
    world: {
      dimensions: { width: 800, height: 600 },
      wrapEdges: true,
    },
    timing: {
      deltaTime: 16.667,
      targetStepsPerSecond: 60,
      maxStepsPerFrame: 4,
      useFixedTimestep: true,
      timeScale: 1.0,
    },
  },
  agents: {
    initialPopulation: 20,
    maxPopulation: 200,
    minPopulation: 10,
    autoRespawn: true,
    networkLayers: [7, 20, 10, 3],
    agentConfig: {
      maxEnergy: 150,
      maxSpeed: 2,
      rotationSpeed: Math.PI / 4,
      sensorRange: 100,
      energyCostPerTick: 0.08, // Low metabolism
      energyCostMove: 0.3,
      energyCostRotate: 0.05,
      energyCostReproduce: 25, // Cheap reproduction
      reproductionThreshold: 50,
      matureAge: 40, // Quick maturation
    },
  },
  food: {
    initialCount: 150, // Abundant food
    maxCount: 400,
    spawnRate: 0.5, // Fast spawn
    clusteringFactor: 0.2, // Spread out
    foodConfig: {
      energyValue: 25,
      respawnDelay: 30,
      decayRate: 0,
    },
  },
  interaction: {
    eatRadius: 15,
    mateRadius: 25,
    collisionRadius: 5,
  },
  sensory: {
    visionRange: 80,
    foodWeight: 0.8,
    agentWeight: 0.8, // Higher agent awareness for mating
  },
  statistics: {
    historyLength: 1000,
    snapshotInterval: 5,
  },
};

/**
 * Fast evolution - accelerated time scale
 * Good for: Quick generation testing, overnight runs
 */
export const PRESET_FAST_EVOLUTION: SimulationConfig = {
  engine: {
    world: {
      dimensions: { width: 400, height: 400 },
      wrapEdges: true,
    },
    timing: {
      deltaTime: 8, // Faster ticks
      targetStepsPerSecond: 120,
      maxStepsPerFrame: 10,
      useFixedTimestep: true,
      timeScale: 2.0,
    },
  },
  agents: {
    initialPopulation: 25,
    maxPopulation: 80,
    minPopulation: 8,
    autoRespawn: true,
    networkLayers: [7, 12, 3],
    agentConfig: {
      maxEnergy: 80,
      maxSpeed: 3,
      rotationSpeed: Math.PI / 3,
      sensorRange: 80,
      energyCostPerTick: 0.2,
      energyCostMove: 0.4,
      energyCostRotate: 0.1,
      energyCostReproduce: 20,
      reproductionThreshold: 45,
      matureAge: 30, // Very fast maturation
    },
  },
  food: {
    initialCount: 50,
    maxCount: 120,
    spawnRate: 0.25,
    clusteringFactor: 0.3,
    foodConfig: {
      energyValue: 20,
      respawnDelay: 40,
      decayRate: 0.03,
    },
  },
  interaction: {
    eatRadius: 12,
    mateRadius: 15,
    collisionRadius: 5,
  },
  sensory: {
    visionRange: 70,
  },
  statistics: {
    historyLength: 2000,
    snapshotInterval: 20,
  },
};

/**
 * All available presets
 */
export const PRESETS = {
  test: PRESET_TEST,
  small: PRESET_SMALL,
  medium: PRESET_MEDIUM,
  large: PRESET_LARGE,
  survival: PRESET_SURVIVAL,
  abundant: PRESET_ABUNDANT,
  fastEvolution: PRESET_FAST_EVOLUTION,
} as const;

export type PresetName = keyof typeof PRESETS;

/**
 * Get a preset by name
 */
export function getPreset(name: PresetName): SimulationConfig {
  return PRESETS[name];
}

/**
 * List all available preset names
 */
export function listPresets(): PresetName[] {
  return Object.keys(PRESETS) as PresetName[];
}

/**
 * Merge a preset with custom overrides
 */
export function customizePreset(
  name: PresetName,
  overrides: Partial<SimulationConfig>
): SimulationConfig {
  const base = PRESETS[name];
  return {
    engine: { ...base.engine, ...overrides.engine },
    agents: { ...base.agents, ...overrides.agents },
    food: { ...base.food, ...overrides.food },
    interaction: { ...base.interaction, ...overrides.interaction },
    sensory: { ...base.sensory, ...overrides.sensory },
    statistics: { ...base.statistics, ...overrides.statistics },
  };
}

/**
 * Preset descriptions
 */
const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  test: 'Minimal simulation for testing and debugging',
  small: 'Compact ecosystem for learning and demos',
  medium: 'Balanced simulation for general use',
  large: 'Large-scale ecosystem for research',
  survival: 'Scarce resources, high competition',
  abundant: 'Plentiful resources, focus on breeding',
  fastEvolution: 'Accelerated time for quick evolution',
};

/**
 * Get description for a preset
 */
export function getPresetDescription(name: PresetName): string {
  return PRESET_DESCRIPTIONS[name];
}
