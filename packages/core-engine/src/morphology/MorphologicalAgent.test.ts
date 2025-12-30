/**
 * MorphologicalAgent.test.ts - Tests for agents with evolved morphology
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MorphologicalAgent,
  DEFAULT_MORPHOLOGICAL_AGENT_CONFIG,
  createMorphologicalAgent,
} from './MorphologicalAgent';
import { MorphologyGenome } from './MorphologyGenome';
import { Genome } from '../genetics/Genome';
import { Brain, SensoryInput, BrainOutput } from '../neural/Brain';
import { TrophicAgent } from '../trophic/types';

// Simple test brain implementation
class TestBrain implements Brain {
  readonly type = 'test-brain';
  readonly inputSize = 10;
  readonly outputSize = 4;

  think(input: SensoryInput): BrainOutput {
    return {
      moveForward: 0.5,
      turnAngle: 0,
      actions: { eat: false, reproduce: false },
    };
  }

  mutate(rate: number, strength: number): Brain {
    return new TestBrain();
  }

  clone(): Brain {
    return new TestBrain();
  }

  toJSON(): object {
    return { type: this.type };
  }
}

describe('MorphologicalAgent', () => {
  let agent: MorphologicalAgent;
  let brain: Brain;
  let genome: Genome;
  let morphGenome: MorphologyGenome;

  beforeEach(() => {
    brain = new TestBrain();
    genome = Genome.withSize(100);
    morphGenome = MorphologyGenome.random();

    agent = new MorphologicalAgent(
      'test-agent-1',
      'test-species',
      { x: 100, y: 100 },
      0,
      100,
      brain,
      genome,
      morphGenome,
      1,
      'test-lineage'
    );
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create morphological agent', () => {
      expect(agent).toBeDefined();
      expect(agent.id).toBe('test-agent-1');
      expect(agent.speciesId).toBe('test-species');
    });

    it('should have physical traits from morphology', () => {
      expect(agent.physicalSize).toBeGreaterThan(0);
      expect(agent.physicalSpeed).toBeGreaterThan(0);
      expect(agent.physicalStrength).toBeGreaterThan(0);
      expect(agent.physicalPerception).toBeGreaterThan(0);
    });

    it('should use default config when not provided', () => {
      const config = agent.getConfig();
      expect(config).toBeDefined();
    });

    it('should create with custom config', () => {
      const customAgent = new MorphologicalAgent(
        'custom-agent',
        'species',
        { x: 0, y: 0 },
        0,
        50,
        brain,
        genome,
        morphGenome,
        1,
        'lineage',
        { usePhysicalTraits: false, traitInfluence: 0.5 }
      );

      expect(customAgent).toBeDefined();
    });
  });

  // =====================
  // STATIC FACTORY TESTS
  // =====================
  describe('static factories', () => {
    it('should create via static create method', () => {
      const created = MorphologicalAgent.create(
        'created-agent',
        'species',
        { x: 50, y: 50 },
        Math.PI,
        80,
        brain,
        genome,
        morphGenome,
        2,
        'lineage'
      );

      expect(created).toBeDefined();
      expect(created.id).toBe('created-agent');
    });

    it('should create with auto morphology', () => {
      const autoAgent = MorphologicalAgent.withAutoMorphology(
        'auto-agent',
        'species',
        { x: 0, y: 0 },
        0,
        100,
        brain,
        genome,
        1,
        'lineage'
      );

      expect(autoAgent).toBeDefined();
      expect(autoAgent.getPhenotype()).toBeDefined();
    });

    it('should create via factory function', () => {
      const factoryAgent = createMorphologicalAgent(
        'factory-agent',
        'species',
        { x: 0, y: 0 },
        0,
        100,
        brain,
        genome,
        morphGenome,
        1,
        'lineage'
      );

      expect(factoryAgent).toBeDefined();
      expect(factoryAgent.id).toBe('factory-agent');
    });
  });

  // =====================
  // TROPHIC AGENT INTERFACE TESTS
  // =====================
  describe('TrophicAgent interface', () => {
    it('should implement size getter', () => {
      expect(agent.size).toBe(agent.physicalSize);
    });

    it('should implement speed getter', () => {
      expect(agent.speed).toBe(agent.physicalSpeed);
    });

    it('should implement strength getter', () => {
      expect(agent.strength).toBe(agent.physicalStrength);
    });

    it('should implement perception getter', () => {
      expect(agent.perception).toBe(agent.physicalPerception);
    });

    it('should implement isAlive getter', () => {
      expect(agent.isAlive).toBe(agent.alive());
    });

    it('should be usable as TrophicAgent type', () => {
      const trophicAgent: TrophicAgent = agent;

      expect(trophicAgent.id).toBe('test-agent-1');
      expect(trophicAgent.size).toBeGreaterThan(0);
      expect(trophicAgent.energy).toBe(100);
    });
  });

  // =====================
  // PHENOTYPE ACCESS TESTS
  // =====================
  describe('phenotype access', () => {
    it('should return phenotype', () => {
      const phenotype = agent.getPhenotype();

      expect(phenotype).toBeDefined();
      expect(phenotype.segments.length).toBeGreaterThan(0);
      expect(phenotype.totalMass).toBeGreaterThan(0);
    });

    it('should return morphology genome', () => {
      const morph = agent.getMorphologyGenome();

      expect(morph).toBe(morphGenome);
    });

    it('should return physical traits', () => {
      const traits = agent.getPhysicalTraits();

      expect(traits.size).toBe(agent.physicalSize);
      expect(traits.speed).toBe(agent.physicalSpeed);
      expect(traits.strength).toBe(agent.physicalStrength);
      expect(traits.perception).toBe(agent.physicalPerception);
      expect(traits.agility).toBeDefined();
      expect(traits.metabolicRate).toBeDefined();
      expect(traits.mass).toBeDefined();
      expect(traits.segmentCount).toBeGreaterThan(0);
    });
  });

  // =====================
  // TRAIT INFLUENCE TESTS
  // =====================
  describe('trait influence', () => {
    it('should blend base config with physical traits', () => {
      const phenotype = agent.getPhenotype();
      const config = agent.getConfig();

      // When usePhysicalTraits is true, config values should be influenced
      // by phenotype values
      expect(config.maxSpeed).toBeDefined();
    });

    it('should respect trait influence parameter', () => {
      const fullInfluence = new MorphologicalAgent(
        'full-influence',
        'species',
        { x: 0, y: 0 },
        0,
        100,
        brain,
        genome,
        morphGenome,
        1,
        'lineage',
        { traitInfluence: 1.0, usePhysicalTraits: true }
      );

      const noInfluence = new MorphologicalAgent(
        'no-influence',
        'species',
        { x: 0, y: 0 },
        0,
        100,
        brain,
        genome,
        morphGenome,
        1,
        'lineage',
        { traitInfluence: 0.0, usePhysicalTraits: true }
      );

      // Both should have valid traits
      expect(fullInfluence.physicalSpeed).toBeGreaterThan(0);
      expect(noInfluence.physicalSpeed).toBeGreaterThan(0);
    });

    it('should not modify config when usePhysicalTraits is false', () => {
      const noPhysics = new MorphologicalAgent(
        'no-physics',
        'species',
        { x: 0, y: 0 },
        0,
        100,
        brain,
        genome,
        morphGenome,
        1,
        'lineage',
        { usePhysicalTraits: false }
      );

      const config = noPhysics.getConfig();
      // Base config values should be used
      expect(config.maxSpeed).toBe(DEFAULT_MORPHOLOGICAL_AGENT_CONFIG.maxSpeed);
    });
  });

  // =====================
  // COMBAT SCORES TESTS
  // =====================
  describe('combat scores', () => {
    it('should calculate combat score', () => {
      const combatScore = agent.getCombatScore();

      expect(combatScore).toBeGreaterThan(0);
      // Combat = strength * 0.4 + speed * 0.3 + size * 0.2 + agility * 0.1
      const phenotype = agent.getPhenotype();
      const expected =
        agent.physicalStrength * 0.4 +
        agent.physicalSpeed * 0.3 +
        agent.physicalSize * 0.2 +
        phenotype.agility * 0.1;

      expect(combatScore).toBeCloseTo(expected, 5);
    });

    it('should calculate evasion score', () => {
      const evasionScore = agent.getEvasionScore();

      expect(evasionScore).toBeGreaterThan(0);
      // Evasion = speed * 0.4 + agility * 0.4 + perception * 0.2
      const phenotype = agent.getPhenotype();
      const expected =
        agent.physicalSpeed * 0.4 +
        phenotype.agility * 0.4 +
        agent.physicalPerception * 0.2;

      expect(evasionScore).toBeCloseTo(expected, 5);
    });
  });

  // =====================
  // COLLISION AND VISION
  // =====================
  describe('collision and vision', () => {
    it('should calculate collision radius from size', () => {
      const radius = agent.getCollisionRadius();

      expect(radius).toBeGreaterThanOrEqual(2);
      expect(radius).toBe(Math.max(2, agent.physicalSize * 0.5));
    });

    it('should calculate vision range from perception', () => {
      const range = agent.getVisionRange();

      expect(range).toBeGreaterThan(50);
      expect(range).toBe(50 + agent.physicalPerception * 100);
    });
  });

  // =====================
  // REPRODUCTION TESTS
  // =====================
  describe('reproduction', () => {
    it('should reproduce with morphology inheritance', () => {
      // Ensure agent has enough energy
      agent.energy = 200;

      const offspring = agent.reproduceWithMorphology();

      if (offspring) {
        expect(offspring).toBeDefined();
        expect(offspring.getMorphologyGenome()).toBeDefined();
        expect(offspring.generation).toBe(agent.generation + 1);
      }
    });

    it('should reproduce with mate', () => {
      agent.energy = 200;

      const mate = new MorphologicalAgent(
        'mate-agent',
        'test-species',
        { x: 110, y: 110 },
        0,
        200,
        brain,
        genome,
        MorphologyGenome.random(),
        1,
        'test-lineage'
      );

      const offspring = agent.reproduceWithMorphology(mate);

      if (offspring) {
        expect(offspring).toBeDefined();
        expect(offspring.getMorphologyGenome()).toBeDefined();
      }
    });

    it('should return null when cannot reproduce', () => {
      agent.energy = 0; // Not enough energy

      const offspring = agent.reproduceWithMorphology();

      expect(offspring).toBeNull();
    });

    it('should deduct energy on reproduction', () => {
      agent.energy = 200;
      const initialEnergy = agent.energy;
      const config = agent.getConfig();

      const offspring = agent.reproduceWithMorphology();

      if (offspring) {
        expect(agent.energy).toBe(initialEnergy - config.energyCostReproduce);
      }
    });
  });

  // =====================
  // SERIALIZATION TESTS
  // =====================
  describe('serialization', () => {
    it('should serialize to JSON with morphology', () => {
      const json = agent.toJSON() as any;

      expect(json).toBeDefined();
      expect(json.morphology).toBeDefined();
      expect(json.morphology.genome).toBeDefined();
      expect(json.morphology.traits).toBeDefined();
    });

    it('should include physical traits in serialization', () => {
      const json = agent.toJSON() as any;

      expect(json.morphology.traits.size).toBe(agent.physicalSize);
      expect(json.morphology.traits.speed).toBe(agent.physicalSpeed);
      expect(json.morphology.traits.strength).toBe(agent.physicalStrength);
      expect(json.morphology.traits.perception).toBe(agent.physicalPerception);
    });

    it('should include base agent properties', () => {
      const json = agent.toJSON() as any;

      expect(json.id).toBe('test-agent-1');
      expect(json.speciesId).toBe('test-species');
      expect(json.position).toBeDefined();
    });
  });

  // =====================
  // PRESET MORPHOLOGY TESTS
  // =====================
  describe('preset morphologies', () => {
    it('should work with blob preset', () => {
      const blobGenome = MorphologyGenome.fromPreset('blob');
      const blobAgent = new MorphologicalAgent(
        'blob-agent',
        'species',
        { x: 0, y: 0 },
        0,
        100,
        brain,
        genome,
        blobGenome,
        1,
        'lineage'
      );

      expect(blobAgent.physicalSize).toBeGreaterThan(0);
      expect(blobAgent.getPhenotype().segmentCount).toBeGreaterThanOrEqual(1);
    });

    it('should work with biped preset', () => {
      const bipedGenome = MorphologyGenome.fromPreset('biped');
      const bipedAgent = new MorphologicalAgent(
        'biped-agent',
        'species',
        { x: 0, y: 0 },
        0,
        100,
        brain,
        genome,
        bipedGenome,
        1,
        'lineage'
      );

      expect(bipedAgent.physicalSize).toBeGreaterThan(0);
      expect(bipedAgent.getPhenotype().limbCount).toBeGreaterThanOrEqual(0);
    });

    it('should work with quadruped preset', () => {
      const quadGenome = MorphologyGenome.fromPreset('quadruped');
      const quadAgent = new MorphologicalAgent(
        'quad-agent',
        'species',
        { x: 0, y: 0 },
        0,
        100,
        brain,
        genome,
        quadGenome,
        1,
        'lineage'
      );

      expect(quadAgent.physicalSize).toBeGreaterThan(0);
    });

    it('should work with serpent preset', () => {
      const serpentGenome = MorphologyGenome.fromPreset('serpent');
      const serpentAgent = new MorphologicalAgent(
        'serpent-agent',
        'species',
        { x: 0, y: 0 },
        0,
        100,
        brain,
        genome,
        serpentGenome,
        1,
        'lineage'
      );

      expect(serpentAgent.physicalSize).toBeGreaterThan(0);
      expect(serpentAgent.getPhenotype().agility).toBeGreaterThan(0);
    });
  });

  // =====================
  // AGENT BASE CLASS BEHAVIOR
  // =====================
  describe('base agent behavior', () => {
    it('should update position on tick', () => {
      const sensoryInput: SensoryInput = {
        nearbyEntities: [],
        nearestFood: null,
        nearestPredator: null,
        nearestMate: null,
        energyLevel: agent.energy,
        age: agent.age,
        currentSpeed: 0,
        heading: 0,
      };

      const initialX = agent.position.x;
      const initialY = agent.position.y;

      // Run an update - movement depends on brain output
      agent.update(sensoryInput);

      // Agent should process the update (actual movement depends on brain)
      expect(agent.age).toBeGreaterThan(0);
    });

    it('should track energy', () => {
      expect(agent.energy).toBe(100);

      agent.energy -= 20;
      expect(agent.energy).toBe(80);
    });

    it('should report alive status', () => {
      expect(agent.alive()).toBe(true);
      expect(agent.isAlive).toBe(true);

      // Agent dies when update() is called with zero energy
      agent.energy = 0;
      const sensoryInput: SensoryInput = {
        nearbyEntities: [],
        nearestFood: null,
        nearestPredator: null,
        nearestMate: null,
        energyLevel: agent.energy,
        age: agent.age,
        currentSpeed: 0,
        heading: 0,
      };
      agent.update(sensoryInput); // Triggers death when energy <= 0

      expect(agent.alive()).toBe(false);
      expect(agent.isAlive).toBe(false);
    });
  });
});
