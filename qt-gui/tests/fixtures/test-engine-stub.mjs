#!/usr/bin/env node
/**
 * @file test-engine-stub.mjs
 * @brief Minimal JSON-RPC engine stub for testing EngineClient
 * 
 * This stub simulates the EcoSysX engine's RPC protocol over stdio.
 * It responds to init, step, snapshot, and stop commands for testing purposes.
 * 
 * Usage:
 *   node test-engine-stub.mjs
 * 
 * Protocol:
 *   - Reads JSON-RPC requests from stdin (one per line)
 *   - Writes JSON-RPC responses to stdout (one per line)
 *   - All other output goes to stderr
 */

import readline from 'readline';

// Simulation state
let state = {
  initialized: false,
  currentStep: 0,
  totalSteps: 1000,
  agents: [],
  config: null
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

/**
 * Generate initial population of agents
 */
function initializeAgents(config) {
  const popSize = config?.simulation?.populationSize || 100;
  const agents = [];
  
  for (let i = 0; i < popSize; i++) {
    agents.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      energy: 50 + Math.random() * 50,
      age: Math.floor(Math.random() * 100),
      state: 'susceptible'
    });
  }
  
  // Infect a few initial agents
  const initialInfected = Math.floor(popSize * 0.05);
  for (let i = 0; i < initialInfected; i++) {
    agents[i].state = 'infected';
  }
  
  return agents;
}

/**
 * Simulate one step of the simulation
 */
function simulateStep() {
  state.currentStep++;
  
  // Simple SIR dynamics
  for (const agent of state.agents) {
    // Random infection spread
    if (agent.state === 'susceptible' && Math.random() < 0.02) {
      agent.state = 'infected';
    }
    
    // Recovery
    if (agent.state === 'infected' && Math.random() < 0.05) {
      agent.state = 'recovered';
    }
    
    // Random death (low probability)
    if (Math.random() < 0.001) {
      agent.state = 'dead';
    }
    
    // Random movement
    agent.x = Math.max(0, Math.min(100, agent.x + (Math.random() - 0.5) * 5));
    agent.y = Math.max(0, Math.min(100, agent.y + (Math.random() - 0.5) * 5));
    
    // Energy changes
    agent.energy = Math.max(0, Math.min(100, agent.energy + (Math.random() - 0.5) * 2));
    
    // Age increment
    agent.age++;
  }
}

/**
 * Generate snapshot from current state
 */
function generateSnapshot(includeAgents = true) {
  const sir = state.agents.reduce((acc, agent) => {
    acc[agent.state] = (acc[agent.state] || 0) + 1;
    return acc;
  }, {});
  
  const metrics = {
    population: state.agents.length,
    energyMean: state.agents.reduce((sum, a) => sum + a.energy, 0) / state.agents.length,
    sir: {
      susceptible: sir.susceptible || 0,
      infected: sir.infected || 0,
      recovered: sir.recovered || 0,
      dead: sir.dead || 0
    }
  };
  
  const snapshot = {
    step: state.currentStep,
    tick: state.currentStep * 100,  // Arbitrary tick value
    metrics: metrics
  };
  
  if (includeAgents) {
    snapshot.agents = state.agents.map(a => ({
      id: a.id,
      x: a.x,
      y: a.y,
      energy: a.energy,
      age: a.age,
      state: a.state
    }));
    
    snapshot.environment = {
      worldSize: 100,
      resourceGrid: Array(10).fill(0).map(() => 
        Array(10).fill(0).map(() => Math.random() * 100)
      )
    };
  }
  
  return snapshot;
}

/**
 * Handle RPC request
 */
function handleRequest(request) {
  const { op, id, params } = request;
  
  console.error(`[STUB] Received: ${op} (id: ${id})`);
  
  let response = { id };
  
  try {
    switch (op) {
      case 'init':
        if (state.initialized) {
          response.error = { message: 'Already initialized' };
        } else {
          state.config = params.config || {};
          state.agents = initializeAgents(state.config);
          state.currentStep = 0;
          state.totalSteps = state.config?.simulation?.totalSteps || 1000;
          state.initialized = true;
          
          response.result = {
            status: 'initialized',
            config: state.config,
            providerInfo: {
              name: 'test-engine-stub',
              version: '1.0.0',
              license: 'MIT'
            }
          };
        }
        break;
        
      case 'step':
        if (!state.initialized) {
          response.error = { message: 'Not initialized' };
        } else {
          const steps = params.steps || 1;
          
          for (let i = 0; i < steps; i++) {
            if (state.currentStep < state.totalSteps) {
              simulateStep();
            }
          }
          
          response.result = {
            currentStep: state.currentStep,
            totalSteps: state.totalSteps,
            completed: state.currentStep >= state.totalSteps
          };
        }
        break;
        
      case 'snapshot':
        if (!state.initialized) {
          response.error = { message: 'Not initialized' };
        } else {
          const fullSnapshot = params.full !== false;
          response.result = {
            snapshot: generateSnapshot(fullSnapshot)
          };
        }
        break;
        
      case 'stop':
        response.result = {
          status: 'stopped',
          finalStep: state.currentStep
        };
        state.initialized = false;
        break;
        
      case 'reset':
        state.initialized = false;
        state.currentStep = 0;
        state.agents = [];
        state.config = null;
        
        response.result = {
          status: 'reset'
        };
        break;
        
      default:
        response.error = { message: `Unknown operation: ${op}` };
    }
  } catch (error) {
    response.error = {
      message: error.message,
      stack: error.stack
    };
  }
  
  return response;
}

// Main loop: read JSON-RPC requests and respond
console.error('[STUB] Test Engine Stub started');
console.error('[STUB] Waiting for JSON-RPC commands on stdin...');

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    const response = handleRequest(request);
    
    // Write response as single line
    console.log(JSON.stringify(response));
  } catch (error) {
    console.error(`[STUB] Error processing request: ${error.message}`);
    console.log(JSON.stringify({
      error: {
        message: `Parse error: ${error.message}`
      }
    }));
  }
});

rl.on('close', () => {
  console.error('[STUB] Stdin closed, exiting');
  process.exit(0);
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.error('[STUB] Received SIGTERM, exiting');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('[STUB] Received SIGINT, exiting');
  process.exit(0);
});
