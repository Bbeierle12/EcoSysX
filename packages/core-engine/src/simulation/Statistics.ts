/**
 * Statistics.ts - Simulation analytics and metrics
 *
 * Tracks and aggregates simulation statistics over time.
 */

import { Agent } from '../agents/Agent';
import { Food } from './Food';

export interface PopulationStats {
  count: number;
  averageEnergy: number;
  averageAge: number;
  averageGeneration: number;
  maxGeneration: number;
  births: number;
  deaths: number;
  speciesCount: number;
}

export interface FoodStats {
  count: number;
  activeCount: number;
  totalEnergy: number;
  consumed: number;
  spawned: number;
}

export interface PerformanceStats {
  ticksPerSecond: number;
  averageTickDuration: number;
  peakTickDuration: number;
  memoryUsage?: number;
}

export interface TickSnapshot {
  tick: number;
  timestamp: number;
  population: PopulationStats;
  food: FoodStats;
  performance: PerformanceStats;
}

export interface StatisticsConfig {
  historyLength: number; // Number of snapshots to keep
  snapshotInterval: number; // Ticks between snapshots
  trackSpecies: boolean;
  trackLineages: boolean;
}

export const DEFAULT_STATISTICS_CONFIG: StatisticsConfig = {
  historyLength: 1000,
  snapshotInterval: 10,
  trackSpecies: true,
  trackLineages: false,
};

export class Statistics {
  private config: StatisticsConfig;
  private history: TickSnapshot[] = [];
  private currentTick: number = 0;
  private startTime: number = 0;
  private lastTickTime: number = 0;
  private tickDurations: number[] = [];
  private maxTickDurations: number = 100;

  // Cumulative counters
  private totalBirths: number = 0;
  private totalDeaths: number = 0;
  private totalFoodConsumed: number = 0;
  private totalFoodSpawned: number = 0;

  // Per-tick counters (reset each tick)
  private tickBirths: number = 0;
  private tickDeaths: number = 0;
  private tickFoodConsumed: number = 0;
  private tickFoodSpawned: number = 0;

  constructor(config?: Partial<StatisticsConfig>) {
    this.config = { ...DEFAULT_STATISTICS_CONFIG, ...config };
  }

  initialize(): void {
    this.history = [];
    this.currentTick = 0;
    this.startTime = Date.now();
    this.lastTickTime = this.startTime;
    this.tickDurations = [];
    this.totalBirths = 0;
    this.totalDeaths = 0;
    this.totalFoodConsumed = 0;
    this.totalFoodSpawned = 0;
    this.resetTickCounters();
  }

  private resetTickCounters(): void {
    this.tickBirths = 0;
    this.tickDeaths = 0;
    this.tickFoodConsumed = 0;
    this.tickFoodSpawned = 0;
  }

  recordBirth(): void {
    this.tickBirths++;
    this.totalBirths++;
  }

  recordDeath(): void {
    this.tickDeaths++;
    this.totalDeaths++;
  }

  recordFoodConsumed(): void {
    this.tickFoodConsumed++;
    this.totalFoodConsumed++;
  }

  recordFoodSpawned(): void {
    this.tickFoodSpawned++;
    this.totalFoodSpawned++;
  }

  beginTick(tick: number): void {
    this.currentTick = tick;
    this.lastTickTime = Date.now();
    this.resetTickCounters();
  }

  endTick(agents: Agent[], foods: Food[]): void {
    const now = Date.now();
    const tickDuration = now - this.lastTickTime;

    // Track tick duration
    this.tickDurations.push(tickDuration);
    if (this.tickDurations.length > this.maxTickDurations) {
      this.tickDurations.shift();
    }

    // Take snapshot if needed
    if (this.currentTick % this.config.snapshotInterval === 0) {
      const snapshot = this.createSnapshot(agents, foods, tickDuration);
      this.history.push(snapshot);

      // Trim history
      while (this.history.length > this.config.historyLength) {
        this.history.shift();
      }
    }
  }

  private createSnapshot(agents: Agent[], foods: Food[], tickDuration: number): TickSnapshot {
    return {
      tick: this.currentTick,
      timestamp: Date.now(),
      population: this.calculatePopulationStats(agents),
      food: this.calculateFoodStats(foods),
      performance: this.calculatePerformanceStats(tickDuration),
    };
  }

