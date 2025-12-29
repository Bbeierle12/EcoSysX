/**
 * Serialization.ts - Save and load simulation state
 *
 * Provides functionality to serialize simulations to JSON and restore them.
 */

import { SimulationEngine, SimulationConfig, SimulationCallbacks } from './SimulationEngine';
import { Agent } from '../agents/Agent';
import { Food, FoodState } from './Food';
import { NeuralBrain } from '../neural/NeuralBrain';
import { NeuralNetwork } from '../neural/NeuralNetwork';
import { Genome } from '../genetics/Genome';
import { VERSION } from '../index';

/**
 * Complete serialized simulation state
 */
export interface SerializedSimulation {
  version: string;
  timestamp: number;
  config: SimulationConfig;
  state: {
    tick: number;
    simulationTime: number;
  };
  agents: SerializedAgent[];
  food: SerializedFood[];
  statistics: {
    totalBirths: number;
    totalDeaths: number;
    totalFoodConsumed: number;
  };
}

export interface SerializedAgent {
  id: string;
  speciesId: string;
  lineageId: string;
  generation: number;
  position: { x: number; y: number };
  rotation: number;
  energy: number;
  age: number;
  genome: {
    id: string;
    genes: number[];
    generation: number;
  };
  brain: {
    type: string;
    networkWeights?: {
      inputToHidden: number[][];
      hiddenToOutput: number[][];
      hiddenBias: number[];
      outputBias: number[];
    };
  };
  stats: {
    totalDistance: number;
    foodEaten: number;
    offspringProduced: number;
    ticksAlive: number;
  };
}

export interface SerializedFood {
  id: string;
  x: number;
  y: number;
  energy: number;
  isConsumed: boolean;
  consumedAtTick?: number;
}

/**
 * Serialize a simulation to JSON-compatible object
 */
export function serializeSimulation(simulation: SimulationEngine): SerializedSimulation {
  const config = simulation.getConfig();
  const agentManager = simulation.getAgentManager();
  const foodManager = simulation.getFoodManager();
  const statistics = simulation.getStatistics();
  const summary = statistics.getSummary();

  return {
    version: VERSION,
    timestamp: Date.now(),
    config: {
      engine: config,
      agents: agentManager.getConfig(),
      food: foodManager.getConfig(),
      interaction: {},
      sensory: {},
      statistics: {},
    },
    state: {
      tick: simulation.getCurrentTick(),
      simulationTime: simulation.getSimulationTime(),
    },
    agents: agentManager.getAllAgents().map(serializeAgent),
    food: foodManager.getAllFood().map(serializeFood),
    statistics: {
      totalBirths: summary.totalBirths,
      totalDeaths: summary.totalDeaths,
      totalFoodConsumed: summary.totalFoodConsumed,
    },
  };
}

function serializeAgent(agent: Agent): SerializedAgent {
  const brainData: SerializedAgent['brain'] = {
    type: agent.brain.constructor.name,
  };

  // Try to extract neural network weights if available
  if ('getNetwork' in agent.brain && typeof agent.brain.getNetwork === 'function') {
    const network = (agent.brain as { getNetwork: () => NeuralNetwork }).getNetwork();
    brainData.networkWeights = network.getWeights();
  }

  return {
    id: agent.id,
    speciesId: agent.speciesId,
    lineageId: agent.lineageId,
    generation: agent.generation,
    position: { ...agent.position },
    rotation: agent.rotation,
    energy: agent.energy,
    age: agent.age,
    genome: {
      id: agent.genome.id,
      genes: Array.from(agent.genome.genes),
      generation: agent.genome.generation,
    },
    brain: brainData,
    stats: { ...agent.getStats() },
  };
}

function serializeFood(food: Food): SerializedFood {
  return {
    id: food.id,
    x: food.x,
    y: food.y,
    energy: food.energy,
    isConsumed: food.isConsumed,
  };
}

/**
 * Convert serialized simulation to JSON string
 */
export function simulationToJSON(simulation: SimulationEngine, pretty = false): string {
  const serialized = serializeSimulation(simulation);
  return pretty ? JSON.stringify(serialized, null, 2) : JSON.stringify(serialized);
}

/**
 * Parse JSON string to serialized simulation
 */
export function parseSimulationJSON(json: string): SerializedSimulation {
  const data = JSON.parse(json);

  // Validate basic structure
  if (!data.version || !data.config || !data.state) {
    throw new Error('Invalid simulation save file: missing required fields');
  }

  return data as SerializedSimulation;
}

/**
 * Create a downloadable save file
 */
