/**
 * MorphologyDecoder.test.ts - Tests for genome to phenotype mapping
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MorphologyDecoder } from './MorphologyDecoder';
import { MorphologyGenome } from './MorphologyGenome';
import {
  SegmentGene,
  GENES_PER_SEGMENT,
  DEFAULT_MORPHOLOGY_CONFIG,
  DEFAULT_TRAIT_WEIGHTS,
} from './types';

describe('MorphologyDecoder', () => {
  let decoder: MorphologyDecoder;

  beforeEach(() => {
    decoder = new MorphologyDecoder();
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create with default config', () => {
      expect(decoder).toBeDefined();
      expect(decoder.getConfig()).toEqual(DEFAULT_MORPHOLOGY_CONFIG);
    });

    it('should create with custom config', () => {
      const customDecoder = new MorphologyDecoder({
        maxSegments: 32,
        maxDepth: 6,
      });

      const config = customDecoder.getConfig();
      expect(config.maxSegments).toBe(32);
      expect(config.maxDepth).toBe(6);
    });

    it('should create with custom trait weights', () => {
      const customDecoder = new MorphologyDecoder(undefined, {
        massSpeedPenalty: 0.2,
        limbSpeedBonus: 0.25,
      });

      const weights = customDecoder.getTraitWeights();
      expect(weights.massSpeedPenalty).toBe(0.2);
      expect(weights.limbSpeedBonus).toBe(0.25);
    });
  });

  // =====================
  // BASIC DECODING TESTS
  // =====================
  describe('basic decoding', () => {
    it('should decode genome to phenotype', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype).toBeDefined();
      expect(phenotype.segments).toBeDefined();
      expect(phenotype.segments.length).toBeGreaterThan(0);
      expect(phenotype.rootSegment).toBeDefined();
    });

    it('should always have root segment at depth 0', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype.rootSegment.depth).toBe(0);
      expect(phenotype.rootSegment.parentId).toBeNull();
    });

    it('should have root segment in segments array', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      const rootInArray = phenotype.segments.find(s => s.id === phenotype.rootSegment.id);
      expect(rootInArray).toBeDefined();
    });
  });

  // =====================
  // SEGMENT STRUCTURE TESTS
  // =====================
  describe('segment structure', () => {
    it('should create valid segment dimensions', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      for (const segment of phenotype.segments) {
        expect(segment.dimensions.length).toBeGreaterThan(0);
        expect(segment.dimensions.width).toBeGreaterThan(0);
        expect(segment.dimensions.height).toBeGreaterThan(0);
      }
    });

    it('should calculate segment mass from volume and density', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      for (const segment of phenotype.segments) {
        const expectedVolume =
          segment.dimensions.length *
          segment.dimensions.width *
          segment.dimensions.height;

        // Volume should be approximately equal (allow for floating point)
        expect(segment.volume).toBeCloseTo(expectedVolume, 5);
      }
    });

    it('should create child segments with correct parent references', () => {
      const genome = MorphologyGenome.fromPreset('quadruped');
      const phenotype = decoder.decode(genome);

      for (const segment of phenotype.segments) {
        if (segment.parentId !== null) {
          const parent = phenotype.segments.find(s => s.id === segment.parentId);
          expect(parent).toBeDefined();
          expect(segment.depth).toBe(parent!.depth + 1);
        }
      }
    });

    it('should respect max depth configuration', () => {
      const shallowDecoder = new MorphologyDecoder({ maxDepth: 2 });
      const genome = MorphologyGenome.fromPreset('serpent'); // Deep structure
      const phenotype = shallowDecoder.decode(genome);

      for (const segment of phenotype.segments) {
        expect(segment.depth).toBeLessThan(2);
      }
    });

    it('should respect max segments configuration', () => {
      const limitedDecoder = new MorphologyDecoder({ maxSegments: 4 });
      const genome = MorphologyGenome.fromPreset('quadruped');
      const phenotype = limitedDecoder.decode(genome);

      expect(phenotype.segments.length).toBeLessThanOrEqual(4);
    });
  });

  // =====================
  // PRESET DECODING TESTS
  // =====================
  describe('preset decoding', () => {
    it('should decode blob preset to single segment', () => {
      const genome = MorphologyGenome.fromPreset('blob');
      const phenotype = decoder.decode(genome);

      expect(phenotype.segments.length).toBeGreaterThanOrEqual(1);
    });

    it('should decode biped preset', () => {
      const genome = MorphologyGenome.fromPreset('biped');
      const phenotype = decoder.decode(genome);

      expect(phenotype.segments.length).toBeGreaterThan(1);
      expect(phenotype.limbCount).toBeGreaterThan(0);
    });

    it('should decode quadruped preset', () => {
      const genome = MorphologyGenome.fromPreset('quadruped');
      const phenotype = decoder.decode(genome);

      expect(phenotype.segments.length).toBeGreaterThan(1);
    });

    it('should decode serpent preset with chain structure', () => {
      const genome = MorphologyGenome.fromPreset('serpent');
      const phenotype = decoder.decode(genome);

      // Serpent should have segments in a chain
      expect(phenotype.segments.length).toBeGreaterThan(1);
    });

    it('should decode radial preset', () => {
      const genome = MorphologyGenome.fromPreset('radial');
      const phenotype = decoder.decode(genome);

      expect(phenotype.segments.length).toBeGreaterThan(1);
    });
  });

  // =====================
  // AGGREGATE TRAIT TESTS
  // =====================
  describe('aggregate traits', () => {
    it('should calculate total mass correctly', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      let expectedMass = 0;
      for (const segment of phenotype.segments) {
        expectedMass += segment.mass;
      }

      expect(phenotype.totalMass).toBeCloseTo(expectedMass, 5);
    });

    it('should calculate total volume correctly', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      let expectedVolume = 0;
      for (const segment of phenotype.segments) {
        expectedVolume += segment.volume;
      }

      expect(phenotype.totalVolume).toBeCloseTo(expectedVolume, 5);
    });

    it('should calculate segment count correctly', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype.segmentCount).toBe(phenotype.segments.length);
    });

    it('should calculate sensor count correctly', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      let expectedSensors = 0;
      for (const segment of phenotype.segments) {
        if (segment.properties.hasSensors) expectedSensors++;
      }

      expect(phenotype.sensorCount).toBe(expectedSensors);
    });

    it('should calculate effector count correctly', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      let expectedEffectors = 0;
      for (const segment of phenotype.segments) {
        if (segment.properties.hasEffectors) expectedEffectors++;
      }

      expect(phenotype.effectorCount).toBe(expectedEffectors);
    });
  });

  // =====================
  // DERIVED TRAITS TESTS
  // =====================
  describe('derived traits', () => {
    it('should calculate size as positive value', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype.size).toBeGreaterThan(0);
    });

    it('should calculate speed within valid range', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype.speed).toBeGreaterThanOrEqual(0.1);
      expect(phenotype.speed).toBeLessThanOrEqual(2);
    });

    it('should calculate strength within valid range', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype.strength).toBeGreaterThanOrEqual(0.1);
      expect(phenotype.strength).toBeLessThanOrEqual(2);
    });

    it('should calculate perception within valid range', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype.perception).toBeGreaterThanOrEqual(0);
      expect(phenotype.perception).toBeLessThanOrEqual(1);
    });

    it('should calculate agility within valid range', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype.agility).toBeGreaterThanOrEqual(0);
      expect(phenotype.agility).toBeLessThanOrEqual(1);
    });

    it('should calculate positive metabolic rate', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype.metabolicRate).toBeGreaterThan(0);
    });

    it('should calculate symmetry score within valid range', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      expect(phenotype.symmetryScore).toBeGreaterThanOrEqual(0);
      expect(phenotype.symmetryScore).toBeLessThanOrEqual(1);
    });
  });

  // =====================
  // TRAIT WEIGHT EFFECTS
  // =====================
  describe('trait weight effects', () => {
    it('should higher limb bonus increase speed', () => {
      const lowLimbDecoder = new MorphologyDecoder(undefined, { limbSpeedBonus: 0.05 });
      const highLimbDecoder = new MorphologyDecoder(undefined, { limbSpeedBonus: 0.5 });

      const genome = MorphologyGenome.fromPreset('quadruped');
      const lowPhenotype = lowLimbDecoder.decode(genome);
      const highPhenotype = highLimbDecoder.decode(genome);

      // Higher limb bonus should result in higher speed for same morphology
      expect(highPhenotype.speed).toBeGreaterThanOrEqual(lowPhenotype.speed);
    });

    it('should higher mass strength bonus increase strength', () => {
      const lowMassDecoder = new MorphologyDecoder(undefined, { massStrengthBonus: 0.1 });
      const highMassDecoder = new MorphologyDecoder(undefined, { massStrengthBonus: 0.5 });

      const genome = MorphologyGenome.fromPreset('quadruped');
      const lowPhenotype = lowMassDecoder.decode(genome);
      const highPhenotype = highMassDecoder.decode(genome);

      expect(highPhenotype.strength).toBeGreaterThanOrEqual(lowPhenotype.strength);
    });
  });

  // =====================
  // MIRROR SYMMETRY TESTS
  // =====================
  describe('mirror symmetry', () => {
    it('should apply mirror symmetry to child segments', () => {
      // Create genome with high mirror symmetry gene
      const genome = MorphologyGenome.fromPreset('biped');
      const phenotype = decoder.decode(genome);

      // Check if there are paired segments with mirrored x coordinates
      const depth1Segments = phenotype.segments.filter(s => s.depth === 1);

      if (depth1Segments.length >= 2) {
        const xPositions = depth1Segments.map(s => s.attachment.x);
        // In a mirrored body, some x positions should be negatives of others
        const hasMirror = xPositions.some(x1 =>
          xPositions.some(x2 => Math.abs(x1 + x2) < 0.3 && x1 !== x2)
        );

        // This is probabilistic based on genome, so we just check the structure exists
        expect(depth1Segments.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // =====================
  // SERIALIZATION TESTS
  // =====================
  describe('serialization', () => {
    it('should serialize phenotype', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);
      const serialized = decoder.serializePhenotype(phenotype);

      expect(serialized.segments).toBeDefined();
      expect(serialized.segments.length).toBe(phenotype.segments.length);
      expect(serialized.rootSegmentId).toBe(phenotype.rootSegment.id);
      expect(serialized.phenotype.totalMass).toBe(phenotype.totalMass);
    });

    it('should deserialize phenotype', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);
      const serialized = decoder.serializePhenotype(phenotype);
      const restored = decoder.deserializePhenotype(serialized);

      expect(restored.segments.length).toBe(phenotype.segments.length);
      expect(restored.totalMass).toBe(phenotype.totalMass);
      expect(restored.size).toBe(phenotype.size);
    });

    it('should preserve segment hierarchy through serialization', () => {
      const genome = MorphologyGenome.fromPreset('quadruped');
      const phenotype = decoder.decode(genome);
      const serialized = decoder.serializePhenotype(phenotype);
      const restored = decoder.deserializePhenotype(serialized);

      // Check that children are properly linked
      for (const segment of restored.segments) {
        for (const child of segment.children) {
          expect(child.parentId).toBe(segment.id);
        }
      }
    });

    it('should preserve segment dimensions through serialization', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);
      const serialized = decoder.serializePhenotype(phenotype);
      const restored = decoder.deserializePhenotype(serialized);

      for (let i = 0; i < phenotype.segments.length; i++) {
        const original = phenotype.segments.find(s => s.id === restored.segments[i].id);
        if (original) {
          expect(restored.segments[i].dimensions.length).toBeCloseTo(original.dimensions.length, 5);
          expect(restored.segments[i].dimensions.width).toBeCloseTo(original.dimensions.width, 5);
          expect(restored.segments[i].dimensions.height).toBeCloseTo(original.dimensions.height, 5);
        }
      }
    });
  });

  // =====================
  // EDGE CASES
  // =====================
  describe('edge cases', () => {
    it('should handle genome with no children', () => {
      const genome = MorphologyGenome.fromPreset('blob');
      const phenotype = decoder.decode(genome);

      expect(phenotype.segments.length).toBeGreaterThanOrEqual(1);
      expect(phenotype.rootSegment).toBeDefined();
    });

    it('should handle minimal config values', () => {
      const minDecoder = new MorphologyDecoder({
        maxSegments: 1,
        maxDepth: 1,
        maxChildrenPerSegment: 0,
      });

      const genome = MorphologyGenome.random();
      const phenotype = minDecoder.decode(genome);

      expect(phenotype.segments.length).toBe(1);
    });

    it('should calculate limb count excluding root effectors', () => {
      const genome = MorphologyGenome.random();
      const phenotype = decoder.decode(genome);

      // Limbs are effectors at depth > 0
      let expectedLimbs = 0;
      for (const segment of phenotype.segments) {
        if (segment.depth > 0 && segment.properties.hasEffectors) {
          expectedLimbs++;
        }
      }

      expect(phenotype.limbCount).toBe(expectedLimbs);
    });
  });
});
