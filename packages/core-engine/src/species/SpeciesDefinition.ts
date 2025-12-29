/**
 * SpeciesDefinition.ts - Data-driven species definition system
 *
 * Combines concepts from:
 * - Tale-Weaver's SpeciesDefinition with behavior interfaces
 * - Tale-Weaver's trophic levels (Omnivore, Predator, Prey, Scavenger)
 * - EcoSysX's agent hierarchy (Producer, Consumer, Decomposer, CausalAgent)
 * - digital-organisms' energy and age management
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export enum TrophicLevel {
  PRODUCER = 'producer',
  PREY = 'prey',
  PREDATOR = 'predator',
  OMNIVORE = 'omnivore',
  DECOMPOSER = 'decomposer',
  SCAVENGER = 'scavenger',
}

export enum AgentClass {
  PRODUCER = 'producer',
  CONSUMER = 'consumer',
  DECOMPOSER = 'decomposer',
  CAUSAL_AGENT = 'causal_agent',
}

export enum ReproductionType {
  ASEXUAL = 'asexual',
  SEXUAL = 'sexual',
  FACULTATIVE = 'facultative',
}

export enum MovementType {
  SESSILE = 'sessile',
  SLOW = 'slow',
  NORMAL = 'normal',
  FAST = 'fast',
  FLYING = 'flying',
  AQUATIC = 'aquatic',
}

// ============================================================================
// Genome Configuration
// ============================================================================

export enum GenomeTrait {
  BASE_SPEED = 0,
  BASE_STRENGTH = 1,
  BASE_PERCEPTION = 2,
  BASE_METABOLISM = 3,
  BASE_SIZE = 4,
  BASE_LIFESPAN = 5,
  BASE_FERTILITY = 6,
  BASE_AGGRESSION = 7,
  BASE_SOCIABILITY = 8,
  BASE_INTELLIGENCE = 9,
  ENERGY_EFFICIENCY = 10,
  ENERGY_STORAGE_CAPACITY = 11,
  ENERGY_CONSUMPTION_RATE = 12,
  PHOTOSYNTHESIS_RATE = 13,
  HUNTING_EFFICIENCY = 14,
  MATURITY_AGE = 15,
  OFFSPRING_COUNT = 16,
  REPRODUCTION_COST = 17,
  MUTATION_RATE = 18,
  PARENTAL_INVESTMENT = 19,
  CAMOUFLAGE = 20,
  TOXICITY = 21,
  ARMOR = 22,
  REGENERATION = 23,
  COLD_TOLERANCE = 24,
  HEAT_TOLERANCE = 25,
  DROUGHT_TOLERANCE = 26,
  ALTITUDE_TOLERANCE = 27,
  SALINITY_TOLERANCE = 28,
  POLLUTION_TOLERANCE = 29,
  TRAIT_COUNT = 30,
}

export interface GenomeConfig {
  traitCount: number;
  mutationRate: number;
  mutationSigma: number;
  minValue: number;
  maxValue: number;
}

export const DEFAULT_GENOME_CONFIG: GenomeConfig = {
  traitCount: GenomeTrait.TRAIT_COUNT,
  mutationRate: 0.05,
  mutationSigma: 0.1,
  minValue: 0.0,
  maxValue: 1.0,
};

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface EnergyConfig {
  initialEnergy: number;
  maxEnergy: number;
  baseConsumption: number;
  movementCost: number;
  reproductionCost: number;
  offspringEnergy: number;
  photosynthesisGain?: number;
  consumptionEfficiency: number;
}

export interface LifecycleConfig {
  maxAge: number;
  maturityAge: number;
  reproductionCooldown: number;
  senescenceRate: number;
}

export interface DietConfig {
  preySpecies: string[];
  canScavenge: boolean;
  canEatPlants: boolean;
  preferences: Map<string, number>;
}

export interface MovementConfig {
  type: MovementType;
  baseSpeed: number;
  maxSpeedMultiplier: number;
  energyCostMultiplier: number;
  aquatic: boolean;
  terrestrial: boolean;
}

export interface SocialConfig {
  maxGroupSize: number;
  socialRadius: number;
  formsPacks: boolean;
  territorySize: number;
}

export interface SensoryConfig {
  visionRange: number;
  smellRange: number;
  hearingRange: number;
  detectsPrey: boolean;
  detectsPredators: boolean;
  detectsMates: boolean;
  detectsFood: boolean;
}

// ============================================================================
// Species Definition
// ============================================================================

export interface SpeciesDefinition {
  id: string;
  name: string;
  scientificName?: string;
  description?: string;

  agentClass: AgentClass;
  trophicLevel: TrophicLevel;
  reproductionType: ReproductionType;

  energy: EnergyConfig;
  lifecycle: LifecycleConfig;
  genome: GenomeConfig;

  diet?: DietConfig;
  movement: MovementConfig;
  social: SocialConfig;
  sensory: SensoryConfig;

  behaviors: string[];
  defaultGenome: Float32Array;

  color: string;
  symbol: string;
  spritePath?: string;

  tags: string[];
  metadata: Record<string, unknown>;
}

// ============================================================================
// Default Presets
// ============================================================================

export const PRODUCER_ENERGY_DEFAULTS: EnergyConfig = {
  initialEnergy: 50,
  maxEnergy: 200,
  baseConsumption: 0.5,
  movementCost: 0,
  reproductionCost: 30,
  offspringEnergy: 25,
  photosynthesisGain: 5,
  consumptionEfficiency: 1.0,
};

export const CONSUMER_ENERGY_DEFAULTS: EnergyConfig = {
  initialEnergy: 100,
  maxEnergy: 300,
  baseConsumption: 2,
  movementCost: 1,
  reproductionCost: 80,
  offspringEnergy: 50,
  consumptionEfficiency: 0.7,
};

export const DECOMPOSER_ENERGY_DEFAULTS: EnergyConfig = {
  initialEnergy: 30,
  maxEnergy: 100,
  baseConsumption: 0.3,
  movementCost: 0.1,
  reproductionCost: 20,
  offspringEnergy: 15,
  consumptionEfficiency: 0.9,
};

// ============================================================================
// Factory Functions
// ============================================================================

export function createDefaultGenome(config: GenomeConfig = DEFAULT_GENOME_CONFIG): Float32Array {
  const genome = new Float32Array(config.traitCount);
  const midValue = (config.maxValue - config.minValue) / 2 + config.minValue;
  genome.fill(midValue);
  return genome;
}

export function createGenome(
  traits: Partial<Record<GenomeTrait, number>>,
  config: GenomeConfig = DEFAULT_GENOME_CONFIG
): Float32Array {
  const genome = createDefaultGenome(config);
  for (const [trait, value] of Object.entries(traits)) {
    const index = parseInt(trait, 10);
    if (index >= 0 && index < config.traitCount) {
      genome[index] = Math.max(config.minValue, Math.min(config.maxValue, value));
    }
  }
  return genome;
}

export function cloneGenome(genome: Float32Array): Float32Array {
  return new Float32Array(genome);
}

export function mutateGenome(
  genome: Float32Array,
  config: GenomeConfig = DEFAULT_GENOME_CONFIG
): Float32Array {
  const mutated = cloneGenome(genome);
  for (let i = 0; i < mutated.length; i++) {
    if (Math.random() < config.mutationRate) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      mutated[i] += z * config.mutationSigma;
      mutated[i] = Math.max(config.minValue, Math.min(config.maxValue, mutated[i]));
    }
  }
  return mutated;
}

export function crossoverGenomes(
  parent1: Float32Array,
  parent2: Float32Array,
  crossoverPoints: number = 2
): Float32Array {
  const length = Math.min(parent1.length, parent2.length);
  const child = new Float32Array(length);

  const points: number[] = [];
  for (let i = 0; i < crossoverPoints; i++) {
    points.push(Math.floor(Math.random() * length));
  }
  points.sort((a, b) => a - b);

  let useParent1 = Math.random() < 0.5;
  let pointIndex = 0;

  for (let i = 0; i < length; i++) {
    if (pointIndex < points.length && i >= points[pointIndex]) {
      useParent1 = !useParent1;
      pointIndex++;
    }
    child[i] = useParent1 ? parent1[i] : parent2[i];
  }

  return child;
}

export function createSpeciesDefinition(
  partial: Partial<SpeciesDefinition> & Pick<SpeciesDefinition, 'id' | 'name' | 'agentClass' | 'trophicLevel'>
): SpeciesDefinition {
  const isProducer = partial.agentClass === AgentClass.PRODUCER;
  const isDecomposer = partial.agentClass === AgentClass.DECOMPOSER;

  const defaultEnergy = isProducer
    ? PRODUCER_ENERGY_DEFAULTS
    : isDecomposer
      ? DECOMPOSER_ENERGY_DEFAULTS
      : CONSUMER_ENERGY_DEFAULTS;

  return {
    id: partial.id,
    name: partial.name,
    agentClass: partial.agentClass,
    trophicLevel: partial.trophicLevel,

    scientificName: partial.scientificName,
    description: partial.description ?? `A ${partial.trophicLevel} species`,

    reproductionType: partial.reproductionType ?? ReproductionType.ASEXUAL,

    energy: { ...defaultEnergy, ...partial.energy },
    lifecycle: {
      maxAge: 1000,
      maturityAge: 100,
      reproductionCooldown: 50,
      senescenceRate: 0.01,
      ...partial.lifecycle,
    },
    genome: { ...DEFAULT_GENOME_CONFIG, ...partial.genome },

    diet: partial.diet,
    movement: {
      type: isProducer ? MovementType.SESSILE : MovementType.NORMAL,
      baseSpeed: isProducer ? 0 : 1,
      maxSpeedMultiplier: 2,
      energyCostMultiplier: 1,
      aquatic: false,
      terrestrial: true,
      ...partial.movement,
    },
    social: {
      maxGroupSize: 1,
      socialRadius: 5,
      formsPacks: false,
      territorySize: 0,
      ...partial.social,
    },
    sensory: {
      visionRange: isProducer ? 0 : 5,
      smellRange: isProducer ? 0 : 3,
      hearingRange: isProducer ? 0 : 4,
      detectsPrey: !isProducer,
      detectsPredators: !isProducer,
      detectsMates: true,
      detectsFood: true,
      ...partial.sensory,
    },

    behaviors: partial.behaviors ?? ['core:lifecycle', 'core:energy'],
    defaultGenome: partial.defaultGenome ?? createDefaultGenome(),

    color: partial.color ?? '#888888',
    symbol: partial.symbol ?? '?',
    spritePath: partial.spritePath,

    tags: partial.tags ?? [],
    metadata: partial.metadata ?? {},
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isProducer(species: SpeciesDefinition): boolean {
  return species.agentClass === AgentClass.PRODUCER;
}

export function isConsumer(species: SpeciesDefinition): boolean {
  return species.agentClass === AgentClass.CONSUMER;
}

export function isDecomposer(species: SpeciesDefinition): boolean {
  return species.agentClass === AgentClass.DECOMPOSER;
}

export function isCausalAgent(species: SpeciesDefinition): boolean {
  return species.agentClass === AgentClass.CAUSAL_AGENT;
}

export function canMove(species: SpeciesDefinition): boolean {
  return species.movement.type !== MovementType.SESSILE && species.movement.baseSpeed > 0;
}

export function isPredator(species: SpeciesDefinition): boolean {
  return species.trophicLevel === TrophicLevel.PREDATOR;
}

export function isPrey(species: SpeciesDefinition): boolean {
  return species.trophicLevel === TrophicLevel.PREY;
}

export function isOmnivore(species: SpeciesDefinition): boolean {
  return species.trophicLevel === TrophicLevel.OMNIVORE;
}

export function canConsume(predator: SpeciesDefinition, prey: SpeciesDefinition): boolean {
  if (!predator.diet) return false;
  return predator.diet.preySpecies.includes(prey.id);
}
