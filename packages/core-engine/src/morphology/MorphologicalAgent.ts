/**
 * MorphologicalAgent.ts - Agent with evolved morphology
 *
 * Extends the base Agent class with physical body structure,
 * deriving traits like size, speed, and strength from morphology.
 */

import { Agent, AgentConfig, Position, DEFAULT_AGENT_CONFIG } from '../agents/Agent';
import { Brain, SensoryInput, BrainOutput } from '../neural/Brain';
import { Genome } from '../genetics/Genome';
import { MorphologyGenome } from './MorphologyGenome';
import { MorphologyDecoder } from './MorphologyDecoder';
import { MorphologyPhenotype, MorphologyConfig, DEFAULT_MORPHOLOGY_CONFIG } from './types';
import { TrophicAgent } from '../trophic/types';

// ============================================================================
// MorphologicalAgent Config
// ============================================================================

export interface MorphologicalAgentConfig extends AgentConfig {
  morphologyConfig: MorphologyConfig;
  usePhysicalTraits: boolean;  // Override config with morphology-derived traits
  traitInfluence: number;      // How much morphology affects traits [0, 1]
}

export const DEFAULT_MORPHOLOGICAL_AGENT_CONFIG: MorphologicalAgentConfig = {
  ...DEFAULT_AGENT_CONFIG,
  morphologyConfig: DEFAULT_MORPHOLOGY_CONFIG,
  usePhysicalTraits: true,
  traitInfluence: 0.8,
};

// ============================================================================
// MorphologicalAgent Class
// ============================================================================

export class MorphologicalAgent extends Agent implements TrophicAgent {
  private morphologyGenome: MorphologyGenome;
  private phenotype: MorphologyPhenotype;
  private decoder: MorphologyDecoder;
  private morphConfig: MorphologicalAgentConfig;

  // Physical traits derived from morphology
  readonly physicalSize: number;
  readonly physicalSpeed: number;
  readonly physicalStrength: number;
  readonly physicalPerception: number;

  // TrophicAgent implementation
  get size(): number { return this.physicalSize; }
  get speed(): number { return this.physicalSpeed; }
  get strength(): number { return this.physicalStrength; }
  get perception(): number { return this.physicalPerception; }
  get isAlive(): boolean { return this.alive(); }

  constructor(
    id: string,
    speciesId: string,
    position: Position,
    rotation: number,
    energy: number,
    brain: Brain,
    genome: Genome,
    morphologyGenome: MorphologyGenome,
    generation: number,
    lineageId: string,
    config?: Partial<MorphologicalAgentConfig>
  ) {
    // Merge config with defaults
    const fullConfig: MorphologicalAgentConfig = {
      ...DEFAULT_MORPHOLOGICAL_AGENT_CONFIG,
      ...config,
    };

    // Initialize decoder and decode phenotype
    const decoder = new MorphologyDecoder(fullConfig.morphologyConfig);
    const phenotype = decoder.decode(morphologyGenome);

    // Calculate effective traits based on morphology
    const influence = fullConfig.traitInfluence;
    const effectiveConfig = { ...fullConfig };

    if (fullConfig.usePhysicalTraits) {
      // Blend base config with phenotype-derived values
      effectiveConfig.maxSpeed = blendValue(
        fullConfig.maxSpeed,
        phenotype.speed,
        influence
      );
      effectiveConfig.sensorRange = blendValue(
        fullConfig.sensorRange,
        phenotype.perception * 150,
        influence
      );
      effectiveConfig.energyCostPerTick = blendValue(
        fullConfig.energyCostPerTick,
        phenotype.metabolicRate,
        influence
      );
    }

    super(
      id,
      speciesId,
      position,
      rotation,
      energy,
      brain,
      genome,
      generation,
      lineageId,
      effectiveConfig
    );

    this.morphologyGenome = morphologyGenome;
    this.phenotype = phenotype;
    this.decoder = decoder;
    this.morphConfig = fullConfig;

    // Store physical traits
    this.physicalSize = phenotype.size;
    this.physicalSpeed = phenotype.speed;
    this.physicalStrength = phenotype.strength;
    this.physicalPerception = phenotype.perception;
  }

  /**
   * Create from separate genomes
   */
  static create(
    id: string,
    speciesId: string,
    position: Position,
    rotation: number,
    energy: number,
    brain: Brain,
    genome: Genome,
    morphologyGenome: MorphologyGenome,
    generation: number,
    lineageId: string,
    config?: Partial<MorphologicalAgentConfig>
  ): MorphologicalAgent {
    return new MorphologicalAgent(
      id,
      speciesId,
      position,
      rotation,
      energy,
      brain,
      genome,
      morphologyGenome,
      generation,
      lineageId,
      config
    );
  }

  /**
   * Create with auto-generated morphology from base genome
   */
  static withAutoMorphology(
    id: string,
    speciesId: string,
    position: Position,
    rotation: number,
    energy: number,
    brain: Brain,
    genome: Genome,
    generation: number,
    lineageId: string,
    config?: Partial<MorphologicalAgentConfig>
  ): MorphologicalAgent {
    // Generate morphology genome from base genome or random
    const morphGenome = MorphologyGenome.random();

    return new MorphologicalAgent(
      id,
      speciesId,
      position,
      rotation,
      energy,
      brain,
      genome,
      morphGenome,
      generation,
      lineageId,
      config
    );
  }

