/**
 * TrophicSensorySystem.ts - Extended sensory system with predator-prey awareness
 *
 * Extends the base SensorySystem to provide species-aware sensing,
 * enabling agents to detect threats and opportunities based on trophic roles.
 */

import { SensorySystem, SensorConfig, AgentLike, WorldLike, DEFAULT_SENSOR_CONFIG } from './SensorySystem';
import { Direction, distance, directionTo, normalize } from './Direction';
import { TrophicRoleTracker } from '../trophic/TrophicRoleTracker';
import { TrophicSensoryInput, DEFAULT_TROPHIC_SENSORY_INPUT } from '../trophic/types';
import { SpatialHash, QueryResult } from '../spatial';

// ============================================================================
// Types
// ============================================================================

export interface TrophicAgent extends AgentLike {
  speciesId: string;
  size?: number;
  speed?: number;
  strength?: number;
}

export interface TrophicWorldLike extends WorldLike {
  getAgents(): TrophicAgent[];
}

export interface TrophicSensorConfig extends SensorConfig {
  threatDetectionRange: number;      // Range for detecting predators
  preyDetectionRange: number;        // Range for detecting prey
  threatWeight: number;              // How much threat affects behavior
  opportunityWeight: number;         // How much opportunity affects behavior
  useSpatialHash: boolean;           // Whether to use spatial hash for queries
}

export const DEFAULT_TROPHIC_SENSOR_CONFIG: TrophicSensorConfig = {
  ...DEFAULT_SENSOR_CONFIG,
  threatDetectionRange: 150,
  preyDetectionRange: 100,
  threatWeight: 1.0,
  opportunityWeight: 1.0,
  useSpatialHash: true,
};

// ============================================================================
// TrophicSensorySystem Class
// ============================================================================

export class TrophicSensorySystem extends SensorySystem {
  private trophicConfig: TrophicSensorConfig;
  private trophicTracker: TrophicRoleTracker;

  constructor(
    trophicTracker: TrophicRoleTracker,
    config?: Partial<TrophicSensorConfig>
  ) {
    super(config);
    this.trophicConfig = { ...DEFAULT_TROPHIC_SENSOR_CONFIG, ...config };
    this.trophicTracker = trophicTracker;
  }

  /**
   * Gather trophic-aware sensory input including predator/prey detection
   */
  gatherTrophic(
    agent: TrophicAgent,
    world: TrophicWorldLike,
    spatialHash?: SpatialHash<TrophicAgent>
  ): TrophicSensoryInput {
    // Get base sensory input
    const baseInput = this.gather(agent, world);

    // Get all nearby agents for trophic analysis
    const nearbyAgents = this.getNearbyAgents(agent, world, spatialHash);

    // Find nearest predator and prey
    const nearestPredator = this.findNearestPredator(agent, nearbyAgents);
    const nearestPrey = this.findNearestPrey(agent, nearbyAgents);

    // Calculate threat and opportunity levels
    const threatLevel = this.calculateThreatLevel(agent, nearbyAgents);
    const opportunityLevel = this.calculateOpportunityLevel(agent, nearbyAgents);

    return {
      // Base inputs
      front: baseInput.front,
      frontLeft: baseInput.frontLeft,
      frontRight: baseInput.frontRight,
      left: baseInput.left,
      right: baseInput.right,
      energy: baseInput.energy,
      bias: baseInput.bias,

      // Trophic-specific inputs
      nearestPreyDistance: nearestPrey?.distance ?? 0,
      nearestPreyDirection: nearestPrey?.direction ?? 0,
      nearestPreySize: nearestPrey?.size ?? 0,
      nearestPredatorDistance: nearestPredator?.distance ?? 0,
      nearestPredatorDirection: nearestPredator?.direction ?? 0,
      nearestPredatorSize: nearestPredator?.size ?? 0,
      threatLevel,
      opportunityLevel,
    };
  }

