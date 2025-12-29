/**
 * GenesisX Core Engine - Grid System
 *
 * Efficient grid storage using TypedArrays (Float32Array, etc.)
 * Inspired by Tale-Weaver's elegant grid implementation.
 */

import type { WorldDimensions, GridLayerConfig } from '../engine/EngineConfig';

// ============================================================================
// Type Definitions
// ============================================================================

export type TypedArrayConstructor =
  | Float32ArrayConstructor
  | Uint8ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor;

export type TypedArray = Float32Array | Uint8Array | Int32Array | Uint32Array;

export type GridDataType = 'float32' | 'uint8' | 'int32' | 'uint32';

const TYPE_MAP: Record<GridDataType, TypedArrayConstructor> = {
  float32: Float32Array,
  uint8: Uint8Array,
  int32: Int32Array,
  uint32: Uint32Array
};

// ============================================================================
// Grid Class
// ============================================================================

export class Grid<T extends TypedArray = Float32Array> {
  public readonly name: string;
  public readonly width: number;
  public readonly height: number;
  public readonly size: number;
  public readonly dataType: GridDataType;
  public readonly wrapEdges: boolean;
  public readonly min: number;
  public readonly max: number;
  public readonly defaultValue: number;

  private _data: T;
  private _scratch: T | null = null;

  constructor(config: GridLayerConfig & { dimensions: WorldDimensions }) {
    this.name = config.name;
    this.width = config.dimensions.width;
    this.height = config.dimensions.height;
    this.size = this.width * this.height;
    this.dataType = config.type;
    this.wrapEdges = config.wrapEdges ?? true;
    this.min = config.min ?? -Infinity;
    this.max = config.max ?? Infinity;
    this.defaultValue = config.defaultValue ?? 0;

    const ArrayConstructor = TYPE_MAP[this.dataType];
    this._data = new ArrayConstructor(this.size) as T;

    if (this.defaultValue !== 0) {
      this._data.fill(this.defaultValue);
    }
  }

  get data(): T {
    return this._data;
  }

  index(x: number, y: number): number {
    if (this.wrapEdges) {
      x = ((x % this.width) + this.width) % this.width;
      y = ((y % this.height) + this.height) % this.height;
    }
    return y * this.width + x;
  }

  coords(index: number): { x: number; y: number } {
    return {
      x: index % this.width,
      y: Math.floor(index / this.width)
    };
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x: number, y: number): number {
    if (!this.wrapEdges && !this.inBounds(x, y)) {
      return this.defaultValue;
    }
    return this._data[this.index(x, y)];
  }

  getAt(index: number): number {
    if (index < 0 || index >= this.size) {
      return this.defaultValue;
    }
    return this._data[index];
  }

  set(x: number, y: number, value: number): void {
    if (!this.wrapEdges && !this.inBounds(x, y)) {
      return;
    }
    const clamped = Math.max(this.min, Math.min(this.max, value));
    this._data[this.index(x, y)] = clamped;
  }

  setAt(index: number, value: number): void {
    if (index < 0 || index >= this.size) {
      return;
    }
    const clamped = Math.max(this.min, Math.min(this.max, value));
    this._data[index] = clamped;
  }

  add(x: number, y: number, delta: number): void {
    this.set(x, y, this.get(x, y) + delta);
  }

  multiply(x: number, y: number, factor: number): void {
    this.set(x, y, this.get(x, y) * factor);
  }

  getNeighbors4(x: number, y: number): number[] {
    return [
      this.get(x, y - 1),
      this.get(x + 1, y),
      this.get(x, y + 1),
      this.get(x - 1, y)
    ];
  }

  getNeighbors8(x: number, y: number): number[] {
    return [
      this.get(x - 1, y - 1),
      this.get(x, y - 1),
      this.get(x + 1, y - 1),
      this.get(x + 1, y),
      this.get(x + 1, y + 1),
      this.get(x, y + 1),
      this.get(x - 1, y + 1),
      this.get(x - 1, y)
    ];
  }

  sumNeighbors4(x: number, y: number): number {
    return this.getNeighbors4(x, y).reduce((a, b) => a + b, 0);
  }

  sumNeighbors8(x: number, y: number): number {
    return this.getNeighbors8(x, y).reduce((a, b) => a + b, 0);
  }

  avgNeighbors8(x: number, y: number): number {
    return this.sumNeighbors8(x, y) / 8;
  }

  fill(value: number): void {
    const clamped = Math.max(this.min, Math.min(this.max, value));
    this._data.fill(clamped);
  }

  clear(): void {
    this.fill(this.defaultValue);
  }

  copyFrom(source: Grid<T>): void {
    if (source.size !== this.size) {
      throw new Error('Grid size mismatch');
    }
    this._data.set(source.data);
  }

  forEach(callback: (value: number, x: number, y: number, index: number) => void): void {
    for (let i = 0; i < this.size; i++) {
      const { x, y } = this.coords(i);
      callback(this._data[i], x, y, i);
    }
  }

