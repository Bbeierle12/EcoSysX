/**
 * SpeciationEngine.ts - Orchestrates speciation events
 *
 * Combines divergence tracking, reproductive isolation, and population
 * clustering to detect and execute speciation events.
 *
 * Inspired by gen3sis modular architecture.
 */

import { Genome, GenomeId } from '../genetics/Genome';
import { Lineage, LineageRegistry, LineageId } from '../lineage/Lineage';
import {
  PopulationId,
  PopulationDescriptor,
  SpeciationEngineConfig,
  DEFAULT_SPECIATION_ENGINE_CONFIG,
  SpeciationEvent,
  SpeciationMechanism,
  SpeciationStats,
  SpeciationCandidate,
  GeneFlowEvent,
  SpatialCluster,
  ClusteringResult,
} from './types';
import { DivergenceMatrix } from './DivergenceMatrix';
import { ReproductiveIsolation, MatingCandidate } from './ReproductiveIsolation';

// ============================================================================
// SpeciationEngine Class
// ============================================================================

export class SpeciationEngine {
  private config: SpeciationEngineConfig;
  private divergenceMatrix: DivergenceMatrix;
  private reproductiveIsolation: ReproductiveIsolation;
  private lineageRegistry: LineageRegistry | null;

  private speciationEvents: SpeciationEvent[];
  private lastSpeciationTicks: Map<PopulationId, number>;
  private stats: SpeciationStats;

  constructor(
    config?: Partial<SpeciationEngineConfig>,
    lineageRegistry?: LineageRegistry
  ) {
    this.config = { ...DEFAULT_SPECIATION_ENGINE_CONFIG, ...config };

    this.divergenceMatrix = new DivergenceMatrix(this.config.divergenceMatrix);
    this.reproductiveIsolation = new ReproductiveIsolation(
      this.config.reproductiveIsolation,
      this.divergenceMatrix
    );

    this.lineageRegistry = lineageRegistry ?? null;
    this.speciationEvents = [];
    this.lastSpeciationTicks = new Map();

    this.stats = {
      totalSpeciationEvents: 0,
      eventsByMechanism: {
        'genetic-drift': 0,
        'geographic-isolation': 0,
        'temporal-isolation': 0,
        'behavioral-isolation': 0,
        'hybrid-incompatibility': 0,
        'ecological-specialization': 0,
      },
      activePopulations: 0,
      extinctPopulations: 0,
      averageDivergence: 0,
      lastSpeciationTick: 0,
    };
  }

  /**
   * Set the lineage registry reference
   */
  setLineageRegistry(registry: LineageRegistry): void {
    this.lineageRegistry = registry;
  }

  /**
   * Register a new population for tracking
   */
  registerPopulation(
    id: PopulationId,
    lineageId: LineageId,
    founderGenome: Genome,
    spatialCenter: { x: number; y: number },
    tick: number
  ): PopulationDescriptor {
    const population: PopulationDescriptor = {
      id,
      lineageId,
      centroidGenome: founderGenome.genes,
      memberCount: 1,
      spatialCenter,
      spatialRadius: 0,
      generation: founderGenome.generation,
      createdAtTick: tick,
      lastUpdateTick: tick,
    };

    this.divergenceMatrix.registerPopulation(population);
    return population;
  }

  /**
   * Update population state from its current members
   */
  updatePopulation(
    populationId: PopulationId,
    members: Array<{ genome: Genome; position: { x: number; y: number } }>,
    tick: number
  ): void {
    if (members.length === 0) return;

    const genomes = members.map((m) => m.genome);
    this.divergenceMatrix.updatePopulationCentroid(populationId, genomes, tick);

    // Update spatial center
    const population = this.divergenceMatrix.getPopulation(populationId);
    if (population) {
      let sumX = 0,
        sumY = 0,
        maxDist = 0;
      const cx =
        members.reduce((sum, m) => sum + m.position.x, 0) / members.length;
      const cy =
        members.reduce((sum, m) => sum + m.position.y, 0) / members.length;

      for (const member of members) {
        sumX += member.position.x;
        sumY += member.position.y;
        const dist = Math.sqrt(
          Math.pow(member.position.x - cx, 2) +
            Math.pow(member.position.y - cy, 2)
        );
        maxDist = Math.max(maxDist, dist);
      }

      population.spatialCenter = { x: cx, y: cy };
      population.spatialRadius = maxDist;
      population.memberCount = members.length;
      population.lastUpdateTick = tick;
    }
  }

  /**
   * Record a gene flow event (e.g., when agents from different populations mate)
   */
  recordGeneFlow(event: GeneFlowEvent): void {
    this.divergenceMatrix.recordGeneFlow(event);
  }

  /**
   * Check if two agents can mate
   */
  canMate(agentA: MatingCandidate, agentB: MatingCandidate): boolean {
    return this.reproductiveIsolation.canMate(agentA, agentB);
  }

