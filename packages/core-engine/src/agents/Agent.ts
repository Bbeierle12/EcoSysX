/**
 * Agent.ts - Core agent class for the simulation
 */

import { Brain, SensoryInput, BrainOutput } from '../neural/Brain';
import { Genome } from '../genetics/Genome';
import { Action, Actions, ActionResult } from './Action';

export interface Position {
  x: number;
  y: number;
}

export interface AgentConfig {
  maxEnergy: number;
  maxSpeed: number;
  rotationSpeed: number;
  sensorRange: number;
  energyCostPerTick: number;
  energyCostMove: number;
  energyCostRotate: number;
  energyCostReproduce: number;
  reproductionThreshold: number;
  matureAge: number;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxEnergy: 100,
  maxSpeed: 2,
  rotationSpeed: Math.PI / 4,
  sensorRange: 100,
  energyCostPerTick: 0.1,
  energyCostMove: 0.5,
  energyCostRotate: 0.1,
  energyCostReproduce: 30,
  reproductionThreshold: 60,
  matureAge: 100,
};

export interface AgentStats {
  totalDistance: number;
  foodEaten: number;
  offspringProduced: number;
  ticksAlive: number;
}

export interface AgentState {
  id: string;
  speciesId: string;
  position: Position;
  rotation: number;
  energy: number;
  age: number;
  generation: number;
  lineageId: string;
}

export class Agent {
  readonly id: string;
  readonly speciesId: string;
  readonly lineageId: string;
  readonly generation: number;

  position: Position;
  rotation: number;
  energy: number;
  age: number;

  brain: Brain;
  genome: Genome;

  private config: AgentConfig;
  private isAlive: boolean;
  private stats: AgentStats;

  onDeath?: (agent: Agent) => void;
  onReproduce?: (parent: Agent, offspring: Agent) => void;

  constructor(
    id: string,
    speciesId: string,
    position: Position,
    rotation: number,
    energy: number,
    brain: Brain,
    genome: Genome,
    generation: number,
    lineageId: string,
    config?: Partial<AgentConfig>
  ) {
    this.id = id;
    this.speciesId = speciesId;
    this.position = { ...position };
    this.rotation = rotation;
    this.energy = energy;
    this.brain = brain;
    this.genome = genome;
    this.generation = generation;
    this.lineageId = lineageId;
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };

