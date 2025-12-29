/**
 * FCMBrain.ts - Fuzzy Cognitive Map Brain Implementation
 *
 * EcoSim-inspired decision-making using causal concept networks.
 * Concepts influence each other through weighted connections,
 * producing emergent behavior from simple rules.
 */

import {
  Brain,
  BrainState,
  BrainConfig,
  SensoryInput,
  BrainOutput,
  BrainRegistry,
} from '../Brain';
import {
  FCMConcept,
  FCMWeight,
  FCMConfig,
  DEFAULT_FCM_CONFIG,
  ALL_STANDARD_CONCEPTS,
  DEFAULT_FCM_WEIGHTS,
  ConceptId,
  ActivationFunction,
  FCMBrainState,
  FCMPreset,
  FCM_PRESETS,
} from './types';

// ============================================================================
// FCMBrain Class
// ============================================================================

export class FCMBrain implements Brain {
  readonly type = 'fcm';
  readonly label?: string;

  private concepts: Map<ConceptId, FCMConcept>;
  private weights: Map<string, number>; // "fromId:toId" -> weight
  private conceptOrder: ConceptId[];    // For consistent iteration
  private config: Omit<FCMConfig, 'concepts' | 'weights'>;

  constructor(config?: Partial<FCMConfig>, label?: string) {
    this.label = label;
    this.concepts = new Map();
    this.weights = new Map();
    this.conceptOrder = [];

    // Merge with defaults
    const fullConfig: FCMConfig = {
      ...DEFAULT_FCM_CONFIG,
      ...config,
      concepts: config?.concepts ?? ALL_STANDARD_CONCEPTS,
      weights: config?.weights ?? DEFAULT_FCM_WEIGHTS,
    };

    this.config = {
      activationFunction: fullConfig.activationFunction,
      convergenceThreshold: fullConfig.convergenceThreshold,
      maxIterations: fullConfig.maxIterations,
      globalDecay: fullConfig.globalDecay,
    };

    // Initialize concepts
    for (const concept of fullConfig.concepts) {
      this.concepts.set(concept.id, { ...concept });
      this.conceptOrder.push(concept.id);
    }

    // Initialize weights
    for (const weight of fullConfig.weights) {
      const key = this.getWeightKey(weight.fromId, weight.toId);
      this.weights.set(key, weight.weight);
    }
  }

  /**
   * Create FCMBrain from a preset
   */
  static fromPreset(preset: FCMPreset, label?: string): FCMBrain {
    const presetConfig = FCM_PRESETS[preset];
    const concepts = ALL_STANDARD_CONCEPTS.map((c) => {
      const override = presetConfig.conceptOverrides[c.id];
      return override ? { ...c, ...override } : { ...c };
    });

    const weights = DEFAULT_FCM_WEIGHTS.map((w) => {
      const key = `${w.fromId}:${w.toId}`;
      const override = presetConfig.weightOverrides[key];
      return override !== undefined ? { ...w, weight: override } : { ...w };
    });

    return new FCMBrain(
      {
        concepts,
        weights: [...weights, ...presetConfig.additionalWeights],
      },
      label ?? presetConfig.name
    );
  }

  /**
   * Process sensory input and produce behavioral output
   */
  think(inputs: SensoryInput): BrainOutput {
    // 1. Map sensory inputs to input concepts
    this.mapSensoryInputs(inputs);

    // 2. Run FCM inference until convergence
    this.propagate();

    // 3. Extract and return output
    return this.extractOutput();
  }

