/**
 * GenesisX Core Engine - World State Management
 *
 * Unified world system combining:
 * - Tale-Weaver's elegant World class with typed grids
 * - EcoSysX's environment management
 * - digital-organisms' simple but effective state tracking
 */

import { Grid, GridManager, TypedArray } from './Grid';
import type {
  WorldConfig,
  WorldDimensions,
  GridLayerConfig,
  SerializedWorldState
} from '../engine/EngineConfig';

// ============================================================================
// Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorldStats {
  dimensions: WorldDimensions;
  cellCount: number;
  layerCount: number;
  memoryUsage: number;
  entityCount: number;
}

export const StandardLayers = {
  ENERGY: 'energy',
  TERRAIN: 'terrain',
  TEMPERATURE: 'temperature',
  MOISTURE: 'moisture',
  PHEROMONE: 'pheromone',
  OBSTACLES: 'obstacles',
  PRESENCE: 'presence',
  LIGHT: 'light'
} as const;

// ============================================================================
// World Class
// ============================================================================

export class World {
  private readonly _config: WorldConfig;
  private readonly _grids: GridManager;

  public readonly width: number;
  public readonly height: number;
  public readonly depth: number;
  public readonly cellSize: number;
  public readonly wrapEdges: boolean;

  private _currentStep: number = 0;
  private readonly _seed: number;
  private _rngState: number;
  private _metadata: Map<string, unknown> = new Map();

  constructor(config: WorldConfig) {
    this._config = { ...config };
    this.width = config.dimensions.width;
    this.height = config.dimensions.height;
    this.depth = config.dimensions.depth ?? 1;
    this.cellSize = config.cellSize ?? 1;
    this.wrapEdges = config.wrapEdges ?? true;
    this._seed = config.seed ?? Date.now();
    this._rngState = this._seed;

    this._grids = new GridManager(config.dimensions);

    if (config.layers) {
      for (const layerConfig of config.layers) {
        this._grids.addLayer(layerConfig);
      }
    }
  }

  get config(): Readonly<WorldConfig> {
    return this._config;
  }

  get dimensions(): WorldDimensions {
    return { width: this.width, height: this.height, depth: this.depth };
  }

  get cellCount(): number {
    return this.width * this.height * this.depth;
  }

  get currentStep(): number {
    return this._currentStep;
  }

  set currentStep(step: number) {
    this._currentStep = step;
  }

  get seed(): number {
    return this._seed;
  }

  addLayer(config: GridLayerConfig): Grid {
    return this._grids.addLayer(config);
  }

  getLayer<T extends TypedArray = Float32Array>(name: string): Grid<T> | undefined {
    return this._grids.getLayer<T>(name);
  }

  hasLayer(name: string): boolean {
    return this._grids.hasLayer(name);
  }

  get layerNames(): string[] {
    return this._grids.layerNames;
  }

  get layerCount(): number {
    return this._grids.layerCount;
  }

  worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this.cellSize),
      y: Math.floor(worldY / this.cellSize)
    };
  }

  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: (gridX + 0.5) * this.cellSize,
      y: (gridY + 0.5) * this.cellSize
    };
  }

  wrapCoords(x: number, y: number): { x: number; y: number } {
    if (!this.wrapEdges) {
      return { x, y };
    }
    return {
      x: ((x % this.width) + this.width) % this.width,
      y: ((y % this.height) + this.height) % this.height
    };
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  distance(x1: number, y1: number, x2: number, y2: number): number {
    let dx = x2 - x1;
    let dy = y2 - y1;

    if (this.wrapEdges) {
      if (Math.abs(dx) > this.width / 2) {
        dx = dx > 0 ? dx - this.width : dx + this.width;
      }
      if (Math.abs(dy) > this.height / 2) {
        dy = dy > 0 ? dy - this.height : dy + this.height;
      }
    }

    return Math.sqrt(dx * dx + dy * dy);
  }

  manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
    let dx = Math.abs(x2 - x1);
    let dy = Math.abs(y2 - y1);

    if (this.wrapEdges) {
      dx = Math.min(dx, this.width - dx);
      dy = Math.min(dy, this.height - dy);
    }

    return dx + dy;
  }

  getValue(layer: string, x: number, y: number): number {
    const grid = this._grids.getLayer(layer);
    return grid?.get(x, y) ?? 0;
  }

  setValue(layer: string, x: number, y: number, value: number): void {
    const grid = this._grids.getLayer(layer);
    grid?.set(x, y, value);
  }

  addValue(layer: string, x: number, y: number, delta: number): void {
    const grid = this._grids.getLayer(layer);
    grid?.add(x, y, delta);
  }

  getRegion(layer: string, region: Region): number[][] {
    const grid = this._grids.getLayer(layer);
    if (!grid) return [];

    const result: number[][] = [];
    for (let y = region.y; y < region.y + region.height; y++) {
      const row: number[] = [];
      for (let x = region.x; x < region.x + region.width; x++) {
        row.push(grid.get(x, y));
      }
      result.push(row);
    }
    return result;
  }

  fillRegion(layer: string, region: Region, value: number): void {
    const grid = this._grids.getLayer(layer);
    if (!grid) return;

    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        grid.set(x, y, value);
      }
    }
  }

  getCellsInRadius(centerX: number, centerY: number, radius: number): Position[] {
    const cells: Position[] = [];
    const radiusSq = radius * radius;

    const minX = Math.floor(centerX - radius);
    const maxX = Math.ceil(centerX + radius);
    const minY = Math.floor(centerY - radius);
    const maxY = Math.ceil(centerY + radius);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const distSq = (x - centerX) ** 2 + (y - centerY) ** 2;
        if (distSq <= radiusSq) {
          const wrapped = this.wrapCoords(x, y);
          if (this.wrapEdges || this.inBounds(x, y)) {
            cells.push({ x: wrapped.x, y: wrapped.y });
          }
        }
      }
    }

    return cells;
  }

  private _mulberry32(): number {
    let t = (this._rngState += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  random(): number {
    return this._mulberry32();
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  randomPosition(): Position {
    return {
      x: this.randomInt(0, this.width - 1),
      y: this.randomInt(0, this.height - 1)
    };
  }

  resetRNG(): void {
    this._rngState = this._seed;
  }

  getRNGState(): number {
    return this._rngState;
  }

  setRNGState(state: number): void {
    this._rngState = state;
  }

  getMetadata<T = unknown>(key: string): T | undefined {
    return this._metadata.get(key) as T | undefined;
  }

  setMetadata(key: string, value: unknown): void {
    this._metadata.set(key, value);
  }

  deleteMetadata(key: string): boolean {
    return this._metadata.delete(key);
  }

  getAllMetadata(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this._metadata.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  update(_deltaTime: number): void {
    // Override in subclass or use layer-specific update logic
  }

  diffuseLayer(layer: string, rate: number): void {
    const grid = this._grids.getLayer(layer);
    grid?.diffuse(rate);
  }

  decayLayer(layer: string, rate: number): void {
    const grid = this._grids.getLayer(layer);
    grid?.decay(rate);
  }

  snapshot(): SerializedWorldState {
    return {
      dimensions: this.dimensions,
      grids: this._grids.snapshotAll(),
      metadata: {
        ...this.getAllMetadata(),
        rngState: this._rngState,
        currentStep: this._currentStep
      }
    };
  }

  restore(state: SerializedWorldState): void {
    this._grids.restoreAll(state.grids);

    if (state.metadata) {
      for (const [key, value] of Object.entries(state.metadata)) {
        if (key === 'rngState' && typeof value === 'number') {
          this._rngState = value;
        } else if (key === 'currentStep' && typeof value === 'number') {
          this._currentStep = value;
        } else {
          this._metadata.set(key, value);
        }
      }
    }
  }

  clear(): void {
    this._grids.clearAll();
    this._metadata.clear();
    this._currentStep = 0;
    this.resetRNG();
  }

  getStats(): WorldStats {
    return {
      dimensions: this.dimensions,
      cellCount: this.cellCount,
      layerCount: this.layerCount,
      memoryUsage: this._grids.memoryUsage(),
      entityCount: 0
    };
  }

  getLayerStats(layer: string): { sum: number; average: number; range: { min: number; max: number } } | undefined {
    const grid = this._grids.getLayer(layer);
    if (!grid) return undefined;

    return {
      sum: grid.sum(),
      average: grid.average(),
      range: grid.range()
    };
  }
}
