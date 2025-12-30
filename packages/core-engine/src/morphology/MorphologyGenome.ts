/**
 * MorphologyGenome.ts - Hierarchical gene encoding for body morphology
 *
 * Wraps the base Genome class with morphology-specific accessors and
 * operations for Karl Sims-style body evolution.
 */

import { Genome } from '../genetics/Genome';
import {
  SegmentGene,
  GENES_PER_SEGMENT,
  MorphologyGenomeConfig,
  DEFAULT_MORPHOLOGY_GENOME_CONFIG,
  MorphologyPreset,
  MORPHOLOGY_PRESETS,
  SegmentDimensions,
  AttachmentPoint,
  SegmentProperties,
} from './types';

// ============================================================================
// MorphologyGenome Class
// ============================================================================

export class MorphologyGenome {
  private genome: Genome;
  private config: MorphologyGenomeConfig;
  private _segmentCount: number;

  constructor(
    genome?: Genome,
    config?: Partial<MorphologyGenomeConfig>
  ) {
    this.config = { ...DEFAULT_MORPHOLOGY_GENOME_CONFIG, ...config };
    this._segmentCount = this.config.maxSegmentGenes;

    if (genome) {
      this.genome = genome;
    } else {
      // Create a new genome sized for morphology
      const genomeSize = this.config.segmentGeneCount * this.config.maxSegmentGenes;
      this.genome = Genome.withSize(genomeSize, {
        mutationRate: this.config.mutationRate,
        mutationStrength: this.config.mutationStrength,
        initRange: [0, 1],
      });
    }
  }

  /**
   * Create MorphologyGenome from an existing base Genome
   */
  static fromGenome(genome: Genome, config?: Partial<MorphologyGenomeConfig>): MorphologyGenome {
    return new MorphologyGenome(genome, config);
  }

  /**
   * Create a random MorphologyGenome
   */
  static random(config?: Partial<MorphologyGenomeConfig>): MorphologyGenome {
    return new MorphologyGenome(undefined, config);
  }

  /**
   * Create MorphologyGenome from a preset
   */
  static fromPreset(preset: MorphologyPreset, config?: Partial<MorphologyGenomeConfig>): MorphologyGenome {
    const presetConfig = MORPHOLOGY_PRESETS[preset];
    const fullConfig = { ...DEFAULT_MORPHOLOGY_GENOME_CONFIG, ...config };
    const genomeSize = fullConfig.segmentGeneCount * fullConfig.maxSegmentGenes;

    const genome = Genome.withSize(genomeSize, {
      mutationRate: fullConfig.mutationRate,
      mutationStrength: fullConfig.mutationStrength,
    });

    // Set root segment genes from preset
    for (let i = 0; i < presetConfig.baseGenes.length && i < GENES_PER_SEGMENT; i++) {
      genome.setGene(i, presetConfig.baseGenes[i]);
    }

    // Generate child segments based on structure rules
    const morphGenome = new MorphologyGenome(genome, fullConfig);
    morphGenome.applyStructureRules(presetConfig);

    return morphGenome;
  }

