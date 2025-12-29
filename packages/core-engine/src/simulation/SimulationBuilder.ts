/**
 * SimulationBuilder.ts - Fluent builder for creating simulations
 *
 * Provides a chainable API for configuring and creating simulations.
 */

import {
  SimulationEngine,
  SimulationConfig,
  SimulationCallbacks,
  DEFAULT_SIMULATION_CONFIG,
} from './SimulationEngine';
import { AgentManagerConfig } from './AgentManager';
import { PresetName, getPreset } from '../presets/SimulationPresets';

export class SimulationBuilder {
  private config: SimulationConfig;
  private callbacks: SimulationCallbacks = {};

  constructor() {
    this.config = JSON.parse(JSON.stringify(DEFAULT_SIMULATION_CONFIG));
  }

  /**
   * Start from a preset configuration
   */
  fromPreset(preset: PresetName): this {
    this.config = JSON.parse(JSON.stringify(getPreset(preset)));
    return this;
  }

  /**
   * Set world dimensions
   */
  withWorldSize(width: number, height: number): this {
    if (!this.config.engine) this.config.engine = {};
    if (!this.config.engine.world) this.config.engine.world = { dimensions: { width, height } };
    this.config.engine.world.dimensions = { width, height };
    return this;
  }

  /**
   * Enable/disable edge wrapping
   */
  withEdgeWrapping(enabled: boolean): this {
    if (!this.config.engine) this.config.engine = {};
    if (!this.config.engine.world) this.config.engine.world = { dimensions: { width: 100, height: 100 } };
    this.config.engine.world.wrapEdges = enabled;
    return this;
  }

  /**
   * Set initial agent population
   */
  withInitialPopulation(count: number): this {
    if (!this.config.agents) this.config.agents = {};
    this.config.agents.initialPopulation = count;
    return this;
  }

  /**
   * Set population limits
   */
  withPopulationLimits(min: number, max: number): this {
    if (!this.config.agents) this.config.agents = {};
    this.config.agents.minPopulation = min;
    this.config.agents.maxPopulation = max;
    return this;
  }

  /**
   * Enable/disable auto respawn
   */
  withAutoRespawn(enabled: boolean): this {
    if (!this.config.agents) this.config.agents = {};
    this.config.agents.autoRespawn = enabled;
    return this;
  }

  /**
   * Set neural network architecture
   */
  withNetworkLayers(...layers: number[]): this {
    if (!this.config.agents) this.config.agents = {};
    this.config.agents.networkLayers = layers;
    return this;
  }

  /**
   * Configure agent parameters
   */
  withAgentConfig(agentConfig: Partial<AgentManagerConfig['agentConfig']>): this {
    if (!this.config.agents) this.config.agents = {};
    this.config.agents.agentConfig = {
      ...(this.config.agents.agentConfig || {}),
      ...agentConfig,
    } as AgentManagerConfig['agentConfig'];
    return this;
  }

  /**
   * Set initial food count
   */
  withInitialFood(count: number): this {
    if (!this.config.food) this.config.food = {};
    this.config.food.initialCount = count;
    return this;
  }

  /**
   * Set food limits and spawn rate
   */
  withFoodConfig(maxCount: number, spawnRate: number): this {
    if (!this.config.food) this.config.food = {};
    this.config.food.maxCount = maxCount;
    this.config.food.spawnRate = spawnRate;
    return this;
  }

  /**
   * Set food clustering
   */
  withFoodClustering(factor: number): this {
    if (!this.config.food) this.config.food = {};
    this.config.food.clusteringFactor = factor;
    return this;
  }

  /**
   * Configure individual food properties
   */
  withFoodProperties(energyValue: number, respawnDelay: number, decayRate?: number): this {
    if (!this.config.food) this.config.food = {};
    this.config.food.foodConfig = {
      ...(this.config.food.foodConfig || {}),
      energyValue,
      respawnDelay,
      decayRate: decayRate ?? 0,
    };
    return this;
  }

  /**
   * Set interaction radii
   */
  withInteractionRadii(eat: number, mate: number, collision?: number): this {
    if (!this.config.interaction) this.config.interaction = {};
    this.config.interaction.eatRadius = eat;
    this.config.interaction.mateRadius = mate;
    if (collision !== undefined) {
      this.config.interaction.collisionRadius = collision;
    }
    return this;
  }