  /**
   * Update the speciation engine for a tick
   */
  update(tick: number): SpeciationEvent[] {
    // Update divergence matrix
    if (tick % this.config.divergenceMatrix.updateInterval === 0) {
      this.divergenceMatrix.update(tick);
    }

    // Check for speciation events
    const events = this.checkForSpeciation(tick);

    // Update stats
    this.stats.activePopulations = this.divergenceMatrix.getActivePopulations().length;
    this.stats.averageDivergence = this.divergenceMatrix.getAverageDivergence();

    if (events.length > 0) {
      this.stats.lastSpeciationTick = tick;
    }

    return events;
  }

  /**
   * Check for and execute speciation events
   */
  private checkForSpeciation(tick: number): SpeciationEvent[] {
    const events: SpeciationEvent[] = [];
    const candidates = this.divergenceMatrix.getSpeciationCandidates();

    for (const candidate of candidates) {
      // Check cooldown
      const lastSpeciationA = this.lastSpeciationTicks.get(candidate.popA) ?? 0;
      const lastSpeciationB = this.lastSpeciationTicks.get(candidate.popB) ?? 0;

      if (
        tick - lastSpeciationA < this.config.speciationCooldown ||
        tick - lastSpeciationB < this.config.speciationCooldown
      ) {
        continue;
      }

      // Determine mechanism
      const mechanism = this.determineMechanism(candidate.popA, candidate.popB);

      // Check if mechanism is enabled
      if (!this.isMechanismEnabled(mechanism)) {
        continue;
      }

      // Get population info
      const popA = this.divergenceMatrix.getPopulation(candidate.popA);
      const popB = this.divergenceMatrix.getPopulation(candidate.popB);

      if (!popA || !popB) continue;

      // Smaller population splits off
      const [parentPop, childPop] =
        popA.memberCount >= popB.memberCount ? [popA, popB] : [popB, popA];

      // Check minimum population size
      if (childPop.memberCount < this.config.minFoundingPopulation) {
        continue;
      }

      // Create speciation event
      const newPopulationId = this.generatePopulationId();
      const newLineageId = this.generateLineageId();

      const event: SpeciationEvent = {
        id: `speciation_${tick}_${Math.random().toString(36).substring(2, 9)}`,
        tick,
        parentPopulationId: parentPop.id,
        parentLineageId: parentPop.lineageId,
        newPopulationId,
        newLineageId,
        mechanism,
        founderGenomeIds: [], // Would be populated by caller
        geneticDistance: candidate.divergence,
        populationDivergence: candidate.divergence,
        spatialSeparation: this.computeSpatialSeparation(parentPop, childPop),
      };

      events.push(event);
      this.speciationEvents.push(event);

      // Update stats
      this.stats.totalSpeciationEvents++;
      this.stats.eventsByMechanism[mechanism]++;

      // Set cooldown
      this.lastSpeciationTicks.set(parentPop.id, tick);
      this.lastSpeciationTicks.set(childPop.id, tick);
    }

    return events;
  }

  /**
   * Determine the primary speciation mechanism
   */
  private determineMechanism(
    popA: PopulationId,
    popB: PopulationId
  ): SpeciationMechanism {
    const populationA = this.divergenceMatrix.getPopulation(popA);
    const populationB = this.divergenceMatrix.getPopulation(popB);

    if (!populationA || !populationB) {
      return 'genetic-drift';
    }

    // Check geographic separation
    const spatialDist = this.computeSpatialSeparation(populationA, populationB);
    const combinedRadius = populationA.spatialRadius + populationB.spatialRadius;

    if (spatialDist > combinedRadius * 2) {
      return 'geographic-isolation';
    }

    // Check for parapatric speciation (partial overlap)
    if (spatialDist > combinedRadius * 0.5) {
      return 'ecological-specialization';
    }

    // Default to genetic drift (sympatric)
    return 'genetic-drift';
  }

  /**
   * Check if a speciation mechanism is enabled
   */
  private isMechanismEnabled(mechanism: SpeciationMechanism): boolean {
    switch (mechanism) {
      case 'geographic-isolation':
        return this.config.enableGeographicSpeciation;
      case 'genetic-drift':
      case 'ecological-specialization':
        return this.config.enableSympatricSpeciation;
      case 'hybrid-incompatibility':
      case 'behavioral-isolation':
        return this.config.enableParapatricSpeciation;
      default:
        return true;
    }
  }