  /**
   * Apply structure rules from a preset to generate child segments
   */
  private applyStructureRules(presetConfig: typeof MORPHOLOGY_PRESETS[MorphologyPreset]): void {
    const { structureRules } = presetConfig;
    let segmentIndex = 1; // Start after root

    for (let depth = 0; depth < structureRules.depth && segmentIndex < this._segmentCount; depth++) {
      const childCount = structureRules.childrenAtDepth[depth] || 0;

      for (let c = 0; c < childCount && segmentIndex < this._segmentCount; c++) {
        const baseOffset = segmentIndex * GENES_PER_SEGMENT;

        // Set child segment genes with variation
        const scale = Math.pow(0.7, depth + 1); // Shrink with depth

        this.genome.setGene(baseOffset + SegmentGene.LENGTH, 0.5 * scale + Math.random() * 0.3);
        this.genome.setGene(baseOffset + SegmentGene.WIDTH, 0.4 * scale + Math.random() * 0.2);
        this.genome.setGene(baseOffset + SegmentGene.HEIGHT, 0.4 * scale + Math.random() * 0.2);

        // Attachment angles for symmetric distribution
        const angleOffset = structureRules.symmetry
          ? (c / childCount) * Math.PI * 2
          : Math.random() * Math.PI * 2;

        this.genome.setGene(baseOffset + SegmentGene.ATTACH_X, Math.cos(angleOffset) * 0.5 + 0.5);
        this.genome.setGene(baseOffset + SegmentGene.ATTACH_Y, Math.sin(angleOffset) * 0.5 + 0.5);
        this.genome.setGene(baseOffset + SegmentGene.ATTACH_Z, 0.5);

        this.genome.setGene(baseOffset + SegmentGene.YAW, angleOffset / (Math.PI * 2));
        this.genome.setGene(baseOffset + SegmentGene.PITCH, 0.3 + Math.random() * 0.2);
        this.genome.setGene(baseOffset + SegmentGene.ROLL, 0.5);

        // Properties
        this.genome.setGene(baseOffset + SegmentGene.DENSITY, 0.7 + Math.random() * 0.3);
        this.genome.setGene(baseOffset + SegmentGene.FLEXIBILITY, 0.3 + Math.random() * 0.4);

        // Functional traits
        this.genome.setGene(baseOffset + SegmentGene.HAS_NEURONS, depth < 2 ? 0.7 : 0.3);
        this.genome.setGene(baseOffset + SegmentGene.HAS_SENSORS, depth === 0 ? 0.8 : 0.4);
        this.genome.setGene(baseOffset + SegmentGene.HAS_EFFECTORS, depth > 0 ? 0.7 : 0.3);

        // Recursion
        this.genome.setGene(baseOffset + SegmentGene.RECURSION_DEPTH, Math.max(0, structureRules.depth - depth - 1) / 10);
        this.genome.setGene(baseOffset + SegmentGene.MIRROR_SYMMETRY, structureRules.symmetry ? 0.8 : 0.2);

        segmentIndex++;
      }
    }
  }

  // =====================
  // Segment Gene Accessors
  // =====================

  /**
   * Get raw gene value for a segment
   */
  getSegmentGene(segmentIndex: number, gene: SegmentGene): number {
    const offset = segmentIndex * GENES_PER_SEGMENT + gene;
    return this.genome.getGene(offset);
  }

  /**
   * Set raw gene value for a segment
   */
  setSegmentGene(segmentIndex: number, gene: SegmentGene, value: number): void {
    const offset = segmentIndex * GENES_PER_SEGMENT + gene;
    this.genome.setGene(offset, Math.max(0, Math.min(1, value)));
  }

  /**
   * Get dimensions for a segment (scaled to physical units)
   */
  getSegmentDimensions(segmentIndex: number, minSize: number = 0.1, maxSize: number = 2.0): SegmentDimensions {
    const range = maxSize - minSize;
    return {
      length: minSize + this.getSegmentGene(segmentIndex, SegmentGene.LENGTH) * range,
      width: minSize + this.getSegmentGene(segmentIndex, SegmentGene.WIDTH) * range,
      height: minSize + this.getSegmentGene(segmentIndex, SegmentGene.HEIGHT) * range,
    };
  }

  /**
   * Get attachment point for a segment
   */
  getSegmentAttachment(segmentIndex: number): AttachmentPoint {
    return {
      x: this.getSegmentGene(segmentIndex, SegmentGene.ATTACH_X) * 2 - 1,
      y: this.getSegmentGene(segmentIndex, SegmentGene.ATTACH_Y) * 2 - 1,
      z: this.getSegmentGene(segmentIndex, SegmentGene.ATTACH_Z) * 2 - 1,
      pitch: this.getSegmentGene(segmentIndex, SegmentGene.PITCH) * Math.PI * 2 - Math.PI,
      yaw: this.getSegmentGene(segmentIndex, SegmentGene.YAW) * Math.PI * 2 - Math.PI,
      roll: this.getSegmentGene(segmentIndex, SegmentGene.ROLL) * Math.PI * 2 - Math.PI,
    };
  }

  /**
   * Get properties for a segment
   */
  getSegmentProperties(
    segmentIndex: number,
    threshold: number = 0.5,
    minDensity: number = 0.5,
    maxDensity: number = 2.0
  ): SegmentProperties {
    const densityRange = maxDensity - minDensity;
    return {
      density: minDensity + this.getSegmentGene(segmentIndex, SegmentGene.DENSITY) * densityRange,
      flexibility: this.getSegmentGene(segmentIndex, SegmentGene.FLEXIBILITY),
      hasNeurons: this.getSegmentGene(segmentIndex, SegmentGene.HAS_NEURONS) > threshold,
      hasSensors: this.getSegmentGene(segmentIndex, SegmentGene.HAS_SENSORS) > threshold,
      hasEffectors: this.getSegmentGene(segmentIndex, SegmentGene.HAS_EFFECTORS) > threshold,
    };
  }

