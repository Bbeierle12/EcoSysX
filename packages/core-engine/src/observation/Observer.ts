/**
 * Observer.ts - Read-only observation layer for simulations
 *
 * The Observer provides a clean interface for visualization code to
 * read simulation state without any ability to mutate it.
 *
 * Principle: The simulation is the truth; observation is just one way of witnessing it.
 */

import { SimulationEngine } from '../simulation/SimulationEngine';
import { SimulationState } from '../engine/EngineConfig';

/**
 * Read-only view of an agent
 */
export interface AgentView {
  readonly id: string;
  readonly speciesId: string;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly age: number;
  readonly generation: number;
  readonly lineageId: string;
  readonly isAlive: boolean;
}

/**
 * Read-only view of a food item
 */
export interface FoodView {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly isConsumed: boolean;
}

/**
 * Read-only view of the world
 */
export interface WorldView {
  readonly width: number;
  readonly height: number;
  readonly wrapEdges: boolean;
}

/**
 * Read-only statistics snapshot
 */
export interface StatsView {
  readonly currentTick: number;
  readonly population: number;
  readonly maxPopulation: number;
  readonly foodCount: number;
  readonly maxFood: number;
  readonly totalBirths: number;
  readonly totalDeaths: number;
  readonly totalFoodConsumed: number;
  readonly averageEnergy: number;
  readonly maxGeneration: number;
  readonly ticksPerSecond: number;
  readonly runTimeSeconds: number;
}

/**
 * Complete simulation view at a point in time
 */
export interface SimulationView {
  readonly tick: number;
  readonly state: SimulationState;
  readonly world: WorldView;
  readonly agents: ReadonlyArray<AgentView>;
  readonly food: ReadonlyArray<FoodView>;
  readonly stats: StatsView;
}

/**
 * Observer callback types
 */
export interface ObserverCallbacks {
  onFrame?: (view: SimulationView) => void;
  onAgentSpawn?: (agent: AgentView) => void;
  onAgentDeath?: (agent: AgentView) => void;
  onStateChange?: (oldState: SimulationState, newState: SimulationState) => void;
}

/**
 * Observer configuration
 */
export interface ObserverConfig {
  /** Minimum milliseconds between frame callbacks */
  frameInterval: number;
  /** Whether to track agent events */
  trackAgentEvents: boolean;
  /** Whether to track state changes */
  trackStateChanges: boolean;
}

export const DEFAULT_OBSERVER_CONFIG: ObserverConfig = {
  frameInterval: 16, // ~60fps
  trackAgentEvents: true,
  trackStateChanges: true,
};

/**
 * Observer class - provides read-only access to simulation state
 *
 * Use this class in all visualization/rendering code to ensure
 * clean separation between simulation and observation.
 */
export class Observer {
  private simulation: SimulationEngine;
  private config: ObserverConfig;
  private callbacks: ObserverCallbacks = {};
  private lastFrameTime: number = 0;
  private isObserving: boolean = false;
  private animationFrameId?: number;
  private timeoutId?: ReturnType<typeof setTimeout>;

  constructor(simulation: SimulationEngine, config?: Partial<ObserverConfig>) {
    this.simulation = simulation;
    this.config = { ...DEFAULT_OBSERVER_CONFIG, ...config };
  }

  /**
   * Set observation callbacks
   */
  setCallbacks(callbacks: ObserverCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };

    // Wire up simulation callbacks if tracking events
    if (this.config.trackAgentEvents) {
      this.simulation.setCallbacks({
        onAgentSpawn: (agent) => {
          this.callbacks.onAgentSpawn?.(this.agentToView(agent));
        },
        onAgentDeath: (agent) => {
          this.callbacks.onAgentDeath?.(this.agentToView(agent));
        },
      });
    }

