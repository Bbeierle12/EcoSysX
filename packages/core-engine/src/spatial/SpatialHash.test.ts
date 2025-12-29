/**
 * SpatialHash.test.ts - Unit tests for SpatialHash class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHash, SpatialEntity, SpatialHashConfig } from './index';

interface TestEntity extends SpatialEntity {
  id: string;
  position: { x: number; y: number };
  name?: string;
}

describe('SpatialHash', () => {
  let spatialHash: SpatialHash<TestEntity>;
  const defaultConfig: Partial<SpatialHashConfig> = {
    cellSize: 50,
    worldWidth: 500,
    worldHeight: 500,
    wrapEdges: true,
  };

  beforeEach(() => {
    spatialHash = new SpatialHash<TestEntity>(defaultConfig);
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create an empty spatial hash', () => {
      expect(spatialHash.size).toBe(0);
    });

    it('should use default config when not provided', () => {
      const hash = new SpatialHash<TestEntity>();
      expect(hash.getConfig()).toBeDefined();
    });

    it('should merge provided config with defaults', () => {
      const hash = new SpatialHash<TestEntity>({ cellSize: 100 });
      expect(hash.getConfig().cellSize).toBe(100);
    });
  });

  // =====================
  // INSERT TESTS
  // =====================
  describe('insert', () => {
    it('should insert an entity', () => {
      const entity: TestEntity = { id: 'e1', position: { x: 25, y: 25 } };
      spatialHash.insert(entity);
      expect(spatialHash.size).toBe(1);
    });

    it('should insert multiple entities', () => {
      for (let i = 0; i < 10; i++) {
        spatialHash.insert({ id: `e${i}`, position: { x: i * 10, y: i * 10 } });
      }
      expect(spatialHash.size).toBe(10);
    });

    it('should track entity presence', () => {
      const entity: TestEntity = { id: 'e1', position: { x: 25, y: 25 } };
      spatialHash.insert(entity);
      expect(spatialHash.has('e1')).toBe(true);
      expect(spatialHash.has('e2')).toBe(false);
    });
  });

  // =====================
  // REMOVE TESTS
  // =====================
  describe('remove', () => {
    it('should remove an entity', () => {
      const entity: TestEntity = { id: 'e1', position: { x: 25, y: 25 } };
      spatialHash.insert(entity);
      expect(spatialHash.size).toBe(1);

      const removed = spatialHash.remove(entity);
      expect(removed).toBe(true);
      expect(spatialHash.size).toBe(0);
    });

    it('should return false when removing non-existent entity', () => {
      const entity: TestEntity = { id: 'e1', position: { x: 25, y: 25 } };
      const removed = spatialHash.remove(entity);
      expect(removed).toBe(false);
    });

    it('should no longer find entity after removal', () => {
      const entity: TestEntity = { id: 'e1', position: { x: 25, y: 25 } };
      spatialHash.insert(entity);
      spatialHash.remove(entity);
      expect(spatialHash.has('e1')).toBe(false);
    });
  });

  // =====================
  // UPDATE TESTS
  // =====================
  describe('update', () => {
    it('should update entity position without changing cells', () => {
      const entity: TestEntity = { id: 'e1', position: { x: 10, y: 10 } };
      spatialHash.insert(entity);

      entity.position = { x: 15, y: 15 }; // Same cell
      const changed = spatialHash.update(entity);

      expect(changed).toBe(false);
      expect(spatialHash.size).toBe(1);
    });

    it('should update entity position changing cells', () => {
      const entity: TestEntity = { id: 'e1', position: { x: 10, y: 10 } };
      spatialHash.insert(entity);

      entity.position = { x: 100, y: 100 }; // Different cell
      const changed = spatialHash.update(entity);

      expect(changed).toBe(true);
      expect(spatialHash.size).toBe(1);
    });

    it('should find entity in new position after update', () => {
      const entity: TestEntity = { id: 'e1', position: { x: 10, y: 10 } };
      spatialHash.insert(entity);

      entity.position = { x: 200, y: 200 };
      spatialHash.update(entity);

      const found = spatialHash.queryRadius(200, 200, 10);
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe('e1');
    });
  });

  // =====================
  // QUERY RADIUS TESTS
  // =====================
  describe('queryRadius', () => {
    beforeEach(() => {
      // Insert entities in a grid pattern
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          spatialHash.insert({
            id: `e_${x}_${y}`,
            position: { x: x * 100, y: y * 100 },
          });
        }
      }
    });

    it('should find entities within radius', () => {
      const found = spatialHash.queryRadius(0, 0, 50);
      expect(found.length).toBeGreaterThan(0);
    });

    it('should not find entities outside radius', () => {
      const found = spatialHash.queryRadius(250, 250, 10);
      expect(found).toHaveLength(0);
    });

    it('should find exact entity at position', () => {
      const found = spatialHash.queryRadius(100, 100, 1);
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe('e_1_1');
    });

    it('should find multiple nearby entities', () => {
      const found = spatialHash.queryRadius(100, 100, 150);
      expect(found.length).toBeGreaterThan(1);
    });

    it('should handle world wrapping', () => {
      // Entity at 0,0 should be found from 490,490 with wrapping
      const hash = new SpatialHash<TestEntity>({
        ...defaultConfig,
        wrapEdges: true,
      });
      hash.insert({ id: 'e1', position: { x: 0, y: 0 } });

      const found = hash.queryRadius(490, 490, 30);
      expect(found).toHaveLength(1);
    });
  });

  // =====================
  // QUERY RADIUS SORTED TESTS
  // =====================
  describe('queryRadiusSorted', () => {
    it('should return results sorted by distance', () => {
      spatialHash.insert({ id: 'far', position: { x: 100, y: 0 } });
      spatialHash.insert({ id: 'near', position: { x: 10, y: 0 } });
      spatialHash.insert({ id: 'mid', position: { x: 50, y: 0 } });

      const results = spatialHash.queryRadiusSorted(0, 0, 150);

      expect(results).toHaveLength(3);
      expect(results[0].entity.id).toBe('near');
      expect(results[1].entity.id).toBe('mid');
      expect(results[2].entity.id).toBe('far');
    });

    it('should include distance in results', () => {
      spatialHash.insert({ id: 'e1', position: { x: 30, y: 40 } });

      const results = spatialHash.queryRadiusSorted(0, 0, 100);

      expect(results).toHaveLength(1);
      expect(results[0].distance).toBeCloseTo(50, 5); // 3-4-5 triangle
    });
  });

  // =====================
  // FIND NEAREST TESTS
  // =====================
  describe('findNearest', () => {
    it('should find the nearest entity', () => {
      spatialHash.insert({ id: 'far', position: { x: 100, y: 0 } });
      spatialHash.insert({ id: 'near', position: { x: 10, y: 0 } });

      const result = spatialHash.findNearest(0, 0, 200);

      expect(result).not.toBeNull();
      expect(result!.entity.id).toBe('near');
    });

    it('should return null when no entities within radius', () => {
      spatialHash.insert({ id: 'far', position: { x: 300, y: 300 } });

      const result = spatialHash.findNearest(0, 0, 50);

      expect(result).toBeNull();
    });

    it('should exclude specified entity', () => {
      spatialHash.insert({ id: 'self', position: { x: 0, y: 0 } });
      spatialHash.insert({ id: 'other', position: { x: 10, y: 0 } });

      const result = spatialHash.findNearest(0, 0, 50, 'self');

      expect(result).not.toBeNull();
      expect(result!.entity.id).toBe('other');
    });
  });

  // =====================
  // FIND K NEAREST TESTS
  // =====================
  describe('findKNearest', () => {
    it('should find K nearest entities', () => {
      for (let i = 0; i < 10; i++) {
        spatialHash.insert({ id: `e${i}`, position: { x: i * 10, y: 0 } });
      }

      const results = spatialHash.findKNearest(0, 0, 3, 200);

      expect(results).toHaveLength(3);
      expect(results[0].entity.id).toBe('e0');
      expect(results[1].entity.id).toBe('e1');
      expect(results[2].entity.id).toBe('e2');
    });

    it('should return fewer than K if not enough entities', () => {
      spatialHash.insert({ id: 'e1', position: { x: 10, y: 0 } });

      const results = spatialHash.findKNearest(0, 0, 5, 50);

      expect(results).toHaveLength(1);
    });
  });

  // =====================
  // HAS ENTITY WITHIN RADIUS TESTS
  // =====================
  describe('hasEntityWithinRadius', () => {
    it('should return true when entity exists within radius', () => {
      spatialHash.insert({ id: 'e1', position: { x: 10, y: 10 } });

      expect(spatialHash.hasEntityWithinRadius(0, 0, 20)).toBe(true);
    });

    it('should return false when no entity within radius', () => {
      spatialHash.insert({ id: 'e1', position: { x: 100, y: 100 } });

      expect(spatialHash.hasEntityWithinRadius(0, 0, 20)).toBe(false);
    });

    it('should exclude specified entity', () => {
      spatialHash.insert({ id: 'e1', position: { x: 10, y: 10 } });

      expect(spatialHash.hasEntityWithinRadius(0, 0, 50, 'e1')).toBe(false);
    });
  });

  // =====================
  // CLEAR AND REBUILD TESTS
  // =====================
  describe('clear and rebuild', () => {
    it('should clear all entities', () => {
      for (let i = 0; i < 10; i++) {
        spatialHash.insert({ id: `e${i}`, position: { x: i * 10, y: 0 } });
      }
      expect(spatialHash.size).toBe(10);

      spatialHash.clear();
      expect(spatialHash.size).toBe(0);
    });

    it('should rebuild from entity array', () => {
      const entities: TestEntity[] = [
        { id: 'e1', position: { x: 10, y: 10 } },
        { id: 'e2', position: { x: 20, y: 20 } },
        { id: 'e3', position: { x: 30, y: 30 } },
      ];

      spatialHash.rebuild(entities);

      expect(spatialHash.size).toBe(3);
      expect(spatialHash.has('e1')).toBe(true);
      expect(spatialHash.has('e2')).toBe(true);
      expect(spatialHash.has('e3')).toBe(true);
    });
  });

  // =====================
  // ITERATOR AND ARRAY TESTS
  // =====================
  describe('iteration', () => {
    it('should iterate over all entities', () => {
      spatialHash.insert({ id: 'e1', position: { x: 10, y: 10 } });
      spatialHash.insert({ id: 'e2', position: { x: 100, y: 100 } });

      const ids: string[] = [];
      for (const entity of spatialHash) {
        ids.push(entity.id);
      }

      expect(ids).toContain('e1');
      expect(ids).toContain('e2');
    });

    it('should convert to array', () => {
      spatialHash.insert({ id: 'e1', position: { x: 10, y: 10 } });
      spatialHash.insert({ id: 'e2', position: { x: 100, y: 100 } });

      const arr = spatialHash.toArray();

      expect(arr).toHaveLength(2);
    });
  });

  // =====================
  // STATS TESTS
  // =====================
  describe('getStats', () => {
    it('should report correct entity count', () => {
      for (let i = 0; i < 5; i++) {
        spatialHash.insert({ id: `e${i}`, position: { x: i * 10, y: 0 } });
      }

      const stats = spatialHash.getStats();
      expect(stats.entityCount).toBe(5);
    });

    it('should report cell statistics', () => {
      // All in one cell
      for (let i = 0; i < 5; i++) {
        spatialHash.insert({ id: `e${i}`, position: { x: 10 + i, y: 10 } });
      }

      const stats = spatialHash.getStats();
      expect(stats.cellCount).toBe(1);
      expect(stats.maxEntitiesPerCell).toBe(5);
      expect(stats.averageEntitiesPerCell).toBe(5);
    });
  });
});
