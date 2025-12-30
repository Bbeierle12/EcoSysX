/**
 * MorphologyDecoder.ts - Genome to Phenotype mapping
 *
 * Decodes a MorphologyGenome into a physical body structure (MorphologyPhenotype)
 * with calculated traits for simulation use.
 */

import { MorphologyGenome } from './MorphologyGenome';
import {
  BodySegment,
  MorphologyPhenotype,
  MorphologyConfig,
  DEFAULT_MORPHOLOGY_CONFIG,
  TraitWeights,
  DEFAULT_TRAIT_WEIGHTS,
  SerializedMorphology,
  SerializedSegment,
} from './types';

// ============================================================================
// MorphologyDecoder Class
// ============================================================================

export class MorphologyDecoder {
  private config: MorphologyConfig;
  private traitWeights: TraitWeights;

  constructor(
    config?: Partial<MorphologyConfig>,
    traitWeights?: Partial<TraitWeights>
  ) {
    this.config = { ...DEFAULT_MORPHOLOGY_CONFIG, ...config };
    this.traitWeights = { ...DEFAULT_TRAIT_WEIGHTS, ...traitWeights };
  }

  /**
   * Decode a MorphologyGenome into a MorphologyPhenotype
   */
  decode(genome: MorphologyGenome): MorphologyPhenotype {
    const segments: BodySegment[] = [];
    const segmentMap = new Map<string, BodySegment>();

    // Create root segment
    const rootSegment = this.createSegment(genome, 0, null, 0, '0');
    segments.push(rootSegment);
    segmentMap.set(rootSegment.id, rootSegment);

    // Build segment tree recursively
    this.buildSegmentTree(genome, rootSegment, segments, segmentMap, 1);

    // Calculate aggregate traits
    const phenotype = this.calculatePhenotype(segments, rootSegment);

    return phenotype;
  }

  /**
   * Create a single body segment from genome data
   */
  private createSegment(
    genome: MorphologyGenome,
    segmentIndex: number,
    parentId: string | null,
    depth: number,
    id: string
  ): BodySegment {
    const dimensions = genome.getSegmentDimensions(
      segmentIndex,
      this.config.minSegmentSize,
      this.config.maxSegmentSize
    );

    const attachment = genome.getSegmentAttachment(segmentIndex);

    const properties = genome.getSegmentProperties(
      segmentIndex,
      this.config.geneThreshold,
      this.config.minDensity,
      this.config.maxDensity
    );

    const volume = dimensions.length * dimensions.width * dimensions.height;
    const mass = volume * properties.density;

    return {
      id,
      parentId,
      depth,
      dimensions,
      attachment,
      properties,
      mass,
      volume,
      children: [],
    };
  }

  /**
   * Recursively build the segment tree
   */
  private buildSegmentTree(
    genome: MorphologyGenome,
    parent: BodySegment,
    segments: BodySegment[],
    segmentMap: Map<string, BodySegment>,
    nextSegmentIndex: number
  ): number {
    if (parent.depth >= this.config.maxDepth - 1) {
      return nextSegmentIndex;
    }

    if (segments.length >= this.config.maxSegments) {
      return nextSegmentIndex;
    }

    if (nextSegmentIndex >= genome.segmentCount) {
      return nextSegmentIndex;
    }

    // Get recursion info from parent's genome
    const parentGenomeIndex = parseInt(parent.id.split('_')[0] || '0');
    const recursion = genome.getSegmentRecursion(parentGenomeIndex, this.config.maxDepth);
    const childCount = Math.min(
      genome.getChildCount(parentGenomeIndex, this.config.maxChildrenPerSegment),
      this.config.maxSegments - segments.length
    );

    if (childCount === 0 || recursion.depth === 0) {
      return nextSegmentIndex;
    }

    const childScale = genome.getChildScale(parentGenomeIndex);

    for (let i = 0; i < childCount && segments.length < this.config.maxSegments; i++) {
      if (nextSegmentIndex >= genome.segmentCount) {
        break;
      }

      const childId = `${nextSegmentIndex}_${parent.depth + 1}_${i}`;
      const child = this.createSegment(
        genome,
        nextSegmentIndex,
        parent.id,
        parent.depth + 1,
        childId
      );

      // Apply scale from parent
      child.dimensions.length *= childScale;
      child.dimensions.width *= childScale;
      child.dimensions.height *= childScale;
      child.volume = child.dimensions.length * child.dimensions.width * child.dimensions.height;
      child.mass = child.volume * child.properties.density;

      // Handle mirror symmetry
      if (recursion.mirror && i > 0 && i % 2 === 1) {
        child.attachment.x = -child.attachment.x;
        child.attachment.yaw = -child.attachment.yaw;
      }

      parent.children.push(child);
      segments.push(child);
      segmentMap.set(child.id, child);

      nextSegmentIndex++;

      // Recursively add children to this segment
      nextSegmentIndex = this.buildSegmentTree(
        genome,
        child,
        segments,
        segmentMap,
        nextSegmentIndex
      );
    }

    return nextSegmentIndex;
  }

