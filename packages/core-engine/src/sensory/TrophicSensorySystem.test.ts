/**
 * TrophicSensorySystem.test.ts - Unit tests for trophic-aware sensory system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrophicSensorySystem, TrophicAgent, TrophicWorldLike } from './TrophicSensorySystem';
import { TrophicRoleTracker } from '../trophic/TrophicRoleTracker';
import { Direction } from './Direction';
import { SpatialHash } from '../spatial';

describe('TrophicSensorySystem', () => {
  let sensorySystem: TrophicSensorySystem;
  let trophicTracker: TrophicRoleTracker;
  let spatialHash: SpatialHash<TrophicAgent>;

  const createAgent = (
    id: string,
    speciesId: string,
    x: number,
    y: number,
    rotation: number = 0,
    options: Partial<TrophicAgent> = {}
  ): TrophicAgent => ({
    id,
    speciesId,
    position: { x, y },
    rotation,
    energy: 50,
    isAlive: true,
    size: 1,
    speed: 1,
    strength: 1,
    ...options,
  });

  const createWorld = (agents: TrophicAgent[]): TrophicWorldLike => ({
    getAgents: () => agents,
    getFood: () => [],
  });

  beforeEach(() => {
    trophicTracker = new TrophicRoleTracker();
    sensorySystem = new TrophicSensorySystem(trophicTracker);
    spatialHash = new SpatialHash<TrophicAgent>({
      cellSize: 50,
      worldWidth: 500,
      worldHeight: 500,
      wrapEdges: false,
    });

    // Establish predator-prey relationships
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
    it('should create trophic sensory system', () => {
      expect(sensorySystem).toBeDefined();
    });

    it('should extend base SensorySystem', () => {
      const agent = createAgent('test', 'herbivore', 100, 100);
      const world = createWorld([agent]);

      const baseInput = sensorySystem.gather(agent, world);
      expect(baseInput.front).toBeDefined();
      expect(baseInput.energy).toBeDefined();
    });

    it('should accept custom trophic config', () => {
      const customSensory = new TrophicSensorySystem(trophicTracker, {
        threatDetectionRange: 200,
        preyDetectionRange: 150,
      });

      const config = customSensory.getTrophicConfig();
      expect(config.threatDetectionRange).toBe(200);
      expect(config.preyDetectionRange).toBe(150);
    });
  });

  // =====================
  // BASIC TROPHIC INPUT TESTS
  // =====================
  describe('gatherTrophic', () => {
    it('should produce trophic sensory input', () => {
      const agent = createAgent('herb', 'herbivore', 100, 100);
      const world = createWorld([agent]);

      const input = sensorySystem.gatherTrophic(agent, world);

      expect(input.front).toBeDefined();
      expect(input.energy).toBeDefined();
      expect(input.nearestPreyDistance).toBeDefined();
      expect(input.nearestPredatorDistance).toBeDefined();
      expect(input.threatLevel).toBeDefined();
      expect(input.opportunityLevel).toBeDefined();
    });

    it('should include base sensory inputs', () => {
      const agent = createAgent('herb', 'herbivore', 100, 100);
      const world = createWorld([agent]);

      const input = sensorySystem.gatherTrophic(agent, world);

      expect(input.frontLeft).toBeDefined();
      expect(input.frontRight).toBeDefined();
      expect(input.left).toBeDefined();
      expect(input.right).toBeDefined();
      expect(input.bias).toBe(1.0);
    });
  });

  // =====================
  // PREDATOR DETECTION TESTS
  // =====================
  describe('predator detection', () => {
    it('should detect nearby predator', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const carnivore = createAgent('carn', 'carnivore', 130, 100);
      const world = createWorld([herbivore, carnivore]);

      spatialHash.insert(herbivore);
      spatialHash.insert(carnivore);

      const input = sensorySystem.gatherTrophic(herbivore, world, spatialHash);

      expect(input.nearestPredatorDistance).toBeGreaterThan(0);
    });

    it('should report predator direction', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100, 0); // Facing east
      const carnivoreEast = createAgent('carn', 'carnivore', 150, 100);
      const world = createWorld([herbivore, carnivoreEast]);

      spatialHash.insert(herbivore);
      spatialHash.insert(carnivoreEast);

      const input = sensorySystem.gatherTrophic(herbivore, world, spatialHash);

      // Predator is ahead (direction should be near 0)
      expect(Math.abs(input.nearestPredatorDirection)).toBeLessThan(0.5);
    });

    it('should report predator size', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const largeCarnivore = createAgent('carn', 'carnivore', 130, 100, 0, { size: 3 });
      const world = createWorld([herbivore, largeCarnivore]);

      spatialHash.insert(herbivore);
      spatialHash.insert(largeCarnivore);

      const input = sensorySystem.gatherTrophic(herbivore, world, spatialHash);

      expect(input.nearestPredatorSize).toBeGreaterThan(0);
    });

    it('should return 0 when no predator in range', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const world = createWorld([herbivore]);

      spatialHash.insert(herbivore);

      const input = sensorySystem.gatherTrophic(herbivore, world, spatialHash);

      expect(input.nearestPredatorDistance).toBe(0);
    });
  });

  // =====================
  // PREY DETECTION TESTS
  // =====================
  describe('prey detection', () => {
    it('should detect nearby prey', () => {
      const carnivore = createAgent('carn', 'carnivore', 100, 100);
      const herbivore = createAgent('herb', 'herbivore', 130, 100);
      const world = createWorld([carnivore, herbivore]);

      spatialHash.insert(carnivore);
      spatialHash.insert(herbivore);

      const input = sensorySystem.gatherTrophic(carnivore, world, spatialHash);

      expect(input.nearestPreyDistance).toBeGreaterThan(0);
    });

    it('should report prey direction', () => {
      const carnivore = createAgent('carn', 'carnivore', 100, 100, 0); // Facing east
      const herbivoreEast = createAgent('herb', 'herbivore', 150, 100);
      const world = createWorld([carnivore, herbivoreEast]);

      spatialHash.insert(carnivore);
      spatialHash.insert(herbivoreEast);

      const input = sensorySystem.gatherTrophic(carnivore, world, spatialHash);

      // Prey is ahead
      expect(Math.abs(input.nearestPreyDirection)).toBeLessThan(0.5);
    });

    it('should return 0 when no prey in range', () => {
      const carnivore = createAgent('carn', 'carnivore', 100, 100);
      const world = createWorld([carnivore]);

      spatialHash.insert(carnivore);

      const input = sensorySystem.gatherTrophic(carnivore, world, spatialHash);

      expect(input.nearestPreyDistance).toBe(0);
    });
  });

  // =====================
  // THREAT LEVEL TESTS
  // =====================
  describe('threat level', () => {
    it('should calculate threat level for prey', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const carnivore = createAgent('carn', 'carnivore', 120, 100);
      const world = createWorld([herbivore, carnivore]);

      spatialHash.insert(herbivore);
      spatialHash.insert(carnivore);

      const input = sensorySystem.gatherTrophic(herbivore, world, spatialHash);

      expect(input.threatLevel).toBeGreaterThan(0);
    });

    it('should increase threat level with more nearby predators', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const carn1 = createAgent('carn1', 'carnivore', 120, 100);
      const carn2 = createAgent('carn2', 'carnivore', 100, 120);

      // Single predator
      spatialHash.clear();
      spatialHash.insert(herbivore);
      spatialHash.insert(carn1);
      const singlePredWorld = createWorld([herbivore, carn1]);
      const singleThreat = sensorySystem.gatherTrophic(herbivore, singlePredWorld, spatialHash).threatLevel;

      // Multiple predators
      spatialHash.insert(carn2);
      const multiPredWorld = createWorld([herbivore, carn1, carn2]);
      const multiThreat = sensorySystem.gatherTrophic(herbivore, multiPredWorld, spatialHash).threatLevel;

      expect(multiThreat).toBeGreaterThanOrEqual(singleThreat);
    });

    it('should return 0 threat level for carnivores', () => {
      const carnivore = createAgent('carn', 'carnivore', 100, 100);
      const herbivore = createAgent('herb', 'herbivore', 120, 100);
      const world = createWorld([carnivore, herbivore]);

      spatialHash.insert(carnivore);
      spatialHash.insert(herbivore);

      const input = sensorySystem.gatherTrophic(carnivore, world, spatialHash);

      // Carnivore shouldn't be threatened by herbivore
      expect(input.threatLevel).toBe(0);
    });
  });

  // =====================
  // OPPORTUNITY LEVEL TESTS
  // =====================
  describe('opportunity level', () => {
    it('should calculate opportunity level for predators', () => {
      const carnivore = createAgent('carn', 'carnivore', 100, 100);
      const herbivore = createAgent('herb', 'herbivore', 120, 100);
      const world = createWorld([carnivore, herbivore]);

      spatialHash.insert(carnivore);
      spatialHash.insert(herbivore);

      const input = sensorySystem.gatherTrophic(carnivore, world, spatialHash);

      expect(input.opportunityLevel).toBeGreaterThan(0);
    });

    it('should return 0 opportunity for herbivores', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const otherHerb = createAgent('herb2', 'herbivore2', 120, 100);
      const world = createWorld([herbivore, otherHerb]);

      spatialHash.insert(herbivore);
      spatialHash.insert(otherHerb);

      const input = sensorySystem.gatherTrophic(herbivore, world, spatialHash);

      expect(input.opportunityLevel).toBe(0);
    });
  });

  // =====================
  // DIRECTIONAL SENSING TESTS
  // =====================
  describe('directional sensing', () => {
    it('should sense predators in specific directions', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100, 0); // Facing east
      const predatorAhead = createAgent('carn', 'carnivore', 150, 100);
      const world = createWorld([herbivore, predatorAhead]);

      spatialHash.insert(herbivore);
      spatialHash.insert(predatorAhead);

      const frontSignal = sensorySystem.sensePredators(
        herbivore,
        world,
        Direction.FRONT,
        spatialHash
      );

      expect(frontSignal).toBeGreaterThan(0);
    });

    it('should sense prey in specific directions', () => {
      const carnivore = createAgent('carn', 'carnivore', 100, 100, 0);
      const preyAhead = createAgent('herb', 'herbivore', 150, 100);
      const world = createWorld([carnivore, preyAhead]);

      spatialHash.insert(carnivore);
      spatialHash.insert(preyAhead);

      const frontSignal = sensorySystem.sensePrey(
        carnivore,
        world,
        Direction.FRONT,
        spatialHash
      );

      expect(frontSignal).toBeGreaterThan(0);
    });
  });

  // =====================
  // DETAILED TROPHIC INPUT TESTS
  // =====================
  describe('gatherDetailedTrophic', () => {
    it('should provide directional predator channels', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100, 0);
      const predator = createAgent('carn', 'carnivore', 150, 100);
      const world = createWorld([herbivore, predator]);

      spatialHash.insert(herbivore);
      spatialHash.insert(predator);

      const detailed = sensorySystem.gatherDetailedTrophic(herbivore, world, spatialHash);

      expect(detailed.predatorFront).toBeDefined();
      expect(detailed.predatorFrontLeft).toBeDefined();
      expect(detailed.predatorFrontRight).toBeDefined();
      expect(detailed.predatorLeft).toBeDefined();
      expect(detailed.predatorRight).toBeDefined();
    });

    it('should provide directional prey channels', () => {
      const carnivore = createAgent('carn', 'carnivore', 100, 100);
      const prey = createAgent('herb', 'herbivore', 150, 100);
      const world = createWorld([carnivore, prey]);

      spatialHash.insert(carnivore);
      spatialHash.insert(prey);

      const detailed = sensorySystem.gatherDetailedTrophic(carnivore, world, spatialHash);

      expect(detailed.preyFront).toBeDefined();
      expect(detailed.preyFrontLeft).toBeDefined();
      expect(detailed.preyFrontRight).toBeDefined();
      expect(detailed.preyLeft).toBeDefined();
      expect(detailed.preyRight).toBeDefined();
    });

    it('should include base trophic input', () => {
      const agent = createAgent('herb', 'herbivore', 100, 100);
      const world = createWorld([agent]);

      const detailed = sensorySystem.gatherDetailedTrophic(agent, world);

      expect(detailed.base).toBeDefined();
      expect(detailed.base.threatLevel).toBeDefined();
    });
  });

  // =====================
  // SPATIAL HASH USAGE TESTS
  // =====================
  describe('spatial hash usage', () => {
    it('should work without spatial hash (using world query)', () => {
      const noHashSensory = new TrophicSensorySystem(trophicTracker, {
        useSpatialHash: false,
      });

      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const carnivore = createAgent('carn', 'carnivore', 130, 100);
      const world = createWorld([herbivore, carnivore]);

      const input = noHashSensory.gatherTrophic(herbivore, world);

      expect(input.nearestPredatorDistance).toBeGreaterThan(0);
    });

    it('should prefer spatial hash when provided', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const carnivore = createAgent('carn', 'carnivore', 130, 100);
      const world = createWorld([herbivore, carnivore]);

      spatialHash.insert(herbivore);
      spatialHash.insert(carnivore);

      const input = sensorySystem.gatherTrophic(herbivore, world, spatialHash);

      expect(input.nearestPredatorDistance).toBeGreaterThan(0);
    });
  });

  // =====================
  // CONFIG TESTS
  // =====================
  describe('configuration', () => {
    it('should get trophic tracker', () => {
      const tracker = sensorySystem.getTrophicTracker();
      expect(tracker).toBe(trophicTracker);
    });

    it('should get trophic config', () => {
      const config = sensorySystem.getTrophicConfig();
      expect(config.threatDetectionRange).toBeDefined();
      expect(config.preyDetectionRange).toBeDefined();
    });

    it('should update trophic config', () => {
      sensorySystem.setTrophicConfig({ threatDetectionRange: 300 });

      expect(sensorySystem.getTrophicConfig().threatDetectionRange).toBe(300);
    });
  });

  // =====================
  // CLONE TESTS
  // =====================
  describe('clone', () => {
    it('should clone trophic sensory system', () => {
      const clone = sensorySystem.cloneTrophic();

      expect(clone).not.toBe(sensorySystem);
      expect(clone.getTrophicTracker()).toBe(sensorySystem.getTrophicTracker());
    });

    it('should apply config overrides', () => {
      const clone = sensorySystem.cloneTrophic({ threatDetectionRange: 250 });

      expect(clone.getTrophicConfig().threatDetectionRange).toBe(250);
    });
  });

  // =====================
  // EDGE CASES
  // =====================
  describe('edge cases', () => {
    it('should handle empty world', () => {
      const agent = createAgent('herb', 'herbivore', 100, 100);
      const world = createWorld([agent]);

      const input = sensorySystem.gatherTrophic(agent, world);

      expect(input.threatLevel).toBe(0);
      expect(input.opportunityLevel).toBe(0);
    });

    it('should ignore dead agents', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const deadCarnivore = createAgent('carn', 'carnivore', 120, 100, 0, { isAlive: false });
      const world = createWorld([herbivore, deadCarnivore]);

      spatialHash.insert(herbivore);
      spatialHash.insert(deadCarnivore);

      const input = sensorySystem.gatherTrophic(herbivore, world, spatialHash);

      expect(input.nearestPredatorDistance).toBe(0);
    });

    it('should handle agent at exact same position', () => {
      const herbivore = createAgent('herb', 'herbivore', 100, 100);
      const carnivore = createAgent('carn', 'carnivore', 100, 100);
      const world = createWorld([herbivore, carnivore]);

      spatialHash.insert(herbivore);
      spatialHash.insert(carnivore);

      // Should not crash
      const input = sensorySystem.gatherTrophic(herbivore, world, spatialHash);
      expect(input).toBeDefined();
    });
  });
});
