/**
 * EventTypes.ts - Event type definitions for GenesisX
 *
 * Type-safe event definitions for the simulation system.
 */

// ============================================================================
// Core Types
// ============================================================================

export interface EntityReference {
  id: string;
  species?: string;
  generation?: number;
}

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface GeneticInfo {
  genomeId: string;
  mutations: string[];
  fitnessScore: number;
}

// ============================================================================
// Event Type Constants
// ============================================================================

export const EventTypes = {
  BIRTH: 'birth',
  DEATH: 'death',
  FOOD_CONSUMED: 'food-consumed',
  RESOURCE_DEPLETED: 'resource-depleted',
  RESOURCE_SPAWNED: 'resource-spawned',
  MUTATION: 'mutation',
  LINEAGE_SPLIT: 'lineage-split',
  REPRODUCTION: 'reproduction',
  MOVEMENT: 'movement',
  INTERACTION: 'interaction',
  TERRITORY_CLAIMED: 'territory-claimed',
  TICK: 'tick',
  SIMULATION_START: 'simulation-start',
  SIMULATION_PAUSE: 'simulation-pause',
  SIMULATION_END: 'simulation-end',
  POPULATION_SNAPSHOT: 'population-snapshot',
  GENERATION_COMPLETE: 'generation-complete',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

// ============================================================================
// Event Payloads
// ============================================================================

export interface BirthEventPayload {
  entity: EntityReference;
  parent1?: EntityReference;
  parent2?: EntityReference;
  position: Position;
  genetics: GeneticInfo;
  timestamp: number;
}

export interface DeathEventPayload {
  entity: EntityReference;
  cause: 'starvation' | 'predation' | 'age' | 'disease' | 'environmental' | 'unknown';
  position: Position;
  age: number;
  timestamp: number;
  killedBy?: EntityReference;
}

export interface FoodConsumedEventPayload {
  consumer: EntityReference;
  resourceId: string;
  resourceType: string;
  energyGained: number;
  position: Position;
  timestamp: number;
}

export interface MutationEventPayload {
  entity: EntityReference;
  mutationType: 'point' | 'insertion' | 'deletion' | 'duplication' | 'inversion';
  geneAffected: string;
  previousValue: unknown;
  newValue: unknown;
  fitnessImpact: number;
  timestamp: number;
}

export interface LineageSplitEventPayload {
  originalLineageId: string;
  newLineageId: string;
  divergencePoint: EntityReference;
  reason: 'geographic-isolation' | 'behavioral-divergence' | 'genetic-drift' | 'speciation';
  generation: number;
  timestamp: number;
}

export interface ReproductionEventPayload {
  parent1: EntityReference;
  parent2?: EntityReference;
  offspring: EntityReference[];
  reproductionType: 'sexual' | 'asexual' | 'budding';
  position: Position;
  timestamp: number;
}

export interface MovementEventPayload {
  entity: EntityReference;
  from: Position;
  to: Position;
  speed: number;
  reason?: 'foraging' | 'fleeing' | 'hunting' | 'migration' | 'random';
  timestamp: number;
}

export interface InteractionEventPayload {
  initiator: EntityReference;
  target: EntityReference;
  interactionType: 'predation' | 'cooperation' | 'competition' | 'mating' | 'territorial';
  outcome: 'success' | 'failure' | 'neutral';
  position: Position;
  timestamp: number;
}

export interface TickEventPayload {
  tickNumber: number;
  deltaTime: number;
  totalSimulationTime: number;
  entityCount: number;
  timestamp: number;
}

export interface SimulationStartEventPayload {
  simulationId: string;
  config: Record<string, unknown>;
  timestamp: number;
}

export interface SimulationPauseEventPayload {
  simulationId: string;
  tickNumber: number;
  reason?: string;
  timestamp: number;
}

export interface SimulationEndEventPayload {
  simulationId: string;
  tickNumber: number;
  reason: 'completed' | 'stopped' | 'error';
  statistics: Record<string, unknown>;
  timestamp: number;
}

export interface PopulationSnapshotEventPayload {
  tickNumber: number;
  totalPopulation: number;
  speciesBreakdown: Record<string, number>;
  averageFitness: number;
  resourceLevels: Record<string, number>;
  timestamp: number;
}

export interface GenerationCompleteEventPayload {
  generationNumber: number;
  survivorCount: number;
  offspringCount: number;
  mutationCount: number;
  averageFitness: number;
  topPerformers: EntityReference[];
  timestamp: number;
}

// ============================================================================
// Event Map
// ============================================================================

export interface EventPayloadMap {
  [EventTypes.BIRTH]: BirthEventPayload;
  [EventTypes.DEATH]: DeathEventPayload;
  [EventTypes.FOOD_CONSUMED]: FoodConsumedEventPayload;
  [EventTypes.MUTATION]: MutationEventPayload;
  [EventTypes.LINEAGE_SPLIT]: LineageSplitEventPayload;
  [EventTypes.REPRODUCTION]: ReproductionEventPayload;
  [EventTypes.MOVEMENT]: MovementEventPayload;
  [EventTypes.INTERACTION]: InteractionEventPayload;
  [EventTypes.TICK]: TickEventPayload;
  [EventTypes.SIMULATION_START]: SimulationStartEventPayload;
  [EventTypes.SIMULATION_PAUSE]: SimulationPauseEventPayload;
  [EventTypes.SIMULATION_END]: SimulationEndEventPayload;
  [EventTypes.POPULATION_SNAPSHOT]: PopulationSnapshotEventPayload;
  [EventTypes.GENERATION_COMPLETE]: GenerationCompleteEventPayload;
}

// ============================================================================
// Generic Event
// ============================================================================

export interface GameEvent<T extends EventType = EventType> {
  id: string;
  type: T;
  payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown;
  timestamp: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Handler Types
// ============================================================================

export type EventHandler<T extends EventType> = (event: GameEvent<T>) => void | Promise<void>;
export type GenericEventHandler = (event: GameEvent) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  eventType: EventType;
  handler: GenericEventHandler;
  priority: number;
  once: boolean;
}

export interface EventFilter {
  types?: EventType[];
  sourcePattern?: string | RegExp;
  timeRange?: { start?: number; end?: number };
  entityIds?: string[];
  custom?: (event: GameEvent) => boolean;
}
