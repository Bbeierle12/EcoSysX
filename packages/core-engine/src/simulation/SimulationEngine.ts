/**
 * SimulationEngine.ts - Main simulation orchestrator
 *
 * Coordinates all simulation systems: agents, food, world, and interactions.
 */

import {
  EngineConfig,
  SimulationState,
  createEngineConfig,
} from '../engine/EngineConfig';
import { World } from '../world/World';
import { SensorySystem, SensorConfig } from '../sensory/SensorySystem';
import { SensoryInput } from '../neural/Brain';
import { Agent } from '../agents/Agent';
import { AgentManager, AgentManagerConfig } from './AgentManager';
import { FoodManager, FoodManagerConfig, Food } from './Food';
import { InteractionSystem, InteractionConfig } from './InteractionSystem';
import { Statistics, StatisticsConfig } from './Statistics';
import { LineageRegistry } from '../lineage/Lineage';

export interface SimulationConfig {
  engine: Partial<EngineConfig>;
  agents: Partial<AgentManagerConfig>;
  food: Partial<FoodManagerConfig>;
  interaction: Partial<InteractionConfig>;
  sensory: Partial<SensorConfig>;
  statistics: Partial<StatisticsConfig>;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  engine: {},
  agents: {},
  food: {},
  interaction: {},
  sensory: {},
  statistics: {},
};

export interface SimulationSnapshot {
  tick: number;
  timestamp: number;
  state: SimulationState;
  agents: ReturnType<Agent['toJSON']>[];
  food: ReturnType<Food['toJSON']>[];
}

export interface SimulationCallbacks {
  onTick?: (tick: number, stats: ReturnType<Statistics['getSummary']>) => void;
  onStateChange?: (oldState: SimulationState, newState: SimulationState) => void;
  onAgentSpawn?: (agent: Agent) => void;
  onAgentDeath?: (agent: Agent) => void;
  onAgentReproduce?: (parent: Agent, offspring: Agent) => void;
}

export class SimulationEngine {
  readonly id: string;

  private config: EngineConfig;
  private state: SimulationState = SimulationState.IDLE;
  private currentTick: number = 0;
  private simulationTime: number = 0;

  // Core systems
  private world: World;
  private sensorySystem: SensorySystem;
  private agentManager: AgentManager;
  private foodManager: FoodManager;
  private interactionSystem: InteractionSystem;
  private statistics: Statistics;
  private lineageRegistry: LineageRegistry;

  // Timing
  private lastUpdateTime: number = 0;
  private accumulator: number = 0;
  private animationFrameId?: number;
  private timeoutId?: ReturnType<typeof setTimeout>;

  // Callbacks
  private callbacks: SimulationCallbacks = {};

  constructor(config: Partial<SimulationConfig> = {}) {
    const fullConfig = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    this.config = createEngineConfig(fullConfig.engine);
    this.id = this.config.id ?? `sim_${Date.now()}`;

    const { width, height } = this.config.world.dimensions;

    // Initialize core systems
    this.world = new World(this.config.world);
    this.sensorySystem = new SensorySystem(fullConfig.sensory);
    this.lineageRegistry = new LineageRegistry();

    this.agentManager = new AgentManager(
      width,
      height,
      fullConfig.agents,
      this.lineageRegistry
    );

    this.foodManager = new FoodManager(width, height, fullConfig.food);

    this.interactionSystem = new InteractionSystem(
      width,
      height,
      fullConfig.interaction
    );

    this.statistics = new Statistics(fullConfig.statistics);

    // Wire up callbacks
    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.agentManager.onAgentDeath = (agent) => {
      this.statistics.recordDeath();
      this.callbacks.onAgentDeath?.(agent);
    };

    this.agentManager.onAgentSpawn = (agent) => {
      this.callbacks.onAgentSpawn?.(agent);
    };

    this.agentManager.onAgentReproduce = (parent, offspring) => {
      this.statistics.recordBirth();
      this.callbacks.onAgentReproduce?.(parent, offspring);
    };
  }

  setCallbacks(callbacks: SimulationCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  initialize(): void {
    if (this.state !== SimulationState.IDLE) {
      this.reset();
    }

    this.agentManager.initialize();
    this.foodManager.initialize();
    this.statistics.initialize();

    this.currentTick = 0;
    this.simulationTime = 0;
    this.accumulator = 0;

    this.setState(SimulationState.PAUSED);
  }

  start(): void {
    if (this.state === SimulationState.IDLE) {
      this.initialize();
    }

    if (this.state !== SimulationState.PAUSED) return;

    this.setState(SimulationState.RUNNING);
    this.lastUpdateTime = performance.now();

    this.scheduleUpdate();
  }

  pause(): void {
    if (this.state !== SimulationState.RUNNING) return;

    this.setState(SimulationState.PAUSED);
    this.cancelUpdate();
  }

  resume(): void {
    if (this.state !== SimulationState.PAUSED) return;

    this.setState(SimulationState.RUNNING);
    this.lastUpdateTime = performance.now();

    this.scheduleUpdate();
  }

  stop(): void {
    if (this.state === SimulationState.IDLE) return;

    this.cancelUpdate();
    this.setState(SimulationState.IDLE);
  }

  reset(): void {
    this.stop();
    this.currentTick = 0;
    this.simulationTime = 0;
    this.accumulator = 0;
    this.agentManager.clear();
    this.foodManager.clear();
    this.statistics.clear();
  }

  step(count: number = 1): void {
    if (this.state === SimulationState.IDLE) {
      this.initialize();
    }

    const wasRunning = this.state === SimulationState.RUNNING;
    if (wasRunning) {
      this.pause();
    }

    this.setState(SimulationState.STEPPING);

    for (let i = 0; i < count; i++) {
      this.tick();
    }

    this.setState(SimulationState.PAUSED);

    if (wasRunning) {
      this.resume();
    }
  }

  private scheduleUpdate(): void {
    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(() => this.update());
    } else {
      // Node.js environment
      this.timeoutId = setTimeout(() => this.update(), this.config.timing.deltaTime);
    }
  }

