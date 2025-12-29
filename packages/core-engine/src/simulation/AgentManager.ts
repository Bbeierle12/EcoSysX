/**
 * AgentManager.ts - Agent population management
 *
 * Handles spawning, updating, and removing agents from the simulation.
 */

import { Agent, Position, AgentConfig, DEFAULT_AGENT_CONFIG } from '../agents/Agent';
import { Brain } from '../neural/Brain';
import { NeuralBrain } from '../neural/NeuralBrain';
import { Genome } from '../genetics/Genome';
import { LineageRegistry } from '../lineage/Lineage';

export interface AgentManagerConfig {
  initialPopulation: number;
  maxPopulation: number;
  minPopulation: number;
  autoRespawn: boolean;
  respawnDelay: number;
  agentConfig: AgentConfig;
  brainType: string;
  genomeSize: number;
  networkLayers: number[];
}

export const DEFAULT_AGENT_MANAGER_CONFIG: AgentManagerConfig = {
  initialPopulation: 20,
  maxPopulation: 200,
  minPopulation: 5,
  autoRespawn: true,
  respawnDelay: 50,
  agentConfig: DEFAULT_AGENT_CONFIG,
  brainType: 'neural',
  genomeSize: 100,
  networkLayers: [7, 12, 3],
};

export interface SpawnOptions {
  position?: Position;
  brain?: Brain;
  genome?: Genome;
  speciesId?: string;
  lineageId?: string;
  generation?: number;
  energy?: number;
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private deadAgents: Map<string, { agent: Agent; diedAt: number }> = new Map();
  private config: AgentManagerConfig;
  private worldWidth: number;
  private worldHeight: number;
  private idCounter: number = 0;
  private lineageTracker?: LineageRegistry;

  private stats = {
    totalSpawned: 0,
    totalDied: 0,
    totalReproduced: 0,
    oldestGeneration: 0,
    maxGenerationReached: 0,
  };

  onAgentDeath?: (agent: Agent) => void;
  onAgentSpawn?: (agent: Agent) => void;
  onAgentReproduce?: (parent: Agent, offspring: Agent) => void;

