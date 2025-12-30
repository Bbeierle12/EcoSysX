/**
 * Genome.ts - Core genome representation using Float32Array
 *
 * Provides efficient storage and manipulation of genetic data.
 * Supports both point mutations and neural weight mutations.
 */

// ============================================================================
// Types
// ============================================================================

export type GenomeId = string;

export interface GenomeStats {
  generation: number;
  mutationCount: number;
  lastMutationTick: number;
  parentId: GenomeId | null;
  createdAt: number;
}

export interface GenomeOptions {
  size: number;
  initRange?: [number, number];
  generation?: number;
  parentId?: GenomeId | null;
}

export interface MutationConfig {
  mutationRate: number;
  mutationMagnitude: number;
  minValue: number;
  maxValue: number;
  useGaussian: boolean;
}

export const DEFAULT_MUTATION_CONFIG: MutationConfig = {
  mutationRate: 0.1,
  mutationMagnitude: 0.3,
  minValue: -1,
  maxValue: 1,
  useGaussian: true,
};

export interface MutationResult {
  mutatedCount: number;
  indices: number[];
  deltas: number[];
}

// ============================================================================
// Genome Class
// ============================================================================

export class Genome {
  public readonly id: GenomeId;
  private _genes: Float32Array;
  private _stats: GenomeStats;
  private _mutationConfig: MutationConfig;

  constructor(options: GenomeOptions, mutationConfig?: Partial<MutationConfig>) {
    this.id = Genome.generateId();
    this._genes = new Float32Array(options.size);
    this._mutationConfig = { ...DEFAULT_MUTATION_CONFIG, ...mutationConfig };

    this._stats = {
      generation: options.generation ?? 0,
      mutationCount: 0,
      lastMutationTick: 0,
      parentId: options.parentId ?? null,
      createdAt: Date.now(),
    };

    if (options.initRange) {
      this.randomize(options.initRange[0], options.initRange[1]);
    }
  }