  /**
   * Map standard sensory input to FCM input concepts
   */
  private mapSensoryInputs(inputs: SensoryInput): void {
    // Food detection
    this.setConceptActivation('food_ahead', inputs.front);
    this.setConceptActivation('food_left', inputs.frontLeft + inputs.left * 0.5);
    this.setConceptActivation('food_right', inputs.frontRight + inputs.right * 0.5);

    // Energy level (inverted for hunger)
    this.setConceptActivation('energy_level', inputs.energy);

    // Agent detection (could be threat or mate)
    const agentSignal = Math.max(inputs.front, inputs.frontLeft, inputs.frontRight) * 0.5;
    this.setConceptActivation('agent_ahead', agentSignal);
    this.setConceptActivation('agent_left', (inputs.frontLeft + inputs.left) * 0.3);
    this.setConceptActivation('agent_right', (inputs.frontRight + inputs.right) * 0.3);
  }

  /**
   * Set activation for a concept
   */
  setConceptActivation(id: ConceptId, value: number): void {
    const concept = this.concepts.get(id);
    if (concept && concept.type === 'input') {
      concept.activation = Math.max(-1, Math.min(1, value));
    }
  }

  /**
   * Set threat/prey signals (for trophic-aware sensing)
   */
  setTrophicInputs(threatLevel: number, preyLevel: number): void {
    this.setConceptActivation('threat_nearby', threatLevel);
    this.setConceptActivation('prey_nearby', preyLevel);
  }

  /**
   * Propagate activations through the FCM network
   */
  private propagate(): void {
    let iteration = 0;
    let maxChange = Infinity;

    while (maxChange > this.config.convergenceThreshold &&
           iteration < this.config.maxIterations) {
      maxChange = this.propagateOnce();
      iteration++;
    }
  }

  /**
   * Single propagation step
   */
  private propagateOnce(): number {
    const newActivations = new Map<ConceptId, number>();
    let maxChange = 0;

    for (const id of this.conceptOrder) {
      const concept = this.concepts.get(id)!;

      // Input concepts don't update from internal propagation
      if (concept.type === 'input') {
        newActivations.set(id, concept.activation);
        continue;
      }

      // Sum weighted influences from all incoming connections
      let influenceSum = concept.bias;
      for (const [key, weight] of this.weights) {
        const [fromId, toId] = key.split(':');
        if (toId === id) {
          const fromConcept = this.concepts.get(fromId);
          if (fromConcept) {
            influenceSum += fromConcept.activation * weight;
          }
        }
      }

      // Apply activation function
      const rawActivation = this.activate(influenceSum);

      // Apply decay
      const decayedCurrent = concept.activation * (1 - concept.decayRate - this.config.globalDecay);
      const newActivation = Math.max(-1, Math.min(1, rawActivation * 0.7 + decayedCurrent * 0.3));

      newActivations.set(id, newActivation);
      maxChange = Math.max(maxChange, Math.abs(newActivation - concept.activation));
    }

    // Apply new activations
    for (const [id, activation] of newActivations) {
      const concept = this.concepts.get(id);
      if (concept) {
        concept.activation = activation;
      }
    }

    return maxChange;
  }

  /**
   * Apply activation function
   */
  private activate(x: number): number {
    switch (this.config.activationFunction) {
      case 'sigmoid':
        return 2 / (1 + Math.exp(-x)) - 1; // Scaled to [-1, 1]
      case 'tanh':
        return Math.tanh(x);
      case 'linear':
        return Math.max(-1, Math.min(1, x));
      case 'step':
        return x > 0 ? 1 : x < 0 ? -1 : 0;
      default:
        return Math.tanh(x);
    }
  }