  private calculatePopulationStats(agents: Agent[]): PopulationStats {
    const aliveAgents = agents.filter(a => a.alive());
    const count = aliveAgents.length;

    if (count === 0) {
      return {
        count: 0,
        averageEnergy: 0,
        averageAge: 0,
        averageGeneration: 0,
        maxGeneration: 0,
        births: this.tickBirths,
        deaths: this.tickDeaths,
        speciesCount: 0,
      };
    }

    let totalEnergy = 0;
    let totalAge = 0;
    let totalGeneration = 0;
    let maxGeneration = 0;
    const species = new Set<string>();

    for (const agent of aliveAgents) {
      totalEnergy += agent.energy;
      totalAge += agent.age;
      totalGeneration += agent.generation;
      if (agent.generation > maxGeneration) maxGeneration = agent.generation;
      species.add(agent.speciesId);
    }

    return {
      count,
      averageEnergy: totalEnergy / count,
      averageAge: totalAge / count,
      averageGeneration: totalGeneration / count,
      maxGeneration,
      births: this.tickBirths,
      deaths: this.tickDeaths,
      speciesCount: species.size,
    };
  }

  private calculateFoodStats(foods: Food[]): FoodStats {
    let activeCount = 0;
    let totalEnergy = 0;

    for (const food of foods) {
      if (!food.isConsumed) {
        activeCount++;
        totalEnergy += food.energy;
      }
    }

    return {
      count: foods.length,
      activeCount,
      totalEnergy,
      consumed: this.tickFoodConsumed,
      spawned: this.tickFoodSpawned,
    };
  }

  private calculatePerformanceStats(_currentTickDuration: number): PerformanceStats {
    const avgDuration = this.tickDurations.length > 0
      ? this.tickDurations.reduce((a, b) => a + b, 0) / this.tickDurations.length
      : 0;

    const peakDuration = Math.max(...this.tickDurations, 0);
    const ticksPerSecond = avgDuration > 0 ? 1000 / avgDuration : 0;

    return {
      ticksPerSecond,
      averageTickDuration: avgDuration,
      peakTickDuration: peakDuration,
    };
  }

  getLatestSnapshot(): TickSnapshot | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getHistory(): TickSnapshot[] {
    return [...this.history];
  }

  getHistoryRange(startTick: number, endTick: number): TickSnapshot[] {
    return this.history.filter(s => s.tick >= startTick && s.tick <= endTick);
  }

  getSummary() {
    const latest = this.getLatestSnapshot();
    const runTime = Date.now() - this.startTime;

    return {
      currentTick: this.currentTick,
      runTimeMs: runTime,
      runTimeSeconds: runTime / 1000,
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
      totalFoodConsumed: this.totalFoodConsumed,
      totalFoodSpawned: this.totalFoodSpawned,
      currentPopulation: latest?.population.count ?? 0,
      currentFoodCount: latest?.food.activeCount ?? 0,
      averageTicksPerSecond: latest?.performance.ticksPerSecond ?? 0,
      maxGeneration: latest?.population.maxGeneration ?? 0,
    };
  }

  getPopulationHistory(): { tick: number; count: number }[] {
    return this.history.map(s => ({ tick: s.tick, count: s.population.count }));
  }

  getEnergyHistory(): { tick: number; average: number }[] {
    return this.history.map(s => ({ tick: s.tick, average: s.population.averageEnergy }));
  }

  getGenerationHistory(): { tick: number; max: number; average: number }[] {
    return this.history.map(s => ({
      tick: s.tick,
      max: s.population.maxGeneration,
      average: s.population.averageGeneration,
    }));
  }

  getFoodHistory(): { tick: number; count: number; totalEnergy: number }[] {
    return this.history.map(s => ({
      tick: s.tick,
      count: s.food.activeCount,
      totalEnergy: s.food.totalEnergy,
    }));
  }

  getConfig(): StatisticsConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<StatisticsConfig>): void {
    Object.assign(this.config, config);
  }

  exportData(): object {
    return {
      summary: this.getSummary(),
      history: this.history,
      config: this.config,
    };
  }

  clear(): void {
    this.history = [];
    this.resetTickCounters();
  }
}