  map(callback: (value: number, x: number, y: number, index: number) => number): void {
    for (let i = 0; i < this.size; i++) {
      const { x, y } = this.coords(i);
      const newValue = callback(this._data[i], x, y, i);
      this._data[i] = Math.max(this.min, Math.min(this.max, newValue));
    }
  }

  reduce<R>(callback: (acc: R, value: number, x: number, y: number) => R, initial: R): R {
    let acc = initial;
    for (let i = 0; i < this.size; i++) {
      const { x, y } = this.coords(i);
      acc = callback(acc, this._data[i], x, y);
    }
    return acc;
  }

  getScratch(): T {
    if (!this._scratch) {
      const ArrayConstructor = TYPE_MAP[this.dataType];
      this._scratch = new ArrayConstructor(this.size) as T;
    }
    return this._scratch;
  }

  swap(): void {
    if (this._scratch) {
      const temp = this._data;
      this._data = this._scratch;
      this._scratch = temp;
    }
  }

  copyToScratch(): void {
    const scratch = this.getScratch();
    scratch.set(this._data);
  }

  diffuse(rate: number): void {
    const scratch = this.getScratch();
    for (let i = 0; i < this.size; i++) {
      const { x, y } = this.coords(i);
      const current = this._data[i];
      const neighborAvg = this.avgNeighbors8(x, y);
      scratch[i] = current + (neighborAvg - current) * rate;
    }
    this.swap();
  }

  decay(rate: number): void {
    for (let i = 0; i < this.size; i++) {
      this._data[i] *= (1 - rate);
    }
  }

  snapshot(): ArrayBuffer {
    const buffer = this._data.buffer;
    if (buffer instanceof SharedArrayBuffer) {
      // Convert SharedArrayBuffer to ArrayBuffer
      const copy = new ArrayBuffer(buffer.byteLength);
      new Uint8Array(copy).set(new Uint8Array(buffer));
      return copy;
    }
    return buffer.slice(0);
  }

  restore(buffer: ArrayBuffer): void {
    const ArrayConstructor = TYPE_MAP[this.dataType];
    const restored = new ArrayConstructor(buffer);
    if (restored.length !== this.size) {
      throw new Error('Snapshot size mismatch');
    }
    this._data.set(restored as T);
  }

  clone(): Grid<T> {
    const cloned = new Grid<T>({
      name: this.name,
      type: this.dataType,
      dimensions: { width: this.width, height: this.height },
      defaultValue: this.defaultValue,
      min: this.min,
      max: this.max,
      wrapEdges: this.wrapEdges
    });
    cloned._data.set(this._data);
    return cloned;
  }

  sum(): number {
    let total = 0;
    for (let i = 0; i < this.size; i++) {
      total += this._data[i];
    }
    return total;
  }

  average(): number {
    return this.sum() / this.size;
  }

  range(): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this.size; i++) {
      const val = this._data[i];
      if (val < min) min = val;
      if (val > max) max = val;
    }
    return { min, max };
  }

  memoryUsage(): number {
    const mainBuffer = this._data.byteLength;
    const scratchBuffer = this._scratch?.byteLength ?? 0;
    return mainBuffer + scratchBuffer;
  }
}

// ============================================================================
// Grid Manager
// ============================================================================

export class GridManager {
  private readonly _grids: Map<string, Grid> = new Map();
  private readonly _dimensions: WorldDimensions;

  constructor(dimensions: WorldDimensions) {
    this._dimensions = { ...dimensions };
  }

  get dimensions(): WorldDimensions {
    return this._dimensions;
  }

  get layerCount(): number {
    return this._grids.size;
  }

  get layerNames(): string[] {
    return Array.from(this._grids.keys());
  }

  addLayer(config: GridLayerConfig): Grid {
    if (this._grids.has(config.name)) {
      throw new Error(`Grid layer "${config.name}" already exists`);
    }
    const grid = new Grid({
      ...config,
      dimensions: this._dimensions
    });
    this._grids.set(config.name, grid);
    return grid;
  }

  getLayer<T extends TypedArray = Float32Array>(name: string): Grid<T> | undefined {
    return this._grids.get(name) as Grid<T> | undefined;
  }

  hasLayer(name: string): boolean {
    return this._grids.has(name);
  }

  removeLayer(name: string): boolean {
    return this._grids.delete(name);
  }

  forEachLayer(callback: (grid: Grid, name: string) => void): void {
    this._grids.forEach((grid, name) => callback(grid, name));
  }

  clearAll(): void {
    this._grids.forEach(grid => grid.clear());
  }

  snapshotAll(): Record<string, ArrayBuffer> {
    const snapshots: Record<string, ArrayBuffer> = {};
    this._grids.forEach((grid, name) => {
      snapshots[name] = grid.snapshot();
    });
    return snapshots;
  }

  restoreAll(snapshots: Record<string, ArrayBuffer>): void {
    for (const [name, buffer] of Object.entries(snapshots)) {
      const grid = this._grids.get(name);
      if (grid) {
        grid.restore(buffer);
      }
    }
  }

  memoryUsage(): number {
    let total = 0;
    this._grids.forEach(grid => {
      total += grid.memoryUsage();
    });
    return total;
  }
}
