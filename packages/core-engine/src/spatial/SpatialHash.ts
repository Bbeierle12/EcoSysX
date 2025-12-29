/**
 * SpatialHash.ts - High-performance spatial hashing for O(1) neighbor queries
 *
 * Provides efficient spatial indexing for large numbers of entities.
 * Designed for scalability to 100M+ agents.
 */

import {
  Position,
  SpatialEntity,
  SpatialHashConfig,
  DEFAULT_SPATIAL_HASH_CONFIG,
  QueryResult,
  SpatialStats,
} from './types';

// ============================================================================
// SpatialHash Class
// ============================================================================

export class SpatialHash<T extends SpatialEntity> {
  private cells: Map<number, T[]>;
  private entityCells: Map<string, number>;
  private config: SpatialHashConfig;
  private cellsX: number;
  private cellsY: number;
  private totalCells: number;

  constructor(config?: Partial<SpatialHashConfig>) {
    this.config = { ...DEFAULT_SPATIAL_HASH_CONFIG, ...config };
    this.cellsX = Math.ceil(this.config.worldWidth / this.config.cellSize);
    this.cellsY = Math.ceil(this.config.worldHeight / this.config.cellSize);
    this.totalCells = this.cellsX * this.cellsY;
    this.cells = new Map();
    this.entityCells = new Map();
  }

  /**
   * Hash a position to a cell index
   */
  private hash(x: number, y: number): number {
    let cx = Math.floor(x / this.config.cellSize);
    let cy = Math.floor(y / this.config.cellSize);

    if (this.config.wrapEdges) {
      cx = ((cx % this.cellsX) + this.cellsX) % this.cellsX;
      cy = ((cy % this.cellsY) + this.cellsY) % this.cellsY;
    } else {
      cx = Math.max(0, Math.min(this.cellsX - 1, cx));
      cy = Math.max(0, Math.min(this.cellsY - 1, cy));
    }

    return cy * this.cellsX + cx;
  }

  /**
   * Insert an entity into the spatial hash
   */
  insert(entity: T): void {
    const h = this.hash(entity.position.x, entity.position.y);

    if (!this.cells.has(h)) {
      this.cells.set(h, []);
    }
    this.cells.get(h)!.push(entity);
    this.entityCells.set(entity.id, h);
  }

  /**
   * Remove an entity from the spatial hash
   */
  remove(entity: T): boolean {
    const h = this.entityCells.get(entity.id);
    if (h === undefined) return false;

    const cell = this.cells.get(h);
    if (cell) {
      const idx = cell.findIndex((e) => e.id === entity.id);
      if (idx >= 0) {
        cell.splice(idx, 1);
        if (cell.length === 0) {
          this.cells.delete(h);
        }
      }
    }
    this.entityCells.delete(entity.id);
    return true;
  }

  /**
   * Update an entity's position in the spatial hash
   * Returns true if the entity changed cells
   */
  update(entity: T): boolean {
    const oldH = this.entityCells.get(entity.id);
    const newH = this.hash(entity.position.x, entity.position.y);

    if (oldH === newH) {
      return false;
    }

    if (oldH !== undefined) {
      const oldCell = this.cells.get(oldH);
      if (oldCell) {
        const idx = oldCell.findIndex((e) => e.id === entity.id);
        if (idx >= 0) {
          oldCell.splice(idx, 1);
          if (oldCell.length === 0) {
            this.cells.delete(oldH);
          }
        }
      }
    }

    if (!this.cells.has(newH)) {
      this.cells.set(newH, []);
    }
    this.cells.get(newH)!.push(entity);
    this.entityCells.set(entity.id, newH);

    return true;
  }

