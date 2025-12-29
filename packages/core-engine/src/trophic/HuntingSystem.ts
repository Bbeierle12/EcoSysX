/**
 * HuntingSystem.ts - Predation mechanics for emergent trophic dynamics
 *
 * Handles hunting interactions between agents, calculating success based on
 * physical traits (size, speed, strength) and transferring energy on success.
 */

import {
  TrophicAgent,
  TrophicConfig,
  DEFAULT_TROPHIC_CONFIG,
  TrophicInteraction,
  HuntResult,
} from './types';
import { TrophicRoleTracker } from './TrophicRoleTracker';
import { SpatialHash, QueryResult } from '../spatial';

// ============================================================================
// HuntingSystem Types
// ============================================================================

export interface HuntingSystemConfig extends TrophicConfig {
  minEnergyToHunt: number;      // Minimum energy required to attempt hunt
  killThreshold: number;        // Damage threshold to kill prey (0-1 of prey energy)
  escapeSpeedBonus: number;     // Bonus to escape chance per speed difference
  sizeDisadvantage: number;     // How much larger predators are penalized hunting smaller prey
}

export const DEFAULT_HUNTING_CONFIG: HuntingSystemConfig = {
  ...DEFAULT_TROPHIC_CONFIG,
  minEnergyToHunt: 10,
  killThreshold: 0.8,
  escapeSpeedBonus: 0.1,
  sizeDisadvantage: 0.1,
};

export interface HuntingTarget {
  agent: TrophicAgent;
  distance: number;
  successChance: number;
  expectedEnergyGain: number;
}

export interface HuntingSystemStats {
  totalHuntsAttempted: number;
  totalHuntsSuccessful: number;
  totalEnergyTransferred: number;
  totalPreyKilled: number;
  averageSuccessRate: number;
}

// ============================================================================
// HuntingSystem Class
// ============================================================================

export class HuntingSystem {
  private config: HuntingSystemConfig;
  private trophicTracker: TrophicRoleTracker;
  private huntCooldowns: Map<string, number>; // agentId -> tick when can hunt again
  private stats: HuntingSystemStats;

  constructor(
    trophicTracker: TrophicRoleTracker,
    config?: Partial<HuntingSystemConfig>
  ) {
    this.config = { ...DEFAULT_HUNTING_CONFIG, ...config };
    this.trophicTracker = trophicTracker;
    this.huntCooldowns = new Map();
    this.stats = {
      totalHuntsAttempted: 0,
      totalHuntsSuccessful: 0,
      totalEnergyTransferred: 0,
      totalPreyKilled: 0,
      averageSuccessRate: 0,
    };
  }

  /**
   * Find potential prey within hunting range
   */
  findPotentialPrey(
    predator: TrophicAgent,
    spatialHash: SpatialHash<TrophicAgent>,
    tick: number
  ): HuntingTarget[] {
    // Check if predator can hunt
    if (!this.canHunt(predator, tick)) {
      return [];
    }

    const nearby = spatialHash.queryRadiusSorted(
      predator.position.x,
      predator.position.y,
      this.config.huntingRange
    );

    const targets: HuntingTarget[] = [];

    for (const { entity: prey, distance } of nearby) {
      // Can't hunt self
      if (prey.id === predator.id) continue;

      // Can't hunt dead agents
      if (!prey.isAlive) continue;

      // Check if this is a valid prey relationship
      if (!this.isValidPrey(predator, prey)) continue;

      const successChance = this.calculateHuntSuccessChance(predator, prey, distance);
      const expectedEnergyGain = prey.energy * this.config.energyTransferRatio;

      targets.push({
        agent: prey,
        distance,
        successChance,
        expectedEnergyGain,
      });
    }

    // Sort by expected value (successChance * expectedEnergyGain)
    return targets.sort(
      (a, b) =>
        b.successChance * b.expectedEnergyGain -
        a.successChance * a.expectedEnergyGain
    );
  }

