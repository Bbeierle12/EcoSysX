/**
 * RuleBrain.ts - Simple rule-based Brain implementation
 */

import { Brain, SensoryInput, BrainOutput, BrainState, BrainRegistry } from './Brain';

export interface RuleBrainConfig {
  criticalEnergyThreshold?: number;
  reproductionEnergyThreshold?: number;
  avoidCrowding?: boolean;
  crowdingThreshold?: number;
}

export class RuleBrain implements Brain {
  readonly type = 'rule';
  readonly label?: string;

  private config: Required<RuleBrainConfig>;
  private stats = {
    totalDecisions: 0,
    actionCounts: {} as Record<string, number>,
  };

  constructor(config?: RuleBrainConfig, label?: string) {
    this.label = label;
    this.config = {
      criticalEnergyThreshold: config?.criticalEnergyThreshold ?? 0.2,
      reproductionEnergyThreshold: config?.reproductionEnergyThreshold ?? 0.7,
      avoidCrowding: config?.avoidCrowding ?? true,
      crowdingThreshold: config?.crowdingThreshold ?? 5,
    };
  }

  think(input: SensoryInput): BrainOutput {
    this.stats.totalDecisions++;

    const energy = input.energy;
    const front = input.front;
    const frontLeft = input.frontLeft;
    const frontRight = input.frontRight;

    // Calculate outputs based on rules
    let moveForward = 0;
    let rotate = 0;
    let action = 0;

    // Critical energy - prioritize finding food
    if (energy < this.config.criticalEnergyThreshold) {
      if (front > 0.1) {
        moveForward = 1;
        action = 1; // Eat action
      } else if (frontLeft > frontRight) {
        rotate = 0.5; // Turn left (positive rotation)
      } else if (frontRight > frontLeft) {
        rotate = -0.5; // Turn right (negative rotation)
      } else {
        moveForward = 0.8;
      }
    }
    // Normal behavior
    else {
      // Food ahead - move toward it
      if (front > 0.1) {
        moveForward = front;
        if (front > 0.5) {
          action = 1; // Eat if close enough
        }
      }
      // Food to side - turn toward it
      else if (frontLeft > 0.1) {
        rotate = frontLeft * 0.5;
      } else if (frontRight > 0.1) {
        rotate = -frontRight * 0.5;
      }
      // Explore
      else {
        moveForward = 0.5;
        // Random exploration
        if (Math.random() < 0.2) {
          rotate = 0.3;
        } else if (Math.random() < 0.2) {
          rotate = -0.3;
        }
      }

      // Consider reproduction if energy is high
      if (energy > this.config.reproductionEnergyThreshold) {
        action = 2; // Reproduce action
      }
    }

    return {
      moveForward,
      rotate,
      action,
    };
  }

  mutate(mutationRate: number = 0.1, mutationStrength: number = 0.2): Brain {
    const mutate = (value: number, min: number, max: number) => {
      if (Math.random() < mutationRate) {
        const mutation = (Math.random() - 0.5) * mutationStrength;
        return Math.max(min, Math.min(max, value + mutation));
      }
      return value;
    };

    const newConfig: RuleBrainConfig = {
      criticalEnergyThreshold: mutate(this.config.criticalEnergyThreshold, 0.1, 0.4),
      reproductionEnergyThreshold: mutate(this.config.reproductionEnergyThreshold, 0.5, 0.9),
      avoidCrowding: this.config.avoidCrowding,
      crowdingThreshold: mutate(this.config.crowdingThreshold, 2, 10),
    };

    return new RuleBrain(newConfig, this.label);
  }

  clone(): Brain {
    return new RuleBrain({ ...this.config }, this.label);
  }

  crossover(other: Brain): Brain {
    if (!(other instanceof RuleBrain)) {
      return this.clone();
    }

    const childConfig: RuleBrainConfig = {
      criticalEnergyThreshold:
        Math.random() < 0.5
          ? this.config.criticalEnergyThreshold
          : other.config.criticalEnergyThreshold,
      reproductionEnergyThreshold:
        Math.random() < 0.5
          ? this.config.reproductionEnergyThreshold
          : other.config.reproductionEnergyThreshold,
      avoidCrowding:
        Math.random() < 0.5 ? this.config.avoidCrowding : other.config.avoidCrowding,
      crowdingThreshold:
        Math.random() < 0.5
          ? this.config.crowdingThreshold
          : other.config.crowdingThreshold,
    };

    return new RuleBrain(childConfig, this.label);
  }

  serialize(): BrainState {
    return {
      type: 'rule',
      version: 1,
      config: {
        label: this.label,
      },
      data: {
        ruleConfig: this.config,
        stats: this.stats,
      },
    };
  }

  getComplexity(): number {
    // Rule-based brains have low complexity
    return 4; // Number of configurable parameters
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  getConfig(): Required<RuleBrainConfig> {
    return { ...this.config };
  }
}

// Register with BrainRegistry
BrainRegistry.register('rule', (state) => {
  const data = state.data as { ruleConfig?: RuleBrainConfig };
  const brain = new RuleBrain(data?.ruleConfig, state.config?.label);
  return brain;
});

export const RULE_BRAIN_TYPE = 'rule';