  /**
   * Query all entities within a radius of a point
   */
  queryRadius(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const radiusSq = radius * radius;

    const cellRadius = Math.ceil(radius / this.config.cellSize);
    const centerCX = Math.floor(x / this.config.cellSize);
    const centerCY = Math.floor(y / this.config.cellSize);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        let cx = centerCX + dx;
        let cy = centerCY + dy;

        if (this.config.wrapEdges) {
          cx = ((cx % this.cellsX) + this.cellsX) % this.cellsX;
          cy = ((cy % this.cellsY) + this.cellsY) % this.cellsY;
        } else if (cx < 0 || cx >= this.cellsX || cy < 0 || cy >= this.cellsY) {
          continue;
        }

        const h = cy * this.cellsX + cx;
        const cell = this.cells.get(h);
        if (!cell) continue;

        for (const entity of cell) {
          const distSq = this.distanceSquared(
            x,
            y,
            entity.position.x,
            entity.position.y
          );
          if (distSq <= radiusSq) {
            results.push(entity);
          }
        }
      }
    }

    return results;
  }

  /**
   * Query entities with distance information, sorted by distance
   */
  queryRadiusSorted(x: number, y: number, radius: number): QueryResult<T>[] {
    const results: QueryResult<T>[] = [];
    const radiusSq = radius * radius;

    const cellRadius = Math.ceil(radius / this.config.cellSize);
    const centerCX = Math.floor(x / this.config.cellSize);
    const centerCY = Math.floor(y / this.config.cellSize);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        let cx = centerCX + dx;
        let cy = centerCY + dy;

        if (this.config.wrapEdges) {
          cx = ((cx % this.cellsX) + this.cellsX) % this.cellsX;
          cy = ((cy % this.cellsY) + this.cellsY) % this.cellsY;
        } else if (cx < 0 || cx >= this.cellsX || cy < 0 || cy >= this.cellsY) {
          continue;
        }

        const h = cy * this.cellsX + cx;
        const cell = this.cells.get(h);
        if (!cell) continue;

        for (const entity of cell) {
          const distSq = this.distanceSquared(
            x,
            y,
            entity.position.x,
            entity.position.y
          );
          if (distSq <= radiusSq) {
            results.push({ entity, distance: Math.sqrt(distSq) });
          }
        }
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Find the nearest entity to a point within a maximum radius
   */
  findNearest(
    x: number,
    y: number,
    maxRadius: number,
    excludeId?: string
  ): QueryResult<T> | null {
    let nearest: QueryResult<T> | null = null;
    let nearestDistSq = maxRadius * maxRadius;

    const cellRadius = Math.ceil(maxRadius / this.config.cellSize);
    const centerCX = Math.floor(x / this.config.cellSize);
    const centerCY = Math.floor(y / this.config.cellSize);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        let cx = centerCX + dx;
        let cy = centerCY + dy;

        if (this.config.wrapEdges) {
          cx = ((cx % this.cellsX) + this.cellsX) % this.cellsX;
          cy = ((cy % this.cellsY) + this.cellsY) % this.cellsY;
        } else if (cx < 0 || cx >= this.cellsX || cy < 0 || cy >= this.cellsY) {
          continue;
        }

        const h = cy * this.cellsX + cx;
        const cell = this.cells.get(h);
        if (!cell) continue;

        for (const entity of cell) {
          if (excludeId && entity.id === excludeId) continue;

          const distSq = this.distanceSquared(
            x,
            y,
            entity.position.x,
            entity.position.y
          );
          if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearest = { entity, distance: Math.sqrt(distSq) };
          }
        }
      }
    }

    return nearest;
  }

  /**
   * Find the K nearest entities to a point
   */
  findKNearest(
    x: number,
    y: number,
    k: number,
    maxRadius: number,
    excludeId?: string
  ): QueryResult<T>[] {
    const candidates = this.queryRadiusSorted(x, y, maxRadius);

    if (excludeId) {
      return candidates
        .filter((r) => r.entity.id !== excludeId)
        .slice(0, k);
    }

    return candidates.slice(0, k);
  }

  /**
   * Check if any entity exists within radius
   */
  hasEntityWithinRadius(
    x: number,
    y: number,
    radius: number,
    excludeId?: string
  ): boolean {
    const radiusSq = radius * radius;

    const cellRadius = Math.ceil(radius / this.config.cellSize);
    const centerCX = Math.floor(x / this.config.cellSize);
    const centerCY = Math.floor(y / this.config.cellSize);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        let cx = centerCX + dx;
        let cy = centerCY + dy;

        if (this.config.wrapEdges) {
          cx = ((cx % this.cellsX) + this.cellsX) % this.cellsX;
          cy = ((cy % this.cellsY) + this.cellsY) % this.cellsY;
        } else if (cx < 0 || cx >= this.cellsX || cy < 0 || cy >= this.cellsY) {
          continue;
        }

        const h = cy * this.cellsX + cx;
        const cell = this.cells.get(h);
        if (!cell) continue;

        for (const entity of cell) {
          if (excludeId && entity.id === excludeId) continue;

          const distSq = this.distanceSquared(
            x,
            y,
            entity.position.x,
            entity.position.y
          );
          if (distSq <= radiusSq) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get all entities in a specific cell
   */
  getCell(x: number, y: number): T[] {
    const h = this.hash(x, y);
    return this.cells.get(h) ?? [];
  }

  /**
   * Clear all entities
   */
  clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }

  /**
   * Rebuild the entire spatial hash from a list of entities
   */
  rebuild(entities: T[]): void {
    this.clear();
    for (const entity of entities) {
      this.insert(entity);
    }
  }

  /**
   * Get the number of entities in the hash
   */
  get size(): number {
    return this.entityCells.size;
  }

  /**
   * Check if an entity exists in the hash
   */
  has(entityId: string): boolean {
    return this.entityCells.has(entityId);
  }

  /**
   * Get statistics about the spatial hash
   */
  getStats(): SpatialStats {
    let maxEntities = 0;
    let totalEntities = 0;

    for (const cell of this.cells.values()) {
      totalEntities += cell.length;
      maxEntities = Math.max(maxEntities, cell.length);
    }

    const cellCount = this.cells.size;
    const emptyCount = this.totalCells - cellCount;

    return {
      entityCount: this.entityCells.size,
      cellCount,
      averageEntitiesPerCell: cellCount > 0 ? totalEntities / cellCount : 0,
      maxEntitiesPerCell: maxEntities,
      emptyRatio: emptyCount / this.totalCells,
    };
  }

  /**
   * Calculate squared distance, accounting for world wrapping
   */
  private distanceSquared(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    let dx = x2 - x1;
    let dy = y2 - y1;

    if (this.config.wrapEdges) {
      const halfWidth = this.config.worldWidth / 2;
      const halfHeight = this.config.worldHeight / 2;

      if (dx > halfWidth) dx -= this.config.worldWidth;
      else if (dx < -halfWidth) dx += this.config.worldWidth;

      if (dy > halfHeight) dy -= this.config.worldHeight;
      else if (dy < -halfHeight) dy += this.config.worldHeight;
    }

    return dx * dx + dy * dy;
  }

  /**
   * Get configuration
   */
  getConfig(): SpatialHashConfig {
    return { ...this.config };
  }

  /**
   * Iterator over all entities
   */
  *[Symbol.iterator](): Iterator<T> {
    for (const cell of this.cells.values()) {
      for (const entity of cell) {
        yield entity;
      }
    }
  }

  /**
   * Get all entities as an array
   */
  toArray(): T[] {
    const result: T[] = [];
    for (const cell of this.cells.values()) {
      result.push(...cell);
    }
    return result;
  }
}

export default SpatialHash;