  /**
   * Check if predator can hunt at the current tick
   */
  canHunt(predator: TrophicAgent, tick: number): boolean {
    // Check energy
    if (predator.energy < this.config.minEnergyToHunt) {
      return false;
    }

    // Check cooldown
    const cooldownEnd = this.huntCooldowns.get(predator.id);
    if (cooldownEnd !== undefined && tick < cooldownEnd) {
      return false;
    }

    return true;
  }

  /**
   * Check if prey is a valid target based on trophic relationships
   */
  isValidPrey(predator: TrophicAgent, prey: TrophicAgent): boolean {
    // Can't hunt same species (no cannibalism by default)
    if (predator.speciesId === prey.speciesId) {
      return false;
    }

    // Use trophic tracker to determine if this is a threat relationship
    return this.trophicTracker.isThreatTo(predator.speciesId, prey.speciesId);
  }

  /**
   * Calculate the probability of a successful hunt
   */
  calculateHuntSuccessChance(
    predator: TrophicAgent,
    prey: TrophicAgent,
    distance: number
  ): number {
    let successChance = this.config.baseHuntingSuccessRate;

    // Size advantage (larger predator = better hunter, but too large is wasteful)
    const predatorSize = predator.size ?? 1;
    const preySize = prey.size ?? 1;
    const sizeRatio = predatorSize / preySize;

    if (sizeRatio > 1) {
      // Predator is larger - advantage
      successChance += Math.min(0.3, (sizeRatio - 1) * this.config.sizeAdvantageMultiplier);
    } else {
      // Predator is smaller - disadvantage
      successChance -= Math.min(0.4, (1 - sizeRatio) * this.config.sizeAdvantageMultiplier * 2);
    }

    // Speed advantage (faster predator catches prey easier)
    const predatorSpeed = predator.speed ?? 1;
    const preySpeed = prey.speed ?? 1;
    const speedDiff = predatorSpeed - preySpeed;
    successChance += speedDiff * this.config.speedAdvantageMultiplier;

    // Strength advantage
    const predatorStrength = predator.strength ?? 1;
    const preyStrength = prey.strength ?? 1;
    if (predatorStrength > preyStrength) {
      successChance += 0.1;
    }

    // Distance penalty (further = harder)
    const distancePenalty = (distance / this.config.huntingRange) * 0.2;
    successChance -= distancePenalty;

    // Prey energy (weak prey easier to catch)
    const preyWeakness = 1 - Math.min(1, prey.energy / 50);
    successChance += preyWeakness * 0.1;

    // Clamp to valid probability
    return Math.max(0.05, Math.min(0.95, successChance));
  }