  /**
   * Calculate the complete phenotype from segments
   */
  private calculatePhenotype(
    segments: BodySegment[],
    rootSegment: BodySegment
  ): MorphologyPhenotype {
    // Aggregate counts
    let totalMass = 0;
    let totalVolume = 0;
    let sensorCount = 0;
    let effectorCount = 0;
    let neuronCount = 0;
    let limbCount = 0;

    for (const segment of segments) {
      totalMass += segment.mass;
      totalVolume += segment.volume;

      if (segment.properties.hasSensors) sensorCount++;
      if (segment.properties.hasEffectors) effectorCount++;
      if (segment.properties.hasNeurons) neuronCount++;

      // Count limbs (segments with effectors at depth > 0)
      if (segment.depth > 0 && segment.properties.hasEffectors) {
        limbCount++;
      }
    }

    // Calculate bounding size (approximate)
    const size = this.calculateBoundingRadius(segments);

    // Calculate derived traits
    const speed = this.calculateSpeed(totalMass, limbCount, effectorCount);
    const strength = this.calculateStrength(totalMass, effectorCount);
    const perception = this.calculatePerception(sensorCount, neuronCount, segments.length);
    const agility = this.calculateAgility(segments);
    const metabolicRate = this.calculateMetabolicRate(totalMass, neuronCount);
    const symmetryScore = this.calculateSymmetryScore(segments);

    return {
      segments,
      rootSegment,
      totalMass,
      totalVolume,
      size,
      segmentCount: segments.length,
      speed,
      strength,
      perception,
      agility,
      metabolicRate,
      symmetryScore,
      limbCount,
      sensorCount,
      effectorCount,
    };
  }

  /**
   * Calculate approximate bounding radius
   */
  private calculateBoundingRadius(segments: BodySegment[]): number {
    let maxExtent = 0;

    for (const segment of segments) {
      // Simple approximation: sum of dimensions at each depth
      const segmentExtent = Math.max(
        segment.dimensions.length,
        segment.dimensions.width,
        segment.dimensions.height
      ) * (segment.depth + 1);

      maxExtent = Math.max(maxExtent, segmentExtent);
    }

    return maxExtent;
  }

  /**
   * Calculate speed trait
   * Lighter bodies with more limbs are faster
   */
  private calculateSpeed(mass: number, limbCount: number, effectorCount: number): number {
    const baseMass = 1.0;
    const massRatio = baseMass / Math.max(0.1, mass);

    const massContribution = Math.min(1, massRatio * (1 - this.traitWeights.massSpeedPenalty));
    const limbContribution = Math.min(0.5, limbCount * this.traitWeights.limbSpeedBonus);
    const effectorContribution = Math.min(0.5, effectorCount * this.traitWeights.effectorSpeedBonus);

    return Math.min(2, Math.max(0.1, massContribution + limbContribution + effectorContribution));
  }

  /**
   * Calculate strength trait
   * Heavier bodies with more effectors are stronger
   */
  private calculateStrength(mass: number, effectorCount: number): number {
    const massContribution = Math.min(1, mass * this.traitWeights.massStrengthBonus);
    const effectorContribution = Math.min(1, effectorCount * this.traitWeights.effectorStrengthBonus);

    return Math.min(2, Math.max(0.1, massContribution + effectorContribution));
  }

  /**
   * Calculate perception trait
   * More sensors and neurons increase perception
   */
  private calculatePerception(
    sensorCount: number,
    neuronCount: number,
    totalSegments: number
  ): number {
    const sensorRatio = sensorCount / Math.max(1, totalSegments);
    const neuronRatio = neuronCount / Math.max(1, totalSegments);

    const sensorContribution = sensorRatio * this.traitWeights.sensorPerceptionBonus;
    const neuronContribution = neuronRatio * this.traitWeights.neuronPerceptionBonus;

    return Math.min(1, Math.max(0, sensorContribution + neuronContribution + 0.2));
  }

  /**
   * Calculate agility trait
   * Based on flexibility and segment count
   */
  private calculateAgility(segments: BodySegment[]): number {
    if (segments.length === 0) return 0;

    let totalFlexibility = 0;
    for (const segment of segments) {
      totalFlexibility += segment.properties.flexibility;
    }

    const avgFlexibility = totalFlexibility / segments.length;
    const segmentBonus = Math.min(0.3, segments.length * 0.03);

    return Math.min(1, Math.max(0, avgFlexibility * 0.7 + segmentBonus));
  }