  /**
   * Compute spatial separation between two populations
   */
  private computeSpatialSeparation(
    popA: PopulationDescriptor,
    popB: PopulationDescriptor
  ): number {
    const dx = popA.spatialCenter.x - popB.spatialCenter.x;
    const dy = popA.spatialCenter.y - popB.spatialCenter.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Find speciation candidates in a population
   */
  findSpeciationCandidates(
    populationId: PopulationId,
    members: Array<{ id: string; genome: Genome }>
  ): SpeciationCandidate[] {
    const population = this.divergenceMatrix.getPopulation(populationId);
    if (!population) return [];

    const candidates: SpeciationCandidate[] = [];
    const threshold =
      this.config.reproductiveIsolation.matingDistanceThreshold * 1.5;

    for (const member of members) {
      if (
        this.reproductiveIsolation.isSpeciationCandidate(
          member.genome,
          population.centroidGenome,
          threshold
        )
      ) {
        const genes = member.genome.genes;
        let sumSquares = 0;
        for (let i = 0; i < genes.length; i++) {
          const diff = genes[i] - population.centroidGenome[i];
          sumSquares += diff * diff;
        }
        const maxDistance = Math.sqrt(genes.length * 4);
        const distanceFromCentroid = Math.sqrt(sumSquares) / maxDistance;

        candidates.push({
          genomeId: member.genome.id,
          currentPopulationId: populationId,
          distanceFromCentroid,
          isolationScore: distanceFromCentroid,
          potentialFounders: [member.genome.id],
        });
      }
    }

    return candidates.sort((a, b) => b.isolationScore - a.isolationScore);
  }

  /**
   * Cluster agents spatially for geographic speciation detection
   */
  clusterSpatially(
    agents: Array<{
      id: string;
      position: { x: number; y: number };
      populationId: PopulationId;
    }>,
    minClusterSize: number = 5,
    maxClusterRadius: number = 100
  ): ClusteringResult {
    // Simple grid-based clustering
    const cellSize = maxClusterRadius;
    const cells = new Map<string, typeof agents>();

    // Assign to cells
    for (const agent of agents) {
      const cx = Math.floor(agent.position.x / cellSize);
      const cy = Math.floor(agent.position.y / cellSize);
      const key = `${cx},${cy}`;

      if (!cells.has(key)) {
        cells.set(key, []);
      }
      cells.get(key)!.push(agent);
    }

    const clusters: SpatialCluster[] = [];
    const noise: string[] = [];
    const connectivity = new Map<string, Set<string>>();

    // Process cells
    for (const [key, cellAgents] of cells) {
      if (cellAgents.length < minClusterSize) {
        noise.push(...cellAgents.map((a) => a.id));
        continue;
      }

      // Calculate cluster center
      const cx =
        cellAgents.reduce((sum, a) => sum + a.position.x, 0) / cellAgents.length;
      const cy =
        cellAgents.reduce((sum, a) => sum + a.position.y, 0) / cellAgents.length;

      // Calculate radius
      let maxDist = 0;
      for (const agent of cellAgents) {
        const dist = Math.sqrt(
          Math.pow(agent.position.x - cx, 2) +
            Math.pow(agent.position.y - cy, 2)
        );
        maxDist = Math.max(maxDist, dist);
      }

      const cluster: SpatialCluster = {
        id: `cluster_${key}`,
        populationId: cellAgents[0].populationId,
        memberIds: new Set(cellAgents.map((a) => a.id)),
        center: { x: cx, y: cy },
        radius: maxDist,
        density: cellAgents.length / (Math.PI * maxDist * maxDist || 1),
      };

      clusters.push(cluster);

      // Track connectivity (adjacent cells)
      const [cellX, cellY] = key.split(',').map(Number);
      const adjacent = [
        `${cellX - 1},${cellY}`,
        `${cellX + 1},${cellY}`,
        `${cellX},${cellY - 1}`,
        `${cellX},${cellY + 1}`,
      ];

      for (const adjKey of adjacent) {
        if (cells.has(adjKey)) {
          if (!connectivity.has(cluster.id)) {
            connectivity.set(cluster.id, new Set());
          }
          connectivity.get(cluster.id)!.add(`cluster_${adjKey}`);
        }
      }
    }

    return { clusters, noise, connectivity };
  }

  /**
   * Generate a unique population ID
   */
  private generatePopulationId(): PopulationId {
    return `pop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate a unique lineage ID
   */
  private generateLineageId(): LineageId {
    return `lineage_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get all speciation events
   */
  getSpeciationEvents(): SpeciationEvent[] {
    return [...this.speciationEvents];
  }

  /**
   * Get recent speciation events
   */
  getRecentEvents(count: number = 10): SpeciationEvent[] {
    return this.speciationEvents.slice(-count);
  }

  /**
   * Get speciation statistics
   */
  getStats(): SpeciationStats {
    return { ...this.stats };
  }

  /**
   * Get divergence matrix
   */
  getDivergenceMatrix(): DivergenceMatrix {
    return this.divergenceMatrix;
  }

  /**
   * Get reproductive isolation system
   */
  getReproductiveIsolation(): ReproductiveIsolation {
    return this.reproductiveIsolation;
  }

  /**
   * Get configuration
   */
  getConfig(): SpeciationEngineConfig {
    return { ...this.config };
  }

  /**
   * Export state for serialization
   */
  toJSON(): object {
    return {
      config: this.config,
      divergenceMatrix: this.divergenceMatrix.toJSON(),
      speciationEvents: this.speciationEvents,
      stats: this.stats,
    };
  }
}

export default SpeciationEngine;
