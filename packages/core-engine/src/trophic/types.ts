/**
 * types.ts - Trophic system types
 *
 * Defines interfaces for emergent predator-prey dynamics.
 * Roles are determined by observed behavior, not pre-assigned.
 */

// ============================================================================
// Role Types
// ============================================================================

export enum EmergentRole {
  UNDETERMINED = 'undetermined',
  PRODUCER = 'producer',        // Generates energy (plants, if modeled)
  HERBIVORE = 'herbivore',      // Eats only food/plants
  CARNIVORE = 'carnivore',      // Hunts and eats other agents
  OMNIVORE = 'omnivore',        // Eats both food and other agents
  APEX_PREDATOR = 'apex_predator', // No natural predators, high hunting success
  SCAVENGER = 'scavenger',      // Eats dead agents (future feature)
}

export interface TrophicProfile {
  role: EmergentRole;
  confidence: number;           // 0-1, how strongly role is expressed
  huntingAttempts: number;
  huntingSuccesses: number;
  huntingSuccessRate: number;
  foodConsumed: number;
  agentsConsumed: number;
  preySpeciesIds: Set<string>;  // Species IDs successfully hunted
  predatorSpeciesIds: Set<string>; // Species IDs that have hunted this species
  lastRoleUpdateTick: number;
}

export const DEFAULT_TROPHIC_PROFILE: Omit<TrophicProfile, 'preySpeciesIds' | 'predatorSpeciesIds'> = {
  role: EmergentRole.UNDETERMINED,
  confidence: 0,
  huntingAttempts: 0,
  huntingSuccesses: 0,
  huntingSuccessRate: 0,
  foodConsumed: 0,
  agentsConsumed: 0,
  lastRoleUpdateTick: 0,
};

// ============================================================================
// Interaction Types
// ============================================================================

export interface TrophicInteraction {
  tick: number;
  predatorId: string;
  predatorSpeciesId: string;
  preyId: string;
  preySpeciesId: string;
  success: boolean;
  energyTransferred: number;
  interactionType: 'hunt' | 'scavenge' | 'graze';
}

export interface HuntResult {
  success: boolean;
  reason: 'success' | 'prey_escaped' | 'invalid_target' | 'out_of_range' | 'cooldown' | 'insufficient_energy';
  energyGained?: number;
  energySpent: number;
  preyKilled?: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface TrophicConfig {
  huntingRange: number;
  huntingEnergyCost: number;
  baseHuntingSuccessRate: number;
  sizeAdvantageMultiplier: number;
  speedAdvantageMultiplier: number;
  energyTransferRatio: number;   // How much of prey's energy is gained
  huntingCooldown: number;       // Ticks between hunt attempts
  roleUpdateInterval: number;    // Ticks between role recalculation
  minInteractionsForRole: number; // Min interactions before role is determined
}

export const DEFAULT_TROPHIC_CONFIG: TrophicConfig = {
  huntingRange: 30,
  huntingEnergyCost: 5,
  baseHuntingSuccessRate: 0.5,
  sizeAdvantageMultiplier: 0.2,
  speedAdvantageMultiplier: 0.3,
  energyTransferRatio: 0.7,
  huntingCooldown: 20,
  roleUpdateInterval: 100,
  minInteractionsForRole: 5,
};

// ============================================================================
// Tracker Types
// ============================================================================

export interface SpeciesTrophicStats {
  speciesId: string;
  profile: TrophicProfile;
  totalMembers: number;
  averageHuntingSuccess: number;
  dominantRole: EmergentRole;
  roleHistory: Array<{ tick: number; role: EmergentRole }>;
}

export interface TrophicTrackerStats {
  totalSpecies: number;
  roleDistribution: Record<EmergentRole, number>;
  totalInteractions: number;
  recentInteractions: TrophicInteraction[];
  foodWebDensity: number; // Connections / possible connections
}

// ============================================================================
// Agent Interface (what trophic system needs from agents)
// ============================================================================

export interface TrophicAgent {
  id: string;
  speciesId: string;
  position: { x: number; y: number };
  energy: number;
  isAlive: boolean;

  // Traits that affect hunting
  size?: number;
  speed?: number;
  strength?: number;
  perception?: number;
}

// ============================================================================
// Sensory Types
// ============================================================================

export interface TrophicSensoryInput {
  // Base sensory input
  front: number;
  frontLeft: number;
  frontRight: number;
  left: number;
  right: number;
  energy: number;
  bias: number;

  // Trophic-specific additions
  nearestPreyDistance: number;
  nearestPreyDirection: number;
  nearestPreySize: number;
  nearestPredatorDistance: number;
  nearestPredatorDirection: number;
  nearestPredatorSize: number;
  threatLevel: number;
  opportunityLevel: number;
}

export const DEFAULT_TROPHIC_SENSORY_INPUT: TrophicSensoryInput = {
  front: 0,
  frontLeft: 0,
  frontRight: 0,
  left: 0,
  right: 0,
  energy: 0.5,
  bias: 1.0,
  nearestPreyDistance: 0,
  nearestPreyDirection: 0,
  nearestPreySize: 0,
  nearestPredatorDistance: 0,
  nearestPredatorDirection: 0,
  nearestPredatorSize: 0,
  threatLevel: 0,
  opportunityLevel: 0,
};