  /**
   * Calculate metabolic rate
   * Larger bodies and more neurons consume more energy
   */
  private calculateMetabolicRate(mass: number, neuronCount: number): number {
    const basal = this.traitWeights.basalMetabolicRate;
    const massCost = mass * this.traitWeights.massMetabolicCost;
    const neuronCost = neuronCount * this.traitWeights.neuronMetabolicCost;

    return basal + massCost + neuronCost;
  }

  /**
   * Calculate symmetry score
   * How symmetric the body is (0 = asymmetric, 1 = perfectly symmetric)
   */
  private calculateSymmetryScore(segments: BodySegment[]): number {
    if (segments.length <= 1) return 1;

    // Group segments by depth
    const segmentsByDepth = new Map<number, BodySegment[]>();
    for (const segment of segments) {
      if (!segmentsByDepth.has(segment.depth)) {
        segmentsByDepth.set(segment.depth, []);
      }
      segmentsByDepth.get(segment.depth)!.push(segment);
    }

    let symmetrySum = 0;
    let count = 0;

    for (const [depth, depthSegments] of segmentsByDepth) {
      if (depth === 0) continue; // Root is always symmetric

      // Check for paired segments (mirrored x coordinates)
      const xPositions = depthSegments.map(s => s.attachment.x);

      let pairedCount = 0;
      for (let i = 0; i < xPositions.length; i++) {
        for (let j = i + 1; j < xPositions.length; j++) {
          if (Math.abs(xPositions[i] + xPositions[j]) < 0.2) {
            pairedCount++;
          }
        }
      }

      const expectedPairs = Math.floor(depthSegments.length / 2);
      const symmetry = expectedPairs > 0 ? pairedCount / expectedPairs : 1;

      symmetrySum += Math.min(1, symmetry);
      count++;
    }

    return count > 0 ? symmetrySum / count : 1;
  }

  /**
   * Serialize a phenotype for storage
   */
  serializePhenotype(phenotype: MorphologyPhenotype): SerializedMorphology {
    const serializedSegments: SerializedSegment[] = phenotype.segments.map(segment => ({
      id: segment.id,
      parentId: segment.parentId,
      depth: segment.depth,
      dimensions: { ...segment.dimensions },
      attachment: { ...segment.attachment },
      properties: { ...segment.properties },
      mass: segment.mass,
      volume: segment.volume,
      childIds: segment.children.map(c => c.id),
    }));

    return {
      segments: serializedSegments,
      rootSegmentId: phenotype.rootSegment.id,
      phenotype: {
        totalMass: phenotype.totalMass,
        totalVolume: phenotype.totalVolume,
        size: phenotype.size,
        segmentCount: phenotype.segmentCount,
        speed: phenotype.speed,
        strength: phenotype.strength,
        perception: phenotype.perception,
        agility: phenotype.agility,
        metabolicRate: phenotype.metabolicRate,
        symmetryScore: phenotype.symmetryScore,
        limbCount: phenotype.limbCount,
        sensorCount: phenotype.sensorCount,
        effectorCount: phenotype.effectorCount,
      },
    };
  }

  /**
   * Deserialize a phenotype from storage
   */
  deserializePhenotype(data: SerializedMorphology): MorphologyPhenotype {
    // Rebuild segment objects with children arrays
    const segmentMap = new Map<string, BodySegment>();

    // First pass: create all segments without children
    for (const serialized of data.segments) {
      const segment: BodySegment = {
        id: serialized.id,
        parentId: serialized.parentId,
        depth: serialized.depth,
        dimensions: { ...serialized.dimensions },
        attachment: { ...serialized.attachment },
        properties: { ...serialized.properties },
        mass: serialized.mass,
        volume: serialized.volume,
        children: [],
      };
      segmentMap.set(segment.id, segment);
    }

    // Second pass: link children
    for (const serialized of data.segments) {
      const segment = segmentMap.get(serialized.id)!;
      for (const childId of serialized.childIds) {
        const child = segmentMap.get(childId);
        if (child) {
          segment.children.push(child);
        }
      }
    }

    const segments = Array.from(segmentMap.values());
    const rootSegment = segmentMap.get(data.rootSegmentId)!;

    return {
      segments,
      rootSegment,
      ...data.phenotype,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): MorphologyConfig {
    return { ...this.config };
  }

  /**
   * Get trait weights
   */
  getTraitWeights(): TraitWeights {
    return { ...this.traitWeights };
  }
}

export default MorphologyDecoder;
