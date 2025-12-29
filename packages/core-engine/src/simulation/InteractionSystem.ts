/**
 * InteractionSystem.ts - Collision and interaction detection
 *
 * Handles interactions between agents, food, and the environment.
 */

import { Agent, Position } from '../agents/Agent';
import { Action, ActionType } from '../agents/Action';
import { Food, FoodManager } from './Food';
import { AgentManager } from './AgentManager';

export interface InteractionConfig {
  eatRadius: number;
  mateRadius: number;
  collisionRadius: number;
  enableCollisions: boolean;
  enableFeeding: boolean;
  enableMating: boolean;
}

export const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  eatRadius: 10,
  mateRadius: 15,
  collisionRadius: 5,
  enableCollisions: true,
  enableFeeding: true,
  enableMating: true,
};

export interface InteractionResult {
  type: 'eat' | 'reproduce' | 'collision';
  agentId: string;
  targetId?: string;
  success: boolean;
  energyChange?: number;
  offspring?: Agent;
}

export class InteractionSystem {
  private config: InteractionConfig;
  private worldWidth: number;
  private worldHeight: number;

  private stats = {
    totalEatAttempts: 0,
    successfulEats: 0,
    totalMateAttempts: 0,
    successfulMates: 0,
    collisionsDetected: 0,
  };

  constructor(
    worldWidth: number,
    worldHeight: number,
    config?: Partial<InteractionConfig>
  ) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.config = { ...DEFAULT_INTERACTION_CONFIG, ...config };
  }

  processActions(
    agent: Agent,
    actions: Action[],
    agentManager: AgentManager,
    foodManager: FoodManager,
    currentTick: number
  ): InteractionResult[] {
    const results: InteractionResult[] = [];

    for (const action of actions) {
      switch (action.type) {
        case ActionType.MOVE:
          agent.executeMove(action.speed, this.worldWidth, this.worldHeight);
          break;

        case ActionType.ROTATE:
          agent.executeRotate(action.angleDelta);
          break;

        case ActionType.EAT:
          if (this.config.enableFeeding) {
            const eatResult = this.processEat(agent, foodManager, currentTick, action.targetId);
            if (eatResult) results.push(eatResult);
          }
          break;

        case ActionType.REPRODUCE:
          if (this.config.enableMating) {
            const reproduceResult = this.processReproduce(agent, agentManager, action.mateId);
            if (reproduceResult) results.push(reproduceResult);
          }
          break;

        case ActionType.IDLE:
          // No action needed
          break;
      }
    }

    return results;
  }

  private processEat(
    agent: Agent,
    foodManager: FoodManager,
    currentTick: number,
    targetId?: string
  ): InteractionResult | null {
    this.stats.totalEatAttempts++;

    // Find food to eat
    let food: Food | null = null;

    if (targetId) {
      food = foodManager.getFood(targetId) ?? null;
      if (food && food.isConsumed) food = null;
      if (food && !this.isInRange(agent.position, food.position, this.config.eatRadius)) {
        food = null;
      }
    }

    if (!food) {
      food = foodManager.getClosestFood(agent.position.x, agent.position.y, this.config.eatRadius);
    }

    if (!food) {
      return {
        type: 'eat',
        agentId: agent.id,
        success: false,
      };
    }

    const energyGained = foodManager.consumeFood(food.id, currentTick);
    if (energyGained > 0) {
      agent.executeEat(energyGained);
      this.stats.successfulEats++;
      return {
        type: 'eat',
        agentId: agent.id,
        targetId: food.id,
        success: true,
        energyChange: energyGained,
      };
    }

    return {
      type: 'eat',
      agentId: agent.id,
      targetId: food.id,
      success: false,
    };
  }

  private processReproduce(
    agent: Agent,
    agentManager: AgentManager,
    mateId?: string
  ): InteractionResult | null {
    this.stats.totalMateAttempts++;

    if (!agent.canReproduce()) {
      return {
        type: 'reproduce',
        agentId: agent.id,
        success: false,
      };
    }

    // Find mate if specified or nearby
    let mate: Agent | undefined = undefined;

    if (mateId) {
      const potentialMate = agentManager.getAgent(mateId);
      if (
        potentialMate &&
        potentialMate.alive() &&
        this.isInRange(agent.position, potentialMate.position, this.config.mateRadius)
      ) {
        mate = potentialMate;
      }
    }

    if (!mate) {
      const nearbyAgents = agentManager.getAgentsNear(
        agent.position.x,
        agent.position.y,
        this.config.mateRadius
      );
      for (const nearby of nearbyAgents) {
        if (nearby.id !== agent.id && nearby.alive()) {
          mate = nearby;
          break;
        }
      }
    }

    // Reproduce (with or without mate)
    const offspring = agent.reproduce(mate);

    if (offspring) {
      this.stats.successfulMates++;
      return {
        type: 'reproduce',
        agentId: agent.id,
        targetId: mate?.id,
        success: true,
        offspring,
      };
    }

    return {
      type: 'reproduce',
      agentId: agent.id,
      success: false,
    };
  }

  detectCollisions(agents: Agent[]): { agent1: Agent; agent2: Agent }[] {
    if (!this.config.enableCollisions) return [];

    const collisions: { agent1: Agent; agent2: Agent }[] = [];
    const aliveAgents = agents.filter(a => a.alive());

    for (let i = 0; i < aliveAgents.length; i++) {
      for (let j = i + 1; j < aliveAgents.length; j++) {
        const a1 = aliveAgents[i];
        const a2 = aliveAgents[j];

        if (this.isInRange(a1.position, a2.position, this.config.collisionRadius)) {
          collisions.push({ agent1: a1, agent2: a2 });
          this.stats.collisionsDetected++;
        }
      }
    }

    return collisions;
  }

  private isInRange(pos1: Position, pos2: { x: number; y: number }, radius: number): boolean {
    const dx = this.wrapDistance(pos1.x - pos2.x, this.worldWidth);
    const dy = this.wrapDistance(pos1.y - pos2.y, this.worldHeight);
    return dx * dx + dy * dy <= radius * radius;
  }

  private wrapDistance(diff: number, size: number): number {
    // Handle toroidal world wrapping
    if (diff > size / 2) return diff - size;
    if (diff < -size / 2) return diff + size;
    return diff;
  }

  getDistance(pos1: Position, pos2: Position): number {
    const dx = this.wrapDistance(pos1.x - pos2.x, this.worldWidth);
    const dy = this.wrapDistance(pos1.y - pos2.y, this.worldHeight);
    return Math.sqrt(dx * dx + dy * dy);
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalEatAttempts: 0,
      successfulEats: 0,
      totalMateAttempts: 0,
      successfulMates: 0,
      collisionsDetected: 0,
    };
  }

  getConfig(): InteractionConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<InteractionConfig>): void {
    Object.assign(this.config, config);
  }
}
