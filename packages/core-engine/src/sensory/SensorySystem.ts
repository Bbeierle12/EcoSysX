/**
 * SensorySystem.ts - Main sensory gathering for agents
 *
 * Produces sensory input compatible with the Brain interface.
 * Aggregates food and agent detection into directional signals.
 */

import { Direction, Vector2D, distance, isInDirectionCone } from './Direction';
import { SensoryInput } from '../neural/Brain';

export interface SensorConfig {
  visionRange: number;
  visionAngle: number;
  smellRange: number;
  maxEnergy?: number;
  falloffType?: 'linear' | 'quadratic' | 'exponential';
  foodWeight?: number; // Weight for food detection (default 1.0)
  agentWeight?: number; // Weight for agent detection (default 0.5)
}

export const DEFAULT_SENSOR_CONFIG: SensorConfig = {
  visionRange: 100,
  visionAngle: Math.PI / 3,
  smellRange: 50,
  maxEnergy: 100,
  falloffType: 'linear',
  foodWeight: 1.0,
  agentWeight: 0.5,
};

export interface AgentLike {
  id: string;
  position: Vector2D;
  rotation: number;
  energy: number;
  isAlive?: boolean;
}

export interface FoodLike {
  id: string;
  position: Vector2D;
  isConsumed?: boolean;
}

export interface WorldLike {
  getAgents(): AgentLike[];
  getFood(): FoodLike[];
}

/**
 * Extended sensory data with separate food and agent channels
 */
export interface DetailedSensoryInput {
  frontFood: number;
  frontLeftFood: number;
  frontRightFood: number;
  leftFood: number;
  rightFood: number;
  frontAgent: number;
  frontLeftAgent: number;
  frontRightAgent: number;
  leftAgent: number;
  rightAgent: number;
  energy: number;
}

export class SensorySystem {
  private config: Required<SensorConfig>;

  constructor(config: Partial<SensorConfig> = {}) {
    this.config = {
      visionRange: config.visionRange ?? DEFAULT_SENSOR_CONFIG.visionRange,
      visionAngle: config.visionAngle ?? DEFAULT_SENSOR_CONFIG.visionAngle,
      smellRange: config.smellRange ?? DEFAULT_SENSOR_CONFIG.smellRange,
      maxEnergy: config.maxEnergy ?? DEFAULT_SENSOR_CONFIG.maxEnergy!,
      falloffType: config.falloffType ?? DEFAULT_SENSOR_CONFIG.falloffType!,
      foodWeight: config.foodWeight ?? DEFAULT_SENSOR_CONFIG.foodWeight!,
      agentWeight: config.agentWeight ?? DEFAULT_SENSOR_CONFIG.agentWeight!,
    };
  }

  /**
   * Gather sensory input in the format expected by Brain interface.
   * Combines food and agent detection into single directional values.
   */
  gather(agent: AgentLike, world: WorldLike): SensoryInput {
    const detailed = this.gatherDetailed(agent, world);

    // Combine food and agent signals with configurable weights
    const fw = this.config.foodWeight;
    const aw = this.config.agentWeight;

    return {
      front: Math.min(1, detailed.frontFood * fw + detailed.frontAgent * aw),
      frontLeft: Math.min(1, detailed.frontLeftFood * fw + detailed.frontLeftAgent * aw),
      frontRight: Math.min(1, detailed.frontRightFood * fw + detailed.frontRightAgent * aw),
      left: Math.min(1, detailed.leftFood * fw + detailed.leftAgent * aw),
      right: Math.min(1, detailed.rightFood * fw + detailed.rightAgent * aw),
      energy: detailed.energy,
      bias: 1.0,
    };
  }

  /**
   * Gather detailed sensory input with separate food and agent channels.
   * Useful for more sophisticated brains that need to distinguish entity types.
   */
  gatherDetailed(agent: AgentLike, world: WorldLike): DetailedSensoryInput {
    return {
      frontFood: this.senseFood(agent, world, Direction.FRONT),
      frontLeftFood: this.senseFood(agent, world, Direction.FRONT_LEFT),
      frontRightFood: this.senseFood(agent, world, Direction.FRONT_RIGHT),
      leftFood: this.senseFood(agent, world, Direction.LEFT),
      rightFood: this.senseFood(agent, world, Direction.RIGHT),
      frontAgent: this.senseAgents(agent, world, Direction.FRONT),
      frontLeftAgent: this.senseAgents(agent, world, Direction.FRONT_LEFT),
      frontRightAgent: this.senseAgents(agent, world, Direction.FRONT_RIGHT),
      leftAgent: this.senseAgents(agent, world, Direction.LEFT),
      rightAgent: this.senseAgents(agent, world, Direction.RIGHT),
      energy: this.senseEnergy(agent),
    };
  }

  senseFood(agent: AgentLike, world: WorldLike, direction: Direction): number {
    const food = world.getFood();
    return this.senseEntities(
      agent,
      food.filter((f) => !f.isConsumed).map((f) => f.position),
      direction
    );
  }

  senseAgents(agent: AgentLike, world: WorldLike, direction: Direction): number {
    const agents = world
      .getAgents()
      .filter((a) => a.id !== agent.id && a.isAlive !== false);
    return this.senseEntities(
      agent,
      agents.map((a) => a.position),
      direction
    );
  }

  senseEnergy(agent: AgentLike): number {
    return Math.max(0, Math.min(1, agent.energy / this.config.maxEnergy));
  }

  private senseEntities(
    agent: AgentLike,
    positions: Vector2D[],
    direction: Direction
  ): number {
    let closestDistance = Infinity;

    for (const pos of positions) {
      if (
        isInDirectionCone(
          agent.position,
          agent.rotation,
          pos,
          direction,
          this.config.visionRange
        )
      ) {
        const dist = distance(agent.position, pos);
        if (dist < closestDistance) {
          closestDistance = dist;
        }
      }
    }

    if (closestDistance === Infinity) return 0;
    return this.calculateFalloff(closestDistance, this.config.visionRange);
  }

  private calculateFalloff(dist: number, maxRange: number): number {
    if (dist >= maxRange) return 0;
    if (dist <= 0) return 1;

    const normalizedDist = dist / maxRange;

    switch (this.config.falloffType) {
      case 'quadratic':
        return 1 - normalizedDist * normalizedDist;
      case 'exponential':
        return Math.exp(-3 * normalizedDist);
      case 'linear':
      default:
        return 1 - normalizedDist;
    }
  }

  setConfig(config: Partial<SensorConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): SensorConfig {
    return { ...this.config };
  }

  clone(configOverrides?: Partial<SensorConfig>): SensorySystem {
    return new SensorySystem({ ...this.config, ...configOverrides });
  }
}

export function createSensorySystem(config?: Partial<SensorConfig>): SensorySystem {
  return new SensorySystem(config);
}
