/**
 * MorphologyGenome.test.ts - Tests for morphology genome encoding
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MorphologyGenome } from './MorphologyGenome';
import { Genome } from '../genetics/Genome';
import {
  SegmentGene,
  GENES_PER_SEGMENT,
  MorphologyPreset,
} from './types';

describe('MorphologyGenome', () => {
  let morphGenome: MorphologyGenome;

  beforeEach(() => {
    morphGenome = MorphologyGenome.random();
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create random morphology genome', () => {
      expect(morphGenome).toBeDefined();
      expect(morphGenome.geneCount).toBeGreaterThan(0);
    });

    it('should create with custom segment count', () => {
      const customGenome = MorphologyGenome.random({ maxSegmentGenes: 8 });
      expect(customGenome.segmentCount).toBe(8);
    });

    it('should create from existing base genome', () => {
      const baseGenome = Genome.withSize(GENES_PER_SEGMENT * 10);
      const fromBase = MorphologyGenome.fromGenome(baseGenome);

      expect(fromBase).toBeDefined();
      expect(fromBase.getBaseGenome()).toBe(baseGenome);
    });

    it('should have correct gene count based on config', () => {
      const config = { segmentGeneCount: 20, maxSegmentGenes: 10 };
      const customGenome = MorphologyGenome.random(config);

      expect(customGenome.geneCount).toBe(20 * 10);
    });
  });

  // =====================
  // PRESET TESTS
  // =====================
  describe('presets', () => {
    it('should create blob preset', () => {
      const blob = MorphologyGenome.fromPreset('blob');
      expect(blob).toBeDefined();
      expect(blob.segmentCount).toBeGreaterThan(0);
    });

    it('should create biped preset', () => {
      const biped = MorphologyGenome.fromPreset('biped');
      expect(biped).toBeDefined();
    });

    it('should create quadruped preset', () => {
      const quadruped = MorphologyGenome.fromPreset('quadruped');
      expect(quadruped).toBeDefined();
    });

    it('should create serpent preset', () => {
      const serpent = MorphologyGenome.fromPreset('serpent');
      expect(serpent).toBeDefined();
    });

    it('should create radial preset', () => {
      const radial = MorphologyGenome.fromPreset('radial');
      expect(radial).toBeDefined();
    });

    it('should create asymmetric preset', () => {
      const asymmetric = MorphologyGenome.fromPreset('asymmetric');
      expect(asymmetric).toBeDefined();
    });

    it('should set root segment genes from preset', () => {
      const blob = MorphologyGenome.fromPreset('blob');
      const dimensions = blob.getSegmentDimensions(0);

      // Blob preset has 1.0, 1.0, 1.0 as base dimensions
      expect(dimensions.length).toBeGreaterThan(0);
    });
  });

  // =====================
  // SEGMENT GENE ACCESS TESTS
  // =====================
  describe('segment gene access', () => {
    it('should get segment gene value', () => {
      const value = morphGenome.getSegmentGene(0, SegmentGene.LENGTH);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });

    it('should set segment gene value', () => {
      morphGenome.setSegmentGene(0, SegmentGene.LENGTH, 0.75);
      expect(morphGenome.getSegmentGene(0, SegmentGene.LENGTH)).toBe(0.75);
    });

    it('should clamp segment gene to valid range', () => {
      morphGenome.setSegmentGene(0, SegmentGene.LENGTH, 1.5);
      expect(morphGenome.getSegmentGene(0, SegmentGene.LENGTH)).toBe(1);

      morphGenome.setSegmentGene(0, SegmentGene.WIDTH, -0.5);
      expect(morphGenome.getSegmentGene(0, SegmentGene.WIDTH)).toBe(0);
    });

    it('should get all genes for a segment', () => {
      const genes = morphGenome.getSegmentGenes(0);
      expect(genes).toHaveLength(GENES_PER_SEGMENT);
    });

    it('should set all genes for a segment', () => {
      const newGenes = Array(GENES_PER_SEGMENT).fill(0.5);
      morphGenome.setSegmentGenes(0, newGenes);

      const genes = morphGenome.getSegmentGenes(0);
      genes.forEach(g => expect(g).toBe(0.5));
    });
  });

  // =====================
  // DIMENSION TESTS
  // =====================
  describe('dimensions', () => {
    it('should get segment dimensions', () => {
      const dims = morphGenome.getSegmentDimensions(0);

      expect(dims.length).toBeDefined();
      expect(dims.width).toBeDefined();
      expect(dims.height).toBeDefined();
    });

    it('should scale dimensions to min/max range', () => {
      morphGenome.setSegmentGene(0, SegmentGene.LENGTH, 0);
      morphGenome.setSegmentGene(0, SegmentGene.WIDTH, 1);

      const dims = morphGenome.getSegmentDimensions(0, 0.1, 2.0);

      expect(dims.length).toBeCloseTo(0.1, 2);
      expect(dims.width).toBeCloseTo(2.0, 2);
    });
  });

  // =====================
  // ATTACHMENT TESTS
  // =====================
  describe('attachment', () => {
    it('should get segment attachment point', () => {
      const attachment = morphGenome.getSegmentAttachment(0);

      expect(attachment.x).toBeDefined();
      expect(attachment.y).toBeDefined();
      expect(attachment.z).toBeDefined();
      expect(attachment.pitch).toBeDefined();
      expect(attachment.yaw).toBeDefined();
      expect(attachment.roll).toBeDefined();
    });

    it('should normalize attachment position to [-1, 1]', () => {
      morphGenome.setSegmentGene(0, SegmentGene.ATTACH_X, 0);
      morphGenome.setSegmentGene(0, SegmentGene.ATTACH_Y, 1);

      const attachment = morphGenome.getSegmentAttachment(0);

      expect(attachment.x).toBe(-1);
      expect(attachment.y).toBe(1);
    });

    it('should normalize angles to [-PI, PI]', () => {
      morphGenome.setSegmentGene(0, SegmentGene.PITCH, 0.5);

      const attachment = morphGenome.getSegmentAttachment(0);

      expect(attachment.pitch).toBeGreaterThanOrEqual(-Math.PI);
      expect(attachment.pitch).toBeLessThanOrEqual(Math.PI);
    });
  });

  // =====================
  // PROPERTIES TESTS
  // =====================
  describe('properties', () => {
    it('should get segment properties', () => {
      const props = morphGenome.getSegmentProperties(0);

      expect(props.density).toBeDefined();
      expect(props.flexibility).toBeDefined();
      expect(typeof props.hasNeurons).toBe('boolean');
      expect(typeof props.hasSensors).toBe('boolean');
      expect(typeof props.hasEffectors).toBe('boolean');
    });

    it('should threshold boolean properties correctly', () => {
      morphGenome.setSegmentGene(0, SegmentGene.HAS_NEURONS, 0.6);
      morphGenome.setSegmentGene(0, SegmentGene.HAS_SENSORS, 0.4);

      const props = morphGenome.getSegmentProperties(0, 0.5);

      expect(props.hasNeurons).toBe(true);
      expect(props.hasSensors).toBe(false);
    });

    it('should scale density to configured range', () => {
      morphGenome.setSegmentGene(0, SegmentGene.DENSITY, 1);

      const props = morphGenome.getSegmentProperties(0, 0.5, 0.5, 2.0);

      expect(props.density).toBe(2.0);
    });
  });

  // =====================
  // RECURSION TESTS
  // =====================
  describe('recursion', () => {
    it('should get recursion parameters', () => {
      const recursion = morphGenome.getSegmentRecursion(0);

      expect(recursion.depth).toBeDefined();
      expect(typeof recursion.mirror).toBe('boolean');
    });

    it('should scale depth to max depth', () => {
      morphGenome.setSegmentGene(0, SegmentGene.RECURSION_DEPTH, 1);

      const recursion = morphGenome.getSegmentRecursion(0, 8);

      expect(recursion.depth).toBe(8);
    });

    it('should threshold mirror symmetry', () => {
      morphGenome.setSegmentGene(0, SegmentGene.MIRROR_SYMMETRY, 0.6);
      expect(morphGenome.getSegmentRecursion(0).mirror).toBe(true);

      morphGenome.setSegmentGene(0, SegmentGene.MIRROR_SYMMETRY, 0.4);
      expect(morphGenome.getSegmentRecursion(0).mirror).toBe(false);
    });
  });

  // =====================
  // CHILD CONTROL TESTS
  // =====================
  describe('child control', () => {
    it('should get child count', () => {
      const count = morphGenome.getChildCount(0);
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should scale child count to max', () => {
      morphGenome.setSegmentGene(0, SegmentGene.CHILD_COUNT, 1);

      const count = morphGenome.getChildCount(0, 4);

      expect(count).toBe(4);
    });

    it('should get child scale factor', () => {
      const scale = morphGenome.getChildScale(0);

      expect(scale).toBeGreaterThanOrEqual(0.5);
      expect(scale).toBeLessThanOrEqual(1.0);
    });
  });

  // =====================
  // GENETIC OPERATIONS
  // =====================
  describe('genetic operations', () => {
    it('should mutate genome', () => {
      const mutated = morphGenome.mutate(0.5, 0.5);

      expect(mutated).not.toBe(morphGenome);
      expect(mutated.geneCount).toBe(morphGenome.geneCount);
    });

    it('should create different values with high mutation', () => {
      // Run multiple mutations to ensure some difference
      let different = false;
      for (let i = 0; i < 10; i++) {
        const mutated = morphGenome.mutate(1.0, 1.0);

        // Check multiple genes to increase chance of detecting mutation
        for (let g = 0; g < GENES_PER_SEGMENT; g++) {
          const original = morphGenome.getSegmentGene(0, g);
          const mutatedVal = mutated.getSegmentGene(0, g);

          if (Math.abs(original - mutatedVal) > 0.001) {
            different = true;
            break;
          }
        }
        if (different) break;
      }

      expect(different).toBe(true);
    });

    it('should clone genome', () => {
      const clone = morphGenome.clone();

      expect(clone).not.toBe(morphGenome);
      expect(clone.id).not.toBe(morphGenome.id);

      // Values should be same
      for (let i = 0; i < GENES_PER_SEGMENT; i++) {
        expect(clone.getSegmentGene(0, i)).toBe(morphGenome.getSegmentGene(0, i));
      }
    });

    it('should crossover with another genome', () => {
      const other = MorphologyGenome.random();
      const offspring = morphGenome.crossover(other);

      expect(offspring).toBeDefined();
      expect(offspring.geneCount).toBe(morphGenome.geneCount);
    });
  });

  // =====================
  // DISTANCE TESTS
  // =====================
  describe('genetic distance', () => {
    it('should calculate distance to another genome', () => {
      const other = MorphologyGenome.random();
      const distance = morphGenome.distanceTo(other);

      expect(distance).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for distance to clone', () => {
      const clone = morphGenome.clone();
      const distance = morphGenome.distanceTo(clone);

      expect(distance).toBeCloseTo(0, 5);
    });
  });

  // =====================
  // SERIALIZATION TESTS
  // =====================
  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const json = morphGenome.toJSON();

      expect(json).toBeDefined();
      expect((json as any).genome).toBeDefined();
      expect((json as any).config).toBeDefined();
    });

    it('should deserialize from JSON', () => {
      const json = morphGenome.toJSON() as any;
      const restored = MorphologyGenome.fromJSON(json);

      expect(restored.geneCount).toBe(morphGenome.geneCount);
      expect(restored.segmentCount).toBe(morphGenome.segmentCount);
    });

    it('should preserve gene values through serialization', () => {
      morphGenome.setSegmentGene(0, SegmentGene.LENGTH, 0.42);

      const json = morphGenome.toJSON() as any;
      const restored = MorphologyGenome.fromJSON(json);

      expect(restored.getSegmentGene(0, SegmentGene.LENGTH)).toBeCloseTo(0.42, 5);
    });
  });

  // =====================
  // IDENTITY TESTS
  // =====================
  describe('identity', () => {
    it('should have unique ID', () => {
      const other = MorphologyGenome.random();
      expect(morphGenome.id).not.toBe(other.id);
    });

    it('should track generation', () => {
      expect(morphGenome.generation).toBeDefined();
    });

    it('should get config', () => {
      const config = morphGenome.getConfig();
      expect(config.segmentGeneCount).toBe(GENES_PER_SEGMENT);
    });
  });
});
