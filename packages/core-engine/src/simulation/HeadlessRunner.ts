/**
 * HeadlessRunner.ts - Run simulations without any rendering context
 *
 * Provides a way to run simulations purely for computation:
 * - Batch processing
 * - Testing
 * - Server-side execution
 * - Benchmarking
 */

import { SimulationEngine, SimulationConfig, SimulationSnapshot } from './SimulationEngine';
import { Statistics } from './Statistics';

export interface HeadlessConfig {
  /** Simulation configuration */
  simulation: Partial<SimulationConfig>;
  /** Random seed for deterministic execution */
  seed?: number;
  /** Maximum number of ticks to run (0 = unlimited) */
  maxTicks: number;
  /** Stop when population reaches zero */
  stopOnExtinction: boolean;
  /** Snapshot interval (0 = no snapshots) */
  snapshotInterval: number;
  /** Progress callback interval in ticks (0 = no callbacks) */
  progressInterval: number;
}

export const DEFAULT_HEADLESS_CONFIG: HeadlessConfig = {
  simulation: {},
  seed: undefined,
  maxTicks: 10000,
  stopOnExtinction: true,
  snapshotInterval: 0,
  progressInterval: 100,
};

export interface HeadlessProgress {
  currentTick: number;
  maxTicks: number;
  percentComplete: number;
  population: number;
  elapsedMs: number;
  ticksPerSecond: number;
}

export interface HeadlessResult {
  /** Final simulation state */
  simulation: SimulationEngine;
  /** Total ticks executed */
  ticksCompleted: number;
  /** Wall-clock time in milliseconds */
  elapsedMs: number;
  /** Average ticks per second */
  averageTicksPerSecond: number;
  /** Reason for stopping */
  stopReason: 'max_ticks' | 'extinction' | 'manual' | 'error';
  /** Error if stopped due to error */
  error?: Error;
  /** Seed used (for reproduction) */
  seed: number;
  /** State hash at end (for determinism verification) */
  stateHash: string;
  /** Snapshots if configured */
  snapshots: SimulationSnapshot[];
  /** Final statistics */
  statistics: ReturnType<Statistics['getSummary']>;
}

/**
 * Run a simulation headlessly (no rendering)
 */
