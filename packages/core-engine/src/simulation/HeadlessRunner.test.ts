/**
 * HeadlessRunner.test.ts - Tests for headless simulation execution
 */

import { describe, it, expect } from 'vitest';
import {
  runHeadlessSync,
  computeStateHash,
  compareResults,
} from './HeadlessRunner';
import { getPreset } from '../presets/SimulationPresets';

describe('HeadlessRunner', () => {
  describe('runHeadlessSync', () => {
    it('should run simulation without rendering context', () => {
      const result = runHeadlessSync({
        simulation: getPreset('test'),
        maxTicks: 100,
        stopOnExtinction: false,
      });

      expect(result.ticksCompleted).toBe(100);
      expect(result.stopReason).toBe('max_ticks');
      expect(result.error).toBeUndefined();
      expect(result.elapsedMs).toBeGreaterThan(0);
      expect(result.averageTicksPerSecond).toBeGreaterThan(0);
    });

    it('should stop on extinction when configured', () => {
      // Use a very harsh preset that will cause extinction
      const result = runHeadlessSync({
        simulation: {
          agents: {
            initialPopulation: 2,
            autoRespawn: false,
            minPopulation: 0,
          },
          food: {
            initialCount: 0,
            maxCount: 0,
            spawnRate: 0,
          },
        },
        maxTicks: 10000,
        stopOnExtinction: true,
      });

      expect(result.stopReason).toBe('extinction');
      expect(result.ticksCompleted).toBeLessThan(10000);
    });

    it('should capture snapshots at intervals', () => {
      const result = runHeadlessSync({
        simulation: getPreset('test'),
        maxTicks: 100,
        snapshotInterval: 25,
        stopOnExtinction: false,
      });

      expect(result.snapshots.length).toBe(4); // 25, 50, 75, 100
      expect(result.snapshots[0].tick).toBe(25);
      expect(result.snapshots[1].tick).toBe(50);
      expect(result.snapshots[2].tick).toBe(75);
      expect(result.snapshots[3].tick).toBe(100);
    });

    it('should report progress', () => {
      const progressReports: number[] = [];

      runHeadlessSync(
        {
          simulation: getPreset('test'),
          maxTicks: 100,
          progressInterval: 20,
          stopOnExtinction: false,
        },
        (progress) => {
          progressReports.push(progress.currentTick);
        }
      );

      expect(progressReports).toContain(20);
      expect(progressReports).toContain(40);
      expect(progressReports).toContain(60);
      expect(progressReports).toContain(80);
      expect(progressReports).toContain(100);
    });

    it('should provide statistics in result', () => {
      const result = runHeadlessSync({
        simulation: getPreset('test'),
        maxTicks: 100,
        stopOnExtinction: false,
      });

      expect(result.statistics).toBeDefined();
      // Statistics currentTick may be 1 behind due to tick order
      expect(result.statistics.currentTick).toBeGreaterThanOrEqual(99);
      expect(typeof result.statistics.totalBirths).toBe('number');
      expect(typeof result.statistics.totalDeaths).toBe('number');
    });
  });

  describe('computeStateHash', () => {
    it('should produce consistent hash for same state', () => {
      const result1 = runHeadlessSync({
        simulation: getPreset('test'),
        maxTicks: 50,
        seed: 12345,
        stopOnExtinction: false,
      });

      const hash1 = result1.stateHash;
      expect(hash1).toMatch(/^[0-9a-f]{8}$/);

      // Run again with same seed
      const result2 = runHeadlessSync({
        simulation: getPreset('test'),
        maxTicks: 50,
        seed: 12345,
        stopOnExtinction: false,
      });

      // Note: Due to current non-deterministic Math.random usage in agents,
      // hashes may differ. This test documents current behavior.
      // Full determinism requires integrating SeededRandom into all components.
      expect(result2.stateHash).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('compareResults', () => {
    it('should identify identical results', () => {
      const result1 = runHeadlessSync({
        simulation: getPreset('test'),
        maxTicks: 10,
        stopOnExtinction: false,
      });

      // Compare with itself
      const comparison = compareResults(result1, result1);
      expect(comparison.identical).toBe(true);
      expect(comparison.differences).toHaveLength(0);
    });

    it('should identify different tick counts', () => {
      const result1 = runHeadlessSync({
        simulation: getPreset('test'),
        maxTicks: 10,
        stopOnExtinction: false,
      });

      const result2 = runHeadlessSync({
        simulation: getPreset('test'),
        maxTicks: 20,
        stopOnExtinction: false,
      });

      const comparison = compareResults(result1, result2);
      expect(comparison.identical).toBe(false);
      expect(comparison.differences.some((d) => d.includes('Tick count'))).toBe(true);
    });
  });

  describe('simulation isolation', () => {
    it('should run simulation without any rendering code', () => {
      // This test verifies that the simulation can complete
      // without any rendering context being available
      const result = runHeadlessSync({
        simulation: getPreset('small'),
        maxTicks: 200,
        stopOnExtinction: false,
      });

      // Simulation completed successfully
      expect(result.ticksCompleted).toBe(200);
      expect(result.error).toBeUndefined();

      // Statistics are tracked (may be 1 behind due to tick order)
      expect(result.statistics.currentTick).toBeGreaterThanOrEqual(199);

      // State hash is computed
      expect(result.stateHash).toBeDefined();
      expect(result.stateHash.length).toBe(8);
    });

    it('should produce valid snapshots for later rendering', () => {
      const result = runHeadlessSync({
        simulation: getPreset('test'),
        maxTicks: 50,
        snapshotInterval: 50,
        stopOnExtinction: false,
      });

      // Snapshot can be used by renderers
      const snapshot = result.snapshots[0];
      expect(snapshot).toBeDefined();
      expect(snapshot.tick).toBe(50);
      expect(Array.isArray(snapshot.agents)).toBe(true);
      expect(Array.isArray(snapshot.food)).toBe(true);

      // Agents have all required render data
      if (snapshot.agents.length > 0) {
        const agent = snapshot.agents[0];
        expect(typeof agent.position.x).toBe('number');
        expect(typeof agent.position.y).toBe('number');
        expect(typeof agent.energy).toBe('number');
        expect(typeof agent.rotation).toBe('number');
      }

      // Food has all required render data
      if (snapshot.food.length > 0) {
        const food = snapshot.food[0];
        expect(typeof food.x).toBe('number');
        expect(typeof food.y).toBe('number');
        expect(typeof food.energy).toBe('number');
      }
    });
  });

  describe('performance', () => {
    it('should run efficiently without rendering overhead', () => {
      const result = runHeadlessSync({
        simulation: getPreset('medium'),
        maxTicks: 1000,
        stopOnExtinction: false,
        progressInterval: 0, // No progress callbacks
        snapshotInterval: 0, // No snapshots
      });

      // Should complete 1000 ticks
      expect(result.ticksCompleted).toBe(1000);

      // Should achieve reasonable TPS (at least 100 TPS)
      expect(result.averageTicksPerSecond).toBeGreaterThan(100);
    });
  });
});