  /**
   * Attempt to hunt a prey target
   */
  attemptHunt(
    predator: TrophicAgent,
    prey: TrophicAgent,
    tick: number
  ): HuntResult {
    this.stats.totalHuntsAttempted++;

    // Check energy first (more specific reason)
    if (predator.energy < this.config.minEnergyToHunt ||
        predator.energy < this.config.huntingEnergyCost) {
      return {
        success: false,
        reason: 'insufficient_energy',
        energySpent: 0,
      };
    }

    // Check cooldown
    const cooldownEnd = this.huntCooldowns.get(predator.id);
    if (cooldownEnd !== undefined && tick < cooldownEnd) {
      return {
        success: false,
        reason: 'cooldown',
        energySpent: 0,
      };
    }

    const distance = this.calculateDistance(predator.position, prey.position);
    if (distance > this.config.huntingRange) {
      return {
        success: false,
        reason: 'out_of_range',
        energySpent: 0,
      };
    }

    if (!prey.isAlive) {
      return {
        success: false,
        reason: 'invalid_target',
        energySpent: 0,
      };
    }

    // Apply cooldown
    this.huntCooldowns.set(predator.id, tick + this.config.huntingCooldown);

    // Energy cost is always paid
    const energySpent = this.config.huntingEnergyCost;

    // Calculate success
    const successChance = this.calculateHuntSuccessChance(predator, prey, distance);
    const success = Math.random() < successChance;

    // Record the interaction
    const interaction: TrophicInteraction = {
      tick,
      predatorId: predator.id,
      predatorSpeciesId: predator.speciesId,
      preyId: prey.id,
      preySpeciesId: prey.speciesId,
      success,
      energyTransferred: 0,
      interactionType: 'hunt',
    };

    if (!success) {
      this.trophicTracker.recordHuntInteraction(interaction);
      return {
        success: false,
        reason: 'prey_escaped',
        energySpent,
      };
    }

    // Hunt successful - calculate energy transfer
    const energyGained = prey.energy * this.config.energyTransferRatio;
    interaction.energyTransferred = energyGained;

    this.trophicTracker.recordHuntInteraction(interaction);

    // Update stats
    this.stats.totalHuntsSuccessful++;
    this.stats.totalEnergyTransferred += energyGained;
    this.stats.averageSuccessRate =
      this.stats.totalHuntsSuccessful / this.stats.totalHuntsAttempted;

    // Determine if prey is killed
    const preyKilled = prey.energy <= energyGained / this.config.energyTransferRatio;
    if (preyKilled) {
      this.stats.totalPreyKilled++;
    }

    return {
      success: true,
      reason: 'success',
      energyGained,
      energySpent,
      preyKilled,
    };
  }

  /**
   * Process a hunt action and apply effects to agents
   * Returns the energy change for predator (positive) and prey (negative/death)
   */
  processHunt(
    predator: TrophicAgent,
    prey: TrophicAgent,
    tick: number
  ): { predatorEnergyChange: number; preyEnergyChange: number; preyKilled: boolean } {
    const result = this.attemptHunt(predator, prey, tick);

    const predatorEnergyChange = (result.energyGained ?? 0) - result.energySpent;
    let preyEnergyChange = 0;
    let preyKilled = false;

    if (result.success && result.energyGained) {
      // Prey loses what predator gained (before transfer ratio)
      preyEnergyChange = -result.energyGained / this.config.energyTransferRatio;
      preyKilled = result.preyKilled ?? false;
    }

    return {
      predatorEnergyChange,
      preyEnergyChange,
      preyKilled,
    };
  }

  /**
   * Get the best hunting target for an agent
   */
  getBestTarget(
    predator: TrophicAgent,
    spatialHash: SpatialHash<TrophicAgent>,
    tick: number
  ): HuntingTarget | null {
    const targets = this.findPotentialPrey(predator, spatialHash, tick);
    return targets.length > 0 ? targets[0] : null;
  }

  /**
   * Calculate direction to prey from predator
   */
  calculateHuntingDirection(
    predator: TrophicAgent,
    prey: TrophicAgent
  ): number {
    const dx = prey.position.x - predator.position.x;
    const dy = prey.position.y - predator.position.y;
    return Math.atan2(dy, dx);
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number }
  ): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Clear cooldown for an agent (e.g., on death)
   */
  clearCooldown(agentId: string): void {
    this.huntCooldowns.delete(agentId);
  }

  /**
   * Clear all cooldowns
   */
  clearAllCooldowns(): void {
    this.huntCooldowns.clear();
  }

  /**
   * Get remaining cooldown ticks for an agent
   */
  getCooldownRemaining(agentId: string, currentTick: number): number {
    const cooldownEnd = this.huntCooldowns.get(agentId);
    if (cooldownEnd === undefined) return 0;
    return Math.max(0, cooldownEnd - currentTick);
  }

  /**
   * Get hunting statistics
   */
  getStats(): HuntingSystemStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalHuntsAttempted: 0,
      totalHuntsSuccessful: 0,
      totalEnergyTransferred: 0,
      totalPreyKilled: 0,
      averageSuccessRate: 0,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): HuntingSystemConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HuntingSystemConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.huntCooldowns.clear();
    this.resetStats();
  }
}

export default HuntingSystem;
