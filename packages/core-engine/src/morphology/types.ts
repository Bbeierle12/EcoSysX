/**
 * types.ts - Karl Sims-inspired hierarchical morphology types
 *
 * Defines interfaces for evolving 3D body structures through genetic encoding.
 * Based on "Evolving 3D Morphology and Behavior" (Karl Sims, 1994).
 */

// ============================================================================
// Gene Indices (20 genes per segment)
// ============================================================================

export enum SegmentGene {
  // Dimensions (3 genes)
  LENGTH = 0,
  WIDTH = 1,
  HEIGHT = 2,

  // Attachment position (3 genes)
  ATTACH_X = 3,
  ATTACH_Y = 4,
  ATTACH_Z = 5,

  // Attachment angles (3 genes)
  PITCH = 6,
  YAW = 7,
  ROLL = 8,

  // Physical properties (2 genes)
  DENSITY = 9,
  FLEXIBILITY = 10,

  // Functional flags (3 genes, threshold-based booleans)
  HAS_NEURONS = 11,
  HAS_SENSORS = 12,
  HAS_EFFECTORS = 13,

  // Recursion control (2 genes)
  RECURSION_DEPTH = 14,
  MIRROR_SYMMETRY = 15,

  // Child segment control (2 genes)
  CHILD_COUNT = 16,
  CHILD_SCALE = 17,

  // Reserved for future use (2 genes)
  RESERVED_1 = 18,
  RESERVED_2 = 19,
}

export const GENES_PER_SEGMENT = 20;

// ============================================================================
// Body Segment Types
// ============================================================================

export interface SegmentDimensions {
  length: number;   // Along primary axis
  width: number;    // Perpendicular width
  height: number;   // Perpendicular height
}

export interface AttachmentPoint {
  x: number;        // Position on parent [-1, 1] normalized
  y: number;
  z: number;
  pitch: number;    // Rotation in radians
  yaw: number;
  roll: number;
}

export interface SegmentProperties {
  density: number;      // Mass per volume [0.1, 2.0]
  flexibility: number;  // Joint flexibility [0, 1]
  hasNeurons: boolean;  // Can process neural signals
  hasSensors: boolean;  // Can sense environment
  hasEffectors: boolean; // Can produce movement/force
}

export interface BodySegment {
  id: string;
  parentId: string | null;
  depth: number;            // Distance from root segment
  dimensions: SegmentDimensions;
  attachment: AttachmentPoint;
  properties: SegmentProperties;
  mass: number;             // Calculated from dimensions * density
  volume: number;           // Calculated from dimensions
  children: BodySegment[];
}

// ============================================================================
// Morphology Phenotype
// ============================================================================

export interface MorphologyPhenotype {
  segments: BodySegment[];
  rootSegment: BodySegment;

  // Derived aggregate traits
  totalMass: number;
  totalVolume: number;
  size: number;             // Bounding radius, affects collision/visibility
  segmentCount: number;

  // Functional traits (derived from segment composition)
  speed: number;            // Movement capability [0, 2]
  strength: number;         // Force generation [0, 2]
  perception: number;       // Sensing capability [0, 1]
  agility: number;          // Maneuverability [0, 1]
  metabolicRate: number;    // Energy consumption rate

  // Structural metrics
  symmetryScore: number;    // How symmetric the body is [0, 1]
  limbCount: number;        // Number of limb-like appendages
  sensorCount: number;      // Segments with sensors
  effectorCount: number;    // Segments with effectors
}

// ============================================================================
// Morphology Configuration
// ============================================================================

export interface MorphologyConfig {
  maxSegments: number;          // Maximum segments in a body
  maxDepth: number;             // Maximum tree depth
  maxChildrenPerSegment: number;
  minSegmentSize: number;       // Minimum dimension
  maxSegmentSize: number;       // Maximum dimension
  minDensity: number;
  maxDensity: number;
  geneThreshold: number;        // Threshold for boolean genes (default 0.5)
  symmetryProbability: number;  // Chance of symmetric child placement
}

export const DEFAULT_MORPHOLOGY_CONFIG: MorphologyConfig = {
  maxSegments: 16,
  maxDepth: 4,
  maxChildrenPerSegment: 3,
  minSegmentSize: 0.1,
  maxSegmentSize: 2.0,
  minDensity: 0.5,
  maxDensity: 2.0,
  geneThreshold: 0.5,
  symmetryProbability: 0.7,
};

// ============================================================================
// Morphology Genome Types
// ============================================================================

export interface MorphologyGenomeConfig {
  segmentGeneCount: number;     // Genes per segment (default 20)
  maxSegmentGenes: number;      // Max segments encoded in genome
  mutationRate: number;
  mutationStrength: number;
}

export const DEFAULT_MORPHOLOGY_GENOME_CONFIG: MorphologyGenomeConfig = {
  segmentGeneCount: GENES_PER_SEGMENT,
  maxSegmentGenes: 16,
  mutationRate: 0.1,
  mutationStrength: 0.2,
};

// ============================================================================
// Trait Calculation Helpers
// ============================================================================

export interface TraitWeights {
  // Speed factors
  massSpeedPenalty: number;     // How much mass reduces speed
  limbSpeedBonus: number;       // How much limbs increase speed
  effectorSpeedBonus: number;   // Effector contribution to speed

