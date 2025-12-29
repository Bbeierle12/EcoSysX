/**
 * Genome.test.ts - Unit tests for the Genome class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Genome, DEFAULT_MUTATION_CONFIG } from './Genome';
import { createSeededRng } from '../test/setup';

describe('Genome', () => {
  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create a genome with specified size', () => {
      const genome = new Genome({ size: 10 });
      expect(genome.size).toBe(10);
    });

    it('should initialize with Float32Array internally', () => {
      const genome = new Genome({ size: 10 });
      expect(genome.genes).toBeInstanceOf(Float32Array);
    });

    it('should initialize all genes to zero by default', () => {
      const genome = new Genome({ size: 5 });
      for (let i = 0; i < 5; i++) {
        expect(genome.getGene(i)).toBe(0);
      }
    });

    it('should initialize with random values when initRange provided', () => {
      const genome = new Genome({ size: 100, initRange: [-1, 1] });

      let hasNonZero = false;
      for (let i = 0; i < 100; i++) {
        const gene = genome.getGene(i);
        expect(gene).toBeGreaterThanOrEqual(-1);
        expect(gene).toBeLessThanOrEqual(1);
        if (gene !== 0) hasNonZero = true;
      }
      expect(hasNonZero).toBe(true);
    });

    it('should generate unique ID', () => {
      const genome1 = new Genome({ size: 10 });
      const genome2 = new Genome({ size: 10 });
      expect(genome1.id).not.toBe(genome2.id);
    });

    it('should track generation number', () => {
      const genome = new Genome({ size: 10, generation: 5 });
      expect(genome.generation).toBe(5);
    });

    it('should default to generation 0', () => {
      const genome = new Genome({ size: 10 });
      expect(genome.generation).toBe(0);
    });

    it('should track parent ID', () => {
      const genome = new Genome({ size: 10, parentId: 'parent_123' });
      expect(genome.parentId).toBe('parent_123');
    });
  });

  // =====================
  // GENE ACCESS TESTS
  // =====================
  describe('gene access', () => {
    let genome: Genome;

    beforeEach(() => {
      genome = new Genome({ size: 10, initRange: [-1, 1] });
    });

    it('should get gene at valid index', () => {
      const value = genome.getGene(0);
      expect(typeof value).toBe('number');
    });

    it('should set gene at valid index', () => {
      genome.setGene(0, 0.5);
      expect(genome.getGene(0)).toBeCloseTo(0.5, 5);
    });

    it('should throw RangeError for negative index', () => {
      expect(() => genome.getGene(-1)).toThrow(RangeError);
    });

    it('should throw RangeError for index >= size', () => {
      expect(() => genome.getGene(10)).toThrow(RangeError);
    });

    it('should throw RangeError for out-of-bounds set', () => {
      expect(() => genome.setGene(-1, 0.5)).toThrow(RangeError);
      expect(() => genome.setGene(10, 0.5)).toThrow(RangeError);
    });

    it('should return copy of genes array (immutable)', () => {
      const genes = genome.genes;
      genes[0] = 999;
      expect(genome.getGene(0)).not.toBe(999);
    });
  });

  // =====================
  // MUTATION TESTS
  // =====================
  describe('mutation', () => {
    it('should mutate genes based on mutation rate', () => {
      const genome = new Genome({ size: 100 });
      // Initialize to known values
      for (let i = 0; i < 100; i++) {
        genome.setGene(i, 0);
      }

      const result = genome.mutate(0, {
        mutationRate: 0.5,
        mutationMagnitude: 0.3,
      });

      // Should have some mutations with 50% rate
      expect(result.mutatedCount).toBeGreaterThan(0);
      expect(result.mutatedCount).toBeLessThan(100);
    });

    it('should not mutate any genes when rate is 0', () => {
      const genome = new Genome({ size: 100 });
      for (let i = 0; i < 100; i++) {
        genome.setGene(i, 0.5);
      }

      const result = genome.mutate(0, { mutationRate: 0 });

      expect(result.mutatedCount).toBe(0);
      for (let i = 0; i < 100; i++) {
        expect(genome.getGene(i)).toBeCloseTo(0.5, 5);
      }
    });

    it('should mutate all genes when rate is 1', () => {
      const genome = new Genome({ size: 10 });
      for (let i = 0; i < 10; i++) {
        genome.setGene(i, 0.5);
      }

      const result = genome.mutate(0, {
        mutationRate: 1.0,
        mutationMagnitude: 0.5,
      });

      // All genes should be marked as mutated
      expect(result.mutatedCount).toBe(10);
    });

    it('should keep mutated values within configured range', () => {
      const genome = new Genome({ size: 100, initRange: [0.9, 1] });
      genome.mutate(0, {
        mutationRate: 1.0,
        mutationMagnitude: 1.0,
        minValue: -1,
        maxValue: 1,
      });

      for (let i = 0; i < 100; i++) {
        expect(genome.getGene(i)).toBeGreaterThanOrEqual(-1);
        expect(genome.getGene(i)).toBeLessThanOrEqual(1);
      }
    });

    it('should return mutation result with indices and deltas', () => {
      const genome = new Genome({ size: 10 });
      const result = genome.mutate(0, { mutationRate: 1.0 });

      expect(result.indices).toHaveLength(result.mutatedCount);
      expect(result.deltas).toHaveLength(result.mutatedCount);
    });

    it('should track mutation count in stats', () => {
      const genome = new Genome({ size: 10 });
      expect(genome.stats.mutationCount).toBe(0);

      genome.mutate(0);
      expect(genome.stats.mutationCount).toBe(1);

      genome.mutate(1);
      expect(genome.stats.mutationCount).toBe(2);
    });

    it('should track last mutation tick', () => {
      const genome = new Genome({ size: 10 });
      genome.mutate(42);
      expect(genome.stats.lastMutationTick).toBe(42);
    });
  });

  // =====================
  // REPRODUCTION TESTS
  // =====================
  describe('reproduce', () => {
    it('should create child with copied genes', () => {
      const parent = new Genome({ size: 10, initRange: [-1, 1] });
      const child = parent.reproduce(0, false);

      for (let i = 0; i < 10; i++) {
        expect(child.getGene(i)).toBeCloseTo(parent.getGene(i), 5);
      }
    });

    it('should increment generation', () => {
      const parent = new Genome({ size: 10, generation: 5 });
      const child = parent.reproduce();

      expect(child.generation).toBe(6);
    });

    it('should set parent ID', () => {
      const parent = new Genome({ size: 10 });
      const child = parent.reproduce();

      expect(child.parentId).toBe(parent.id);
    });

    it('should optionally mutate during reproduction', () => {
      const parent = new Genome({ size: 100 });
      for (let i = 0; i < 100; i++) {
        parent.setGene(i, 0);
      }

      const child = parent.reproduce(0, true);

      // Some genes should have changed
      let differences = 0;
      for (let i = 0; i < 100; i++) {
        if (child.getGene(i) !== 0) differences++;
      }
      expect(differences).toBeGreaterThan(0);
    });

    it('should not modify parent during reproduction', () => {
      const parent = new Genome({ size: 10 });
      for (let i = 0; i < 10; i++) {
        parent.setGene(i, 0.5);
      }

      parent.reproduce(0, true);

      for (let i = 0; i < 10; i++) {
        expect(parent.getGene(i)).toBeCloseTo(0.5, 5);
      }
    });
  });

  // =====================
  // CROSSOVER TESTS
  // =====================
  describe('crossover', () => {
    let parent1: Genome;
    let parent2: Genome;

    beforeEach(() => {
      parent1 = new Genome({ size: 10 });
      parent2 = new Genome({ size: 10 });
      for (let i = 0; i < 10; i++) {
        parent1.setGene(i, 0);
        parent2.setGene(i, 1);
      }
    });

    it('should produce offspring with genes from both parents', () => {
      const offspring = parent1.crossover(parent2);

      let hasParent1Genes = false;
      let hasParent2Genes = false;

      for (let i = 0; i < 10; i++) {
        const gene = offspring.getGene(i);
        if (gene === 0) hasParent1Genes = true;
        if (gene === 1) hasParent2Genes = true;
      }

      expect(hasParent1Genes).toBe(true);
      expect(hasParent2Genes).toBe(true);
    });

    it('should create offspring with same size as parents', () => {
      const offspring = parent1.crossover(parent2);
      expect(offspring.size).toBe(parent1.size);
    });

    it('should throw error for mismatched sizes', () => {
      const shortParent = new Genome({ size: 5 });
      expect(() => parent1.crossover(shortParent)).toThrow();
    });

    it('should increment generation from max of parents', () => {
      const p1 = new Genome({ size: 10, generation: 3 });
      const p2 = new Genome({ size: 10, generation: 7 });

      const offspring = p1.crossover(p2);
      expect(offspring.generation).toBe(8);
    });

    it('should set parent ID to first parent', () => {
      const offspring = parent1.crossover(parent2);
      expect(offspring.parentId).toBe(parent1.id);
    });
  });

  // =====================
  // DISTANCE CALCULATION TESTS
  // =====================
  describe('distance', () => {
    it('should return 0 for identical genomes', () => {
      const genome1 = new Genome({ size: 10 });
      const genome2 = new Genome({ size: 10 });
      for (let i = 0; i < 10; i++) {
        genome1.setGene(i, 0.5);
        genome2.setGene(i, 0.5);
      }

      expect(genome1.distanceFrom(genome2)).toBe(0);
    });

    it('should calculate Euclidean distance correctly', () => {
      const genome1 = new Genome({ size: 2 });
      const genome2 = new Genome({ size: 2 });
      genome1.setGene(0, 0);
      genome1.setGene(1, 0);
      genome2.setGene(0, 3);
      genome2.setGene(1, 4);

      // Distance should be sqrt(3^2 + 4^2) = 5
      expect(genome1.distanceFrom(genome2)).toBeCloseTo(5, 5);
    });

    it('should be symmetric', () => {
      const genome1 = new Genome({ size: 10, initRange: [-1, 1] });
      const genome2 = new Genome({ size: 10, initRange: [-1, 1] });

      const dist1 = genome1.distanceFrom(genome2);
      const dist2 = genome2.distanceFrom(genome1);

      expect(dist1).toBeCloseTo(dist2, 10);
    });

    it('should throw error for different size genomes', () => {
      const genome1 = new Genome({ size: 10 });
      const genome2 = new Genome({ size: 5 });

      expect(() => genome1.distanceFrom(genome2)).toThrow();
    });

    it('should provide normalized distance in [0, 1]', () => {
      const genome1 = new Genome({ size: 10 });
      const genome2 = new Genome({ size: 10 });
      for (let i = 0; i < 10; i++) {
        genome1.setGene(i, -1);
        genome2.setGene(i, 1);
      }

      const normalized = genome1.normalizedDistanceFrom(genome2);
      expect(normalized).toBeGreaterThanOrEqual(0);
      expect(normalized).toBeLessThanOrEqual(1);
    });
  });

  // =====================
  // CLONING TESTS
  // =====================
  describe('clone', () => {
    it('should create an exact copy of genes', () => {
      const original = new Genome({ size: 10, initRange: [-1, 1] });
      const clone = original.clone();

      expect(clone.size).toBe(original.size);
      for (let i = 0; i < 10; i++) {
        expect(clone.getGene(i)).toBe(original.getGene(i));
      }
    });

    it('should create independent copy (deep clone)', () => {
      const original = new Genome({ size: 10 });
      original.setGene(0, 0.5);
      const clone = original.clone();

      clone.setGene(0, 0.99);

      expect(original.getGene(0)).toBeCloseTo(0.5, 5);
      expect(clone.getGene(0)).toBeCloseTo(0.99, 5);
    });

    it('should preserve generation', () => {
      const original = new Genome({ size: 10, generation: 42 });
      const clone = original.clone();

      expect(clone.generation).toBe(42);
    });

    it('should preserve parent ID', () => {
      const original = new Genome({ size: 10, parentId: 'parent_123' });
      const clone = original.clone();

      expect(clone.parentId).toBe('parent_123');
    });

    it('should preserve mutation config', () => {
      const original = new Genome({ size: 10 }, { mutationRate: 0.2 });
      const clone = original.clone();

      expect(clone.mutationConfig.mutationRate).toBe(0.2);
    });
  });

  // =====================
  // SERIALIZATION TESTS
  // =====================
  describe('serialization', () => {
    it('should serialize to JSON object', () => {
      const genome = new Genome({ size: 5, initRange: [-1, 1] });
      const json = genome.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('genes');
      expect(json).toHaveProperty('stats');
      expect(json).toHaveProperty('mutationConfig');
    });

    it('should deserialize from JSON', () => {
      const original = new Genome({ size: 5, initRange: [-1, 1] });
      const json = original.toJSON();

      const restored = Genome.fromJSON(json as {
        genes: number[];
        stats?: { generation?: number; parentId?: string };
        mutationConfig?: Partial<typeof DEFAULT_MUTATION_CONFIG>;
      });

      expect(restored.size).toBe(original.size);
      for (let i = 0; i < 5; i++) {
        expect(restored.getGene(i)).toBeCloseTo(original.getGene(i), 5);
      }
    });

    it('should preserve generation through serialization', () => {
      const original = new Genome({ size: 5, generation: 100 });
      const json = original.toJSON();
      const restored = Genome.fromJSON(json as {
        genes: number[];
        stats?: { generation?: number };
      });

      expect(restored.generation).toBe(100);
    });
  });

  // =====================
  // NEURAL NETWORK FACTORY TESTS
  // =====================
  describe('forNeuralNetwork', () => {
    it('should create genome sized for network weights', () => {
      // Network: 4 inputs, 8 hidden, 2 outputs
      // Weights: 4*8 = 32, 8*2 = 16
      // Biases: 8, 2
      // Total: 32 + 16 + 8 + 2 = 58
      const genome = Genome.forNeuralNetwork([4, 8, 2]);

      expect(genome.size).toBe(58);
    });

    it('should initialize with random values in [-1, 1]', () => {
      const genome = Genome.forNeuralNetwork([4, 8, 2]);

      for (let i = 0; i < genome.size; i++) {
        expect(genome.getGene(i)).toBeGreaterThanOrEqual(-1);
        expect(genome.getGene(i)).toBeLessThanOrEqual(1);
      }
    });

    it('should handle deep networks', () => {
      // 10 -> 20 -> 30 -> 20 -> 5
      const genome = Genome.forNeuralNetwork([10, 20, 30, 20, 5]);

      // Weights: 10*20 + 20*30 + 30*20 + 20*5 = 200 + 600 + 600 + 100 = 1500
      // Biases: 20 + 30 + 20 + 5 = 75
      // Total: 1575
      expect(genome.size).toBe(1575);
    });
  });

  // =====================
  // NEURAL WEIGHT EXTRACTION TESTS
  // =====================
  describe('extractNeuralWeights', () => {
    it('should extract weights and biases for each layer', () => {
      const genome = Genome.forNeuralNetwork([2, 3, 1]);
      const layers = genome.extractNeuralWeights([2, 3, 1]);

      expect(layers).toHaveLength(2); // 2 weight layers
      expect(layers[0].weights).toHaveLength(3); // 3 neurons
      expect(layers[0].weights[0]).toHaveLength(2); // 2 inputs each
      expect(layers[0].biases).toHaveLength(3);
      expect(layers[1].weights).toHaveLength(1); // 1 output neuron
      expect(layers[1].weights[0]).toHaveLength(3); // 3 inputs
      expect(layers[1].biases).toHaveLength(1);
    });
  });

  // =====================
  // HAMMING DISTANCE TESTS (REvoSim-style)
  // =====================
  describe('hammingDistance', () => {
    it('should return 0 for identical genomes', () => {
      const genome1 = new Genome({ size: 10 });
      const genome2 = new Genome({ size: 10 });
      for (let i = 0; i < 10; i++) {
        genome1.setGene(i, 0.5);
        genome2.setGene(i, 0.5);
      }

      expect(genome1.hammingDistanceFrom(genome2)).toBe(0);
    });

    it('should count bit differences correctly', () => {
      const genome1 = new Genome({ size: 4 });
      const genome2 = new Genome({ size: 4 });

      // Using threshold 0: positive = 1, negative = 0
      genome1.setGene(0, 0.5);  // bit: 1
      genome1.setGene(1, -0.5); // bit: 0
      genome1.setGene(2, 0.5);  // bit: 1
      genome1.setGene(3, -0.5); // bit: 0

      genome2.setGene(0, 0.5);  // bit: 1 (same)
      genome2.setGene(1, 0.5);  // bit: 1 (different)
      genome2.setGene(2, -0.5); // bit: 0 (different)
      genome2.setGene(3, -0.5); // bit: 0 (same)

      expect(genome1.hammingDistanceFrom(genome2)).toBe(2);
    });

    it('should respect custom threshold', () => {
      const genome1 = new Genome({ size: 4 });
      const genome2 = new Genome({ size: 4 });

      // With threshold 0.5: >= 0.5 = 1, < 0.5 = 0
      genome1.setGene(0, 0.6);  // bit: 1
      genome1.setGene(1, 0.4);  // bit: 0
      genome1.setGene(2, 0.6);  // bit: 1
      genome1.setGene(3, 0.4);  // bit: 0

      genome2.setGene(0, 0.6);  // bit: 1 (same)
      genome2.setGene(1, 0.6);  // bit: 1 (different)
      genome2.setGene(2, 0.4);  // bit: 0 (different)
      genome2.setGene(3, 0.4);  // bit: 0 (same)

      expect(genome1.hammingDistanceFrom(genome2, 0.5)).toBe(2);
    });

    it('should throw error for different size genomes', () => {
      const genome1 = new Genome({ size: 10 });
      const genome2 = new Genome({ size: 5 });

      expect(() => genome1.hammingDistanceFrom(genome2)).toThrow();
    });

    it('should return normalized hamming distance in [0, 1]', () => {
      const genome1 = new Genome({ size: 10 });
      const genome2 = new Genome({ size: 10 });

      // All different
      for (let i = 0; i < 10; i++) {
        genome1.setGene(i, 0.5);
        genome2.setGene(i, -0.5);
      }

      const normalized = genome1.normalizedHammingDistanceFrom(genome2);
      expect(normalized).toBe(1); // All 10 bits different
    });

    it('should check breeding compatibility', () => {
      const genome1 = new Genome({ size: 10 });
      const genome2 = new Genome({ size: 10 });

      // 3 bits different
      for (let i = 0; i < 10; i++) {
        genome1.setGene(i, 0.5);
        genome2.setGene(i, i < 3 ? -0.5 : 0.5);
      }

      expect(genome1.canBreedWith(genome2, 5)).toBe(true);  // 3 <= 5
      expect(genome1.canBreedWith(genome2, 2)).toBe(false); // 3 > 2
    });
  });
});
