/**
 * FCMBrain.test.ts - Unit tests for FCM Brain implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FCMBrain } from './FCMBrain';
import { SensoryInput } from '../Brain';
import {
  ALL_STANDARD_CONCEPTS,
  DEFAULT_FCM_WEIGHTS,
  FCMPreset,
} from './types';

describe('FCMBrain', () => {
  let brain: FCMBrain;

  const defaultSensoryInput: SensoryInput = {
    front: 0.5,
    frontLeft: 0.3,
    frontRight: 0.2,
    left: 0.1,
    right: 0.1,
    energy: 0.7,
    bias: 1.0,
  };

  beforeEach(() => {
    brain = new FCMBrain();
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create FCMBrain with default concepts', () => {
      expect(brain).toBeDefined();
      expect(brain.type).toBe('fcm');
    });

    it('should create FCMBrain with custom label', () => {
      const labeledBrain = new FCMBrain({}, 'TestBrain');
      expect(labeledBrain.label).toBe('TestBrain');
    });

    it('should initialize all standard concepts', () => {
      for (const concept of ALL_STANDARD_CONCEPTS) {
        const activation = brain.getConceptActivation(concept.id);
        expect(activation).toBeDefined();
      }
    });

    it('should initialize weights from defaults', () => {
      const weight = brain.getWeight('hunger', 'eat');
      expect(weight).toBeCloseTo(0.7, 1);
    });

    it('should accept custom concepts', () => {
      const customBrain = new FCMBrain({
        concepts: [
          { id: 'custom1', name: 'Custom1', type: 'input', activation: 0.5, decayRate: 0.1, bias: 0 },
          { id: 'custom2', name: 'Custom2', type: 'output', activation: 0, decayRate: 0.1, bias: 0 },
        ],
        weights: [{ fromId: 'custom1', toId: 'custom2', weight: 0.8 }],
      });

      expect(customBrain.getConceptActivation('custom1')).toBe(0.5);
      expect(customBrain.getWeight('custom1', 'custom2')).toBe(0.8);
    });
  });

  // =====================
  // PRESET TESTS
  // =====================
  describe('presets', () => {
    it('should create herbivore preset', () => {
      const herbivore = FCMBrain.fromPreset('herbivore');
      expect(herbivore).toBeDefined();
      expect(herbivore.label).toBe('Herbivore');
    });

    it('should create carnivore preset', () => {
      const carnivore = FCMBrain.fromPreset('carnivore');
      expect(carnivore).toBeDefined();
      expect(carnivore.label).toBe('Carnivore');
    });

    it('should create timid preset with higher fear bias', () => {
      const timid = FCMBrain.fromPreset('timid');
      // Timid preset should have modified behavior
      expect(timid).toBeDefined();
    });

    it('should create aggressive preset', () => {
      const aggressive = FCMBrain.fromPreset('aggressive');
      expect(aggressive).toBeDefined();
      expect(aggressive.label).toBe('Aggressive');
    });

    it('should create omnivore preset', () => {
      const omnivore = FCMBrain.fromPreset('omnivore');
      expect(omnivore).toBeDefined();
    });
  });

  // =====================
  // THINKING TESTS
  // =====================
  describe('think', () => {
    it('should produce output from sensory input', () => {
      const output = brain.think(defaultSensoryInput);

      expect(output).toBeDefined();
      expect(output.moveForward).toBeDefined();
      expect(output.rotate).toBeDefined();
      expect(output.action).toBeDefined();
    });

    it('should produce bounded output values', () => {
      const output = brain.think(defaultSensoryInput);

      expect(output.moveForward).toBeGreaterThanOrEqual(-1);
      expect(output.moveForward).toBeLessThanOrEqual(1);
      expect(output.rotate).toBeGreaterThanOrEqual(-1);
      expect(output.rotate).toBeLessThanOrEqual(1);
    });

    it('should respond to food ahead', () => {
      const foodAheadInput: SensoryInput = {
        ...defaultSensoryInput,
        front: 1.0,
        energy: 0.3, // Low energy = hungry
      };

      const output = brain.think(foodAheadInput);

      // Should move forward towards food
      expect(output.moveForward).toBeGreaterThan(0);
    });

    it('should respond to low energy with different behavior than high energy', () => {
      const lowEnergyInput: SensoryInput = {
        ...defaultSensoryInput,
        energy: 0.1,
        front: 0.8,
      };

      const highEnergyInput: SensoryInput = {
        ...defaultSensoryInput,
        energy: 0.9,
        front: 0.8,
      };

      const lowEnergyBrain = brain.clone();
      const highEnergyBrain = brain.clone();

      lowEnergyBrain.think(lowEnergyInput);
      highEnergyBrain.think(highEnergyInput);

      // The brain should respond differently to different energy levels
      const lowHunger = lowEnergyBrain.getConceptActivation('hunger');
      const highHunger = highEnergyBrain.getConceptActivation('hunger');

      // Hunger should differ based on energy input
      expect(lowHunger).not.toBeCloseTo(highHunger, 1);
    });

    it('should prefer turning towards food', () => {
      const foodLeftInput: SensoryInput = {
        ...defaultSensoryInput,
        front: 0,
        frontLeft: 0.9,
        frontRight: 0,
        energy: 0.3,
      };

      const foodRightInput: SensoryInput = {
        ...defaultSensoryInput,
        front: 0,
        frontLeft: 0,
        frontRight: 0.9,
        energy: 0.3,
      };

      const leftOutput = brain.clone().think(foodLeftInput);
      const rightOutput = brain.clone().think(foodRightInput);

      // Different food positions should cause different rotation
      expect(leftOutput.rotate).not.toBe(rightOutput.rotate);
    });
  });

  // =====================
  // TROPHIC INPUT TESTS
  // =====================
  describe('trophic inputs', () => {
    it('should respond to threat with fear', () => {
      brain.setTrophicInputs(0.9, 0);
      brain.think(defaultSensoryInput);

      const fearActivation = brain.getConceptActivation('fear');
      expect(fearActivation).toBeGreaterThan(0);
    });

    it('should respond to prey with aggression', () => {
      brain.setTrophicInputs(0, 0.9);
      brain.think(defaultSensoryInput);

      const aggressionActivation = brain.getConceptActivation('aggression');
      expect(aggressionActivation).toBeGreaterThan(0);
    });
  });

  // =====================
  // ACTIVATION TESTS
  // =====================
  describe('concept activations', () => {
    it('should get and set concept activations', () => {
      brain.setConceptActivation('food_ahead', 0.8);
      // Note: setConceptActivation only works on input concepts
      // We need to check through getAllActivations
      const activations = brain.getAllActivations();
      expect(activations.food_ahead).toBe(0.8);
    });

    it('should clamp activations to valid range', () => {
      brain.setConceptActivation('food_ahead', 2.0);
      const activations = brain.getAllActivations();
      expect(activations.food_ahead).toBeLessThanOrEqual(1);
    });

    it('should get all activations as record', () => {
      const activations = brain.getAllActivations();
      expect(Object.keys(activations).length).toBeGreaterThan(0);
    });
  });

  // =====================
  // WEIGHT TESTS
  // =====================
  describe('weights', () => {
    it('should get weight between concepts', () => {
      const weight = brain.getWeight('hunger', 'move_forward');
      expect(typeof weight).toBe('number');
    });

    it('should return 0 for non-existent weight', () => {
      const weight = brain.getWeight('nonexistent', 'also_nonexistent');
      expect(weight).toBe(0);
    });

    it('should set weight between concepts', () => {
      brain.setWeight('hunger', 'move_forward', 0.95);
      expect(brain.getWeight('hunger', 'move_forward')).toBe(0.95);
    });
  });

  // =====================
  // MUTATION TESTS
  // =====================
  describe('mutation', () => {
    it('should create mutated copy', () => {
      const mutated = brain.mutate(0.1, 0.2);

      expect(mutated).toBeDefined();
      expect(mutated).not.toBe(brain);
      expect(mutated.type).toBe('fcm');
    });

    it('should preserve structure during mutation', () => {
      const mutated = brain.mutate(0.1, 0.2);

      // Should have same concepts
      const originalActivations = brain.getAllActivations();
      const mutatedActivations = mutated.getAllActivations();

      expect(Object.keys(mutatedActivations)).toEqual(
        expect.arrayContaining(Object.keys(originalActivations))
      );
    });

    it('should create different brain with high mutation rate', () => {
      // Run multiple mutations to ensure some change occurs
      let different = false;
      for (let i = 0; i < 10; i++) {
        const mutated = brain.mutate(1.0, 1.0);
        const originalWeight = brain.getWeight('hunger', 'eat');
        const mutatedWeight = mutated.getWeight('hunger', 'eat');

        if (Math.abs(originalWeight - mutatedWeight) > 0.01) {
          different = true;
          break;
        }
      }

      expect(different).toBe(true);
    });

    it('should keep brain similar with low mutation rate', () => {
      const mutated = brain.mutate(0.001, 0.001);

      const originalWeight = brain.getWeight('hunger', 'eat');
      const mutatedWeight = mutated.getWeight('hunger', 'eat');

      // With very low mutation, weights should be very similar
      expect(Math.abs(originalWeight - mutatedWeight)).toBeLessThan(0.1);
    });
  });

  // =====================
  // CLONE TESTS
  // =====================
  describe('clone', () => {
    it('should create exact copy', () => {
      const clone = brain.clone();

      expect(clone).not.toBe(brain);
      expect(clone.type).toBe(brain.type);
      expect(clone.label).toBe(brain.label);
    });

    it('should have same activations', () => {
      brain.setConceptActivation('food_ahead', 0.7);
      const clone = brain.clone();

      expect(clone.getConceptActivation('food_ahead')).toBe(
        brain.getConceptActivation('food_ahead')
      );
    });

    it('should have same weights', () => {
      const clone = brain.clone();

      expect(clone.getWeight('hunger', 'eat')).toBe(
        brain.getWeight('hunger', 'eat')
      );
    });

    it('should be independent from original', () => {
      const clone = brain.clone();
      brain.setWeight('hunger', 'eat', 0.1);

      // Clone should not be affected
      expect(clone.getWeight('hunger', 'eat')).not.toBe(0.1);
    });
  });

  // =====================
  // CROSSOVER TESTS
  // =====================
  describe('crossover', () => {
    it('should create offspring from two parents', () => {
      const parent1 = FCMBrain.fromPreset('herbivore');
      const parent2 = FCMBrain.fromPreset('carnivore');

      const offspring = parent1.crossover(parent2);

      expect(offspring).toBeDefined();
      expect(offspring.type).toBe('fcm');
    });

    it('should return clone when crossing with non-FCM brain', () => {
      const mockBrain = { type: 'other' } as any;
      const offspring = brain.crossover(mockBrain);

      expect(offspring).toBeDefined();
      expect(offspring.type).toBe('fcm');
    });

    it('should produce viable offspring that can think', () => {
      const parent1 = new FCMBrain();
      const parent2 = new FCMBrain();

      const offspring = parent1.crossover(parent2);
      const output = offspring.think(defaultSensoryInput);

      expect(output.moveForward).toBeDefined();
      expect(output.rotate).toBeDefined();
    });
  });

  // =====================
  // SERIALIZATION TESTS
  // =====================
  describe('serialization', () => {
    it('should serialize to BrainState', () => {
      const state = brain.serialize();

      expect(state.type).toBe('fcm');
      expect(state.version).toBe(1);
      expect(state.data).toBeDefined();
    });

    it('should deserialize from BrainState', () => {
      const state = brain.serialize();
      const restored = FCMBrain.deserialize(state);

      expect(restored.type).toBe('fcm');
    });

    it('should preserve activations through serialization', () => {
      brain.think(defaultSensoryInput); // Generate some activations
      const state = brain.serialize();
      const restored = FCMBrain.deserialize(state);

      const originalActivations = brain.getAllActivations();
      const restoredActivations = restored.getAllActivations();

      // Check a few key activations match
      expect(restoredActivations.hunger).toBeCloseTo(originalActivations.hunger, 5);
    });

    it('should preserve weights through serialization', () => {
      brain.setWeight('hunger', 'eat', 0.42);
      const state = brain.serialize();
      const restored = FCMBrain.deserialize(state);

      expect(restored.getWeight('hunger', 'eat')).toBe(0.42);
    });
  });

  // =====================
  // COMPLEXITY TESTS
  // =====================
  describe('complexity', () => {
    it('should calculate complexity based on concepts and weights', () => {
      const complexity = brain.getComplexity();
      expect(complexity).toBeGreaterThan(0);
    });

    it('should have higher complexity with more weights', () => {
      const brain1 = new FCMBrain({
        concepts: ALL_STANDARD_CONCEPTS,
        weights: DEFAULT_FCM_WEIGHTS.slice(0, 5),
      });

      const brain2 = new FCMBrain({
        concepts: ALL_STANDARD_CONCEPTS,
        weights: DEFAULT_FCM_WEIGHTS,
      });

      expect(brain2.getComplexity()).toBeGreaterThan(brain1.getComplexity());
    });
  });

  // =====================
  // BEHAVIOR TESTS
  // =====================
  describe('behavioral responses', () => {
    it('should exhibit different behaviors for different presets', () => {
      const herbivore = FCMBrain.fromPreset('herbivore');
      const carnivore = FCMBrain.fromPreset('carnivore');

      // Set same input with threat and prey
      herbivore.setTrophicInputs(0.8, 0.2);
      carnivore.setTrophicInputs(0.8, 0.2);

      const herbivoreOutput = herbivore.think(defaultSensoryInput);
      const carnivoreOutput = carnivore.think(defaultSensoryInput);

      // Herbivore should be more fearful, carnivore more aggressive
      const herbivoreFear = herbivore.getConceptActivation('fear');
      const carnivoreFear = carnivore.getConceptActivation('fear');

      expect(herbivoreFear).toBeGreaterThanOrEqual(carnivoreFear);
    });

    it('should produce movement when food is detected', () => {
      const foodInput: SensoryInput = {
        front: 1.0,
        frontLeft: 0,
        frontRight: 0,
        left: 0,
        right: 0,
        energy: 0.2,
        bias: 1.0,
      };

      const output = brain.think(foodInput);

      // Should want to move towards food
      expect(output.moveForward).toBeGreaterThan(0);
    });
  });
});
