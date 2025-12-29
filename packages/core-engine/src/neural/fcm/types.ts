/**
 * types.ts - Fuzzy Cognitive Map types
 *
 * Defines interfaces for EcoSim-inspired FCM brains.
 * FCMs model causal relationships between concepts using weighted connections.
 */

// ============================================================================
// Concept Types
// ============================================================================

export type ConceptId = string;

export type ConceptType = 'input' | 'hidden' | 'output' | 'memory';

export interface FCMConcept {
  id: ConceptId;
  name: string;
  type: ConceptType;
  activation: number;       // Current activation [-1, 1]
  decayRate: number;        // How quickly activation decays (0-1)
  bias: number;             // Baseline activation tendency
}

export interface FCMWeight {
  fromId: ConceptId;
  toId: ConceptId;
  weight: number;           // Causal influence [-1, 1], negative = inhibitory
}

// ============================================================================
// Configuration Types
// ============================================================================

export type ActivationFunction = 'sigmoid' | 'tanh' | 'linear' | 'step';

export interface FCMConfig {
  concepts: FCMConcept[];
  weights: FCMWeight[];
  activationFunction: ActivationFunction;
  convergenceThreshold: number;
  maxIterations: number;
  globalDecay: number;      // Applied to all concepts each think cycle
}

export const DEFAULT_FCM_CONFIG: FCMConfig = {
  concepts: [],
  weights: [],
  activationFunction: 'tanh',
  convergenceThreshold: 0.001,
  maxIterations: 10,
  globalDecay: 0.1,
};

// ============================================================================
// Standard Concepts (EcoSim-inspired)
// ============================================================================

export const STANDARD_INPUT_CONCEPTS: FCMConcept[] = [
  { id: 'food_ahead', name: 'Food Ahead', type: 'input', activation: 0, decayRate: 0.5, bias: 0 },
  { id: 'food_left', name: 'Food Left', type: 'input', activation: 0, decayRate: 0.5, bias: 0 },
  { id: 'food_right', name: 'Food Right', type: 'input', activation: 0, decayRate: 0.5, bias: 0 },
  { id: 'agent_ahead', name: 'Agent Ahead', type: 'input', activation: 0, decayRate: 0.5, bias: 0 },
  { id: 'agent_left', name: 'Agent Left', type: 'input', activation: 0, decayRate: 0.5, bias: 0 },
  { id: 'agent_right', name: 'Agent Right', type: 'input', activation: 0, decayRate: 0.5, bias: 0 },
  { id: 'energy_level', name: 'Energy Level', type: 'input', activation: 0, decayRate: 0, bias: 0 },
  { id: 'threat_nearby', name: 'Threat Nearby', type: 'input', activation: 0, decayRate: 0.3, bias: 0 },
  { id: 'prey_nearby', name: 'Prey Nearby', type: 'input', activation: 0, decayRate: 0.3, bias: 0 },
];

export const STANDARD_HIDDEN_CONCEPTS: FCMConcept[] = [
  { id: 'hunger', name: 'Hunger', type: 'hidden', activation: 0, decayRate: 0.05, bias: 0.1 },
  { id: 'fear', name: 'Fear', type: 'hidden', activation: 0, decayRate: 0.2, bias: 0 },
  { id: 'aggression', name: 'Aggression', type: 'hidden', activation: 0, decayRate: 0.15, bias: 0 },
  { id: 'curiosity', name: 'Curiosity', type: 'hidden', activation: 0.2, decayRate: 0.1, bias: 0.2 },
  { id: 'caution', name: 'Caution', type: 'hidden', activation: 0, decayRate: 0.1, bias: 0 },
  { id: 'mating_urge', name: 'Mating Urge', type: 'hidden', activation: 0, decayRate: 0.05, bias: 0 },
  { id: 'satiation', name: 'Satiation', type: 'hidden', activation: 0, decayRate: 0.02, bias: 0 },
];

export const STANDARD_OUTPUT_CONCEPTS: FCMConcept[] = [
  { id: 'move_forward', name: 'Move Forward', type: 'output', activation: 0, decayRate: 0.5, bias: 0.1 },
  { id: 'turn_left', name: 'Turn Left', type: 'output', activation: 0, decayRate: 0.5, bias: 0 },
  { id: 'turn_right', name: 'Turn Right', type: 'output', activation: 0, decayRate: 0.5, bias: 0 },
  { id: 'eat', name: 'Eat', type: 'output', activation: 0, decayRate: 0.3, bias: 0 },
  { id: 'flee', name: 'Flee', type: 'output', activation: 0, decayRate: 0.4, bias: 0 },
  { id: 'hunt', name: 'Hunt', type: 'output', activation: 0, decayRate: 0.3, bias: 0 },
  { id: 'reproduce', name: 'Reproduce', type: 'output', activation: 0, decayRate: 0.2, bias: 0 },
];

export const ALL_STANDARD_CONCEPTS: FCMConcept[] = [
  ...STANDARD_INPUT_CONCEPTS,
  ...STANDARD_HIDDEN_CONCEPTS,
  ...STANDARD_OUTPUT_CONCEPTS,
];

// ============================================================================
// Default Causal Relationships
// ============================================================================