    if (this.config.trackStateChanges) {
      this.simulation.setCallbacks({
        onStateChange: (oldState, newState) => {
          this.callbacks.onStateChange?.(oldState, newState);
        },
      });
    }
  }

  /**
   * Start observing the simulation
   */
  startObserving(): void {
    if (this.isObserving) return;
    this.isObserving = true;
    this.lastFrameTime = performance.now();
    this.scheduleFrame();
  }

  /**
   * Stop observing the simulation
   */
  stopObserving(): void {
    this.isObserving = false;
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

  private scheduleFrame(): void {
    if (!this.isObserving) return;

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(() => this.frame());
    } else {
      this.timeoutId = setTimeout(() => this.frame(), this.config.frameInterval);
    }
  }

  private frame(): void {
    if (!this.isObserving) return;

    const now = performance.now();
    if (now - this.lastFrameTime >= this.config.frameInterval) {
      this.lastFrameTime = now;
      this.callbacks.onFrame?.(this.getView());
    }

    this.scheduleFrame();
  }

  /**
   * Get a complete read-only view of the current simulation state
   */
  getView(): SimulationView {
    const agentManager = this.simulation.getAgentManager();
    const foodManager = this.simulation.getFoodManager();
    const config = this.simulation.getConfig();

    return Object.freeze({
      tick: this.simulation.getCurrentTick(),
      state: this.simulation.getState(),
      world: Object.freeze({
        width: config.world.dimensions.width,
        height: config.world.dimensions.height,
        wrapEdges: config.world.wrapEdges ?? true,
      }),
      agents: Object.freeze(
        agentManager.getAllAgents().map((a) => this.agentToView(a))
      ),
      food: Object.freeze(
        foodManager.getAllFood().map((f) => this.foodToView(f))
      ),
      stats: this.getStats(),
    });
  }

  /**
   * Get just the agents view (for rendering optimization)
   */
  getAgents(): ReadonlyArray<AgentView> {
    return Object.freeze(
      this.simulation.getAgentManager().getAllAgents().map((a) => this.agentToView(a))
    );
  }

  /**
   * Get just the food view (for rendering optimization)
   */
  getFood(): ReadonlyArray<FoodView> {
    return Object.freeze(
      this.simulation.getFoodManager().getAllFood().map((f) => this.foodToView(f))
    );
  }

  /**
   * Get statistics view
   */
  getStats(): StatsView {
    const statistics = this.simulation.getStatistics();
    const summary = statistics.getSummary();
    const agentManager = this.simulation.getAgentManager();
    const agentStats = agentManager.getStats();
    const foodManager = this.simulation.getFoodManager();
    const foodStats = foodManager.getStats();

    // Calculate average energy
    const agents = agentManager.getAliveAgents();
    const avgEnergy =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.energy, 0) / agents.length
        : 0;

    return Object.freeze({
      currentTick: summary.currentTick,
      population: agentStats.alivePopulation,
      maxPopulation: agentManager.getConfig().maxPopulation,
      foodCount: foodStats.activeCount,
      maxFood: foodManager.getConfig().maxCount,
      totalBirths: summary.totalBirths,
      totalDeaths: summary.totalDeaths,
      totalFoodConsumed: summary.totalFoodConsumed,
      averageEnergy: Math.round(avgEnergy * 100) / 100,
      maxGeneration: agentStats.maxGenerationReached,
      ticksPerSecond: summary.averageTicksPerSecond,
      runTimeSeconds: summary.runTimeSeconds,
    });
  }

  /**
   * Get world view
   */
  getWorld(): WorldView {
    const config = this.simulation.getConfig();
    return Object.freeze({
      width: config.world.dimensions.width,
      height: config.world.dimensions.height,
      wrapEdges: config.world.wrapEdges ?? true,
    });
  }

  /**
   * Get current tick
   */
  getTick(): number {
    return this.simulation.getCurrentTick();
  }

  /**
   * Get current state
   */
  getState(): SimulationState {
    return this.simulation.getState();
  }

  /**
   * Check if simulation is running
   */
  isRunning(): boolean {
    return this.simulation.getState() === SimulationState.RUNNING;
  }

  private agentToView(agent: {
    id: string;
    speciesId: string;
    position: { x: number; y: number };
    rotation: number;
    energy: number;
    age: number;
    generation: number;
    lineageId: string;
    alive: () => boolean;
    getConfig: () => { maxEnergy: number };
  }): AgentView {
    return Object.freeze({
      id: agent.id,
      speciesId: agent.speciesId,
      x: agent.position.x,
      y: agent.position.y,
      rotation: agent.rotation,
      energy: agent.energy,
      maxEnergy: agent.getConfig().maxEnergy,
      age: agent.age,
      generation: agent.generation,
      lineageId: agent.lineageId,
      isAlive: agent.alive(),
    });
  }

  private foodToView(food: {
    id: string;
    x: number;
    y: number;
    energy: number;
    isConsumed: boolean;
    getConfig: () => { energyValue: number };
  }): FoodView {
    return Object.freeze({
      id: food.id,
      x: food.x,
      y: food.y,
      energy: food.energy,
      maxEnergy: food.getConfig().energyValue,
      isConsumed: food.isConsumed,
    });
  }

  /**
   * Clean up observer
   */
  destroy(): void {
    this.stopObserving();
  }
}

/**
 * Create an observer for a simulation
 */
export function createObserver(
  simulation: SimulationEngine,
  config?: Partial<ObserverConfig>
): Observer {
  return new Observer(simulation, config);
}