  /**
   * Get nearby agents using spatial hash if available, otherwise from world
   */
  private getNearbyAgents(
    agent: TrophicAgent,
    world: TrophicWorldLike,
    spatialHash?: SpatialHash<TrophicAgent>
  ): Array<{ agent: TrophicAgent; distance: number }> {
    const maxRange = Math.max(
      this.trophicConfig.threatDetectionRange,
      this.trophicConfig.preyDetectionRange
    );

    if (this.trophicConfig.useSpatialHash && spatialHash) {
      const results = spatialHash.queryRadiusSorted(
        agent.position.x,
        agent.position.y,
        maxRange
      );
      return results
        .filter(r => r.entity.id !== agent.id && r.entity.isAlive !== false)
        .map(r => ({ agent: r.entity, distance: r.distance }));
    }

    // Fallback to world query
    const agents = world.getAgents().filter(
      a => a.id !== agent.id && a.isAlive !== false
    );

    return agents
      .map(a => ({
        agent: a,
        distance: distance(agent.position, a.position),
      }))
      .filter(r => r.distance <= maxRange)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Find the nearest predator agent
   */
  private findNearestPredator(
    agent: TrophicAgent,
    nearbyAgents: Array<{ agent: TrophicAgent; distance: number }>
  ): { distance: number; direction: number; size: number } | null {
    for (const { agent: other, distance: dist } of nearbyAgents) {
      if (dist > this.trophicConfig.threatDetectionRange) continue;

      // Check if this agent is a threat to us
      if (this.trophicTracker.isThreatTo(other.speciesId, agent.speciesId)) {
        const direction = this.calculateRelativeDirection(agent, other);
        const normalizedDistance = Math.min(1, dist / this.trophicConfig.threatDetectionRange);

        return {
          distance: 1 - normalizedDistance, // Higher = closer
          direction: direction / Math.PI,   // Normalized to [-1, 1]
          size: Math.min(1, (other.size ?? 1) / 2), // Normalized size
        };
      }
    }

    return null;
  }

  /**
   * Find the nearest prey agent
   */
  private findNearestPrey(
    agent: TrophicAgent,
    nearbyAgents: Array<{ agent: TrophicAgent; distance: number }>
  ): { distance: number; direction: number; size: number } | null {
    for (const { agent: other, distance: dist } of nearbyAgents) {
      if (dist > this.trophicConfig.preyDetectionRange) continue;

      // Check if this agent is prey to us
      if (this.trophicTracker.isOpportunityFor(agent.speciesId, other.speciesId)) {
        const direction = this.calculateRelativeDirection(agent, other);
        const normalizedDistance = Math.min(1, dist / this.trophicConfig.preyDetectionRange);

        return {
          distance: 1 - normalizedDistance, // Higher = closer
          direction: direction / Math.PI,   // Normalized to [-1, 1]
          size: Math.min(1, (other.size ?? 1) / 2), // Normalized size
        };
      }
    }

    return null;
  }

  /**
   * Calculate the relative direction to another agent from the agent's perspective
   * Returns angle in radians: 0 = directly ahead, positive = right, negative = left
   */
  private calculateRelativeDirection(agent: TrophicAgent, target: TrophicAgent): number {
    const dx = target.position.x - agent.position.x;
    const dy = target.position.y - agent.position.y;
    const absoluteAngle = Math.atan2(dy, dx);

    // Calculate relative angle (difference from agent's facing direction)
    let relativeAngle = absoluteAngle - agent.rotation;

    // Normalize to [-PI, PI]
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    return relativeAngle;
  }

  /**
   * Calculate overall threat level from nearby predators
   */
  private calculateThreatLevel(
    agent: TrophicAgent,
    nearbyAgents: Array<{ agent: TrophicAgent; distance: number }>
  ): number {
    const threats = nearbyAgents
      .filter(({ agent: other, distance: dist }) =>
        dist <= this.trophicConfig.threatDetectionRange &&
        this.trophicTracker.isThreatTo(other.speciesId, agent.speciesId)
      )
      .map(({ agent: other, distance: dist }) => ({
        speciesId: other.speciesId,
        distance: dist,
        size: other.size,
      }));

    return this.trophicTracker.calculateThreatLevel(agent.speciesId, threats);
  }

  /**
   * Calculate overall opportunity level from nearby prey
   */
  private calculateOpportunityLevel(
    agent: TrophicAgent,
    nearbyAgents: Array<{ agent: TrophicAgent; distance: number }>
  ): number {
    const opportunities = nearbyAgents
      .filter(({ agent: other, distance: dist }) =>
        dist <= this.trophicConfig.preyDetectionRange &&
        this.trophicTracker.isOpportunityFor(agent.speciesId, other.speciesId)
      )
      .map(({ agent: other, distance: dist }) => ({
        speciesId: other.speciesId,
        distance: dist,
        size: other.size,
        energy: other.energy,
      }));

    return this.trophicTracker.calculateOpportunityLevel(agent.speciesId, opportunities);
  }

  /**
   * Sense predators in a specific direction
   */
  sensePredators(
    agent: TrophicAgent,
    world: TrophicWorldLike,
    direction: Direction,
    spatialHash?: SpatialHash<TrophicAgent>
  ): number {
    const nearbyAgents = this.getNearbyAgents(agent, world, spatialHash);
    let closestDistance = Infinity;

    for (const { agent: other, distance: dist } of nearbyAgents) {
      if (dist > this.trophicConfig.threatDetectionRange) continue;

      if (this.trophicTracker.isThreatTo(other.speciesId, agent.speciesId)) {
        if (this.isInDirectionCone(agent, other.position, direction)) {
          if (dist < closestDistance) {
            closestDistance = dist;
          }
        }
      }
    }

    if (closestDistance === Infinity) return 0;
    return 1 - Math.min(1, closestDistance / this.trophicConfig.threatDetectionRange);
  }

  /**
   * Sense prey in a specific direction
   */
  sensePrey(
    agent: TrophicAgent,
    world: TrophicWorldLike,
    direction: Direction,
    spatialHash?: SpatialHash<TrophicAgent>
  ): number {
    const nearbyAgents = this.getNearbyAgents(agent, world, spatialHash);
    let closestDistance = Infinity;

    for (const { agent: other, distance: dist } of nearbyAgents) {
      if (dist > this.trophicConfig.preyDetectionRange) continue;

      if (this.trophicTracker.isOpportunityFor(agent.speciesId, other.speciesId)) {
        if (this.isInDirectionCone(agent, other.position, direction)) {
          if (dist < closestDistance) {
            closestDistance = dist;
          }
        }
      }
    }

    if (closestDistance === Infinity) return 0;
    return 1 - Math.min(1, closestDistance / this.trophicConfig.preyDetectionRange);
  }

  /**
   * Check if a position is within a direction cone from the agent
   */
  private isInDirectionCone(
    agent: TrophicAgent,
    position: { x: number; y: number },
    direction: Direction
  ): boolean {
    const dx = position.x - agent.position.x;
    const dy = position.y - agent.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return true;

    const absoluteAngle = Math.atan2(dy, dx);
    let relativeAngle = absoluteAngle - agent.rotation;

    // Normalize to [-PI, PI]
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    const coneWidth = this.trophicConfig.visionAngle;

    switch (direction) {
      case Direction.FRONT:
        return Math.abs(relativeAngle) <= coneWidth / 2;
      case Direction.FRONT_LEFT:
        return relativeAngle >= coneWidth / 2 && relativeAngle <= coneWidth * 1.5;
      case Direction.FRONT_RIGHT:
        return relativeAngle <= -coneWidth / 2 && relativeAngle >= -coneWidth * 1.5;
      case Direction.LEFT:
        return relativeAngle >= coneWidth * 1.5 || relativeAngle <= -Math.PI + coneWidth / 2;
      case Direction.RIGHT:
        return relativeAngle <= -coneWidth * 1.5 || relativeAngle >= Math.PI - coneWidth / 2;
      default:
        return false;
    }
  }

  /**
   * Get detailed trophic sensory data with separate predator/prey channels per direction
   */
  gatherDetailedTrophic(
    agent: TrophicAgent,
    world: TrophicWorldLike,
    spatialHash?: SpatialHash<TrophicAgent>
  ): {
    base: TrophicSensoryInput;
    predatorFront: number;
    predatorFrontLeft: number;
    predatorFrontRight: number;
    predatorLeft: number;
    predatorRight: number;
    preyFront: number;
    preyFrontLeft: number;
    preyFrontRight: number;
    preyLeft: number;
    preyRight: number;
  } {
    const base = this.gatherTrophic(agent, world, spatialHash);

    return {
      base,
      predatorFront: this.sensePredators(agent, world, Direction.FRONT, spatialHash),
      predatorFrontLeft: this.sensePredators(agent, world, Direction.FRONT_LEFT, spatialHash),
      predatorFrontRight: this.sensePredators(agent, world, Direction.FRONT_RIGHT, spatialHash),
      predatorLeft: this.sensePredators(agent, world, Direction.LEFT, spatialHash),
      predatorRight: this.sensePredators(agent, world, Direction.RIGHT, spatialHash),
      preyFront: this.sensePrey(agent, world, Direction.FRONT, spatialHash),
      preyFrontLeft: this.sensePrey(agent, world, Direction.FRONT_LEFT, spatialHash),
      preyFrontRight: this.sensePrey(agent, world, Direction.FRONT_RIGHT, spatialHash),
      preyLeft: this.sensePrey(agent, world, Direction.LEFT, spatialHash),
      preyRight: this.sensePrey(agent, world, Direction.RIGHT, spatialHash),
    };
  }

  /**
   * Get the trophic tracker
   */
  getTrophicTracker(): TrophicRoleTracker {
    return this.trophicTracker;
  }

  /**
   * Get trophic configuration
   */
  getTrophicConfig(): TrophicSensorConfig {
    return { ...this.trophicConfig };
  }

  /**
   * Update trophic configuration
   */
  setTrophicConfig(config: Partial<TrophicSensorConfig>): void {
    Object.assign(this.trophicConfig, config);
    // Also update base config
    this.setConfig(config);
  }

  /**
   * Clone with optional config overrides
   */
  cloneTrophic(configOverrides?: Partial<TrophicSensorConfig>): TrophicSensorySystem {
    return new TrophicSensorySystem(
      this.trophicTracker,
      { ...this.trophicConfig, ...configOverrides }
    );
  }
}

/**
 * Factory function to create a TrophicSensorySystem
 */
export function createTrophicSensorySystem(
  trophicTracker: TrophicRoleTracker,
  config?: Partial<TrophicSensorConfig>
): TrophicSensorySystem {
  return new TrophicSensorySystem(trophicTracker, config);
}

export default TrophicSensorySystem;
