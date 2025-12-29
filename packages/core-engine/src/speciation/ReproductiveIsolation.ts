/**
 * ReproductiveIsolation.ts - REvoSim-inspired mating compatibility system
 *
 * Determines whether two agents can successfully mate based on:
 * - Genetic distance (genome similarity)
 * - Population-level divergence
 * - Geographic proximity
 * - Behavioral compatibility (optional)
 *
 * Based on: REvoSim (Garwood et al. 2019)
 */

import { Genome, GenomeId } from '../genetics/Genome';
import {
  PopulationId,
  ReproductiveIsolationConfig,
  DEFAULT_REPRODUCTIVE_ISOLATION_CONFIG,
  MatingCompatibility,
  IsolationFactor,
} from './types';
import { DivergenceMatrix } from './DivergenceMatrix';

// ============================================================================
// Agent-like interface for mating checks
// ============================================================================

export interface MatingCandidate {
  id: string;
  genome: Genome;
  populationId: PopulationId;
  position: { x: number; y: number };
  age: number;
  energy: number;
  speciesId?: string;
}

// ============================================================================
// ReproductiveIsolation Class
// ============================================================================

export class ReproductiveIsolation {
  private config: ReproductiveIsolationConfig;
  private divergenceMatrix: DivergenceMatrix | null;

  constructor(
    config?: Partial<ReproductiveIsolationConfig>,
    divergenceMatrix?: DivergenceMatrix
  ) {
    this.config = { ...DEFAULT_REPRODUCTIVE_ISOLATION_CONFIG, ...config };
    this.divergenceMatrix = divergenceMatrix ?? null;
  }

  /**
   * Set the divergence matrix reference
   */
  setDivergenceMatrix(matrix: DivergenceMatrix): void {
    this.divergenceMatrix = matrix;
  }

  /**
   * Check if two agents can mate
   * Returns detailed compatibility information
   */
  checkCompatibility(
    agentA: MatingCandidate,
    agentB: MatingCandidate
  ): MatingCompatibility {
    const isolationFactors: IsolationFactor[] = [];
    let compatible = true;

    // 1. Genetic distance check
    const geneticDistance = agentA.genome.normalizedDistanceFrom(agentB.genome);
    if (geneticDistance > this.config.matingDistanceThreshold) {
      compatible = false;
      isolationFactors.push({
        type: 'genetic',
        strength: geneticDistance,
        description: `Genetic distance ${geneticDistance.toFixed(3)} exceeds threshold ${this.config.matingDistanceThreshold}`,
      });
    }

    // 2. Population divergence check (if matrix available)
    let populationDivergence = 0;
    if (
      this.divergenceMatrix &&
      agentA.populationId !== agentB.populationId
    ) {
      populationDivergence = this.divergenceMatrix.getDivergence(
        agentA.populationId,
        agentB.populationId
      );

      if (populationDivergence > this.config.populationIsolationThreshold) {
        compatible = false;
        isolationFactors.push({
          type: 'population',
          strength: populationDivergence,
          description: `Population divergence ${populationDivergence.toFixed(3)} exceeds threshold ${this.config.populationIsolationThreshold}`,
        });
      }
    }

    // 3. Geographic isolation check
    const distance = this.computeDistance(agentA.position, agentB.position);
    if (distance > this.config.geographicIsolationRadius) {
      compatible = false;
      const strength = distance / this.config.geographicIsolationRadius;
      isolationFactors.push({
        type: 'geographic',
        strength: Math.min(1, strength),
        description: `Geographic distance ${distance.toFixed(1)} exceeds radius ${this.config.geographicIsolationRadius}`,
      });
    }

    // 4. Behavioral isolation (optional, based on speciesId mismatch)
    if (
      this.config.behavioralIsolationEnabled &&
      agentA.speciesId &&
      agentB.speciesId &&
      agentA.speciesId !== agentB.speciesId
    ) {
      // Check if genetic distance is borderline - behavioral isolation adds extra barrier
      if (geneticDistance > this.config.matingDistanceThreshold * 0.7) {
        compatible = false;
        isolationFactors.push({
          type: 'behavioral',
          strength: 0.5,
          description: 'Behavioral isolation due to species identity mismatch',
        });
      }
    }

    return {
      compatible,
      geneticDistance,
      populationDivergence,
      isolationFactors,
    };
  }