  /**
   * Reproduce with morphology inheritance
   */
  reproduceWithMorphology(mate?: MorphologicalAgent): MorphologicalAgent | null {
    if (!this.canReproduce()) return null;

    // Cross over behavior genome
    let offspringGenome: Genome;
    if (mate && mate.genome) {
      offspringGenome = this.genome.crossover(mate.genome);
    } else {
      offspringGenome = this.genome.reproduce();
    }

    // Cross over morphology genome
    let offspringMorphGenome: MorphologyGenome;
    if (mate && mate.morphologyGenome) {
      offspringMorphGenome = this.morphologyGenome.crossover(mate.morphologyGenome);
    } else {
      offspringMorphGenome = this.morphologyGenome.mutate();
    }

    // Clone and mutate brain
    const offspringBrain = this.brain.clone().mutate(0.1, 0.2);

    const config = this.getConfig() as MorphologicalAgentConfig;
    const offspringId = `${this.id}_offspring_${Date.now()}`;
    const offsetAngle = Math.random() * 2 * Math.PI;
    const offsetDistance = config.maxSpeed * 2;
    const offspringPosition: Position = {
      x: this.position.x + Math.cos(offsetAngle) * offsetDistance,
      y: this.position.y + Math.sin(offsetAngle) * offsetDistance,
    };

    const offspring = new MorphologicalAgent(
      offspringId,
      this.speciesId,
      offspringPosition,
      Math.random() * 2 * Math.PI,
      config.maxEnergy * 0.5,
      offspringBrain,
      offspringGenome,
      offspringMorphGenome,
      this.generation + 1,
      this.lineageId,
      this.morphConfig
    );

    // Deduct reproduction cost
    this.energy -= config.energyCostReproduce;

    this.onReproduce?.(this, offspring);

    return offspring;
  }

  /**
   * Get morphology phenotype
   */
  getPhenotype(): MorphologyPhenotype {
    return this.phenotype;
  }

  /**
   * Get morphology genome
   */
  getMorphologyGenome(): MorphologyGenome {
    return this.morphologyGenome;
  }

  /**
   * Get detailed physical traits for display/debugging
   */
  getPhysicalTraits(): {
    size: number;
    speed: number;
    strength: number;
    perception: number;
    agility: number;
    metabolicRate: number;
    mass: number;
    segmentCount: number;
    limbCount: number;
    symmetryScore: number;
  } {
    return {
      size: this.physicalSize,
      speed: this.physicalSpeed,
      strength: this.physicalStrength,
      perception: this.physicalPerception,
      agility: this.phenotype.agility,
      metabolicRate: this.phenotype.metabolicRate,
      mass: this.phenotype.totalMass,
      segmentCount: this.phenotype.segmentCount,
      limbCount: this.phenotype.limbCount,
      symmetryScore: this.phenotype.symmetryScore,
    };
  }

  /**
   * Calculate combat effectiveness (for hunting/fleeing)
   */
  getCombatScore(): number {
    return (
      this.physicalStrength * 0.4 +
      this.physicalSpeed * 0.3 +
      this.physicalSize * 0.2 +
      this.phenotype.agility * 0.1
    );
  }

  /**
   * Calculate evasion score
   */
  getEvasionScore(): number {
    return (
      this.physicalSpeed * 0.4 +
      this.phenotype.agility * 0.4 +
      this.physicalPerception * 0.2
    );
  }

  /**
   * Get collision radius based on size
   */
  getCollisionRadius(): number {
    return Math.max(2, this.physicalSize * 0.5);
  }

  /**
   * Get vision range based on perception
   */
  getVisionRange(): number {
    return 50 + this.physicalPerception * 100;
  }

  /**
   * Override toJSON to include morphology
   */
  toJSON(): object {
    const baseJSON = super.toJSON();
    return {
      ...baseJSON,
      morphology: {
        genome: this.morphologyGenome.toJSON(),
        traits: this.getPhysicalTraits(),
      },
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Blend two values based on influence factor
 */
function blendValue(base: number, modifier: number, influence: number): number {
  return base * (1 - influence) + modifier * influence;
}

/**
 * Factory function to create a MorphologicalAgent
 */
export function createMorphologicalAgent(
  id: string,
  speciesId: string,
  position: Position,
  rotation: number,
  energy: number,
  brain: Brain,
  genome: Genome,
  morphologyGenome: MorphologyGenome,
  generation: number,
  lineageId: string,
  config?: Partial<MorphologicalAgentConfig>
): MorphologicalAgent {
  return new MorphologicalAgent(
    id,
    speciesId,
    position,
    rotation,
    energy,
    brain,
    genome,
    morphologyGenome,
    generation,
    lineageId,
    config
  );
}

export default MorphologicalAgent;
