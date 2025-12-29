/**
 * types.ts - Spatial data structure types
 *
 * Defines interfaces for spatial indexing and querying.
 */

// ============================================================================
// Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface SpatialEntity {
  id: string;
  position: Position;
}

export interface SpatialHashConfig {
  cellSize: number;
  worldWidth: number;
  worldHeight: number;
  wrapEdges?: boolean;
}

export const DEFAULT_SPATIAL_HASH_CONFIG: SpatialHashConfig = {
  cellSize: 50,
  worldWidth: 1000,
  worldHeight: 1000,
  wrapEdges: true,
};

export interface QueryResult<T> {
  entity: T;
  distance: number;
}

export interface SpatialStats {
  entityCount: number;
  cellCount: number;
  averageEntitiesPerCell: number;
  maxEntitiesPerCell: number;
  emptyRatio: number;
}