export const DEFAULT_FCM_WEIGHTS: FCMWeight[] = [
  // Energy -> Hunger (low energy increases hunger)
  { fromId: 'energy_level', toId: 'hunger', weight: -0.8 },

  // Hunger -> Food-seeking behaviors
  { fromId: 'hunger', toId: 'move_forward', weight: 0.5 },
  { fromId: 'hunger', toId: 'eat', weight: 0.7 },
  { fromId: 'hunger', toId: 'curiosity', weight: 0.3 },

  // Food detection -> Movement
  { fromId: 'food_ahead', toId: 'move_forward', weight: 0.8 },
  { fromId: 'food_ahead', toId: 'eat', weight: 0.9 },
  { fromId: 'food_left', toId: 'turn_left', weight: 0.7 },
  { fromId: 'food_right', toId: 'turn_right', weight: 0.7 },

  // Threat detection -> Fear and fleeing
  { fromId: 'threat_nearby', toId: 'fear', weight: 0.9 },
  { fromId: 'fear', toId: 'flee', weight: 0.8 },
  { fromId: 'fear', toId: 'caution', weight: 0.6 },
  { fromId: 'fear', toId: 'move_forward', weight: 0.4 },
  { fromId: 'fear', toId: 'eat', weight: -0.5 },
  { fromId: 'fear', toId: 'reproduce', weight: -0.7 },

  // Prey detection -> Hunting
  { fromId: 'prey_nearby', toId: 'aggression', weight: 0.6 },
  { fromId: 'aggression', toId: 'hunt', weight: 0.8 },
  { fromId: 'hunger', toId: 'aggression', weight: 0.4 },

  // Satiation effects
  { fromId: 'energy_level', toId: 'satiation', weight: 0.7 },
  { fromId: 'satiation', toId: 'hunger', weight: -0.6 },
  { fromId: 'satiation', toId: 'mating_urge', weight: 0.4 },

  // Reproduction
  { fromId: 'mating_urge', toId: 'reproduce', weight: 0.7 },
  { fromId: 'energy_level', toId: 'mating_urge', weight: 0.5 },
  { fromId: 'agent_ahead', toId: 'mating_urge', weight: 0.3 },

  // Curiosity -> Exploration
  { fromId: 'curiosity', toId: 'move_forward', weight: 0.4 },
  { fromId: 'curiosity', toId: 'turn_left', weight: 0.2 },
  { fromId: 'curiosity', toId: 'turn_right', weight: 0.2 },

  // Caution effects
  { fromId: 'caution', toId: 'move_forward', weight: -0.3 },
  { fromId: 'agent_ahead', toId: 'caution', weight: 0.4 },

  // Mutual inhibitions
  { fromId: 'fear', toId: 'aggression', weight: -0.4 },
  { fromId: 'aggression', toId: 'fear', weight: -0.3 },
  { fromId: 'flee', toId: 'hunt', weight: -0.8 },
  { fromId: 'hunt', toId: 'flee', weight: -0.6 },
];

// ============================================================================
// Brain State Types
// ============================================================================

export interface FCMBrainState {
  concepts: Array<{
    id: ConceptId;
    activation: number;
    decayRate: number;
    bias: number;
  }>;
  weights: FCMWeight[];
  config: Omit<FCMConfig, 'concepts' | 'weights'>;
}

// ============================================================================
// Preset Configurations
// ============================================================================

export type FCMPreset = 'herbivore' | 'carnivore' | 'omnivore' | 'timid' | 'aggressive';

export interface FCMPresetConfig {
  name: string;
  description: string;
  conceptOverrides: Partial<Record<ConceptId, Partial<FCMConcept>>>;
  weightOverrides: Partial<Record<string, number>>; // "fromId:toId" -> weight
  additionalWeights: FCMWeight[];
}

export const FCM_PRESETS: Record<FCMPreset, FCMPresetConfig> = {
  herbivore: {
    name: 'Herbivore',
    description: 'Plant-eating, threat-averse behavior',
    conceptOverrides: {
      fear: { bias: 0.2, decayRate: 0.1 },
      aggression: { bias: -0.3 },
      caution: { bias: 0.3 },
    },
    weightOverrides: {
      'threat_nearby:fear': 0.95,
      'fear:flee': 0.9,
      'aggression:hunt': 0.1,
    },
    additionalWeights: [],
  },
  carnivore: {
    name: 'Carnivore',
    description: 'Prey-hunting, aggressive behavior',
    conceptOverrides: {
      aggression: { bias: 0.3, decayRate: 0.1 },
      fear: { bias: -0.2 },
      hunger: { bias: 0.2 },
    },
    weightOverrides: {
      'prey_nearby:aggression': 0.85,
      'aggression:hunt': 0.9,
      'hunger:aggression': 0.6,
      'fear:flee': 0.5,
    },
    additionalWeights: [],
  },
  omnivore: {
    name: 'Omnivore',
    description: 'Balanced eating and hunting',
    conceptOverrides: {
      curiosity: { bias: 0.3 },
    },
    weightOverrides: {},
    additionalWeights: [],
  },
  timid: {
    name: 'Timid',
    description: 'Very cautious and easily frightened',
    conceptOverrides: {
      fear: { bias: 0.4, decayRate: 0.05 },
      caution: { bias: 0.5 },
      aggression: { bias: -0.5 },
    },
    weightOverrides: {
      'agent_ahead:fear': 0.6,
      'threat_nearby:fear': 0.99,
      'fear:flee': 0.95,
    },
    additionalWeights: [],
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Quick to hunt and confront',
    conceptOverrides: {
      aggression: { bias: 0.5, decayRate: 0.05 },
      fear: { bias: -0.3 },
    },
    weightOverrides: {
      'agent_ahead:aggression': 0.5,
      'hunger:aggression': 0.7,
      'aggression:hunt': 0.95,
    },
    additionalWeights: [],
  },
};