  /**
   * Enable/disable interactions
   */
  withInteractions(feeding: boolean, mating: boolean, collisions: boolean): this {
    if (!this.config.interaction) this.config.interaction = {};
    this.config.interaction.enableFeeding = feeding;
    this.config.interaction.enableMating = mating;
    this.config.interaction.enableCollisions = collisions;
    return this;
  }

  /**
   * Set sensor range
   */
  withSensorRange(range: number): this {
    if (!this.config.sensory) this.config.sensory = {};
    this.config.sensory.visionRange = range;
    return this;
  }

  /**
   * Configure sensory weights
   */
  withSensoryWeights(foodWeight: number, agentWeight: number): this {
    if (!this.config.sensory) this.config.sensory = {};
    this.config.sensory.foodWeight = foodWeight;
    this.config.sensory.agentWeight = agentWeight;
    return this;
  }

  /**
   * Set time scale
   */
  withTimeScale(scale: number): this {
    if (!this.config.engine) this.config.engine = {};
    if (!this.config.engine.timing) {
      this.config.engine.timing = {
        deltaTime: 16.667,
        targetStepsPerSecond: 60,
        maxStepsPerFrame: 4,
        useFixedTimestep: true,
        timeScale: scale,
      };
    } else {
      this.config.engine.timing.timeScale = scale;
    }
    return this;
  }

  /**
   * Set target TPS
   */
  withTargetTPS(tps: number): this {
    if (!this.config.engine) this.config.engine = {};
    if (!this.config.engine.timing) {
      this.config.engine.timing = {
        deltaTime: 1000 / tps,
        targetStepsPerSecond: tps,
        maxStepsPerFrame: 4,
        useFixedTimestep: true,
        timeScale: 1.0,
      };
    } else {
      this.config.engine.timing.targetStepsPerSecond = tps;
      this.config.engine.timing.deltaTime = 1000 / tps;
    }
    return this;
  }

  /**
   * Set statistics history
   */
  withStatisticsHistory(length: number, interval: number): this {
    if (!this.config.statistics) this.config.statistics = {};
    this.config.statistics.historyLength = length;
    this.config.statistics.snapshotInterval = interval;
    return this;
  }

  /**
   * Add tick callback
   */
  onTick(callback: SimulationCallbacks['onTick']): this {
    this.callbacks.onTick = callback;
    return this;
  }

  /**
   * Add state change callback
   */
  onStateChange(callback: SimulationCallbacks['onStateChange']): this {
    this.callbacks.onStateChange = callback;
    return this;
  }

  /**
   * Add agent spawn callback
   */
  onAgentSpawn(callback: SimulationCallbacks['onAgentSpawn']): this {
    this.callbacks.onAgentSpawn = callback;
    return this;
  }

  /**
   * Add agent death callback
   */
  onAgentDeath(callback: SimulationCallbacks['onAgentDeath']): this {
    this.callbacks.onAgentDeath = callback;
    return this;
  }

  /**
   * Add reproduction callback
   */
  onAgentReproduce(callback: SimulationCallbacks['onAgentReproduce']): this {
    this.callbacks.onAgentReproduce = callback;
    return this;
  }

  /**
   * Get the current configuration
   */
  getConfig(): SimulationConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Build the simulation
   */
  build(): SimulationEngine {
    const simulation = new SimulationEngine(this.config);
    simulation.setCallbacks(this.callbacks);
    return simulation;
  }

  /**
   * Build and initialize the simulation
   */
  buildAndInitialize(): SimulationEngine {
    const simulation = this.build();
    simulation.initialize();
    return simulation;
  }

  /**
   * Build, initialize, and start the simulation
   */
  buildAndStart(): SimulationEngine {
    const simulation = this.buildAndInitialize();
    simulation.start();
    return simulation;
  }
}

/**
 * Create a new simulation builder
 */
export function createSimulationBuilder(): SimulationBuilder {
  return new SimulationBuilder();
}

/**
 * Quick-start a simulation from a preset
 */
export function quickStart(preset: PresetName = 'medium'): SimulationEngine {
  return new SimulationBuilder()
    .fromPreset(preset)
    .buildAndStart();
}