  /**
   * Extract BrainOutput from output concepts
   */
  private extractOutput(): BrainOutput {
    const moveForward = this.getConceptActivation('move_forward');
    const turnLeft = this.getConceptActivation('turn_left');
    const turnRight = this.getConceptActivation('turn_right');
    const eat = this.getConceptActivation('eat');
    const flee = this.getConceptActivation('flee');
    const hunt = this.getConceptActivation('hunt');
    const reproduce = this.getConceptActivation('reproduce');

    // Combine movement signals
    const forwardSignal = moveForward + (flee > 0.5 ? flee * 0.5 : 0);

    // Rotation: difference between left and right
    const rotation = turnRight - turnLeft;

    // Action: determine primary action
    // 0 = none, ~1 = eat, ~2 = reproduce
    let action = 0;
    const maxAction = Math.max(eat, hunt, reproduce);

    if (maxAction > 0.3) {
      if (eat >= hunt && eat >= reproduce) {
        action = 1; // Eat
      } else if (reproduce > eat && reproduce >= hunt) {
        action = 2; // Reproduce
      } else if (hunt > eat && hunt > reproduce) {
        action = 1; // Hunt (treated as eat for energy gain)
      }
    }

    return {
      moveForward: Math.max(-1, Math.min(1, forwardSignal)),
      rotate: Math.max(-1, Math.min(1, rotation)),
      action: action,
    };
  }

  /**
   * Get concept activation
   */
  getConceptActivation(id: ConceptId): number {
    return this.concepts.get(id)?.activation ?? 0;
  }

  /**
   * Get all concept activations (for debugging/visualization)
   */
  getAllActivations(): Record<ConceptId, number> {
    const result: Record<ConceptId, number> = {};
    for (const [id, concept] of this.concepts) {
      result[id] = concept.activation;
    }
    return result;
  }

  /**
   * Create a mutated copy
   */
  mutate(mutationRate: number = 0.1, mutationStrength: number = 0.3): FCMBrain {
    const newConcepts: FCMConcept[] = [];
    const newWeights: FCMWeight[] = [];

    // Mutate concept parameters
    for (const concept of this.concepts.values()) {
      const mutated = { ...concept };

      if (Math.random() < mutationRate) {
        mutated.decayRate = Math.max(0, Math.min(1,
          mutated.decayRate + (Math.random() - 0.5) * mutationStrength
        ));
      }
      if (Math.random() < mutationRate) {
        mutated.bias = Math.max(-1, Math.min(1,
          mutated.bias + (Math.random() - 0.5) * mutationStrength
        ));
      }

      newConcepts.push(mutated);
    }

    // Mutate weights
    for (const [key, weight] of this.weights) {
      const [fromId, toId] = key.split(':');
      let newWeight = weight;

      if (Math.random() < mutationRate) {
        newWeight = Math.max(-1, Math.min(1,
          newWeight + (Math.random() - 0.5) * 2 * mutationStrength
        ));
      }

      newWeights.push({ fromId, toId, weight: newWeight });
    }

    // Occasionally add or remove a weight
    if (Math.random() < mutationRate * 0.1) {
      const conceptIds = Array.from(this.concepts.keys());
      const fromId = conceptIds[Math.floor(Math.random() * conceptIds.length)];
      const toId = conceptIds[Math.floor(Math.random() * conceptIds.length)];

      const fromConcept = this.concepts.get(fromId);
      const toConcept = this.concepts.get(toId);

      if (fromId !== toId &&
          fromConcept?.type !== 'output' &&
          toConcept?.type !== 'input') {
        const key = this.getWeightKey(fromId, toId);
        if (!this.weights.has(key)) {
          newWeights.push({
            fromId,
            toId,
            weight: (Math.random() - 0.5) * 2,
          });
        }
      }
    }

    return new FCMBrain({
      concepts: newConcepts,
      weights: newWeights,
      ...this.config,
    }, this.label);
  }

  /**
   * Clone this brain
   */
  clone(): FCMBrain {
    const concepts: FCMConcept[] = [];
    const weights: FCMWeight[] = [];

    for (const concept of this.concepts.values()) {
      concepts.push({ ...concept });
    }

    for (const [key, weight] of this.weights) {
      const [fromId, toId] = key.split(':');
      weights.push({ fromId, toId, weight });
    }

    return new FCMBrain({
      concepts,
      weights,
      ...this.config,
    }, this.label);
  }