  private cancelUpdate(): void {
    if (this.animationFrameId !== undefined) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = undefined;
    }
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  private update(): void {
    if (this.state !== SimulationState.RUNNING) return;

    const now = performance.now();
    const frameTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    if (this.config.timing.useFixedTimestep) {
      this.accumulator += frameTime * this.config.timing.timeScale;
      const dt = this.config.timing.deltaTime;

      let steps = 0;
      while (this.accumulator >= dt && steps < this.config.timing.maxStepsPerFrame) {
        this.tick();
        this.accumulator -= dt;
        steps++;
      }
    } else {
      this.tick();
    }

    this.scheduleUpdate();
  }

  private tick(): void {
    this.statistics.beginTick(this.currentTick);

    // 1. Update food
    this.foodManager.update(this.currentTick);

    // 2. Gather sensory input and process agent decisions
    const agents = this.agentManager.getAliveAgents();
    const allActions: Map<string, ReturnType<Agent['update']>> = new Map();

    for (const agent of agents) {
      const sensoryInput = this.gatherSensoryInput(agent);
      const actions = agent.update(sensoryInput, this.config.timing.deltaTime);
      allActions.set(agent.id, actions);
    }

    // 3. Process actions and interactions
    for (const agent of agents) {
      const actions = allActions.get(agent.id);
      if (actions && agent.alive()) {
        const results = this.interactionSystem.processActions(
          agent,
          actions,
          this.agentManager,
          this.foodManager,
          this.currentTick
        );

        // Track food consumption
        for (const result of results) {
          if (result.type === 'eat' && result.success) {
            this.statistics.recordFoodConsumed();
          }
        }
      }
    }

    // 4. Update agent manager (handle deaths, respawns)
    this.agentManager.update(this.currentTick);

    // 5. Update statistics
    this.statistics.endTick(
      this.agentManager.getAllAgents(),
      this.foodManager.getAllFood()
    );

    // 6. Increment tick
    this.currentTick++;
    this.simulationTime += this.config.timing.deltaTime;

    this.callbacks.onTick?.(this.currentTick, this.statistics.getSummary());
  }

  private gatherSensoryInput(agent: Agent): SensoryInput {
    // Create a world-like interface for the sensory system
    const worldLike = {
      getAgents: () => this.agentManager.getAllAgents().map(a => ({
        id: a.id,
        position: a.position,
        rotation: a.rotation,
        energy: a.energy,
        isAlive: a.alive(),
      })),
      getFood: () => this.foodManager.getAllFood().map(f => ({
        id: f.id,
        position: f.position,
        isConsumed: f.isConsumed,
      })),
    };

    return this.sensorySystem.gather(
      {
        id: agent.id,
        position: agent.position,
        rotation: agent.rotation,
        energy: agent.energy,
        isAlive: agent.alive(),
      },
      worldLike
    );
  }

  private setState(newState: SimulationState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    this.callbacks.onStateChange?.(oldState, newState);
  }

  // Getters
  getState(): SimulationState {
    return this.state;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  getSimulationTime(): number {
    return this.simulationTime;
  }

  getAgentManager(): AgentManager {
    return this.agentManager;
  }

  getFoodManager(): FoodManager {
    return this.foodManager;
  }

  getStatistics(): Statistics {
    return this.statistics;
  }

  getLineageRegistry(): LineageRegistry {
    return this.lineageRegistry;
  }

  getWorld(): World {
    return this.world;
  }

  getConfig(): EngineConfig {
    return { ...this.config };
  }

  // Snapshot
  createSnapshot(): SimulationSnapshot {
    return {
      tick: this.currentTick,
      timestamp: Date.now(),
      state: this.state,
      agents: this.agentManager.getAllAgents().map(a => a.toJSON()),
      food: this.foodManager.getAllFood().map(f => f.toJSON()),
    };
  }

  // Time control
  setTimeScale(scale: number): void {
    if (scale < 0.1) scale = 0.1;
    if (scale > 10) scale = 10;
    this.config.timing.timeScale = scale;
  }

  getTimeScale(): number {
    return this.config.timing.timeScale;
  }

  /**
   * Restore simulation state from saved data (for loading saves)
   */
  restoreState(state: { tick: number; simulationTime: number }): void {
    this.currentTick = state.tick;
    this.simulationTime = state.simulationTime;
  }

  /**
   * Prepare for restore by clearing managers
   */
  prepareForRestore(): void {
    this.agentManager.clearForRestore();
    this.foodManager.clearForRestore();
    this.currentTick = 0;
    this.simulationTime = 0;
  }

  // Cleanup
  destroy(): void {
    this.stop();
  }
}

// Factory function
export function createSimulation(config?: Partial<SimulationConfig>): SimulationEngine {
  return new SimulationEngine(config);
}