export async function runHeadless(
  config: Partial<HeadlessConfig> = {},
  onProgress?: (progress: HeadlessProgress) => void,
  shouldStop?: () => boolean
): Promise<HeadlessResult> {
  const fullConfig = { ...DEFAULT_HEADLESS_CONFIG, ...config };

  // Get seed for deterministic execution
  const seed = fullConfig.seed ?? Date.now();
  // Note: Future work will integrate seed into simulation initialization

  // Create simulation
  const simulation = new SimulationEngine(fullConfig.simulation);
  simulation.initialize();

  const snapshots: SimulationSnapshot[] = [];
  const startTime = performance.now();
  let lastProgressTime = startTime;
  let ticksCompleted = 0;
  let stopReason: HeadlessResult['stopReason'] = 'max_ticks';
  let error: Error | undefined;

  try {
    while (true) {
      // Check stop conditions
      if (shouldStop?.()) {
        stopReason = 'manual';
        break;
      }

      if (fullConfig.maxTicks > 0 && ticksCompleted >= fullConfig.maxTicks) {
        stopReason = 'max_ticks';
        break;
      }

      const aliveCount = simulation.getAgentManager().getAliveAgents().length;
      if (fullConfig.stopOnExtinction && aliveCount === 0 && ticksCompleted > 0) {
        stopReason = 'extinction';
        break;
      }

      // Execute tick
      simulation.step(1);
      ticksCompleted++;

      // Take snapshot if configured
      if (
        fullConfig.snapshotInterval > 0 &&
        ticksCompleted % fullConfig.snapshotInterval === 0
      ) {
        snapshots.push(simulation.createSnapshot());
      }

      // Progress callback
      if (
        onProgress &&
        fullConfig.progressInterval > 0 &&
        ticksCompleted % fullConfig.progressInterval === 0
      ) {
        const now = performance.now();
        const elapsedMs = now - startTime;
        const tps = ticksCompleted / (elapsedMs / 1000);

        onProgress({
          currentTick: ticksCompleted,
          maxTicks: fullConfig.maxTicks,
          percentComplete:
            fullConfig.maxTicks > 0
              ? (ticksCompleted / fullConfig.maxTicks) * 100
              : 0,
          population: aliveCount,
          elapsedMs,
          ticksPerSecond: tps,
        });

        lastProgressTime = now;

        // Yield to event loop occasionally for async operations
        if (now - lastProgressTime > 100) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }
  } catch (e) {
    stopReason = 'error';
    error = e instanceof Error ? e : new Error(String(e));
  }

  const endTime = performance.now();
  const elapsedMs = endTime - startTime;

  return {
    simulation,
    ticksCompleted,
    elapsedMs,
    averageTicksPerSecond: ticksCompleted / (elapsedMs / 1000),
    stopReason,
    error,
    seed,
    stateHash: computeStateHash(simulation),
    snapshots,
    statistics: simulation.getStatistics().getSummary(),
  };
}

/**
 * Run headless synchronously (blocking)
 */
export function runHeadlessSync(
  config: Partial<HeadlessConfig> = {},
  onProgress?: (progress: HeadlessProgress) => void
): HeadlessResult {
  const fullConfig = { ...DEFAULT_HEADLESS_CONFIG, ...config };

  const seed = fullConfig.seed ?? Date.now();
  const simulation = new SimulationEngine(fullConfig.simulation);
  simulation.initialize();

  const snapshots: SimulationSnapshot[] = [];
  const startTime = performance.now();
  let ticksCompleted = 0;
  let stopReason: HeadlessResult['stopReason'] = 'max_ticks';
  let error: Error | undefined;

  try {
    while (true) {
      if (fullConfig.maxTicks > 0 && ticksCompleted >= fullConfig.maxTicks) {
        stopReason = 'max_ticks';
        break;
      }

      const aliveCount = simulation.getAgentManager().getAliveAgents().length;
      if (fullConfig.stopOnExtinction && aliveCount === 0 && ticksCompleted > 0) {
        stopReason = 'extinction';
        break;
      }

      simulation.step(1);
      ticksCompleted++;

      if (
        fullConfig.snapshotInterval > 0 &&
        ticksCompleted % fullConfig.snapshotInterval === 0
      ) {
        snapshots.push(simulation.createSnapshot());
      }

      if (
        onProgress &&
        fullConfig.progressInterval > 0 &&
        ticksCompleted % fullConfig.progressInterval === 0
      ) {
        const now = performance.now();
        const elapsedMs = now - startTime;
        const tps = ticksCompleted / (elapsedMs / 1000);

        onProgress({
          currentTick: ticksCompleted,
          maxTicks: fullConfig.maxTicks,
          percentComplete:
            fullConfig.maxTicks > 0
              ? (ticksCompleted / fullConfig.maxTicks) * 100
              : 0,
          population: aliveCount,
          elapsedMs,
          ticksPerSecond: tps,
        });
      }
    }
  } catch (e) {
    stopReason = 'error';
    error = e instanceof Error ? e : new Error(String(e));
  }

  const endTime = performance.now();
  const elapsedMs = endTime - startTime;

  return {
    simulation,
    ticksCompleted,
    elapsedMs,
    averageTicksPerSecond: ticksCompleted / (elapsedMs / 1000),
    stopReason,
    error,
    seed,
    stateHash: computeStateHash(simulation),
    snapshots,
    statistics: simulation.getStatistics().getSummary(),
  };
}

/**
 * Compute a hash of the simulation state for determinism verification
 */
export function computeStateHash(simulation: SimulationEngine): string {
  const snapshot = simulation.createSnapshot();

  // Create a deterministic string representation
  const stateString = JSON.stringify({
    tick: snapshot.tick,
    agentCount: snapshot.agents.length,
    foodCount: snapshot.food.length,
    agents: snapshot.agents.map((a) => ({
      id: a.id,
      x: Math.round(a.position.x * 1000) / 1000,
      y: Math.round(a.position.y * 1000) / 1000,
      energy: Math.round(a.energy * 1000) / 1000,
      age: a.age,
    })),
    food: snapshot.food.map((f) => ({
      id: f.id,
      x: Math.round(f.x * 1000) / 1000,
      y: Math.round(f.y * 1000) / 1000,
    })),
  });

  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < stateString.length; i++) {
    hash = (hash * 33) ^ stateString.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Compare two headless results for determinism
 */
export function compareResults(a: HeadlessResult, b: HeadlessResult): {
  identical: boolean;
  differences: string[];
} {
  const differences: string[] = [];

  if (a.ticksCompleted !== b.ticksCompleted) {
    differences.push(
      `Tick count differs: ${a.ticksCompleted} vs ${b.ticksCompleted}`
    );
  }

  if (a.stateHash !== b.stateHash) {
    differences.push(`State hash differs: ${a.stateHash} vs ${b.stateHash}`);
  }

  if (a.stopReason !== b.stopReason) {
    differences.push(`Stop reason differs: ${a.stopReason} vs ${b.stopReason}`);
  }

  const statsA = a.statistics;
  const statsB = b.statistics;

  if (statsA.totalBirths !== statsB.totalBirths) {
    differences.push(
      `Total births differs: ${statsA.totalBirths} vs ${statsB.totalBirths}`
    );
  }

  if (statsA.totalDeaths !== statsB.totalDeaths) {
    differences.push(
      `Total deaths differs: ${statsA.totalDeaths} vs ${statsB.totalDeaths}`
    );
  }

  return {
    identical: differences.length === 0,
    differences,
  };
}

/**
 * Run a simulation multiple times and verify determinism
 */
export async function verifyDeterminism(
  config: Partial<HeadlessConfig>,
  runs: number = 2
): Promise<{
  deterministic: boolean;
  results: HeadlessResult[];
  differences: string[];
}> {
  const results: HeadlessResult[] = [];
  const allDifferences: string[] = [];

  // Ensure we use a fixed seed
  const seed = config.seed ?? 12345;
  const configWithSeed = { ...config, seed };

  for (let i = 0; i < runs; i++) {
    const result = await runHeadless(configWithSeed);
    results.push(result);
  }

  // Compare all results with first
  for (let i = 1; i < results.length; i++) {
    const comparison = compareResults(results[0], results[i]);
    if (!comparison.identical) {
      allDifferences.push(
        `Run 0 vs Run ${i}:`,
        ...comparison.differences.map((d) => `  ${d}`)
      );
    }
  }

  return {
    deterministic: allDifferences.length === 0,
    results,
    differences: allDifferences,
  };
}
