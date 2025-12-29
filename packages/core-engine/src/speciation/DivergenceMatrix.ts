/**
 * DivergenceMatrix.ts - gen3sis-inspired divergence tracking between populations
 *
 * Tracks genetic divergence between population clusters using a sparse matrix.
 * Divergence accumulates when populations are isolated (no gene flow) and
 * decays when gene flow occurs.
 *
 * Based on: gen3sis (Hagen et al. 2021)
 */

import { Genome, GenomeId } from '../genetics/Genome';
import {
  PopulationId,
  PopulationDescriptor,
  DivergenceMatrixConfig,
  DEFAULT_DIVERGENCE_MATRIX_CONFIG,
  DivergenceEntry,
  GeneFlowEvent,
  SpeciationEvent,
  SpeciationMechanism,
} from './types';
import { LineageId } from '../lineage/Lineage';

// ============================================================================
// DivergenceMatrix Class
// ============================================================================

export class DivergenceMatrix {
  private matrix: Map<string, DivergenceEntry>;
  private populations: Map<PopulationId, PopulationDescriptor>;
  private populationIndices: Map<PopulationId, number>;
  private nextIndex: number;
  private config: DivergenceMatrixConfig;

  constructor(config?: Partial<DivergenceMatrixConfig>) {
    this.config = { ...DEFAULT_DIVERGENCE_MATRIX_CONFIG, ...config };
    this.matrix = new Map();
    this.populations = new Map();
    this.populationIndices = new Map();
    this.nextIndex = 0;
  }

  /**
   * Generate a unique key for a population pair (order-independent)
   */
  private getPairKey(popA: PopulationId, popB: PopulationId): string {
    return popA < popB ? `${popA}:${popB}` : `${popB}:${popA}`;
  }

  /**
   * Register a new population in the matrix
   */
  registerPopulation(population: PopulationDescriptor): void {
    if (this.populations.has(population.id)) {
      this.populations.set(population.id, population);
      return;
    }

    if (this.populationIndices.size >= this.config.maxPopulations) {
      this.pruneExtinctPopulations();
    }

    this.populations.set(population.id, population);
    this.populationIndices.set(population.id, this.nextIndex++);

    // Initialize divergence entries with existing populations
    for (const existingPop of this.populations.values()) {
      if (existingPop.id !== population.id) {
        this.initializeDivergence(population.id, existingPop.id, population.lastUpdateTick);
      }
    }
  }

  /**
   * Remove a population from the matrix
   */
  removePopulation(populationId: PopulationId): void {
    this.populations.delete(populationId);
    this.populationIndices.delete(populationId);

    // Remove all divergence entries involving this population
    for (const key of this.matrix.keys()) {
      if (key.includes(populationId)) {
        this.matrix.delete(key);
      }
    }
  }

  /**
   * Initialize divergence between two populations
   */
  private initializeDivergence(
    popA: PopulationId,
    popB: PopulationId,
    tick: number
  ): void {
    const key = this.getPairKey(popA, popB);
    if (this.matrix.has(key)) return;

    const populationA = this.populations.get(popA);
    const populationB = this.populations.get(popB);

    // Calculate initial divergence based on genetic distance
    let initialDivergence = 0;
    if (populationA?.centroidGenome && populationB?.centroidGenome) {
      initialDivergence = this.computeGenomeDistance(
        populationA.centroidGenome,
        populationB.centroidGenome
      );
    }

    this.matrix.set(key, {
      populationIdA: popA,
      populationIdB: popB,
      divergence: initialDivergence,
      hasGeneFlow: false,
      lastGeneFlowTick: 0,
      lastUpdateTick: tick,
    });
  }

  /**
   * Get divergence between two populations
   */
  getDivergence(popA: PopulationId, popB: PopulationId): number {
    if (popA === popB) return 0;
    const key = this.getPairKey(popA, popB);
    return this.matrix.get(key)?.divergence ?? 0;
  }

  /**
   * Set divergence between two populations
   */
  setDivergence(
    popA: PopulationId,
    popB: PopulationId,
    divergence: number,
    tick: number
  ): void {
    if (popA === popB) return;
    const key = this.getPairKey(popA, popB);
    const entry = this.matrix.get(key);

    if (entry) {
      entry.divergence = Math.max(0, Math.min(1, divergence));
      entry.lastUpdateTick = tick;
    }
  }

  /**
   * Record a gene flow event between populations
   */
  recordGeneFlow(event: GeneFlowEvent): void {
    const key = this.getPairKey(event.sourcePopulationId, event.targetPopulationId);
    const entry = this.matrix.get(key);

    if (entry) {
      // Gene flow reduces divergence
      const reduction = event.geneFlowStrength * this.config.divergenceDecayRate * 10;
      entry.divergence = Math.max(0, entry.divergence - reduction);
      entry.hasGeneFlow = true;
      entry.lastGeneFlowTick = event.tick;
      entry.lastUpdateTick = event.tick;
    }
  }

  /**
   * Update divergence matrix for a tick
   * Divergence increases for isolated populations, decreases with gene flow
   */
  update(tick: number): void {
    const ticksSinceLastUpdate = 1; // Assuming called every tick

    for (const entry of this.matrix.values()) {
      const ticksSinceGeneFlow = tick - entry.lastGeneFlowTick;

      if (ticksSinceGeneFlow > this.config.updateInterval) {
        // No recent gene flow - accumulate divergence
        entry.divergence += this.config.isolationAccumulationRate * ticksSinceLastUpdate;
        entry.divergence = Math.min(1, entry.divergence);
        entry.hasGeneFlow = false;
      } else {
        // Recent gene flow - decay divergence
        entry.divergence -= this.config.divergenceDecayRate * ticksSinceLastUpdate;
        entry.divergence = Math.max(0, entry.divergence);
      }

      entry.lastUpdateTick = tick;
    }
  }