  // Strength factors
  massStrengthBonus: number;    // Mass contribution to strength
  effectorStrengthBonus: number;

  // Perception factors
  sensorPerceptionBonus: number;
  neuronPerceptionBonus: number;

  // Metabolic factors
  basalMetabolicRate: number;   // Base energy consumption
  massMetabolicCost: number;    // Energy per unit mass
  neuronMetabolicCost: number;  // Extra cost for neural segments
}

export const DEFAULT_TRAIT_WEIGHTS: TraitWeights = {
  massSpeedPenalty: 0.1,
  limbSpeedBonus: 0.15,
  effectorSpeedBonus: 0.2,
  massStrengthBonus: 0.3,
  effectorStrengthBonus: 0.4,
  sensorPerceptionBonus: 0.3,
  neuronPerceptionBonus: 0.2,
  basalMetabolicRate: 0.05,
  massMetabolicCost: 0.02,
  neuronMetabolicCost: 0.01,
};

// ============================================================================
// Serialization Types
// ============================================================================

export interface SerializedSegment {
  id: string;
  parentId: string | null;
  depth: number;
  dimensions: SegmentDimensions;
  attachment: AttachmentPoint;
  properties: SegmentProperties;
  mass: number;
  volume: number;
  childIds: string[];
}

export interface SerializedMorphology {
  segments: SerializedSegment[];
  rootSegmentId: string;
  phenotype: Omit<MorphologyPhenotype, 'segments' | 'rootSegment'>;
}

// ============================================================================
// Preset Morphologies
// ============================================================================

export type MorphologyPreset =
  | 'blob'        // Simple single-segment body
  | 'biped'       // Two-legged body
  | 'quadruped'   // Four-legged body
  | 'serpent'     // Long segmented body
  | 'radial'      // Radially symmetric (starfish-like)
  | 'asymmetric'; // Intentionally asymmetric

export interface MorphologyPresetConfig {
  name: string;
  description: string;
  segmentCount: number;
  baseGenes: number[];        // Gene values for root segment
  structureRules: {
    depth: number;
    childrenAtDepth: number[];
    symmetry: boolean;
  };
}

export const MORPHOLOGY_PRESETS: Record<MorphologyPreset, MorphologyPresetConfig> = {
  blob: {
    name: 'Blob',
    description: 'Simple single-segment organism',
    segmentCount: 1,
    baseGenes: [
      1.0, 1.0, 1.0,           // Dimensions
      0, 0, 0, 0, 0, 0,        // No attachment (root)
      1.0, 0.5,                // Density, flexibility
      0.8, 0.8, 0.8,           // All functional
      0, 0,                    // No recursion
      0, 1.0,                  // No children
      0, 0,                    // Reserved
    ],
    structureRules: { depth: 1, childrenAtDepth: [0], symmetry: false },
  },
  biped: {
    name: 'Biped',
    description: 'Two-legged walking body',
    segmentCount: 5,
    baseGenes: [
      0.8, 0.6, 1.2,           // Tall body
      0, 0, 0, 0, 0, 0,
      1.2, 0.3,
      0.9, 0.7, 0.5,
      1, 1,                    // Recursion for legs
      2, 0.7,                  // 2 children
      0, 0,
    ],
    structureRules: { depth: 3, childrenAtDepth: [2, 1, 0], symmetry: true },
  },
  quadruped: {
    name: 'Quadruped',
    description: 'Four-legged body',
    segmentCount: 9,
    baseGenes: [
      1.5, 0.8, 0.6,           // Long body
      0, 0, 0, 0, 0, 0,
      1.0, 0.4,
      0.8, 0.6, 0.7,
      2, 1,                    // Recursion
      4, 0.6,                  // 4 children
      0, 0,
    ],
    structureRules: { depth: 3, childrenAtDepth: [4, 1, 0], symmetry: true },
  },
  serpent: {
    name: 'Serpent',
    description: 'Long segmented snake-like body',
    segmentCount: 8,
    baseGenes: [
      0.5, 0.5, 0.5,
      0, 0, 0, 0, 0, 0,
      0.8, 0.9,                // Flexible
      0.6, 0.8, 0.9,
      6, 0,                    // Deep recursion, no branching
      1, 0.95,                 // Single chain
      0, 0,
    ],
    structureRules: { depth: 8, childrenAtDepth: [1, 1, 1, 1, 1, 1, 1, 0], symmetry: false },
  },
  radial: {
    name: 'Radial',
    description: 'Radially symmetric starfish-like body',
    segmentCount: 6,
    baseGenes: [
      0.8, 0.8, 0.3,           // Flat center
      0, 0, 0, 0, 0, 0,
      1.0, 0.5,
      0.9, 0.9, 0.6,
      1, 1,
      5, 0.8,                  // 5 arms
      0, 0,
    ],
    structureRules: { depth: 2, childrenAtDepth: [5, 0], symmetry: true },
  },
  asymmetric: {
    name: 'Asymmetric',
    description: 'Intentionally asymmetric body',
    segmentCount: 6,
    baseGenes: [
      1.0, 0.7, 0.8,
      0, 0, 0, 0, 0, 0,
      1.1, 0.6,
      0.7, 0.8, 0.7,
      2, 0,                    // No mirror symmetry
      3, 0.7,
      0, 0,
    ],
    structureRules: { depth: 3, childrenAtDepth: [3, 1, 1], symmetry: false },
  },
};
