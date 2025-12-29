/**
 * TrophicRoleTracker.ts - Tracks and determines emergent trophic roles
 *
 * Observes agent behavior (hunting success, food consumption) to determine
 * ecological roles emergently rather than by pre-assignment.
 */

import {
  EmergentRole,
  TrophicProfile,
  TrophicInteraction,
  TrophicConfig,
  DEFAULT_TROPHIC_CONFIG,
  DEFAULT_TROPHIC_PROFILE,
  SpeciesTrophicStats,
  TrophicTrackerStats,
} from './types';

// ============================================================================
// TrophicRoleTracker Class
// ============================================================================

export class TrophicRoleTracker {
  private speciesProfiles: Map<string, TrophicProfile>;
  private interactionHistory: TrophicInteraction[];
  private maxHistorySize: number;
  private config: TrophicConfig;

  constructor(config?: Partial<TrophicConfig>, maxHistorySize: number = 1000) {
    this.config = { ...DEFAULT_TROPHIC_CONFIG, ...config };
    this.speciesProfiles = new Map();
    this.interactionHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Get or create profile for a species
   */
  getOrCreateProfile(speciesId: string): TrophicProfile {
    if (!this.speciesProfiles.has(speciesId)) {
      this.speciesProfiles.set(speciesId, {
        ...DEFAULT_TROPHIC_PROFILE,
        preySpeciesIds: new Set(),
        predatorSpeciesIds: new Set(),
      });
    }
    return this.speciesProfiles.get(speciesId)!;
  }

  /**
   * Record a hunting interaction
   */
  recordHuntInteraction(interaction: TrophicInteraction): void {
    // Add to history
    this.interactionHistory.push(interaction);
    if (this.interactionHistory.length > this.maxHistorySize) {
      this.interactionHistory.shift();
    }

    // Update predator profile
    const predatorProfile = this.getOrCreateProfile(interaction.predatorSpeciesId);
    predatorProfile.huntingAttempts++;
    if (interaction.success) {
      predatorProfile.huntingSuccesses++;
      predatorProfile.agentsConsumed++;
      predatorProfile.preySpeciesIds.add(interaction.preySpeciesId);
    }
    predatorProfile.huntingSuccessRate =
      predatorProfile.huntingAttempts > 0
        ? predatorProfile.huntingSuccesses / predatorProfile.huntingAttempts
        : 0;

    // Update prey profile
    const preyProfile = this.getOrCreateProfile(interaction.preySpeciesId);
    if (interaction.success) {
      preyProfile.predatorSpeciesIds.add(interaction.predatorSpeciesId);
    }
  }

  /**
   * Record food consumption (non-agent eating)
   */
  recordFoodConsumption(speciesId: string, amount: number = 1): void {
    const profile = this.getOrCreateProfile(speciesId);
    profile.foodConsumed += amount;
  }

  /**
   * Determine role for a species based on observed behavior
   */
  determineRole(speciesId: string): EmergentRole {
    const profile = this.getOrCreateProfile(speciesId);

    // Need minimum interactions to determine role
    const totalInteractions = profile.huntingAttempts + profile.foodConsumed;
    if (totalInteractions < this.config.minInteractionsForRole) {
      return EmergentRole.UNDETERMINED;
    }

    const huntsAnimals = profile.preySpeciesIds.size > 0;
    const eatsFood = profile.foodConsumed > 0;
    const hasNoPredators = profile.predatorSpeciesIds.size === 0;
    const highHuntingSuccess = profile.huntingSuccessRate > 0.5;

    // Apex predator: hunts, no predators, high success
    if (huntsAnimals && hasNoPredators && highHuntingSuccess && profile.agentsConsumed > 5) {
      return EmergentRole.APEX_PREDATOR;
    }

    // Omnivore: eats both
    if (huntsAnimals && eatsFood) {
      const huntRatio = profile.agentsConsumed / (profile.agentsConsumed + profile.foodConsumed);
      if (huntRatio > 0.7) {
        return EmergentRole.CARNIVORE;
      } else if (huntRatio < 0.3) {
        return EmergentRole.HERBIVORE;
      }
      return EmergentRole.OMNIVORE;
    }

    // Carnivore: only hunts
    if (huntsAnimals && !eatsFood) {
      return EmergentRole.CARNIVORE;
    }

    // Herbivore: only eats food
    if (eatsFood && !huntsAnimals) {
      return EmergentRole.HERBIVORE;
    }

    return EmergentRole.UNDETERMINED;
  }

  /**
   * Update role and confidence for all species
   */
  updateRoles(tick: number): void {
    if (tick % this.config.roleUpdateInterval !== 0) {
      return;
    }

    for (const [speciesId, profile] of this.speciesProfiles) {
      const newRole = this.determineRole(speciesId);

      // Calculate confidence based on consistency and sample size
      const totalInteractions = profile.huntingAttempts + profile.foodConsumed;
      const sampleConfidence = Math.min(1, totalInteractions / 20);

      // Role consistency confidence
      let roleConfidence = 0;
      if (newRole !== EmergentRole.UNDETERMINED) {
        switch (newRole) {
          case EmergentRole.CARNIVORE:
            roleConfidence = profile.agentsConsumed > 0
              ? profile.agentsConsumed / (profile.agentsConsumed + profile.foodConsumed + 1)
              : 0;
            break;
          case EmergentRole.HERBIVORE:
            roleConfidence = profile.foodConsumed > 0
              ? profile.foodConsumed / (profile.agentsConsumed + profile.foodConsumed + 1)
              : 0;
            break;
          case EmergentRole.APEX_PREDATOR:
            roleConfidence = profile.huntingSuccessRate *
              (profile.predatorSpeciesIds.size === 0 ? 1 : 0.5);
            break;
          case EmergentRole.OMNIVORE:
            roleConfidence = 0.5 + Math.min(0.5,
              Math.min(profile.agentsConsumed, profile.foodConsumed) / 10
            );
            break;
          default:
            roleConfidence = 0.5;
        }
      }

      profile.role = newRole;
      profile.confidence = sampleConfidence * roleConfidence;
      profile.lastRoleUpdateTick = tick;
    }
  }

  /**
   * Check if speciesA is a predator of speciesB
   */
  isPredatorOf(predatorSpeciesId: string, preySpeciesId: string): boolean {
    const predatorProfile = this.speciesProfiles.get(predatorSpeciesId);
    return predatorProfile?.preySpeciesIds.has(preySpeciesId) ?? false;
  }

  /**
   * Check if speciesA is prey of speciesB
   */
  isPreyOf(preySpeciesId: string, predatorSpeciesId: string): boolean {
    const preyProfile = this.speciesProfiles.get(preySpeciesId);
    return preyProfile?.predatorSpeciesIds.has(predatorSpeciesId) ?? false;
  }

  /**
   * Get role for a species
   */
  getRole(speciesId: string): EmergentRole {
    return this.speciesProfiles.get(speciesId)?.role ?? EmergentRole.UNDETERMINED;
  }

  /**
   * Get profile for a species
   */
  getProfile(speciesId: string): TrophicProfile | undefined {
    return this.speciesProfiles.get(speciesId);
  }

  /**
   * Check if agent should be considered a threat to another
   */
  isThreatTo(potentialPredatorSpeciesId: string, potentialPreySpeciesId: string): boolean {
    const predatorRole = this.getRole(potentialPredatorSpeciesId);
    const preyRole = this.getRole(potentialPreySpeciesId);

    // Known predator relationship
    if (this.isPredatorOf(potentialPredatorSpeciesId, potentialPreySpeciesId)) {
      return true;
    }

    // Role-based threat assessment
    if (predatorRole === EmergentRole.CARNIVORE ||
        predatorRole === EmergentRole.APEX_PREDATOR) {
      if (preyRole === EmergentRole.HERBIVORE ||
          preyRole === EmergentRole.UNDETERMINED) {
        return true;
      }
    }

    if (predatorRole === EmergentRole.OMNIVORE) {
      if (preyRole === EmergentRole.HERBIVORE) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if agent should be considered prey to another
   */
  isOpportunityFor(potentialPredatorSpeciesId: string, potentialPreySpeciesId: string): boolean {
    return this.isThreatTo(potentialPredatorSpeciesId, potentialPreySpeciesId);
  }

  /**
   * Calculate threat level for an agent from nearby agents
   */
  calculateThreatLevel(
    agentSpeciesId: string,
    nearbyAgents: Array<{ speciesId: string; distance: number; size?: number }>
  ): number {
    let totalThreat = 0;

    for (const nearby of nearbyAgents) {
      if (this.isThreatTo(nearby.speciesId, agentSpeciesId)) {
        // Closer = more threat, larger = more threat
        const distanceFactor = 1 / (1 + nearby.distance * 0.1);
        const sizeFactor = nearby.size ? Math.min(2, nearby.size) : 1;
        totalThreat += distanceFactor * sizeFactor;
      }
    }

    return Math.min(1, totalThreat);
  }

  /**
   * Calculate opportunity level for an agent (potential prey nearby)
   */
  calculateOpportunityLevel(
    agentSpeciesId: string,
    nearbyAgents: Array<{ speciesId: string; distance: number; size?: number; energy?: number }>
  ): number {
    let totalOpportunity = 0;
    const agentRole = this.getRole(agentSpeciesId);

    // Herbivores don't hunt
    if (agentRole === EmergentRole.HERBIVORE) {
      return 0;
    }

    for (const nearby of nearbyAgents) {
      if (this.isOpportunityFor(agentSpeciesId, nearby.speciesId)) {
        const distanceFactor = 1 / (1 + nearby.distance * 0.1);
        const energyFactor = nearby.energy ? Math.min(1, nearby.energy / 50) : 0.5;
        totalOpportunity += distanceFactor * energyFactor;
      }
    }

    return Math.min(1, totalOpportunity);
  }

  /**
   * Get statistics for a species
   */
  getSpeciesStats(speciesId: string): SpeciesTrophicStats | undefined {
    const profile = this.speciesProfiles.get(speciesId);
    if (!profile) return undefined;

    return {
      speciesId,
      profile,
      totalMembers: 0, // Would need population data
      averageHuntingSuccess: profile.huntingSuccessRate,
      dominantRole: profile.role,
      roleHistory: [], // Could track over time
    };
  }

  /**
   * Get overall tracker statistics
   */
  getStats(): TrophicTrackerStats {
    const roleDistribution: Record<EmergentRole, number> = {
      [EmergentRole.UNDETERMINED]: 0,
      [EmergentRole.PRODUCER]: 0,
      [EmergentRole.HERBIVORE]: 0,
      [EmergentRole.CARNIVORE]: 0,
      [EmergentRole.OMNIVORE]: 0,
      [EmergentRole.APEX_PREDATOR]: 0,
      [EmergentRole.SCAVENGER]: 0,
    };

    for (const profile of this.speciesProfiles.values()) {
      roleDistribution[profile.role]++;
    }

    // Calculate food web density
    let totalConnections = 0;
    for (const profile of this.speciesProfiles.values()) {
      totalConnections += profile.preySpeciesIds.size;
    }
    const n = this.speciesProfiles.size;
    const possibleConnections = n * (n - 1);
    const foodWebDensity = possibleConnections > 0
      ? totalConnections / possibleConnections
      : 0;

    return {
      totalSpecies: this.speciesProfiles.size,
      roleDistribution,
      totalInteractions: this.interactionHistory.length,
      recentInteractions: this.interactionHistory.slice(-10),
      foodWebDensity,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.speciesProfiles.clear();
    this.interactionHistory = [];
  }

  /**
   * Get configuration
   */
  getConfig(): TrophicConfig {
    return { ...this.config };
  }

  /**
   * Export state for serialization
   */
  toJSON(): object {
    const profiles: Array<{
      speciesId: string;
      profile: Omit<TrophicProfile, 'preySpeciesIds' | 'predatorSpeciesIds'> & {
        preySpeciesIds: string[];
        predatorSpeciesIds: string[];
      };
    }> = [];

    for (const [speciesId, profile] of this.speciesProfiles) {
      profiles.push({
        speciesId,
        profile: {
          ...profile,
          preySpeciesIds: Array.from(profile.preySpeciesIds),
          predatorSpeciesIds: Array.from(profile.predatorSpeciesIds),
        },
      });
    }

    return {
      config: this.config,
      profiles,
      recentInteractions: this.interactionHistory.slice(-100),
    };
  }
}

export default TrophicRoleTracker;