  private static generateId(): GenomeId {
    return `genome_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  get size(): number {
    return this._genes.length;
  }

  get generation(): number {
    return this._stats.generation;
  }

  get parentId(): GenomeId | null {
    return this._stats.parentId;
  }

  get mutationConfig(): MutationConfig {
    return { ...this._mutationConfig };
  }

  get stats(): GenomeStats {
    return { ...this._stats };
  }

  get genes(): Float32Array {
    return new Float32Array(this._genes);
  }

  getGene(index: number): number {
    if (index < 0 || index >= this._genes.length) {
      throw new RangeError(`Gene index ${index} out of bounds`);
    }
    return this._genes[index];
  }

  setGene(index: number, value: number): void {
    if (index < 0 || index >= this._genes.length) {
      throw new RangeError(`Gene index ${index} out of bounds`);
    }
    this._genes[index] = value;
  }

  randomize(min: number = -1, max: number = 1): void {
    const range = max - min;
    for (let i = 0; i < this._genes.length; i++) {
      this._genes[i] = min + Math.random() * range;
    }
  }

  private randomGaussian(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  mutate(tick: number = 0, configOverride?: Partial<MutationConfig>): MutationResult {
    const config = { ...this._mutationConfig, ...configOverride };
    const result: MutationResult = {
      mutatedCount: 0,
      indices: [],
      deltas: [],
    };

    for (let i = 0; i < this._genes.length; i++) {
      if (Math.random() < config.mutationRate) {
        let delta: number;
        if (config.useGaussian) {
          delta = this.randomGaussian() * config.mutationMagnitude;
        } else {
          delta = (Math.random() - 0.5) * 2 * config.mutationMagnitude;
        }

        const oldValue = this._genes[i];
        this._genes[i] = Math.max(
          config.minValue,
          Math.min(config.maxValue, oldValue + delta)
        );

        result.mutatedCount++;
        result.indices.push(i);
        result.deltas.push(this._genes[i] - oldValue);
      }
    }

    this._stats.mutationCount++;
    this._stats.lastMutationTick = tick;

    return result;
  }

  reproduce(tick: number = 0, mutate: boolean = true): Genome {
    const child = new Genome(
      {
        size: this._genes.length,
        generation: this._stats.generation + 1,
        parentId: this.id,
      },
      this._mutationConfig
    );

    child._genes.set(this._genes);

    if (mutate) {
      child.mutate(tick);
    }

    return child;
  }

  crossover(other: Genome, _tick: number = 0, crossoverRate: number = 0.5): Genome {
    if (this._genes.length !== other._genes.length) {
      throw new Error('Cannot crossover genomes of different sizes');
    }

    const child = new Genome(
      {
        size: this._genes.length,
        generation: Math.max(this._stats.generation, other._stats.generation) + 1,
        parentId: this.id,
      },
      this._mutationConfig
    );

    for (let i = 0; i < this._genes.length; i++) {
      child._genes[i] = Math.random() < crossoverRate
        ? other._genes[i]
        : this._genes[i];
    }

    return child;
  }

  distanceFrom(other: Genome): number {
    if (this._genes.length !== other._genes.length) {
      throw new Error('Cannot calculate distance between genomes of different sizes');
    }

    let sumSquares = 0;
    for (let i = 0; i < this._genes.length; i++) {
      const diff = this._genes[i] - other._genes[i];
      sumSquares += diff * diff;
    }

    return Math.sqrt(sumSquares);
  }

  normalizedDistanceFrom(other: Genome): number {
    const distance = this.distanceFrom(other);
    const maxDistance = Math.sqrt(this._genes.length * 4);
    return Math.min(1, distance / maxDistance);
  }

  /**
   * REvoSim-style Hamming distance for reproductive isolation
   * Converts continuous genes to binary representation using threshold
   */
  hammingDistanceFrom(other: Genome, threshold: number = 0): number {
    if (this._genes.length !== other._genes.length) {
      throw new Error('Cannot compare genomes of different sizes');
    }

    let differences = 0;
    for (let i = 0; i < this._genes.length; i++) {
      const thisBit = this._genes[i] >= threshold ? 1 : 0;
      const otherBit = other._genes[i] >= threshold ? 1 : 0;
      if (thisBit !== otherBit) {
        differences++;
      }
    }

    return differences;
  }

  /**
   * Normalized Hamming distance (0-1 range)
   */
  normalizedHammingDistanceFrom(other: Genome, threshold: number = 0): number {
    return this.hammingDistanceFrom(other, threshold) / this._genes.length;
  }

  /**
   * REvoSim-style breeding compatibility check
   * Returns true if genomes can interbreed based on maximum bit difference
   */
  canBreedWith(other: Genome, maxBitDifference: number): boolean {
    return this.hammingDistanceFrom(other) <= maxBitDifference;
  }

  clone(): Genome {
    const cloned = new Genome(
      {
        size: this._genes.length,
        generation: this._stats.generation,
        parentId: this._stats.parentId,
      },
      this._mutationConfig
    );

    cloned._genes.set(this._genes);
    cloned._stats = { ...this._stats };

    return cloned;
  }

  toJSON(): object {
    return {
      id: this.id,
      genes: Array.from(this._genes),
      stats: this._stats,
      mutationConfig: this._mutationConfig,
    };
  }

  /**
   * Static factory to create a genome with a specified size
   */
  static withSize(
    size: number,
    options?: {
      mutationRate?: number;
      mutationStrength?: number;
      initRange?: [number, number];
      generation?: number;
    }
  ): Genome {
    return new Genome(
      {
        size,
        initRange: options?.initRange ?? [0, 1],
        generation: options?.generation ?? 0,
      },
      {
        mutationRate: options?.mutationRate ?? DEFAULT_MUTATION_CONFIG.mutationRate,
        mutationMagnitude: options?.mutationStrength ?? DEFAULT_MUTATION_CONFIG.mutationMagnitude,
      }
    );
  }

  static fromJSON(data: {
    id?: string;
    genes: number[];
    stats?: Partial<GenomeStats>;
    mutationConfig?: Partial<MutationConfig>;
  }): Genome {
    const genome = new Genome(
      {
        size: data.genes.length,
        generation: data.stats?.generation ?? 0,
        parentId: data.stats?.parentId ?? null,
      },
      data.mutationConfig
    );

    genome._genes.set(data.genes);

    if (data.stats) {
      genome._stats = { ...genome._stats, ...data.stats };
    }

    return genome;
  }

  static forNeuralNetwork(layerSizes: number[], config?: Partial<MutationConfig>): Genome {
    let totalWeights = 0;
    for (let i = 1; i < layerSizes.length; i++) {
      totalWeights += layerSizes[i - 1] * layerSizes[i] + layerSizes[i];
    }

    return new Genome(
      {
        size: totalWeights,
        initRange: [-1, 1],
      },
      {
        ...DEFAULT_MUTATION_CONFIG,
        ...config,
        mutationMagnitude: config?.mutationMagnitude ?? 0.1,
      }
    );
  }

  extractNeuralWeights(layerSizes: number[]): { weights: number[][]; biases: number[] }[] {
    const layers: { weights: number[][]; biases: number[] }[] = [];
    let offset = 0;

    for (let l = 1; l < layerSizes.length; l++) {
      const inputSize = layerSizes[l - 1];
      const outputSize = layerSizes[l];

      const weights: number[][] = [];
      for (let i = 0; i < outputSize; i++) {
        const row: number[] = [];
        for (let j = 0; j < inputSize; j++) {
          row.push(this._genes[offset++]);
        }
        weights.push(row);
      }

      const biases: number[] = [];
      for (let i = 0; i < outputSize; i++) {
        biases.push(this._genes[offset++]);
      }

      layers.push({ weights, biases });
    }

    return layers;
  }
}

export default Genome;
