/**
 * Lineage.ts - Lineage tracking with threshold-based species splitting
 *
 * Tracks evolutionary lineages and supports speciation events
 * based on genetic distance thresholds.
 */

import { Genome, GenomeId } from '../genetics/Genome';

// ============================================================================
// Types
// ============================================================================

export type LineageId = string;

export interface LineageMetadata {
  createdAt: number;
  createdAtTick: number;
  founderGenomeId: GenomeId;
  parentLineageId: LineageId | null;
  splitReason?: 'genetic-drift' | 'geographic-isolation' | 'speciation';
}

export interface LineageStats {
  totalBirths: number;
  totalDeaths: number;
  currentPopulation: number;
  peakPopulation: number;
  cumulativeFitness: number;
  averageFitness: number;
  generationCount: number;
  lastUpdateTick: number;
}

export interface LineageConfig {
  splitThreshold: number;
  minSplitPopulation: number;
  trackAncestry: boolean;
  maxAncestryDepth: number;
}

export const DEFAULT_LINEAGE_CONFIG: LineageConfig = {
  splitThreshold: 0.5,
  minSplitPopulation: 10,
  trackAncestry: true,
  maxAncestryDepth: 100,
};

// ============================================================================
// Lineage Class
// ============================================================================

export class Lineage {
  public readonly id: LineageId;
  public readonly metadata: LineageMetadata;
  private _stats: LineageStats;
  private _config: LineageConfig;
  private _founderGenome: Genome | null;
  private _representativeGenome: Genome | null;
  private _memberGenomeIds: Set<GenomeId>;
  private _ancestorIds: LineageId[];

  constructor(
    founderGenome: Genome,
    parentLineageId: LineageId | null = null,
    tick: number = 0,
    config?: Partial<LineageConfig>
  ) {
    this.id = Lineage.generateId();
    this._config = { ...DEFAULT_LINEAGE_CONFIG, ...config };

    this.metadata = {
      createdAt: Date.now(),
      createdAtTick: tick,
      founderGenomeId: founderGenome.id,
      parentLineageId,
    };

    this._stats = {
      totalBirths: 1,
      totalDeaths: 0,
      currentPopulation: 1,
      peakPopulation: 1,
      cumulativeFitness: 0,
      averageFitness: 0,
      generationCount: founderGenome.generation,
      lastUpdateTick: tick,
    };

    this._founderGenome = founderGenome.clone();
    this._representativeGenome = founderGenome.clone();
    this._memberGenomeIds = new Set([founderGenome.id]);
    this._ancestorIds = [];
  }