    this.age = 0;
    this.isAlive = true;
    this.stats = {
      totalDistance: 0,
      foodEaten: 0,
      offspringProduced: 0,
      ticksAlive: 0,
    };
  }

  update(sensoryInput: SensoryInput, deltaTime: number = 1): Action[] {
    if (!this.isAlive) return [];

    this.age++;
    this.stats.ticksAlive++;
    this.energy -= this.config.energyCostPerTick * deltaTime;

    if (this.energy <= 0) {
      this.die();
      return [];
    }

    const brainOutput = this.brain.think(sensoryInput);
    return this.interpretBrainOutput(brainOutput);
  }

  private interpretBrainOutput(output: BrainOutput): Action[] {
    const actions: Action[] = [];

    // Move forward based on moveForward output
    if (output.moveForward > 0.1) {
      actions.push(Actions.move(output.moveForward));
    }

    // Rotate based on rotate output (positive = left, negative = right)
    if (Math.abs(output.rotate) > 0.1) {
      actions.push(Actions.rotate(output.rotate * this.config.rotationSpeed));
    }

    // Action output: 0 = none, 1 = eat, 2 = reproduce
    if (output.action > 0.5 && output.action < 1.5) {
      actions.push(Actions.eat());
    } else if (output.action >= 1.5) {
      actions.push(Actions.reproduce());
    }

    if (actions.length === 0) {
      actions.push(Actions.idle());
    }

    return actions;
  }

  executeMove(speed: number, worldWidth: number, worldHeight: number): ActionResult {
    const actualSpeed = speed * this.config.maxSpeed;
    const dx = Math.cos(this.rotation) * actualSpeed;
    const dy = Math.sin(this.rotation) * actualSpeed;

    this.position.x = ((this.position.x + dx) % worldWidth + worldWidth) % worldWidth;
    this.position.y = ((this.position.y + dy) % worldHeight + worldHeight) % worldHeight;

    const distanceMoved = Math.sqrt(dx * dx + dy * dy);
    this.stats.totalDistance += distanceMoved;

    const energyCost = this.config.energyCostMove * speed;
    this.energy -= energyCost;

    return { success: true, energyCost };
  }

  executeRotate(angleDelta: number): ActionResult {
    const maxRotation = this.config.rotationSpeed;
    const clampedDelta = Math.max(-maxRotation, Math.min(maxRotation, angleDelta));

    this.rotation = (this.rotation + clampedDelta) % (2 * Math.PI);
    if (this.rotation < 0) this.rotation += 2 * Math.PI;

    const energyCost = this.config.energyCostRotate * Math.abs(clampedDelta);
    this.energy -= energyCost;

    return { success: true, energyCost };
  }

  executeEat(energyGained: number): ActionResult {
    this.energy = Math.min(this.config.maxEnergy, this.energy + energyGained);
    this.stats.foodEaten++;
    return { success: true, energyCost: 0 };
  }

  canReproduce(): boolean {
    return (
      this.isAlive &&
      this.age >= this.config.matureAge &&
      this.energy >= this.config.reproductionThreshold
    );
  }

  reproduce(mate?: Agent): Agent | null {
    if (!this.canReproduce()) return null;

    let offspringGenome: Genome;
    if (mate && mate.genome) {
      offspringGenome = this.genome.crossover(mate.genome);
    } else {
      offspringGenome = this.genome.reproduce();
    }

    // Clone and mutate brain - mutate returns a new brain instance
    const offspringBrain = this.brain.clone().mutate(0.1, 0.2);

    const offspringId = `${this.id}_offspring_${Date.now()}`;
    const offsetAngle = Math.random() * 2 * Math.PI;
    const offsetDistance = this.config.maxSpeed * 2;
    const offspringPosition: Position = {
      x: this.position.x + Math.cos(offsetAngle) * offsetDistance,
      y: this.position.y + Math.sin(offsetAngle) * offsetDistance,
    };

    const offspring = new Agent(
      offspringId,
      this.speciesId,
      offspringPosition,
      Math.random() * 2 * Math.PI,
      this.config.maxEnergy * 0.5,
      offspringBrain,
      offspringGenome,
      this.generation + 1,
      this.lineageId,
      this.config
    );

    this.energy -= this.config.energyCostReproduce;
    this.stats.offspringProduced++;

    this.onReproduce?.(this, offspring);

    return offspring;
  }

  die(): void {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.energy = 0;
    this.onDeath?.(this);
  }

  alive(): boolean {
    return this.isAlive;
  }

  getStats(): Readonly<AgentStats> {
    return { ...this.stats };
  }

  restoreStats(stats: Partial<AgentStats>): void {
    if (stats.totalDistance !== undefined) this.stats.totalDistance = stats.totalDistance;
    if (stats.foodEaten !== undefined) this.stats.foodEaten = stats.foodEaten;
    if (stats.offspringProduced !== undefined) this.stats.offspringProduced = stats.offspringProduced;
    if (stats.ticksAlive !== undefined) this.stats.ticksAlive = stats.ticksAlive;
  }

  getConfig(): Readonly<AgentConfig> {
    return { ...this.config };
  }

  toJSON(): AgentState {
    return {
      id: this.id,
      speciesId: this.speciesId,
      position: { ...this.position },
      rotation: this.rotation,
      energy: this.energy,
      age: this.age,
      generation: this.generation,
      lineageId: this.lineageId,
    };
  }
}