export function createSaveFile(simulation: SimulationEngine): Blob {
  const json = simulationToJSON(simulation, true);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Generate a filename for the save
 */
export function generateSaveFilename(simulation: SimulationEngine): string {
  const tick = simulation.getCurrentTick();
  const date = new Date().toISOString().slice(0, 10);
  return `genesisx-save-${date}-tick${tick}.json`;
}

/**
 * Export simulation snapshot for analysis
 */
export interface ExportedSnapshot {
  tick: number;
  timestamp: number;
  population: number;
  foodCount: number;
  agents: {
    id: string;
    x: number;
    y: number;
    energy: number;
    generation: number;
    age: number;
  }[];
  food: {
    id: string;
    x: number;
    y: number;
    energy: number;
  }[];
}

export function exportSnapshot(simulation: SimulationEngine): ExportedSnapshot {
  const agentManager = simulation.getAgentManager();
  const foodManager = simulation.getFoodManager();

  return {
    tick: simulation.getCurrentTick(),
    timestamp: Date.now(),
    population: agentManager.getAliveAgents().length,
    foodCount: foodManager.getActiveFood().length,
    agents: agentManager.getAliveAgents().map((a) => ({
      id: a.id,
      x: a.position.x,
      y: a.position.y,
      energy: a.energy,
      generation: a.generation,
      age: a.age,
    })),
    food: foodManager.getActiveFood().map((f) => ({
      id: f.id,
      x: f.x,
      y: f.y,
      energy: f.energy,
    })),
  };
}

/**
 * Export statistics history as CSV
 */
export function exportStatisticsCSV(simulation: SimulationEngine): string {
  const statistics = simulation.getStatistics();
  const history = statistics.getHistory();

  if (history.length === 0) {
    return 'tick,population,foodCount,births,deaths,foodConsumed\n';
  }

  const headers = 'tick,population,foodCount,avgEnergy,maxGeneration\n';
  const rows = history.map((snapshot) => {
    return [
      snapshot.tick,
      snapshot.population.count,
      snapshot.food.activeCount,
      snapshot.population.averageEnergy.toFixed(2),
      snapshot.population.maxGeneration,
    ].join(',');
  });

  return headers + rows.join('\n');
}

/**
 * Load a simulation from serialized data
 */
export function loadSimulation(
  data: SerializedSimulation,
  callbacks?: SimulationCallbacks
): SimulationEngine {
  // Create simulation with saved config
  const simulation = new SimulationEngine(data.config);

  if (callbacks) {
    simulation.setCallbacks(callbacks);
  }

  // Prepare for restore (clear default entities)
  simulation.prepareForRestore();

  // Restore food
  const foodManager = simulation.getFoodManager();
  for (const foodData of data.food) {
    const foodState: FoodState = {
      id: foodData.id,
      x: foodData.x,
      y: foodData.y,
      energy: foodData.energy,
      isConsumed: foodData.isConsumed,
      consumedAt: foodData.consumedAtTick,
      spawnedAt: 0,
    };
    foodManager.restoreFood(foodState);
  }

  // Restore agents
  const agentManager = simulation.getAgentManager();
  const agentConfig = agentManager.getConfig();

  for (const agentData of data.agents) {
    // Reconstruct genome
    const genome = new Genome({
      size: agentData.genome.genes.length,
      generation: agentData.genome.generation,
    });
    for (let i = 0; i < agentData.genome.genes.length; i++) {
      genome.setGene(i, agentData.genome.genes[i]);
    }

    // Reconstruct brain
    let brain: NeuralBrain;
    if (agentData.brain.networkWeights) {
      // Restore with saved weights
      const nw = agentData.brain.networkWeights;

      // Determine network size from weights
      const inputSize = nw.inputToHidden.length;
      const hiddenSize = nw.hiddenBias.length;
      const outputSize = nw.outputBias.length;

      // Create network with weights
      const network = new NeuralNetwork(
        { inputSize, hiddenSize, outputSize },
        nw
      );

      brain = new NeuralBrain(
        { inputSize, hiddenSize, outputSize },
        network
      );
    } else {
      // Create new brain with default architecture
      const [inputSize, hiddenSize, outputSize] = agentConfig.networkLayers;
      brain = new NeuralBrain({ inputSize, hiddenSize, outputSize });
    }

    // Restore agent
    agentManager.restoreAgent(
      agentData.id,
      agentData.speciesId,
      agentData.lineageId,
      agentData.generation,
      agentData.position,
      agentData.rotation,
      agentData.energy,
      agentData.age,
      brain,
      genome,
      agentData.stats
    );
  }

  // Restore simulation state
  simulation.restoreState(data.state);

  return simulation;
}

/**
 * Load simulation from a JSON string
 */
export function loadSimulationFromJSON(
  json: string,
  callbacks?: SimulationCallbacks
): SimulationEngine {
  const data = parseSimulationJSON(json);
  return loadSimulation(data, callbacks);
}

/**
 * Load simulation from a File/Blob
 */
export async function loadSimulationFromFile(
  file: Blob,
  callbacks?: SimulationCallbacks
): Promise<SimulationEngine> {
  const text = await file.text();
  return loadSimulationFromJSON(text, callbacks);
}