  private static generateId(): LineageId {
    return `lineage_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  get stats(): LineageStats {
    return { ...this._stats };
  }

  get config(): LineageConfig {
    return { ...this._config };
  }

  get founderGenome(): Genome | null {
    return this._founderGenome?.clone() ?? null;
  }

  get representativeGenome(): Genome | null {
    return this._representativeGenome?.clone() ?? null;
  }

  get memberCount(): number {
    return this._memberGenomeIds.size;
  }

  get currentPopulation(): number {
    return this._stats.currentPopulation;
  }

  get ancestors(): LineageId[] {
    return [...this._ancestorIds];
  }

  recordBirth(genome: Genome, fitness: number = 0, tick: number = 0): void {
    this._memberGenomeIds.add(genome.id);
    this._stats.totalBirths++;
    this._stats.currentPopulation++;
    this._stats.peakPopulation = Math.max(this._stats.peakPopulation, this._stats.currentPopulation);
    this._stats.cumulativeFitness += fitness;
    this._stats.generationCount = Math.max(this._stats.generationCount, genome.generation);
    this._stats.lastUpdateTick = tick;
    this._updateAverageFitness();
  }

  recordDeath(genomeId: GenomeId, tick: number = 0): void {
    if (this._memberGenomeIds.has(genomeId)) {
      this._stats.totalDeaths++;
      this._stats.currentPopulation--;
      this._stats.lastUpdateTick = tick;
    }
  }

  updateFitness(fitness: number): void {
    this._stats.cumulativeFitness += fitness;
    this._updateAverageFitness();
  }

  private _updateAverageFitness(): void {
    if (this._stats.totalBirths > 0) {
      this._stats.averageFitness = this._stats.cumulativeFitness / this._stats.totalBirths;
    }
  }

  updateRepresentative(genome: Genome): void {
    this._representativeGenome = genome.clone();
  }

  shouldSplit(genome: Genome): boolean {
    if (this._stats.currentPopulation < this._config.minSplitPopulation) {
      return false;
    }

    if (!this._representativeGenome) {
      return false;
    }

    const distance = genome.normalizedDistanceFrom(this._representativeGenome);
    return distance > this._config.splitThreshold;
  }

  split(divergentGenome: Genome, tick: number = 0, reason: 'genetic-drift' | 'geographic-isolation' | 'speciation' = 'genetic-drift'): Lineage {
    const newLineage = new Lineage(divergentGenome, this.id, tick, this._config);
    newLineage.metadata.splitReason = reason;

    if (this._config.trackAncestry) {
      newLineage._ancestorIds = [this.id, ...this._ancestorIds].slice(0, this._config.maxAncestryDepth);
    }

    this._memberGenomeIds.delete(divergentGenome.id);
    this._stats.currentPopulation--;

    return newLineage;
  }

  isMember(genomeId: GenomeId): boolean {
    return this._memberGenomeIds.has(genomeId);
  }

  isDescendantOf(lineageId: LineageId): boolean {
    return this._ancestorIds.includes(lineageId) || this.metadata.parentLineageId === lineageId;
  }

  getDistanceToFounder(genome: Genome): number {
    if (!this._founderGenome) {
      return 0;
    }
    return genome.normalizedDistanceFrom(this._founderGenome);
  }

  getDistanceToRepresentative(genome: Genome): number {
    if (!this._representativeGenome) {
      return 0;
    }
    return genome.normalizedDistanceFrom(this._representativeGenome);
  }

  toJSON(): object {
    return {
      id: this.id,
      metadata: this.metadata,
      stats: this._stats,
      config: this._config,
      founderGenome: this._founderGenome?.toJSON(),
      representativeGenome: this._representativeGenome?.toJSON(),
      memberCount: this._memberGenomeIds.size,
      ancestors: this._ancestorIds,
    };
  }
}

// ============================================================================
// Lineage Registry
// ============================================================================

export class LineageRegistry {
  private _lineages: Map<LineageId, Lineage> = new Map();
  private _genomeToLineage: Map<GenomeId, LineageId> = new Map();
  private _config: LineageConfig;

  constructor(config?: Partial<LineageConfig>) {
    this._config = { ...DEFAULT_LINEAGE_CONFIG, ...config };
  }

  get lineageCount(): number {
    return this._lineages.size;
  }

  get allLineages(): Lineage[] {
    return Array.from(this._lineages.values());
  }

  createLineage(founderGenome: Genome, tick: number = 0): Lineage {
    const lineage = new Lineage(founderGenome, null, tick, this._config);
    this._lineages.set(lineage.id, lineage);
    this._genomeToLineage.set(founderGenome.id, lineage.id);
    return lineage;
  }

  getLineage(lineageId: LineageId): Lineage | undefined {
    return this._lineages.get(lineageId);
  }

  getLineageForGenome(genomeId: GenomeId): Lineage | undefined {
    const lineageId = this._genomeToLineage.get(genomeId);
    return lineageId ? this._lineages.get(lineageId) : undefined;
  }

  registerBirth(genome: Genome, parentGenomeId: GenomeId, fitness: number = 0, tick: number = 0): Lineage {
    const parentLineage = this.getLineageForGenome(parentGenomeId);

    if (!parentLineage) {
      return this.createLineage(genome, tick);
    }

    if (parentLineage.shouldSplit(genome)) {
      const newLineage = parentLineage.split(genome, tick, 'genetic-drift');
      this._lineages.set(newLineage.id, newLineage);
      this._genomeToLineage.set(genome.id, newLineage.id);
      return newLineage;
    }

    parentLineage.recordBirth(genome, fitness, tick);
    this._genomeToLineage.set(genome.id, parentLineage.id);
    return parentLineage;
  }

  registerDeath(genomeId: GenomeId, tick: number = 0): void {
    const lineage = this.getLineageForGenome(genomeId);
    if (lineage) {
      lineage.recordDeath(genomeId, tick);
    }
    this._genomeToLineage.delete(genomeId);
  }

  getActiveLineages(): Lineage[] {
    return this.allLineages.filter(l => l.currentPopulation > 0);
  }

  getExtinctLineages(): Lineage[] {
    return this.allLineages.filter(l => l.currentPopulation === 0);
  }

  getTotalPopulation(): number {
    return this.allLineages.reduce((sum, l) => sum + l.currentPopulation, 0);
  }

  getLineagesByFitness(): Lineage[] {
    return [...this.allLineages].sort((a, b) => b.stats.averageFitness - a.stats.averageFitness);
  }

  toJSON(): object {
    return {
      lineages: Array.from(this._lineages.values()).map(l => l.toJSON()),
      genomeMapping: Object.fromEntries(this._genomeToLineage),
      config: this._config,
    };
  }
}

export default Lineage;