  /**
   * Simple boolean check for mating compatibility
   */
  canMate(agentA: MatingCandidate, agentB: MatingCandidate): boolean {
    return this.checkCompatibility(agentA, agentB).compatible;
  }

  /**
   * Check genetic compatibility using Hamming distance (REvoSim style)
   * Treats genome as binary by thresholding at 0
   */
  checkHammingCompatibility(
    agentA: MatingCandidate,
    agentB: MatingCandidate,
    maxBitDifference: number
  ): boolean {
    const hammingDistance = this.computeHammingDistance(
      agentA.genome,
      agentB.genome
    );
    return hammingDistance <= maxBitDifference;
  }

  /**
   * Compute Hamming distance between two genomes
   * Converts continuous genes to binary (threshold at 0)
   */
  private computeHammingDistance(genomeA: Genome, genomeB: Genome): number {
    const genesA = genomeA.genes;
    const genesB = genomeB.genes;

    if (genesA.length !== genesB.length) {
      throw new Error('Cannot compare genomes of different sizes');
    }

    let differences = 0;
    for (let i = 0; i < genesA.length; i++) {
      const bitA = genesA[i] >= 0 ? 1 : 0;
      const bitB = genesB[i] >= 0 ? 1 : 0;
      if (bitA !== bitB) {
        differences++;
      }
    }

    return differences;
  }

  /**
   * Compute Euclidean distance between positions
   */
  private computeDistance(
    posA: { x: number; y: number },
    posB: { x: number; y: number }
  ): number {
    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Find compatible mates from a list of candidates
   */
  findCompatibleMates(
    agent: MatingCandidate,
    candidates: MatingCandidate[]
  ): MatingCandidate[] {
    return candidates.filter(
      (candidate) =>
        candidate.id !== agent.id && this.canMate(agent, candidate)
    );
  }

  /**
   * Find the most compatible mate from a list of candidates
   * Returns the candidate with the lowest genetic distance
   */
  findBestMate(
    agent: MatingCandidate,
    candidates: MatingCandidate[]
  ): MatingCandidate | null {
    let bestMate: MatingCandidate | null = null;
    let bestDistance = Infinity;

    for (const candidate of candidates) {
      if (candidate.id === agent.id) continue;

      const compatibility = this.checkCompatibility(agent, candidate);
      if (compatibility.compatible && compatibility.geneticDistance < bestDistance) {
        bestDistance = compatibility.geneticDistance;
        bestMate = candidate;
      }
    }

    return bestMate;
  }

  /**
   * Calculate isolation score between two agents
   * Higher score = more isolated (less likely to mate)
   */
  calculateIsolationScore(
    agentA: MatingCandidate,
    agentB: MatingCandidate
  ): number {
    const compatibility = this.checkCompatibility(agentA, agentB);

    // Combine all isolation factors
    let totalScore = 0;
    let factorCount = 0;

    // Genetic isolation (weighted heavily)
    totalScore += compatibility.geneticDistance * 2;
    factorCount += 2;

    // Population isolation
    if (compatibility.populationDivergence > 0) {
      totalScore += compatibility.populationDivergence;
      factorCount += 1;
    }

    // Factor-based isolation
    for (const factor of compatibility.isolationFactors) {
      totalScore += factor.strength;
      factorCount += 1;
    }

    return factorCount > 0 ? totalScore / factorCount : 0;
  }

  /**
   * Check if a genome has diverged enough to be a speciation founder
   */
  isSpeciationCandidate(
    genome: Genome,
    populationCentroid: Float32Array,
    threshold: number = this.config.matingDistanceThreshold * 1.5
  ): boolean {
    const genes = genome.genes;

    if (genes.length !== populationCentroid.length) {
      return false;
    }

    let sumSquares = 0;
    for (let i = 0; i < genes.length; i++) {
      const diff = genes[i] - populationCentroid[i];
      sumSquares += diff * diff;
    }

    const maxDistance = Math.sqrt(genes.length * 4);
    const normalizedDistance = Math.sqrt(sumSquares) / maxDistance;

    return normalizedDistance > threshold;
  }

  /**
   * Get configuration
   */
  getConfig(): ReproductiveIsolationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReproductiveIsolationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default ReproductiveIsolation;