  constructor(
    worldWidth: number,
    worldHeight: number,
    config?: Partial<AgentManagerConfig>,
    lineageRegistry?: LineageRegistry
  ) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.config = { ...DEFAULT_AGENT_MANAGER_CONFIG, ...config };
    this.lineageTracker = lineageRegistry;
  }

  initialize(): void {
    this.agents.clear();
    this.deadAgents.clear();
    this.idCounter = 0;
    this.stats = {
      totalSpawned: 0,
      totalDied: 0,
      totalReproduced: 0,
      oldestGeneration: 0,
      maxGenerationReached: 0,
    };

    // Spawn initial population
    for (let i = 0; i < this.config.initialPopulation; i++) {
      this.spawnAgent();
    }
  }

  spawnAgent(options: SpawnOptions = {}): Agent | null {
    if (this.agents.size >= this.config.maxPopulation) {
      return null;
    }

    const id = `agent_${this.idCounter++}`;
    const position = options.position ?? this.getRandomPosition();
    const rotation = Math.random() * Math.PI * 2;
    const energy = options.energy ?? this.config.agentConfig.maxEnergy * 0.7;

    // Create brain
    const brain = options.brain ?? this.createDefaultBrain();

    // Create genome
    const genome = options.genome ?? Genome.forNeuralNetwork(this.config.networkLayers);

    // Determine species and lineage
    const speciesId = options.speciesId ?? 'species_0';
    const lineageId = options.lineageId ?? `lineage_${id}`;
    const generation = options.generation ?? 0;

    const agent = new Agent(
      id,
      speciesId,
      position,
      rotation,
      energy,
      brain,
      genome,
      generation,
      lineageId,
      this.config.agentConfig
    );

    // Set up callbacks
    agent.onDeath = (a) => this.handleAgentDeath(a);
    agent.onReproduce = (parent, offspring) => this.handleAgentReproduce(parent, offspring);

    this.agents.set(id, agent);
    this.stats.totalSpawned++;

    if (generation > this.stats.maxGenerationReached) {
      this.stats.maxGenerationReached = generation;
    }

    this.onAgentSpawn?.(agent);
    return agent;
  }

  private createDefaultBrain(): Brain {
    const [inputSize, ...rest] = this.config.networkLayers;
    const outputSize = rest[rest.length - 1];
    const hiddenSize = rest.length > 1 ? rest[0] : inputSize;

    return new NeuralBrain({
      inputSize,
      hiddenSize,
      outputSize,
      mutationRate: 0.1,
      mutationStrength: 0.3,
    });
  }

  private getRandomPosition(): Position {
    return {
      x: Math.random() * this.worldWidth,
      y: Math.random() * this.worldHeight,
    };
  }

  private handleAgentDeath(agent: Agent): void {
    this.stats.totalDied++;
    this.deadAgents.set(agent.id, { agent, diedAt: Date.now() });
    this.onAgentDeath?.(agent);
  }

  private handleAgentReproduce(parent: Agent, offspring: Agent): void {
    this.stats.totalReproduced++;

    // Register offspring
    offspring.onDeath = (a) => this.handleAgentDeath(a);
    offspring.onReproduce = (p, o) => this.handleAgentReproduce(p, o);
    this.agents.set(offspring.id, offspring);
    this.stats.totalSpawned++;

    if (offspring.generation > this.stats.maxGenerationReached) {
      this.stats.maxGenerationReached = offspring.generation;
    }

    // Track in lineage registry
    if (this.lineageTracker) {
      this.lineageTracker.registerBirth(
        offspring.genome,
        parent.genome.id,
        0, // fitness
        0  // tick
      );
    }

    this.onAgentReproduce?.(parent, offspring);
    this.onAgentSpawn?.(offspring);
  }

  update(_currentTick: number): void {
    // Remove dead agents from main map
    const toRemove: string[] = [];
    for (const [id, agent] of this.agents) {
      if (!agent.alive()) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      this.agents.delete(id);
    }

    // Auto-respawn if population is too low
    if (this.config.autoRespawn && this.agents.size < this.config.minPopulation) {
      const toSpawn = this.config.minPopulation - this.agents.size;
      for (let i = 0; i < toSpawn; i++) {
        this.spawnAgent();
      }
    }

    // Clean up old dead agents
    const maxDeadAge = this.config.respawnDelay * 2;
    const now = Date.now();
    for (const [id, { diedAt }] of this.deadAgents) {
      if (now - diedAt > maxDeadAge) {
        this.deadAgents.delete(id);
      }
    }
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAliveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.alive());
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  getAliveCount(): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.alive()) count++;
    }
    return count;
  }

  getAgentsNear(x: number, y: number, radius: number): Agent[] {
    const result: Agent[] = [];
    const radiusSq = radius * radius;

    for (const agent of this.agents.values()) {
      if (!agent.alive()) continue;

      const dx = agent.position.x - x;
      const dy = agent.position.y - y;
      if (dx * dx + dy * dy <= radiusSq) {
        result.push(agent);
      }
    }

    return result;
  }

  getClosestAgent(x: number, y: number, excludeId?: string, maxRadius?: number): Agent | null {
    let closest: Agent | null = null;
    let closestDistSq = maxRadius ? maxRadius * maxRadius : Infinity;

    for (const agent of this.agents.values()) {
      if (!agent.alive()) continue;
      if (excludeId && agent.id === excludeId) continue;

      const dx = agent.position.x - x;
      const dy = agent.position.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < closestDistSq) {
        closest = agent;
        closestDistSq = distSq;
      }
    }

    return closest;
  }

  getAgentsBySpecies(speciesId: string): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.speciesId === speciesId);
  }

  getAgentsByLineage(lineageId: string): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.lineageId === lineageId);
  }

  killAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.die();
    return true;
  }

  removeAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (agent) {
      if (agent.alive()) agent.die();
      this.agents.delete(id);
      return true;
    }
    return false;
  }

  clear(): void {
    for (const agent of this.agents.values()) {
      if (agent.alive()) agent.die();
    }
    this.agents.clear();
    this.deadAgents.clear();
  }

  getStats() {
    // Calculate oldest generation among living agents
    let oldestGen = 0;
    for (const agent of this.agents.values()) {
      if (agent.alive() && agent.generation > oldestGen) {
        oldestGen = agent.generation;
      }
    }
    this.stats.oldestGeneration = oldestGen;

    return {
      ...this.stats,
      currentPopulation: this.agents.size,
      alivePopulation: this.getAliveCount(),
    };
  }

  getConfig(): AgentManagerConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<AgentManagerConfig>): void {
    Object.assign(this.config, config);
  }

  setLineageTracker(tracker: LineageRegistry): void {
    this.lineageTracker = tracker;
  }

  /**
   * Restore an agent directly with all properties (for loading saves)
   */
  restoreAgent(
    id: string,
    speciesId: string,
    lineageId: string,
    generation: number,
    position: Position,
    rotation: number,
    energy: number,
    age: number,
    brain: Brain,
    genome: Genome,
    stats?: { totalDistance: number; foodEaten: number; offspringProduced: number; ticksAlive: number }
  ): Agent | null {
    // Create the agent directly
    const agent = new Agent(
      id,
      speciesId,
      position,
      rotation,
      energy,
      brain,
      genome,
      generation,
      lineageId,
      this.config.agentConfig
    );

    // Restore age
    (agent as { age: number }).age = age;

    // Restore stats if provided
    if (stats) {
      agent.restoreStats(stats);
    }

    // Set up callbacks
    agent.onDeath = (a) => this.handleAgentDeath(a);
    agent.onReproduce = (parent, offspring) => this.handleAgentReproduce(parent, offspring);

    this.agents.set(id, agent);

    // Update id counter to avoid collisions
    const numPart = parseInt(id.replace('agent_', ''), 10);
    if (!isNaN(numPart) && numPart >= this.idCounter) {
      this.idCounter = numPart + 1;
    }

    if (generation > this.stats.maxGenerationReached) {
      this.stats.maxGenerationReached = generation;
    }

    return agent;
  }

  /**
   * Reset manager without triggering death callbacks (for loading)
   */
  clearForRestore(): void {
    this.agents.clear();
    this.deadAgents.clear();
    this.idCounter = 0;
    this.stats = {
      totalSpawned: 0,
      totalDied: 0,
      totalReproduced: 0,
      oldestGeneration: 0,
      maxGenerationReached: 0,
    };
  }

  /**
   * Restore statistics from a save file
   */
  restoreStats(stats: { totalSpawned?: number; totalDied?: number; totalReproduced?: number; maxGenerationReached?: number }): void {
    if (stats.totalSpawned !== undefined) this.stats.totalSpawned = stats.totalSpawned;
    if (stats.totalDied !== undefined) this.stats.totalDied = stats.totalDied;
    if (stats.totalReproduced !== undefined) this.stats.totalReproduced = stats.totalReproduced;
    if (stats.maxGenerationReached !== undefined) this.stats.maxGenerationReached = stats.maxGenerationReached;
  }
}
