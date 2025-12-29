/**
 * TrophicRoleTracker.test.ts - Unit tests for emergent trophic role detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrophicRoleTracker } from './TrophicRoleTracker';
import {
  EmergentRole,
  TrophicInteraction,
  TrophicConfig,
} from './types';

describe('TrophicRoleTracker', () => {
  let tracker: TrophicRoleTracker;

  beforeEach(() => {
    tracker = new TrophicRoleTracker();
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create tracker with default config', () => {
      expect(tracker).toBeDefined();
      expect(tracker.getConfig()).toBeDefined();
    });

    it('should accept custom config', () => {
      const customTracker = new TrophicRoleTracker({
        huntingRange: 50,
        minInteractionsForRole: 10,
      });
      const config = customTracker.getConfig();

      expect(config.huntingRange).toBe(50);
      expect(config.minInteractionsForRole).toBe(10);
    });

    it('should accept custom history size', () => {
      const largeHistoryTracker = new TrophicRoleTracker({}, 5000);
      expect(largeHistoryTracker).toBeDefined();
    });
  });

  // =====================
  // PROFILE TESTS
  // =====================
  describe('profile management', () => {
    it('should create profile for new species', () => {
      const profile = tracker.getOrCreateProfile('species_1');

      expect(profile).toBeDefined();
      expect(profile.role).toBe(EmergentRole.UNDETERMINED);
      expect(profile.huntingAttempts).toBe(0);
      expect(profile.foodConsumed).toBe(0);
    });

    it('should return same profile for same species', () => {
      const profile1 = tracker.getOrCreateProfile('species_1');
      const profile2 = tracker.getOrCreateProfile('species_1');

      expect(profile1).toBe(profile2);
    });

    it('should get profile for existing species', () => {
      tracker.getOrCreateProfile('species_1');
      const profile = tracker.getProfile('species_1');

      expect(profile).toBeDefined();
    });

    it('should return undefined for non-existent species', () => {
      const profile = tracker.getProfile('nonexistent');
      expect(profile).toBeUndefined();
    });
  });

  // =====================
  // HUNT INTERACTION TESTS
  // =====================
  describe('hunt interactions', () => {
    it('should record successful hunt', () => {
      const interaction: TrophicInteraction = {
        tick: 1,
        predatorId: 'pred_1',
        predatorSpeciesId: 'predator_species',
        preyId: 'prey_1',
        preySpeciesId: 'prey_species',
        success: true,
        energyTransferred: 20,
        interactionType: 'hunt',
      };

      tracker.recordHuntInteraction(interaction);

      const predatorProfile = tracker.getProfile('predator_species');
      expect(predatorProfile?.huntingAttempts).toBe(1);
      expect(predatorProfile?.huntingSuccesses).toBe(1);
      expect(predatorProfile?.agentsConsumed).toBe(1);
    });

    it('should record failed hunt', () => {
      const interaction: TrophicInteraction = {
        tick: 1,
        predatorId: 'pred_1',
        predatorSpeciesId: 'predator_species',
        preyId: 'prey_1',
        preySpeciesId: 'prey_species',
        success: false,
        energyTransferred: 0,
        interactionType: 'hunt',
      };

      tracker.recordHuntInteraction(interaction);

      const predatorProfile = tracker.getProfile('predator_species');
      expect(predatorProfile?.huntingAttempts).toBe(1);
      expect(predatorProfile?.huntingSuccesses).toBe(0);
      expect(predatorProfile?.agentsConsumed).toBe(0);
    });

    it('should track prey species for successful hunts', () => {
      const interaction: TrophicInteraction = {
        tick: 1,
        predatorId: 'pred_1',
        predatorSpeciesId: 'predator_species',
        preyId: 'prey_1',
        preySpeciesId: 'prey_species',
        success: true,
        energyTransferred: 20,
        interactionType: 'hunt',
      };

      tracker.recordHuntInteraction(interaction);

      const predatorProfile = tracker.getProfile('predator_species');
      expect(predatorProfile?.preySpeciesIds.has('prey_species')).toBe(true);
    });

    it('should track predator species for prey', () => {
      const interaction: TrophicInteraction = {
        tick: 1,
        predatorId: 'pred_1',
        predatorSpeciesId: 'predator_species',
        preyId: 'prey_1',
        preySpeciesId: 'prey_species',
        success: true,
        energyTransferred: 20,
        interactionType: 'hunt',
      };

      tracker.recordHuntInteraction(interaction);

      const preyProfile = tracker.getProfile('prey_species');
      expect(preyProfile?.predatorSpeciesIds.has('predator_species')).toBe(true);
    });

    it('should calculate hunting success rate', () => {
      // 2 successful hunts, 1 failed
      for (let i = 0; i < 2; i++) {
        tracker.recordHuntInteraction({
          tick: i,
          predatorId: 'pred_1',
          predatorSpeciesId: 'predator',
          preyId: `prey_${i}`,
          preySpeciesId: 'prey',
          success: true,
          energyTransferred: 20,
          interactionType: 'hunt',
        });
      }

      tracker.recordHuntInteraction({
        tick: 3,
        predatorId: 'pred_1',
        predatorSpeciesId: 'predator',
        preyId: 'prey_3',
        preySpeciesId: 'prey',
        success: false,
        energyTransferred: 0,
        interactionType: 'hunt',
      });

      const profile = tracker.getProfile('predator');
      expect(profile?.huntingSuccessRate).toBeCloseTo(2 / 3, 5);
    });

    it('should limit history size', () => {
      const smallHistoryTracker = new TrophicRoleTracker({}, 5);

      for (let i = 0; i < 10; i++) {
        smallHistoryTracker.recordHuntInteraction({
          tick: i,
          predatorId: 'pred_1',
          predatorSpeciesId: 'predator',
          preyId: `prey_${i}`,
          preySpeciesId: 'prey',
          success: true,
          energyTransferred: 20,
          interactionType: 'hunt',
        });
      }

      const stats = smallHistoryTracker.getStats();
      expect(stats.totalInteractions).toBe(5);
    });
  });

  // =====================
  // FOOD CONSUMPTION TESTS
  // =====================
  describe('food consumption', () => {
    it('should record food consumption', () => {
      tracker.recordFoodConsumption('herbivore_species', 5);

      const profile = tracker.getProfile('herbivore_species');
      expect(profile?.foodConsumed).toBe(5);
    });

    it('should accumulate food consumption', () => {
      tracker.recordFoodConsumption('herbivore_species', 3);
      tracker.recordFoodConsumption('herbivore_species', 2);

      const profile = tracker.getProfile('herbivore_species');
      expect(profile?.foodConsumed).toBe(5);
    });

    it('should default to amount of 1', () => {
      tracker.recordFoodConsumption('herbivore_species');

      const profile = tracker.getProfile('herbivore_species');
      expect(profile?.foodConsumed).toBe(1);
    });
  });

  // =====================
  // ROLE DETERMINATION TESTS
  // =====================
  describe('role determination', () => {
    it('should return UNDETERMINED for species with too few interactions', () => {
      const role = tracker.determineRole('new_species');
      expect(role).toBe(EmergentRole.UNDETERMINED);
    });

    it('should determine HERBIVORE for food-only consumers', () => {
      // Record enough food consumption
      for (let i = 0; i < 10; i++) {
        tracker.recordFoodConsumption('herbivore_species');
      }

      const role = tracker.determineRole('herbivore_species');
      expect(role).toBe(EmergentRole.HERBIVORE);
    });

    it('should determine CARNIVORE for hunt-only species', () => {
      // Record hunts but add a predator (prevents apex classification)
      for (let i = 0; i < 10; i++) {
        tracker.recordHuntInteraction({
          tick: i,
          predatorId: 'pred_1',
          predatorSpeciesId: 'carnivore_species',
          preyId: `prey_${i}`,
          preySpeciesId: 'prey',
          success: true,
          energyTransferred: 20,
          interactionType: 'hunt',
        });
      }

      // Add a predator to this species (prevents apex classification)
      tracker.recordHuntInteraction({
        tick: 15,
        predatorId: 'bigger_pred',
        predatorSpeciesId: 'apex',
        preyId: 'prey_of_carn',
        preySpeciesId: 'carnivore_species',
        success: true,
        energyTransferred: 20,
        interactionType: 'hunt',
      });

      const role = tracker.determineRole('carnivore_species');
      expect(role).toBe(EmergentRole.CARNIVORE);
    });

    it('should determine OMNIVORE for mixed feeders', () => {
      // Record both food and hunts in balanced amounts
      for (let i = 0; i < 5; i++) {
        tracker.recordFoodConsumption('omnivore_species');
        tracker.recordHuntInteraction({
          tick: i,
          predatorId: 'pred_1',
          predatorSpeciesId: 'omnivore_species',
          preyId: `prey_${i}`,
          preySpeciesId: 'prey',
          success: true,
          energyTransferred: 20,
          interactionType: 'hunt',
        });
      }

      const role = tracker.determineRole('omnivore_species');
      expect(role).toBe(EmergentRole.OMNIVORE);
    });

    it('should determine APEX_PREDATOR for high-success hunters without predators', () => {
      // Many successful hunts, no predators
      for (let i = 0; i < 10; i++) {
        tracker.recordHuntInteraction({
          tick: i,
          predatorId: 'apex_1',
          predatorSpeciesId: 'apex_species',
          preyId: `prey_${i}`,
          preySpeciesId: 'prey',
          success: true,
          energyTransferred: 20,
          interactionType: 'hunt',
        });
      }

      const role = tracker.determineRole('apex_species');
      expect(role).toBe(EmergentRole.APEX_PREDATOR);
    });
  });

  // =====================
  // ROLE UPDATE TESTS
  // =====================
  describe('role updates', () => {
    it('should update roles at configured interval', () => {
      // Set up herbivore
      for (let i = 0; i < 10; i++) {
        tracker.recordFoodConsumption('herbivore');
      }

      // Update at interval tick
      tracker.updateRoles(100); // Default interval is 100

      const profile = tracker.getProfile('herbivore');
      expect(profile?.role).toBe(EmergentRole.HERBIVORE);
    });

    it('should not update roles between intervals', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordFoodConsumption('herbivore');
      }

      tracker.updateRoles(50); // Not at interval

      const profile = tracker.getProfile('herbivore');
      expect(profile?.role).toBe(EmergentRole.UNDETERMINED);
    });

    it('should calculate confidence', () => {
      for (let i = 0; i < 30; i++) {
        tracker.recordFoodConsumption('herbivore');
      }

      tracker.updateRoles(100);

      const profile = tracker.getProfile('herbivore');
      expect(profile?.confidence).toBeGreaterThan(0);
      expect(profile?.confidence).toBeLessThanOrEqual(1);
    });
  });

  // =====================
  // RELATIONSHIP TESTS
  // =====================
  describe('predator-prey relationships', () => {
    beforeEach(() => {
      // Establish predator-prey relationship
      tracker.recordHuntInteraction({
        tick: 1,
        predatorId: 'pred_1',
        predatorSpeciesId: 'predator',
        preyId: 'prey_1',
        preySpeciesId: 'prey',
        success: true,
        energyTransferred: 20,
        interactionType: 'hunt',
      });
    });

    it('should identify predator-of relationship', () => {
      expect(tracker.isPredatorOf('predator', 'prey')).toBe(true);
      expect(tracker.isPredatorOf('prey', 'predator')).toBe(false);
    });

    it('should identify prey-of relationship', () => {
      expect(tracker.isPreyOf('prey', 'predator')).toBe(true);
      expect(tracker.isPreyOf('predator', 'prey')).toBe(false);
    });

    it('should get role for species', () => {
      const role = tracker.getRole('predator');
      expect(role).toBeDefined();
    });

    it('should return UNDETERMINED for unknown species', () => {
      const role = tracker.getRole('unknown');
      expect(role).toBe(EmergentRole.UNDETERMINED);
    });
  });

  // =====================
  // THREAT ASSESSMENT TESTS
  // =====================
  describe('threat assessment', () => {
    beforeEach(() => {
      // Establish carnivore with prey relationships
      for (let i = 0; i < 10; i++) {
        tracker.recordHuntInteraction({
          tick: i,
          predatorId: 'carn_1',
          predatorSpeciesId: 'carnivore',
          preyId: `herb_${i}`,
          preySpeciesId: 'herbivore',
          success: true,
          energyTransferred: 20,
          interactionType: 'hunt',
        });
        tracker.recordFoodConsumption('herbivore');
      }
      tracker.updateRoles(100);
    });

    it('should identify threat based on known relationships', () => {
      expect(tracker.isThreatTo('carnivore', 'herbivore')).toBe(true);
    });

    it('should identify threat based on roles', () => {
      // Carnivore should be threat to undetermined species
      expect(tracker.isThreatTo('carnivore', 'unknown_species')).toBe(true);
    });

    it('should not flag herbivore as threat', () => {
      expect(tracker.isThreatTo('herbivore', 'unknown_species')).toBe(false);
    });

    it('should identify opportunity for predator', () => {
      expect(tracker.isOpportunityFor('carnivore', 'herbivore')).toBe(true);
    });
  });

  // =====================
  // THREAT/OPPORTUNITY LEVEL TESTS
  // =====================
  describe('threat and opportunity levels', () => {
    beforeEach(() => {
      // Set up predator
      for (let i = 0; i < 10; i++) {
        tracker.recordHuntInteraction({
          tick: i,
          predatorId: 'pred_1',
          predatorSpeciesId: 'predator',
          preyId: `prey_${i}`,
          preySpeciesId: 'prey',
          success: true,
          energyTransferred: 20,
          interactionType: 'hunt',
        });
      }
      tracker.updateRoles(100);
    });

    it('should calculate threat level from nearby agents', () => {
      const threatLevel = tracker.calculateThreatLevel('prey', [
        { speciesId: 'predator', distance: 10, size: 1.5 },
      ]);

      expect(threatLevel).toBeGreaterThan(0);
      expect(threatLevel).toBeLessThanOrEqual(1);
    });

    it('should increase threat level for closer predators', () => {
      const farThreat = tracker.calculateThreatLevel('prey', [
        { speciesId: 'predator', distance: 50 },
      ]);

      const nearThreat = tracker.calculateThreatLevel('prey', [
        { speciesId: 'predator', distance: 5 },
      ]);

      expect(nearThreat).toBeGreaterThan(farThreat);
    });

    it('should return 0 threat for herbivores', () => {
      const threatLevel = tracker.calculateThreatLevel('prey', [
        { speciesId: 'prey', distance: 10 },
      ]);

      expect(threatLevel).toBe(0);
    });

    it('should calculate opportunity level', () => {
      const opportunityLevel = tracker.calculateOpportunityLevel('predator', [
        { speciesId: 'prey', distance: 10, energy: 50 },
      ]);

      expect(opportunityLevel).toBeGreaterThan(0);
    });

    it('should return 0 opportunity for herbivores', () => {
      // Set up herbivore
      for (let i = 0; i < 10; i++) {
        tracker.recordFoodConsumption('herbivore');
      }
      tracker.updateRoles(200);

      const opportunityLevel = tracker.calculateOpportunityLevel('herbivore', [
        { speciesId: 'prey', distance: 10, energy: 50 },
      ]);

      expect(opportunityLevel).toBe(0);
    });
  });

  // =====================
  // STATISTICS TESTS
  // =====================
  describe('statistics', () => {
    it('should return species statistics', () => {
      for (let i = 0; i < 5; i++) {
        tracker.recordHuntInteraction({
          tick: i,
          predatorId: 'pred_1',
          predatorSpeciesId: 'predator',
          preyId: `prey_${i}`,
          preySpeciesId: 'prey',
          success: i < 3,
          energyTransferred: i < 3 ? 20 : 0,
          interactionType: 'hunt',
        });
      }

      const stats = tracker.getSpeciesStats('predator');

      expect(stats).toBeDefined();
      expect(stats?.speciesId).toBe('predator');
      expect(stats?.averageHuntingSuccess).toBeCloseTo(0.6, 5);
    });

    it('should return undefined for non-existent species', () => {
      const stats = tracker.getSpeciesStats('nonexistent');
      expect(stats).toBeUndefined();
    });

    it('should return overall tracker statistics', () => {
      tracker.recordFoodConsumption('herbivore');
      tracker.recordHuntInteraction({
        tick: 1,
        predatorId: 'pred_1',
        predatorSpeciesId: 'carnivore',
        preyId: 'prey_1',
        preySpeciesId: 'herbivore',
        success: true,
        energyTransferred: 20,
        interactionType: 'hunt',
      });

      const stats = tracker.getStats();

      expect(stats.totalSpecies).toBe(2);
      expect(stats.totalInteractions).toBe(1);
      expect(stats.foodWebDensity).toBeGreaterThanOrEqual(0);
    });

    it('should track role distribution', () => {
      // Set up species with different roles
      for (let i = 0; i < 10; i++) {
        tracker.recordFoodConsumption('herbivore');
        tracker.recordHuntInteraction({
          tick: i,
          predatorId: 'carn_1',
          predatorSpeciesId: 'carnivore',
          preyId: `prey_${i}`,
          preySpeciesId: 'prey',
          success: true,
          energyTransferred: 20,
          interactionType: 'hunt',
        });
      }
      tracker.updateRoles(100);

      const stats = tracker.getStats();
      expect(stats.roleDistribution).toBeDefined();
    });
  });

  // =====================
  // SERIALIZATION TESTS
  // =====================
  describe('serialization', () => {
    it('should export state to JSON', () => {
      tracker.recordFoodConsumption('herbivore');
      tracker.recordHuntInteraction({
        tick: 1,
        predatorId: 'pred_1',
        predatorSpeciesId: 'carnivore',
        preyId: 'prey_1',
        preySpeciesId: 'herbivore',
        success: true,
        energyTransferred: 20,
        interactionType: 'hunt',
      });

      const json = tracker.toJSON();

      expect(json).toBeDefined();
      expect((json as any).profiles).toBeDefined();
      expect((json as any).config).toBeDefined();
    });
  });

  // =====================
  // CLEAR TESTS
  // =====================
  describe('clear', () => {
    it('should clear all data', () => {
      tracker.recordFoodConsumption('herbivore');
      tracker.clear();

      const profile = tracker.getProfile('herbivore');
      expect(profile).toBeUndefined();
    });

    it('should reset statistics', () => {
      for (let i = 0; i < 5; i++) {
        tracker.recordFoodConsumption('herbivore');
      }

      tracker.clear();
      const stats = tracker.getStats();

      expect(stats.totalSpecies).toBe(0);
      expect(stats.totalInteractions).toBe(0);
    });
  });
});