  /**
   * Crossover with another FCM brain
   */
  crossover(other: Brain): FCMBrain {
    if (other.type !== 'fcm') {
      return this.clone();
    }

    const otherFCM = other as FCMBrain;
    const newConcepts: FCMConcept[] = [];
    const newWeights: FCMWeight[] = [];

    // Crossover concepts
    for (const id of this.conceptOrder) {
      const myConcept = this.concepts.get(id);
      const otherConcept = otherFCM.concepts.get(id);

      if (myConcept && otherConcept) {
        const source = Math.random() < 0.5 ? myConcept : otherConcept;
        newConcepts.push({ ...source });
      } else if (myConcept) {
        newConcepts.push({ ...myConcept });
      }
    }

    // Crossover weights
    const allWeightKeys = new Set([
      ...this.weights.keys(),
      ...otherFCM.weights.keys(),
    ]);

    for (const key of allWeightKeys) {
      const myWeight = this.weights.get(key);
      const otherWeight = otherFCM.weights.get(key);
      const [fromId, toId] = key.split(':');

      if (myWeight !== undefined && otherWeight !== undefined) {
        const weight = Math.random() < 0.5 ? myWeight : otherWeight;
        newWeights.push({ fromId, toId, weight });
      } else if (myWeight !== undefined) {
        if (Math.random() < 0.7) {
          newWeights.push({ fromId, toId, weight: myWeight });
        }
      } else if (otherWeight !== undefined) {
        if (Math.random() < 0.7) {
          newWeights.push({ fromId, toId, weight: otherWeight });
        }
      }
    }

    return new FCMBrain({
      concepts: newConcepts,
      weights: newWeights,
      ...this.config,
    }, this.label);
  }

  /**
   * Serialize to BrainState
   */
  serialize(): BrainState {
    const concepts: FCMBrainState['concepts'] = [];
    const weights: FCMWeight[] = [];

    for (const concept of this.concepts.values()) {
      concepts.push({
        id: concept.id,
        activation: concept.activation,
        decayRate: concept.decayRate,
        bias: concept.bias,
      });
    }

    for (const [key, weight] of this.weights) {
      const [fromId, toId] = key.split(':');
      weights.push({ fromId, toId, weight });
    }

    return {
      type: 'fcm',
      version: 1,
      config: { label: this.label },
      data: {
        concepts,
        weights,
        config: this.config,
      } as FCMBrainState,
    };
  }

  /**
   * Get complexity metric
   */
  getComplexity(): number {
    return this.concepts.size + this.weights.size;
  }

  /**
   * Deserialize from BrainState
   */
  static deserialize(state: BrainState): FCMBrain {
    const data = state.data as FCMBrainState;

    // Reconstruct full concepts from stored data
    const conceptMap = new Map(
      ALL_STANDARD_CONCEPTS.map(c => [c.id, c])
    );

    const concepts: FCMConcept[] = data.concepts.map(stored => {
      const base = conceptMap.get(stored.id);
      return {
        id: stored.id,
        name: base?.name ?? stored.id,
        type: base?.type ?? 'hidden',
        activation: stored.activation,
        decayRate: stored.decayRate,
        bias: stored.bias,
      };
    });

    return new FCMBrain({
      concepts,
      weights: data.weights,
      ...data.config,
    }, state.config?.label);
  }

  /**
   * Get weight key
   */
  private getWeightKey(fromId: ConceptId, toId: ConceptId): string {
    return `${fromId}:${toId}`;
  }

  /**
   * Get weight between two concepts
   */
  getWeight(fromId: ConceptId, toId: ConceptId): number {
    return this.weights.get(this.getWeightKey(fromId, toId)) ?? 0;
  }

  /**
   * Set weight between two concepts
   */
  setWeight(fromId: ConceptId, toId: ConceptId, weight: number): void {
    this.weights.set(this.getWeightKey(fromId, toId), weight);
  }
}

// Register with BrainRegistry
BrainRegistry.register('fcm', FCMBrain.deserialize);

export default FCMBrain;
