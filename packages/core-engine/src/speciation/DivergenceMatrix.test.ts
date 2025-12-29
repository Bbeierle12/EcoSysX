/**
 * DivergenceMatrix.test.ts - Unit tests for DivergenceMatrix class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DivergenceMatrix } from './DivergenceMatrix';
import { Genome } from '../genetics/Genome';
import { PopulationDescriptor } from './types';

describe('DivergenceMatrix', () => {
  let matrix: DivergenceMatrix;

  beforeEach(() => {
    matrix = new DivergenceMatrix({
      maxPopulations: 100,
      divergenceThreshold: 0.5,
      divergenceDecayRate: 0.01,
      isolationAccumulationRate: 0.02,
      updateInterval: 10,
    });
  });

  // Helper to create a population descriptor
  const createPopulation = (
    id: string,
    genomeSize: number = 10,
    geneValue: number = 0.5
  ): PopulationDescriptor => {
    const centroid = new Float32Array(genomeSize);
    for (let i = 0; i < genomeSize; i++) {
      centroid[i] = geneValue;
    }
    return {
      id,
      lineageId: `lineage_${id}`,
      centroidGenome: centroid,
      memberCount: 10,
      spatialCenter: { x: 0, y: 0 },
      spatialRadius: 50,
      generation: 1,
      createdAtTick: 0,
      lastUpdateTick: 0,
    };
  };

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create an empty matrix', () => {
      expect(matrix.populationCount).toBe(0);
      expect(matrix.entryCount).toBe(0);
    });

    it('should use provided config', () => {
      const config = matrix.getConfig();
      expect(config.divergenceThreshold).toBe(0.5);
      expect(config.maxPopulations).toBe(100);
    });
  });

  // =====================
  // POPULATION REGISTRATION TESTS
  // =====================
  describe('registerPopulation', () => {
    it('should register a new population', () => {
      const pop = createPopulation('pop1');
      matrix.registerPopulation(pop);

      expect(matrix.populationCount).toBe(1);
      expect(matrix.getPopulation('pop1')).toBeDefined();
    });

    it('should update existing population', () => {
      const pop = createPopulation('pop1');
      matrix.registerPopulation(pop);

      pop.memberCount = 20;
      matrix.registerPopulation(pop);

      expect(matrix.populationCount).toBe(1);
      expect(matrix.getPopulation('pop1')?.memberCount).toBe(20);
    });

    it('should create divergence entries between populations', () => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));

      expect(matrix.entryCount).toBe(1); // One pair
    });

    it('should create entries for multiple populations', () => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));
      matrix.registerPopulation(createPopulation('pop3'));

      // 3 populations = 3 pairs (1-2, 1-3, 2-3)
      expect(matrix.entryCount).toBe(3);
    });
  });

  // =====================
  // DIVERGENCE GET/SET TESTS
  // =====================
  describe('getDivergence/setDivergence', () => {
    beforeEach(() => {
      matrix.registerPopulation(createPopulation('pop1', 10, 0.0));
      matrix.registerPopulation(createPopulation('pop2', 10, 0.5));
    });

    it('should get initial divergence based on genetic distance', () => {
      const divergence = matrix.getDivergence('pop1', 'pop2');
      expect(divergence).toBeGreaterThan(0);
    });

    it('should return 0 for same population', () => {
      expect(matrix.getDivergence('pop1', 'pop1')).toBe(0);
    });

    it('should set divergence value', () => {
      matrix.setDivergence('pop1', 'pop2', 0.75, 100);
      expect(matrix.getDivergence('pop1', 'pop2')).toBe(0.75);
    });

    it('should clamp divergence to [0, 1]', () => {
      matrix.setDivergence('pop1', 'pop2', 1.5, 100);
      expect(matrix.getDivergence('pop1', 'pop2')).toBe(1);

      matrix.setDivergence('pop1', 'pop2', -0.5, 100);
      expect(matrix.getDivergence('pop1', 'pop2')).toBe(0);
    });

    it('should be symmetric (order-independent)', () => {
      matrix.setDivergence('pop1', 'pop2', 0.6, 100);

      expect(matrix.getDivergence('pop1', 'pop2')).toBe(0.6);
      expect(matrix.getDivergence('pop2', 'pop1')).toBe(0.6);
    });
  });

  // =====================
  // GENE FLOW TESTS
  // =====================
  describe('recordGeneFlow', () => {
    beforeEach(() => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));
      matrix.setDivergence('pop1', 'pop2', 0.5, 0);
    });

    it('should reduce divergence on gene flow', () => {
      const before = matrix.getDivergence('pop1', 'pop2');

      matrix.recordGeneFlow({
        tick: 100,
        sourcePopulationId: 'pop1',
        targetPopulationId: 'pop2',
        genomeId: 'genome_123',
        geneFlowStrength: 0.5,
      });

      const after = matrix.getDivergence('pop1', 'pop2');
      expect(after).toBeLessThan(before);
    });

    it('should update gene flow tracking', () => {
      matrix.recordGeneFlow({
        tick: 100,
        sourcePopulationId: 'pop1',
        targetPopulationId: 'pop2',
        genomeId: 'genome_123',
        geneFlowStrength: 0.5,
      });

      const entry = matrix.getDivergenceEntry('pop1', 'pop2');
      expect(entry?.hasGeneFlow).toBe(true);
      expect(entry?.lastGeneFlowTick).toBe(100);
    });
  });

  // =====================
  // UPDATE TESTS
  // =====================
  describe('update', () => {
    beforeEach(() => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));
      matrix.setDivergence('pop1', 'pop2', 0.3, 0);
    });

    it('should increase divergence when isolated', () => {
      const before = matrix.getDivergence('pop1', 'pop2');

      // Simulate many ticks without gene flow
      for (let tick = 1; tick <= 100; tick++) {
        matrix.update(tick);
      }

      const after = matrix.getDivergence('pop1', 'pop2');
      expect(after).toBeGreaterThan(before);
    });

    it('should decrease divergence with recent gene flow', () => {
      matrix.setDivergence('pop1', 'pop2', 0.5, 0);

      // Record gene flow
      matrix.recordGeneFlow({
        tick: 5,
        sourcePopulationId: 'pop1',
        targetPopulationId: 'pop2',
        genomeId: 'genome_123',
        geneFlowStrength: 0.3,
      });

      const before = matrix.getDivergence('pop1', 'pop2');
      matrix.update(6);
      const after = matrix.getDivergence('pop1', 'pop2');

      expect(after).toBeLessThanOrEqual(before);
    });
  });

  // =====================
  // SPECIATION TESTS
  // =====================
  describe('speciation detection', () => {
    it('should detect when populations should speciate', () => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));
      matrix.setDivergence('pop1', 'pop2', 0.6, 0); // Above 0.5 threshold

      expect(matrix.shouldSpeciate('pop1', 'pop2')).toBe(true);
    });

    it('should not trigger speciation below threshold', () => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));
      matrix.setDivergence('pop1', 'pop2', 0.3, 0); // Below threshold

      expect(matrix.shouldSpeciate('pop1', 'pop2')).toBe(false);
    });

    it('should return speciation candidates sorted by divergence', () => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));
      matrix.registerPopulation(createPopulation('pop3'));

      matrix.setDivergence('pop1', 'pop2', 0.6, 0);
      matrix.setDivergence('pop1', 'pop3', 0.8, 0);
      matrix.setDivergence('pop2', 'pop3', 0.4, 0); // Below threshold

      const candidates = matrix.getSpeciationCandidates();

      expect(candidates).toHaveLength(2);
      expect(candidates[0].divergence).toBe(0.8);
      expect(candidates[1].divergence).toBe(0.6);
    });
  });

  // =====================
  // POPULATION CENTROID TESTS
  // =====================
  describe('updatePopulationCentroid', () => {
    it('should update centroid from sampled genomes', () => {
      matrix.registerPopulation(createPopulation('pop1', 10, 0.5));

      const genomes = [
        Genome.fromJSON({ genes: Array(10).fill(0.8) }),
        Genome.fromJSON({ genes: Array(10).fill(0.9) }),
      ];

      matrix.updatePopulationCentroid('pop1', genomes, 100);

      const pop = matrix.getPopulation('pop1');
      expect(pop?.centroidGenome[0]).toBeCloseTo(0.85, 2);
    });
  });

  // =====================
  // REMOVE POPULATION TESTS
  // =====================
  describe('removePopulation', () => {
    it('should remove population and its entries', () => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));
      matrix.registerPopulation(createPopulation('pop3'));

      expect(matrix.populationCount).toBe(3);
      expect(matrix.entryCount).toBe(3);

      matrix.removePopulation('pop2');

      expect(matrix.populationCount).toBe(2);
      expect(matrix.entryCount).toBe(1); // Only pop1-pop3 remains
    });
  });

  // =====================
  // STATISTICS TESTS
  // =====================
  describe('statistics', () => {
    it('should calculate average divergence', () => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));
      matrix.registerPopulation(createPopulation('pop3'));

      matrix.setDivergence('pop1', 'pop2', 0.3, 0);
      matrix.setDivergence('pop1', 'pop3', 0.5, 0);
      matrix.setDivergence('pop2', 'pop3', 0.7, 0);

      const avg = matrix.getAverageDivergence();
      expect(avg).toBeCloseTo(0.5, 2);
    });

    it('should return 0 average for empty matrix', () => {
      expect(matrix.getAverageDivergence()).toBe(0);
    });

    it('should get active populations', () => {
      const pop1 = createPopulation('pop1');
      const pop2 = createPopulation('pop2');
      pop2.memberCount = 0; // Extinct

      matrix.registerPopulation(pop1);
      matrix.registerPopulation(pop2);

      const active = matrix.getActivePopulations();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('pop1');
    });
  });

  // =====================
  // SERIALIZATION TESTS
  // =====================
  describe('serialization', () => {
    it('should export to JSON', () => {
      matrix.registerPopulation(createPopulation('pop1'));
      matrix.registerPopulation(createPopulation('pop2'));
      matrix.setDivergence('pop1', 'pop2', 0.5, 100);

      const json = matrix.toJSON();

      expect(json).toHaveProperty('config');
      expect(json).toHaveProperty('populations');
      expect(json).toHaveProperty('entries');
    });
  });
});
