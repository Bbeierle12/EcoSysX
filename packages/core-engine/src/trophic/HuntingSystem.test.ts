/**
 * HuntingSystem.test.ts - Unit tests for predation mechanics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HuntingSystem, HuntingSystemConfig } from './HuntingSystem';
import { TrophicRoleTracker } from './TrophicRoleTracker';
import { TrophicAgent, EmergentRole } from './types';
import { SpatialHash } from '../spatial';

describe('HuntingSystem', () => {
  let huntingSystem: HuntingSystem;
  let trophicTracker: TrophicRoleTracker;
  let spatialHash: SpatialHash<TrophicAgent>;

  const createAgent = (
    id: string,
    speciesId: string,
    x: number,
    y: number,
    options: Partial<TrophicAgent> = {}
  ): TrophicAgent => ({
    id,
    speciesId,
    position: { x, y },
    energy: 50,
    isAlive: true,
    size: 1,
    speed: 1,
    strength: 1,
    ...options,
  });

  beforeEach(() => {
    trophicTracker = new TrophicRoleTracker();
    huntingSystem = new HuntingSystem(trophicTracker);
    spatialHash = new SpatialHash<TrophicAgent>({
      cellSize: 50,
      worldWidth: 500,
      worldHeight: 500,
      wrapEdges: false,
    });

    // Set up predator-prey relationship
    for (let i = 0; i < 10; i++) {
      trophicTracker.recordHuntInteraction({
        tick: i,
        predatorId: `pred_${i}`,
        predatorSpeciesId: 'carnivore',
        preyId: `herb_${i}`,
        preySpeciesId: 'herbivore',
        success: true,
        energyTransferred: 20,
        interactionType: 'hunt',
      });
      trophicTracker.recordFoodConsumption('herbivore');
    }
    trophicTracker.updateRoles(100);
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create hunting system with default config', () => {
      expect(huntingSystem).toBeDefined();
      expect(huntingSystem.getConfig()).toBeDefined();
    });

    it('should accept custom config', () => {
      const customHunting = new HuntingSystem(trophicTracker, {
        huntingRange: 50,
        huntingEnergyCost: 10,
      });

      const config = customHunting.getConfig();
      expect(config.huntingRange).toBe(50);
      expect(config.huntingEnergyCost).toBe(10);
    });
  });

  // =====================
  // CAN HUNT TESTS
  // =====================
  describe('canHunt', () => {
    it('should allow hunting with sufficient energy', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100, { energy: 50 });
      expect(huntingSystem.canHunt(predator, 0)).toBe(true);
    });

    it('should prevent hunting with insufficient energy', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100, { energy: 5 });
      expect(huntingSystem.canHunt(predator, 0)).toBe(false);
    });

    it('should prevent hunting during cooldown', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);
      expect(huntingSystem.canHunt(predator, 5)).toBe(false);
    });

    it('should allow hunting after cooldown expires', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);

      const config = huntingSystem.getConfig();
      expect(huntingSystem.canHunt(predator, config.huntingCooldown + 1)).toBe(true);
    });
  });

  // =====================
  // VALID PREY TESTS
  // =====================
  describe('isValidPrey', () => {
    it('should identify valid prey based on trophic relationship', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      expect(huntingSystem.isValidPrey(predator, prey)).toBe(true);
    });

    it('should reject same species as prey (no cannibalism)', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const sameSpecies = createAgent('other', 'carnivore', 110, 100);

      expect(huntingSystem.isValidPrey(predator, sameSpecies)).toBe(false);
    });

    it('should reject non-prey relationships', () => {
      const herbivore1 = createAgent('herb1', 'herbivore', 100, 100);
      const herbivore2 = createAgent('herb2', 'herbivore2', 110, 100);

      // Herbivores shouldn't prey on each other
      expect(huntingSystem.isValidPrey(herbivore1, herbivore2)).toBe(false);
    });
  });

  // =====================
  // SUCCESS CHANCE TESTS
  // =====================
  describe('calculateHuntSuccessChance', () => {
    it('should calculate base success chance', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      const chance = huntingSystem.calculateHuntSuccessChance(predator, prey, 10);
      expect(chance).toBeGreaterThan(0);
      expect(chance).toBeLessThan(1);
    });

    it('should increase success for larger predators', () => {
      const smallPredator = createAgent('pred1', 'carnivore', 100, 100, { size: 1 });
      const largePredator = createAgent('pred2', 'carnivore', 100, 100, { size: 2 });
      const prey = createAgent('prey', 'herbivore', 110, 100, { size: 1 });

      const smallChance = huntingSystem.calculateHuntSuccessChance(smallPredator, prey, 10);
      const largeChance = huntingSystem.calculateHuntSuccessChance(largePredator, prey, 10);

      expect(largeChance).toBeGreaterThan(smallChance);
    });

    it('should increase success for faster predators', () => {
      const slowPredator = createAgent('pred1', 'carnivore', 100, 100, { speed: 1 });
      const fastPredator = createAgent('pred2', 'carnivore', 100, 100, { speed: 2 });
      const prey = createAgent('prey', 'herbivore', 110, 100, { speed: 1 });

      const slowChance = huntingSystem.calculateHuntSuccessChance(slowPredator, prey, 10);
      const fastChance = huntingSystem.calculateHuntSuccessChance(fastPredator, prey, 10);

      expect(fastChance).toBeGreaterThan(slowChance);
    });

    it('should decrease success at greater distance', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const nearPrey = createAgent('prey1', 'herbivore', 105, 100);
      const farPrey = createAgent('prey2', 'herbivore', 125, 100);

      const nearChance = huntingSystem.calculateHuntSuccessChance(predator, nearPrey, 5);
      const farChance = huntingSystem.calculateHuntSuccessChance(predator, farPrey, 25);

      expect(nearChance).toBeGreaterThan(farChance);
    });

    it('should clamp success chance to valid range', () => {
      const superPredator = createAgent('pred', 'carnivore', 100, 100, {
        size: 10,
        speed: 10,
        strength: 10,
      });
      const weakPrey = createAgent('prey', 'herbivore', 101, 100, {
        size: 0.1,
        speed: 0.1,
        strength: 0.1,
        energy: 1,
      });

      const chance = huntingSystem.calculateHuntSuccessChance(superPredator, weakPrey, 1);
      expect(chance).toBeLessThanOrEqual(0.95);
      expect(chance).toBeGreaterThanOrEqual(0.05);
    });
  });

  // =====================
  // ATTEMPT HUNT TESTS
  // =====================
  describe('attemptHunt', () => {
    it('should return failure when on cooldown', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);
      const result = huntingSystem.attemptHunt(predator, prey, 1);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('cooldown');
      expect(result.energySpent).toBe(0);
    });

    it('should return failure when out of range', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 500, 500);

      const result = huntingSystem.attemptHunt(predator, prey, 0);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('out_of_range');
    });

    it('should return failure for dead prey', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const deadPrey = createAgent('prey', 'herbivore', 110, 100, { isAlive: false });

      const result = huntingSystem.attemptHunt(predator, deadPrey, 0);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('invalid_target');
    });

    it('should return failure when insufficient energy', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100, { energy: 1 });
      const prey = createAgent('prey', 'herbivore', 110, 100);

      const result = huntingSystem.attemptHunt(predator, prey, 0);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficient_energy');
    });

    it('should record interaction in trophic tracker', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);

      const stats = trophicTracker.getStats();
      expect(stats.totalInteractions).toBeGreaterThan(10); // 10 from setup + 1 new
    });

    it('should set cooldown after attempt', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);

      const remaining = huntingSystem.getCooldownRemaining(predator.id, 1);
      expect(remaining).toBeGreaterThan(0);
    });
  });

  // =====================
  // PROCESS HUNT TESTS
  // =====================
  describe('processHunt', () => {
    it('should return energy changes', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      const result = huntingSystem.processHunt(predator, prey, 0);

      expect(result.predatorEnergyChange).toBeDefined();
      expect(result.preyEnergyChange).toBeDefined();
      expect(result.preyKilled).toBeDefined();
    });

    it('should transfer energy on successful hunt', () => {
      // Run multiple times to get a success
      let successOccurred = false;
      for (let i = 0; i < 20; i++) {
        const predator = createAgent(`pred_${i}`, 'carnivore', 100, 100, {
          size: 2,
          speed: 2,
        });
        const prey = createAgent(`prey_${i}`, 'herbivore', 101, 100, {
          energy: 30,
          size: 0.5,
          speed: 0.5,
        });

        const result = huntingSystem.processHunt(predator, prey, i * 100);

        if (result.predatorEnergyChange > 0) {
          successOccurred = true;
          expect(result.preyEnergyChange).toBeLessThan(0);
          break;
        }
      }

      expect(successOccurred).toBe(true);
    });
  });

  // =====================
  // FIND POTENTIAL PREY TESTS
  // =====================
  describe('findPotentialPrey', () => {
    beforeEach(() => {
      // Add agents to spatial hash
      spatialHash.insert(createAgent('pred', 'carnivore', 100, 100));
      spatialHash.insert(createAgent('prey1', 'herbivore', 110, 100));
      spatialHash.insert(createAgent('prey2', 'herbivore', 120, 100));
      spatialHash.insert(createAgent('prey3', 'herbivore', 200, 200));
    });

    it('should find prey within hunting range', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const targets = huntingSystem.findPotentialPrey(predator, spatialHash, 0);

      expect(targets.length).toBeGreaterThan(0);
    });

    it('should not find prey outside hunting range', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const smallRangeHunting = new HuntingSystem(trophicTracker, { huntingRange: 15 });

      const targets = smallRangeHunting.findPotentialPrey(predator, spatialHash, 0);

      // Only prey1 should be in range (10 units away)
      expect(targets.length).toBeLessThanOrEqual(1);
    });

    it('should sort targets by expected value', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const targets = huntingSystem.findPotentialPrey(predator, spatialHash, 0);

      if (targets.length > 1) {
        // First target should have higher expected value
        const firstValue = targets[0].successChance * targets[0].expectedEnergyGain;
        const secondValue = targets[1].successChance * targets[1].expectedEnergyGain;
        expect(firstValue).toBeGreaterThanOrEqual(secondValue);
      }
    });

    it('should not include dead agents', () => {
      spatialHash.insert(createAgent('dead', 'herbivore', 105, 100, { isAlive: false }));

      const predator = createAgent('pred', 'carnivore', 100, 100);
      const targets = huntingSystem.findPotentialPrey(predator, spatialHash, 0);

      const deadTarget = targets.find((t) => t.agent.id === 'dead');
      expect(deadTarget).toBeUndefined();
    });
  });

  // =====================
  // GET BEST TARGET TESTS
  // =====================
  describe('getBestTarget', () => {
    it('should return best target', () => {
      spatialHash.insert(createAgent('prey1', 'herbivore', 110, 100, { energy: 100 }));
      spatialHash.insert(createAgent('prey2', 'herbivore', 105, 100, { energy: 50 }));

      const predator = createAgent('pred', 'carnivore', 100, 100);
      const best = huntingSystem.getBestTarget(predator, spatialHash, 0);

      expect(best).not.toBeNull();
    });

    it('should return null when no prey available', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const emptyHash = new SpatialHash<TrophicAgent>({
        cellSize: 50,
        worldWidth: 500,
        worldHeight: 500,
      });

      const best = huntingSystem.getBestTarget(predator, emptyHash, 0);
      expect(best).toBeNull();
    });
  });

  // =====================
  // HUNTING DIRECTION TESTS
  // =====================
  describe('calculateHuntingDirection', () => {
    it('should calculate direction to prey', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 200, 100);

      const direction = huntingSystem.calculateHuntingDirection(predator, prey);

      expect(direction).toBeCloseTo(0, 1); // East direction
    });

    it('should handle prey above predator', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 100, 200);

      const direction = huntingSystem.calculateHuntingDirection(predator, prey);

      expect(direction).toBeCloseTo(Math.PI / 2, 1); // North direction
    });
  });

  // =====================
  // COOLDOWN TESTS
  // =====================
  describe('cooldown management', () => {
    it('should clear cooldown for specific agent', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);
      huntingSystem.clearCooldown(predator.id);

      expect(huntingSystem.getCooldownRemaining(predator.id, 1)).toBe(0);
    });

    it('should clear all cooldowns', () => {
      const pred1 = createAgent('pred1', 'carnivore', 100, 100);
      const pred2 = createAgent('pred2', 'carnivore', 200, 200);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(pred1, prey, 0);
      huntingSystem.attemptHunt(pred2, prey, 0);
      huntingSystem.clearAllCooldowns();

      expect(huntingSystem.getCooldownRemaining(pred1.id, 1)).toBe(0);
      expect(huntingSystem.getCooldownRemaining(pred2.id, 1)).toBe(0);
    });

    it('should report correct remaining cooldown', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);

      const config = huntingSystem.getConfig();
      expect(huntingSystem.getCooldownRemaining(predator.id, 5)).toBe(config.huntingCooldown - 5);
    });
  });

  // =====================
  // STATISTICS TESTS
  // =====================
  describe('statistics', () => {
    it('should track hunt attempts', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);

      const stats = huntingSystem.getStats();
      expect(stats.totalHuntsAttempted).toBe(1);
    });

    it('should reset statistics', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);
      huntingSystem.resetStats();

      const stats = huntingSystem.getStats();
      expect(stats.totalHuntsAttempted).toBe(0);
    });

    it('should clear all state', () => {
      const predator = createAgent('pred', 'carnivore', 100, 100);
      const prey = createAgent('prey', 'herbivore', 110, 100);

      huntingSystem.attemptHunt(predator, prey, 0);
      huntingSystem.clear();

      const stats = huntingSystem.getStats();
      expect(stats.totalHuntsAttempted).toBe(0);
      expect(huntingSystem.getCooldownRemaining(predator.id, 1)).toBe(0);
    });
  });

  // =====================
  // CONFIG UPDATE TESTS
  // =====================
  describe('configuration', () => {
    it('should update configuration', () => {
      huntingSystem.updateConfig({ huntingRange: 100 });

      expect(huntingSystem.getConfig().huntingRange).toBe(100);
    });

    it('should preserve other config values on partial update', () => {
      const originalCost = huntingSystem.getConfig().huntingEnergyCost;
      huntingSystem.updateConfig({ huntingRange: 100 });

      expect(huntingSystem.getConfig().huntingEnergyCost).toBe(originalCost);
    });
  });
});