  /**
   * Get recursion parameters for a segment
   */
  getSegmentRecursion(segmentIndex: number, maxDepth: number = 4): { depth: number; mirror: boolean } {
    const depthGene = this.getSegmentGene(segmentIndex, SegmentGene.RECURSION_DEPTH);
    const mirrorGene = this.getSegmentGene(segmentIndex, SegmentGene.MIRROR_SYMMETRY);

    return {
      depth: Math.floor(depthGene * maxDepth),
      mirror: mirrorGene > 0.5,
    };
  }

  /**
   * Get child count for a segment
   */
  getChildCount(segmentIndex: number, maxChildren: number = 3): number {
    const gene = this.getSegmentGene(segmentIndex, SegmentGene.CHILD_COUNT);
    return Math.min(maxChildren, Math.floor(gene * (maxChildren + 1)));
  }

  /**
   * Get child scale factor
   */
  getChildScale(segmentIndex: number): number {
    return 0.5 + this.getSegmentGene(segmentIndex, SegmentGene.CHILD_SCALE) * 0.5;
  }

  // =====================
  // Genetic Operations
  // =====================

  /**
   * Create a mutated copy
   */
  mutate(mutationRate?: number, mutationStrength?: number): MorphologyGenome {
    const rate = mutationRate ?? this.config.mutationRate;
    const strength = mutationStrength ?? this.config.mutationStrength;

    const mutatedGenome = this.genome.clone();
    mutatedGenome.mutate(rate, strength);

    return new MorphologyGenome(mutatedGenome, this.config);
  }

  /**
   * Crossover with another MorphologyGenome
   */
  crossover(other: MorphologyGenome): MorphologyGenome {
    const childGenome = this.genome.crossover(other.genome);
    return new MorphologyGenome(childGenome, this.config);
  }

  /**
   * Clone this morphology genome
   */
  clone(): MorphologyGenome {
    return new MorphologyGenome(this.genome.clone(), this.config);
  }

  /**
   * Get the underlying base genome
   */
  getBaseGenome(): Genome {
    return this.genome;
  }

  /**
   * Get genome ID
   */
  get id(): string {
    return this.genome.id;
  }

  /**
   * Get generation number
   */
  get generation(): number {
    return this.genome.generation;
  }

  /**
   * Get segment count
   */
  get segmentCount(): number {
    return this._segmentCount;
  }

  /**
   * Get total gene count
   */
  get geneCount(): number {
    return this.genome.size;
  }

  /**
   * Calculate genetic distance to another morphology genome
   */
  distanceTo(other: MorphologyGenome): number {
    return this.genome.distanceFrom(other.genome);
  }

  /**
   * Get all genes as array
   */
  getGenes(): Float32Array {
    return this.genome.genes;
  }

  /**
   * Get all genes for a specific segment
   */
  getSegmentGenes(segmentIndex: number): number[] {
    const offset = segmentIndex * GENES_PER_SEGMENT;
    const genes: number[] = [];

    for (let i = 0; i < GENES_PER_SEGMENT; i++) {
      genes.push(this.genome.getGene(offset + i));
    }

    return genes;
  }

  /**
   * Set all genes for a specific segment
   */
  setSegmentGenes(segmentIndex: number, genes: number[]): void {
    const offset = segmentIndex * GENES_PER_SEGMENT;

    for (let i = 0; i < Math.min(genes.length, GENES_PER_SEGMENT); i++) {
      this.genome.setGene(offset + i, Math.max(0, Math.min(1, genes[i])));
    }
  }

  // =====================
  // Serialization
  // =====================

  /**
   * Serialize to JSON
   */
  toJSON(): object {
    return {
      genome: this.genome.toJSON(),
      config: this.config,
      segmentCount: this._segmentCount,
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data: {
    genome: ReturnType<Genome['toJSON']>;
    config: MorphologyGenomeConfig;
    segmentCount: number;
  }): MorphologyGenome {
    const genome = Genome.fromJSON(data.genome);
    const morphGenome = new MorphologyGenome(genome, data.config);
    morphGenome._segmentCount = data.segmentCount;
    return morphGenome;
  }

  /**
   * Get configuration
   */
  getConfig(): MorphologyGenomeConfig {
    return { ...this.config };
  }
}

export default MorphologyGenome;