  /**
   * Check if two populations should speciate based on divergence
   */
  shouldSpeciate(popA: PopulationId, popB: PopulationId): boolean {
    const divergence = this.getDivergence(popA, popB);
    return divergence >= this.config.divergenceThreshold;
  }

  /**
   * Get all population pairs that have exceeded the speciation threshold
   */
  getSpeciationCandidates(): Array<{
    popA: PopulationId;
    popB: PopulationId;
    divergence: number;
  }> {
    const candidates: Array<{
      popA: PopulationId;
      popB: PopulationId;
      divergence: number;
    }> = [];

    for (const entry of this.matrix.values()) {
      if (entry.divergence >= this.config.divergenceThreshold) {
        candidates.push({
          popA: entry.populationIdA,
          popB: entry.populationIdB,
          divergence: entry.divergence,
        });
      }
    }

    return candidates.sort((a, b) => b.divergence - a.divergence);
  }

  /**
   * Update population centroid from sampled genomes
   */
  updatePopulationCentroid(
    populationId: PopulationId,
    genomes: Genome[],
    tick: number
  ): void {
    const population = this.populations.get(populationId);
    if (!population || genomes.length === 0) return;

    const genomeSize = genomes[0].size;
    const newCentroid = new Float32Array(genomeSize);

    // Calculate mean genome
    for (const genome of genomes) {
      const genes = genome.genes;
      for (let i = 0; i < genomeSize; i++) {
        newCentroid[i] += genes[i];
      }
    }

    for (let i = 0; i < genomeSize; i++) {
      newCentroid[i] /= genomes.length;
    }

    population.centroidGenome = newCentroid;
    population.memberCount = genomes.length;
    population.lastUpdateTick = tick;

    // Update divergence with all other populations
    for (const otherPop of this.populations.values()) {
      if (otherPop.id !== populationId && otherPop.centroidGenome) {
        const distance = this.computeGenomeDistance(newCentroid, otherPop.centroidGenome);
        const key = this.getPairKey(populationId, otherPop.id);
        const entry = this.matrix.get(key);
        if (entry) {
          // Blend current divergence with new distance measurement
          entry.divergence = entry.divergence * 0.9 + distance * 0.1;
          entry.lastUpdateTick = tick;
        }
      }
    }
  }

  /**
   * Compute normalized distance between two genome arrays
   */
  private computeGenomeDistance(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 1;

    let sumSquares = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sumSquares += diff * diff;
    }

    // Normalize to [0, 1] assuming gene values are in [-1, 1]
    const maxDistance = Math.sqrt(a.length * 4);
    return Math.min(1, Math.sqrt(sumSquares) / maxDistance);
  }

  /**
   * Prune extinct populations (those with memberCount = 0)
   */
  private pruneExtinctPopulations(): void {
    const toRemove: PopulationId[] = [];

    for (const [id, pop] of this.populations) {
      if (pop.memberCount === 0) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.removePopulation(id);
    }
  }

  /**
   * Get population descriptor
   */
  getPopulation(populationId: PopulationId): PopulationDescriptor | undefined {
    return this.populations.get(populationId);
  }

  /**
   * Get all active populations
   */
  getActivePopulations(): PopulationDescriptor[] {
    return Array.from(this.populations.values()).filter((p) => p.memberCount > 0);
  }

  /**
   * Get average divergence across all population pairs
   */
  getAverageDivergence(): number {
    if (this.matrix.size === 0) return 0;

    let total = 0;
    for (const entry of this.matrix.values()) {
      total += entry.divergence;
    }
    return total / this.matrix.size;
  }

  /**
   * Get divergence entry details
   */
  getDivergenceEntry(
    popA: PopulationId,
    popB: PopulationId
  ): DivergenceEntry | undefined {
    const key = this.getPairKey(popA, popB);
    return this.matrix.get(key);
  }

  /**
   * Get all divergence entries for a population
   */
  getDivergenceEntriesFor(populationId: PopulationId): DivergenceEntry[] {
    const entries: DivergenceEntry[] = [];

    for (const entry of this.matrix.values()) {
      if (
        entry.populationIdA === populationId ||
        entry.populationIdB === populationId
      ) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Get configuration
   */
  getConfig(): DivergenceMatrixConfig {
    return { ...this.config };
  }

  /**
   * Get the number of tracked populations
   */
  get populationCount(): number {
    return this.populations.size;
  }

  /**
   * Get the number of divergence entries
   */
  get entryCount(): number {
    return this.matrix.size;
  }

  /**
   * Export matrix state for serialization
   */
  toJSON(): object {
    return {
      config: this.config,
      populations: Array.from(this.populations.entries()).map(([id, pop]) => ({
        id,
        ...pop,
        centroidGenome: Array.from(pop.centroidGenome),
      })),
      entries: Array.from(this.matrix.entries()).map(([key, entry]) => ({
        key,
        ...entry,
      })),
    };
  }

  /**
   * Create a speciation event record
   */
  static createSpeciationEvent(
    parentPop: PopulationDescriptor,
    newPopId: PopulationId,
    newLineageId: LineageId,
    founderGenomeIds: GenomeId[],
    mechanism: SpeciationMechanism,
    divergence: number,
    tick: number
  ): SpeciationEvent {
    return {
      id: `speciation_${tick}_${Math.random().toString(36).substring(2, 9)}`,
      tick,
      parentPopulationId: parentPop.id,
      parentLineageId: parentPop.lineageId,
      newPopulationId: newPopId,
      newLineageId,
      mechanism,
      founderGenomeIds,
      geneticDistance: divergence,
      populationDivergence: divergence,
      spatialSeparation: 0,
    };
  }
}

export default DivergenceMatrix;
