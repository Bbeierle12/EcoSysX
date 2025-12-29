/**
 * types.ts - Speciation system types
 *
 * Defines interfaces for advanced speciation based on gen3sis and REvoSim patterns.
 */

import { GenomeId } from '../genetics/Genome';
import { LineageId } from '../lineage/Lineage';

// ============================================================================
// Population Types
// ============================================================================

export type PopulationId = string;

export interface PopulationDescriptor {
  id: PopulationId;
  lineageId: LineageId;
  centroidGenome: Float32Array;
  memberCount: number;
  spatialCenter: { x: number; y: number };
  spatialRadius: number;
  generation: number;
  createdAtTick: number;
  lastUpdateTick: number;
}

export interface PopulationSample {
  populationId: PopulationId;
  genomeIds: GenomeId[];
  sampleSize: number;
  variance: number;
}

// ============================================================================
// Divergence Matrix Types
// ============================================================================

export interface DivergenceMatrixConfig {
  maxPopulations: number;
  divergenceThreshold: number;
  divergenceDecayRate: number;
  isolationAccumulationRate: number;
  sampleSize: number;
  updateInterval: number;
}

export const DEFAULT_DIVERGENCE_MATRIX_CONFIG: DivergenceMatrixConfig = {
  maxPopulations: 1000,
  divergenceThreshold: 0.5,
  divergenceDecayRate: 0.01,
  isolationAccumulationRate: 0.02,
  sampleSize: 10,
  updateInterval: 100,
};

export interface DivergenceEntry {
  populationIdA: PopulationId;
  populationIdB: PopulationId;
  divergence: number;
  hasGeneFlow: boolean;
  lastGeneFlowTick: number;
  lastUpdateTick: number;
}

// ============================================================================
// Reproductive Isolation Types
// ============================================================================

export interface ReproductiveIsolationConfig {
  matingDistanceThreshold: number;
  populationIsolationThreshold: number;
  behavioralIsolationEnabled: boolean;
  temporalIsolationEnabled: boolean;
  geographicIsolationRadius: number;
}

export const DEFAULT_REPRODUCTIVE_ISOLATION_CONFIG: ReproductiveIsolationConfig = {
  matingDistanceThreshold: 0.3,
  populationIsolationThreshold: 0.6,
  behavioralIsolationEnabled: false,
  temporalIsolationEnabled: false,
  geographicIsolationRadius: 100,
};

export interface MatingCompatibility {
  compatible: boolean;
  geneticDistance: number;
  populationDivergence: number;
  isolationFactors: IsolationFactor[];
}

export interface IsolationFactor {
  type: 'genetic' | 'geographic' | 'temporal' | 'behavioral' | 'population';
  strength: number;
  description: string;
}

// ============================================================================
// Speciation Event Types
// ============================================================================

export type SpeciationMechanism =
  | 'genetic-drift'
  | 'geographic-isolation'
  | 'temporal-isolation'
  | 'behavioral-isolation'
  | 'hybrid-incompatibility'
  | 'ecological-specialization';

export interface SpeciationEvent {
  id: string;
  tick: number;
  parentPopulationId: PopulationId;
  parentLineageId: LineageId;
  newPopulationId: PopulationId;
  newLineageId: LineageId;
  mechanism: SpeciationMechanism;
  founderGenomeIds: GenomeId[];
  geneticDistance: number;
  populationDivergence: number;
  spatialSeparation: number;
}

export interface SpeciationCandidate {
  genomeId: GenomeId;
  currentPopulationId: PopulationId;
  distanceFromCentroid: number;
  isolationScore: number;
  potentialFounders: GenomeId[];
}

// ============================================================================
// Speciation Engine Types
// ============================================================================

export interface SpeciationEngineConfig {
  divergenceMatrix: DivergenceMatrixConfig;
  reproductiveIsolation: ReproductiveIsolationConfig;
  minFoundingPopulation: number;
  speciationCooldown: number;
  enableGeographicSpeciation: boolean;
  enableSympatricSpeciation: boolean;
  enableParapatricSpeciation: boolean;
}

export const DEFAULT_SPECIATION_ENGINE_CONFIG: SpeciationEngineConfig = {
  divergenceMatrix: DEFAULT_DIVERGENCE_MATRIX_CONFIG,
  reproductiveIsolation: DEFAULT_REPRODUCTIVE_ISOLATION_CONFIG,
  minFoundingPopulation: 5,
  speciationCooldown: 500,
  enableGeographicSpeciation: true,
  enableSympatricSpeciation: true,
  enableParapatricSpeciation: true,
};

export interface SpeciationStats {
  totalSpeciationEvents: number;
  eventsByMechanism: Record<SpeciationMechanism, number>;
  activePopulations: number;
  extinctPopulations: number;
  averageDivergence: number;
  lastSpeciationTick: number;
}

// ============================================================================
// Gene Flow Types
// ============================================================================

export interface GeneFlowEvent {
  tick: number;
  sourcePopulationId: PopulationId;
  targetPopulationId: PopulationId;
  genomeId: GenomeId;
  geneFlowStrength: number;
}

export interface GeneFlowStats {
  totalGeneFlowEvents: number;
  geneFlowByPopulationPair: Map<string, number>;
  lastGeneFlowTick: number;
}

// ============================================================================
// Cluster Types (for geographic speciation)
// ============================================================================

export interface SpatialCluster {
  id: string;
  populationId: PopulationId;
  memberIds: Set<string>;
  center: { x: number; y: number };
  radius: number;
  density: number;
}

export interface ClusteringResult {
  clusters: SpatialCluster[];
  noise: string[];
  connectivity: Map<string, Set<string>>;
}
