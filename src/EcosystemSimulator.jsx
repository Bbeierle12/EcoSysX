import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';

// Message Types - Define globally
const MessageTypes = {
  RESOURCE_LOCATION: 'resource',
  THREAT_WARNING: 'threat',
  ALLIANCE_PROPOSAL: 'alliance',
  HELP_REQUEST: 'help',
  KNOWLEDGE_SHARE: 'knowledge'
};

// Message System for Agent Communication
class Message {
  constructor(sender, type, content, priority = 'normal') {
    this.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.sender = sender;
    this.type = type;
    this.content = content;
    this.timestamp = Date.now();
    this.priority = priority;
    this.range = 10; // Communication range
  }
}

// Multi-Agent Reinforcement Learning Policy
class ReinforcementLearningPolicy {
  constructor() {
    this.qTable = new Map();
    this.epsilon = 0.15;
    this.alpha = 0.1;
    this.gamma = 0.9;
    this.lastState = null;
    this.lastAction = null;
  }

  getAction(observation) {
    const state = this.discretizeState(observation);
    
    if (this.lastState && this.lastAction) {
      const reward = this.calculateReward(observation);
      this.updateQValue(this.lastState, this.lastAction, reward, state);
    }
    
    let action;
    if (Math.random() < this.epsilon) {
      action = this.getRandomAction();
    } else {
      action = this.getBestAction(state);
    }
    
    this.lastState = state;
    this.lastAction = action;
    
    return action;
  }

  discretizeState(obs) {
    const energyBucket = Math.floor(obs.energy / 25);
    const nearbyBucket = Math.min(3, obs.nearbyCount);
    const infectedBucket = Math.min(2, obs.nearbyInfected);
    const resourceBucket = obs.nearestResourceDistance < 5 ? 0 : 1;
    
    return `${energyBucket}_${nearbyBucket}_${infectedBucket}_${resourceBucket}_${obs.status}`;
  }

  calculateReward(observation) {
    let reward = 0;
    reward += observation.energy * 0.01;
    reward -= observation.nearbyInfected * 2;
    
    if (observation.energy < 50 && observation.nearestResourceDistance < 10) {
      reward += 5;
    }
    
    reward -= observation.age * 0.001;
    
    return reward;
  }

  updateQValue(state, action, reward, nextState) {
    const key = `${state}_${JSON.stringify(action)}`;
    const currentQ = this.qTable.get(key) || 0;
    const maxNextQ = this.getMaxQValue(nextState);
    
    const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
    this.qTable.set(key, newQ);
  }

  getMaxQValue(state) {
    const actions = this.getAllPossibleActions();
    let maxQ = -Infinity;
    
    actions.forEach(action => {
      const key = `${state}_${JSON.stringify(action)}`;
      const q = this.qTable.get(key) || 0;
      maxQ = Math.max(maxQ, q);
    });
    
    return maxQ === -Infinity ? 0 : maxQ;
  }

  getBestAction(state) {
    const actions = this.getAllPossibleActions();
    let bestAction = actions[0];
    let maxQ = -Infinity;
    
    actions.forEach(action => {
      const key = `${state}_${JSON.stringify(action)}`;
      const q = this.qTable.get(key) || 0;
      if (q > maxQ) {
        maxQ = q;
        bestAction = action;
      }
    });
    
    return bestAction;
  }

  getRandomAction() {
    return {
      intensity: Math.random() * 0.8 + 0.2,
      direction: Math.random() * Math.PI * 2,
      avoidance: Math.random() * 0.5
    };
  }

  getAllPossibleActions() {
    return [
      { intensity: 0.3, direction: 0, avoidance: 0 },
      { intensity: 0.6, direction: Math.PI/2, avoidance: 0 },
      { intensity: 0.9, direction: Math.PI, avoidance: 0 },
      { intensity: 0.6, direction: 3*Math.PI/2, avoidance: 0 },
      { intensity: 0.4, direction: 0, avoidance: 0.3 }
    ];
  }
}

// Enhanced Social Memory with Trust System
class SocialMemory {
  constructor() {
    this.knownAgents = new Map(); // agentId -> relationship data
    this.receivedMessages = [];
    this.maxMessages = 20;
    this.trustDecayRate = 0.001; // Trust slowly decays without interaction
    this.minTrust = 0.0;
    this.maxTrust = 1.0;
    this.neutralTrust = 0.5;
  }

  rememberAgent(agentId, interaction) {
    if (!this.knownAgents.has(agentId)) {
      this.knownAgents.set(agentId, {
        firstMet: Date.now(),
        lastSeen: Date.now(),
        trust: this.neutralTrust, // Start neutral
        interactions: 0,
        sharedInfo: [],
        helpGiven: 0,
        helpReceived: 0,
        accurateInfo: 0,
        falseInfo: 0,
        totalInfo: 0
      });
    }
    
    const memory = this.knownAgents.get(agentId);
    memory.interactions++;
    memory.lastSeen = Date.now();
    
    if (interaction) {
      memory.sharedInfo.push({
        type: interaction.type,
        timestamp: Date.now()
      });
      
      // Limit shared info history
      if (memory.sharedInfo.length > 50) {
        memory.sharedInfo.shift();
      }
    }
  }

  updateTrust(agentId, change, reason = 'interaction') {
    const memory = this.knownAgents.get(agentId);
    if (!memory) return;
    
    const oldTrust = memory.trust;
    memory.trust = Math.max(this.minTrust, Math.min(this.maxTrust, memory.trust + change));
    
    // Track trust change reasons
    memory.sharedInfo.push({
      type: 'trust_change',
      reason: reason,
      change: change,
      newTrust: memory.trust,
      timestamp: Date.now()
    });
    
    console.log(`Trust update: ${agentId} ${oldTrust.toFixed(2)} → ${memory.trust.toFixed(2)} (${reason})`);
  }

  getTrust(agentId) {
    const memory = this.knownAgents.get(agentId);
    return memory ? memory.trust : this.neutralTrust;
  }

  isAgentTrusted(agentId, threshold = 0.4) {
    return this.getTrust(agentId) >= threshold;
  }

  decayTrust() {
    // Trust slowly moves toward neutral over time without interaction
    this.knownAgents.forEach((memory, agentId) => {
      const timeSinceLastSeen = Date.now() - memory.lastSeen;
      if (timeSinceLastSeen > 5000) { // 5 seconds in sim time
        if (memory.trust > this.neutralTrust) {
          memory.trust -= this.trustDecayRate;
        } else if (memory.trust < this.neutralTrust) {
          memory.trust += this.trustDecayRate;
        }
      }
    });
  }

  addReceivedMessage(message) {
    this.receivedMessages.push(message);
    if (this.receivedMessages.length > this.maxMessages) {
      this.receivedMessages.shift();
    }
  }

  getRecentMessages(count = 5, trustedOnly = false, trustThreshold = 0.4) {
    if (!trustedOnly) {
      return this.receivedMessages.slice(-count);
    }
    
    // Filter messages from trusted sources only
    return this.receivedMessages
      .filter(msg => this.isAgentTrusted(msg.sender, trustThreshold))
      .slice(-count);
  }

  getMostTrustedAgents(count = 3) {
    const agents = Array.from(this.knownAgents.entries())
      .sort((a, b) => b[1].trust - a[1].trust)
      .slice(0, count);
    return agents.map(([id, memory]) => ({ id, trust: memory.trust }));
  }

  getLeastTrustedAgents(count = 3) {
    const agents = Array.from(this.knownAgents.entries())
      .sort((a, b) => a[1].trust - b[1].trust)
      .slice(0, count);
    return agents.map(([id, memory]) => ({ id, trust: memory.trust }));
  }

  receiveMessage(message) {
    this.addReceivedMessage(message);
    
    // Update trust based on message sender if known
    if (this.knownAgents.has(message.from)) {
      const trustAdjustment = message.trust > 0.5 ? 0.02 : -0.01;
      this.updateTrust(message.from, trustAdjustment, 'message_received');
    }
  }

  updateAgentMemory(agentId, observation) {
    if (!this.knownAgents.has(agentId)) {
      this.knownAgents.set(agentId, {
        firstMet: Date.now(),
        lastSeen: Date.now(),
        trust: this.neutralTrust,
        interactions: 0,
        sharedInfo: [],
        helpGiven: 0,
        helpReceived: 0,
        accurateInfo: 0,
        falseInfo: 0,
        totalInfo: 0
      });
    }
    
    const memory = this.knownAgents.get(agentId);
    memory.lastSeen = observation.lastSeen || Date.now();
    memory.interactions++;
    
    // Store recent observations
    if (!memory.recentObservations) {
      memory.recentObservations = [];
    }
    memory.recentObservations.push(observation);
    if (memory.recentObservations.length > 10) {
      memory.recentObservations.shift();
    }
  }
}

// Lean Analytics System - Event-driven windowed logging
class EcosystemAnalytics {
  constructor(windowSize = 100, checkpointInterval = 1000) {
    this.windowSize = windowSize;
    this.checkpointInterval = checkpointInterval;
    this.currentStep = 0;
    this.windowStart = 0;
    
    // Rolling aggregates (reset each window)
    this.resetWindow();
    
    // Persistent data
    this.windowHistory = [];
    this.checkpoints = [];
    this.panelSample = new Map(); // Reservoir sample of agents
    this.panelSize = 200;
    
    // Exponential decay contact matrix
    this.contactMatrix = new Map();
    this.decayRate = 0.05;
    
    console.log(`📊 Analytics: Window=${windowSize} steps, Checkpoints every ${checkpointInterval} steps`);
  }

  resetWindow() {
    this.windowData = {
      contacts_by_type: new Map(),
      infections_caused: new Map(),
      infectious_time: new Map(),
      energy_stats: new Map(),
      births_by_type: new Map(),
      deaths_by_cause: new Map(),
      comm_tally: new Map(),
      resources_consumed: 0,
      resources_spawned: 0,
      events: []
    };
  }

  recordStep(step, agents, environment, stats) {
    this.currentStep = step;
    
    // Record contacts and interactions
    this.recordContacts(agents);
    this.recordEnergyStats(agents);
    this.recordResourceActivity(environment);
    this.updatePanelSample(agents);
    
    // Check for window completion
    if (step - this.windowStart >= this.windowSize) {
      this.finalizeWindow(agents, environment, stats);
      this.windowStart = step;
      this.resetWindow();
    }
    
    // Check for checkpoint
    if (step > 0 && step % this.checkpointInterval === 0) {
      this.createCheckpoint(agents, environment, stats);
    }
  }

  recordContacts(agents) {
    const contactDistance = 8;
    
    agents.forEach(agentA => {
      const typeA = this.getAgentType(agentA);
      
      agents.forEach(agentB => {
        if (agentA.id !== agentB.id && agentA.distanceTo(agentB) < contactDistance) {
          const typeB = this.getAgentType(agentB);
          const key = `${typeA}_${typeB}`;
          
          this.windowData.contacts_by_type.set(key, 
            (this.windowData.contacts_by_type.get(key) || 0) + 1);
          
          // Record infection events
          if (agentA.status === 'Infected' && agentB.status === 'Susceptible') {
            this.windowData.infections_caused.set(agentA.id, 
              (this.windowData.infections_caused.get(agentA.id) || 0) + 1);
          }
        }
      });
      
      // Record infectious time
      if (agentA.status === 'Infected') {
        this.windowData.infectious_time.set(typeA, 
          (this.windowData.infectious_time.get(typeA) || 0) + 1);
      }
    });
  }

  recordEnergyStats(agents) {
    const energyByType = new Map();
    
    agents.forEach(agent => {
      const type = this.getAgentType(agent);
      if (!energyByType.has(type)) {
        energyByType.set(type, []);
      }
      energyByType.get(type).push(agent.energy);
    });
    
    energyByType.forEach((energies, type) => {
      const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
      const atCap = energies.filter(e => e >= 100).length / energies.length;
      
      this.windowData.energy_stats.set(type, {
        mean: Math.round(mean * 10) / 10,
        count: energies.length,
        pct_at_cap: Math.round(atCap * 1000) / 10 // 0.1% precision
      });
    });
  }

  recordResourceActivity(environment) {
    this.windowData.resources_spawned = environment.resources.size;
  }

  recordEvent(type, data) {
    this.windowData.events.push({
      step: this.currentStep,
      type: type,
      data: data,
      timestamp: Date.now()
    });
  }

  recordCommunication(fromType, toType, messageType, success) {
    const key = `${messageType}_${fromType}_to_${toType}`;
    const currentTally = this.windowData.comm_tally.get(key) || { sent: 0, acted: 0 };
    
    currentTally.sent++;
    if (success) currentTally.acted++;
    
    this.windowData.comm_tally.set(key, currentTally);
  }

  getAgentType(agent) {
    if (agent.constructor.name === 'CausalAgent') return 'Causal';
    if (agent.id.includes('basic')) return 'Basic';
    return 'RL';
  }

  finalizeWindow(agents, environment, stats) {
    const windowSummary = {
      t0: this.windowStart,
      dt_steps: this.windowSize,
      population: this.summarizePopulation(agents),
      epidemic: this.summarizeEpidemic(agents),
      comms: Object.fromEntries(this.windowData.comm_tally),
      energy: Object.fromEntries(this.windowData.energy_stats),
      resources: {
        total_available: environment.resources.size,
        consumed_estimate: this.windowData.resources_consumed
      },
      contacts: Object.fromEntries(this.windowData.contacts_by_type),
      events_count: this.windowData.events.length
    };
    
    this.windowHistory.push(windowSummary);
    
    // Keep only last 50 windows to manage memory
    if (this.windowHistory.length > 50) {
      this.windowHistory.shift();
    }
    
    // Log compact window summary
    if (this.currentStep % 500 === 0) {
      console.log(`📈 Window [${this.windowStart}-${this.currentStep}]:`, 
        `Pop=${windowSummary.population.total}, ` +
        `I=${windowSummary.epidemic.infections}, ` +
        `Comms=${Object.values(windowSummary.comms).reduce((a,b) => a + (b.sent || 0), 0)}, ` +
        `Contacts=${Object.values(windowSummary.contacts).reduce((a,b) => a + b, 0)}`
      );
    }
  }

  summarizePopulation(agents) {
    const byType = new Map();
    const byHealth = new Map();
    
    agents.forEach(agent => {
      const type = this.getAgentType(agent);
      byType.set(type, (byType.get(type) || 0) + 1);
      byHealth.set(agent.status, (byHealth.get(agent.status) || 0) + 1);
    });
    
    return {
      total: agents.length,
      by_type: Object.fromEntries(byType),
      by_health: Object.fromEntries(byHealth)
    };
  }

  summarizeEpidemic(agents) {
    const infectiousByType = new Map();
    
    agents.filter(a => a.status === 'Infected').forEach(agent => {
      const type = this.getAgentType(agent);
      infectiousByType.set(type, (infectiousByType.get(type) || 0) + 1);
    });
    
    return {
      total_infected: infectiousByType.size,
      infectious_by_type: Object.fromEntries(infectiousByType),
      infections_caused: Object.fromEntries(this.windowData.infections_caused),
      infectious_time: Object.fromEntries(this.windowData.infectious_time)
    };
  }

  updatePanelSample(agents) {
    // Reservoir sampling for detailed tracking
    agents.forEach(agent => {
      if (this.panelSample.size < this.panelSize) {
        this.panelSample.set(agent.id, this.captureAgentState(agent));
      } else if (Math.random() < this.panelSize / (this.currentStep + 1)) {
        // Replace random agent with 5% probability
        if (Math.random() < 0.05) {
          const randomId = Array.from(this.panelSample.keys())[
            Math.floor(Math.random() * this.panelSample.size)
          ];
          this.panelSample.delete(randomId);
          this.panelSample.set(agent.id, this.captureAgentState(agent));
        }
      }
    });
  }

  captureAgentState(agent) {
    return {
      id: agent.id,
      type: this.getAgentType(agent),
      age: agent.age,
      energy: Math.round(agent.energy),
      status: agent.status,
      trust_avg: agent.calculateAverageTrust ? Math.round(agent.calculateAverageTrust() * 100) / 100 : 0.5,
      position: {
        x: Math.round(agent.position.x * 10) / 10,
        z: Math.round(agent.position.z * 10) / 10
      }
    };
  }

  createCheckpoint(agents, environment, stats) {
    const checkpoint = {
      checkpoint_step: this.currentStep,
      population_total: agents.length,
      window_count: this.windowHistory.length,
      panel_sample: Array.from(this.panelSample.values()),
      recent_windows: this.windowHistory.slice(-5), // Last 5 windows for context
      performance: {
        fps: stats.fps || 0,
        memory_mb: typeof performance !== 'undefined' && performance.memory 
          ? Math.round(performance.memory.usedJSHeapSize / 1048576) 
          : 0
      }
    };
    
    this.checkpoints.push(checkpoint);
    
    // Keep only last 10 checkpoints
    if (this.checkpoints.length > 10) {
      this.checkpoints.shift();
    }
    
    console.log(`🎯 CHECKPOINT [Step ${this.currentStep}]: ` +
      `${checkpoint.population_total} agents, ` +
      `${this.windowHistory.length} windows analyzed, ` +
      `${checkpoint.performance.memory_mb}MB memory`);
  }

  exportAnalytics() {
    const export_data = {
      metadata: {
        current_step: this.currentStep,
        window_size: this.windowSize,
        checkpoint_interval: this.checkpointInterval,
        export_timestamp: new Date().toISOString()
      },
      recent_windows: this.windowHistory,
      checkpoints: this.checkpoints,
      panel_sample: Array.from(this.panelSample.values())
    };
    
    console.log('=== LEAN ANALYTICS EXPORT ===');
    console.log(JSON.stringify(export_data, null, 2));
    console.log('=== END ANALYTICS EXPORT ===');
    
    // Download as JSON file
    const blob = new Blob([JSON.stringify(export_data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecosystem-analytics-step-${this.currentStep}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    return export_data;
  }

  // Calculate key epidemiological metrics
  calculateEpiMetrics() {
    if (this.windowHistory.length < 3) return null;
    
    const recent = this.windowHistory.slice(-5);
    const totalInfections = recent.reduce((sum, w) => sum + (w.epidemic?.total_infected || 0), 0);
    const totalContacts = recent.reduce((sum, w) => 
      sum + Object.values(w.contacts || {}).reduce((a, b) => a + b, 0), 0);
    
    const beta_estimate = totalContacts > 0 ? totalInfections / totalContacts : 0;
    
    return {
      beta_estimate: Math.round(beta_estimate * 10000) / 10000,
      total_infections_recent: totalInfections,
      total_contacts_recent: totalContacts,
      windows_analyzed: recent.length
    };
  }
}

// Base Agent Class
class Agent {
  constructor(id, position, genotype = null) {
    this.id = id;
    this.position = { ...position };
    this.velocity = { x: 0, y: 0, z: 0 }; // Start with zero velocity
    this.genotype = genotype || this.generateRandomGenotype();
    this.phenotype = this.expressPhenotype();
    this.age = 0;
    this.energy = 100;
    this.status = 'Susceptible';
    this.infectionTimer = 0;
    this.maxLifespan = this.genotype.lifespan;
    this.mesh = null;
    this.learningPolicy = new ReinforcementLearningPolicy();
    this.reproductionCooldown = 0;
    this.isActive = false; // Flag to prevent movement when paused
  }

  generateRandomGenotype() {
    return {
      speed: Math.random() * 2 + 0.5,
      size: Math.random() * 0.3 + 0.2,
      socialRadius: Math.random() * 5 + 2,
      infectionResistance: Math.random(),
      lifespan: Math.floor(Math.random() * 200 + 100),
      reproductionThreshold: Math.random() * 30 + 50,
      aggressiveness: Math.random(),
      forageEfficiency: Math.random()
    };
  }

  expressPhenotype() {
    return {
      maxSpeed: this.genotype.speed,
      radius: this.genotype.size,
      socialDistance: this.genotype.socialRadius,
      resistance: this.genotype.infectionResistance,
      aggression: this.genotype.aggressiveness,
      efficiency: this.genotype.forageEfficiency
    };
  }

  update(environment, agents, isSimulationRunning = true) {
    // Don't update if simulation is paused
    if (!isSimulationRunning) return 'continue';
    
    this.age++;
    
    // Increased energy consumption for selection pressure
    const baseLoss = 0.5; // Increased from 0.3
    const infectionPenalty = this.status === 'Infected' ? 0.6 : 0; // Increased from 0.4
    const agePenalty = this.age > this.maxLifespan * 0.8 ? 0.3 : 0; // Increased from 0.2
    
    this.energy = Math.max(0, this.energy - (baseLoss + infectionPenalty + agePenalty));
    this.reproductionCooldown = Math.max(0, this.reproductionCooldown - 1);

    const criticalEnergy = 5;
    const oldAge = this.age >= this.maxLifespan;
    
    if (oldAge || this.energy <= criticalEnergy) {
      const deathChance = oldAge ? 0.1 : (criticalEnergy - this.energy) * 0.05;
      if (Math.random() < deathChance) {
        return 'die';
      }
    }

    if (this.status === 'Infected') {
      this.infectionTimer++;
      if (this.infectionTimer > 40) {
        this.status = 'Recovered';
        this.energy = Math.min(100, this.energy + 10);
        this.updateMeshColor();
      }
    }

    if (this.status === 'Susceptible') {
      const nearbyInfected = agents.filter(agent => 
        agent.status === 'Infected' && 
        this.distanceTo(agent) < this.phenotype.socialDistance
      );
      
      if (nearbyInfected.length > 0) {
        // Increased infection probability for observable epidemics
        const baseInfectionRate = 0.15; // Increased from 0.03 to 15%
        const infectionProbability = baseInfectionRate * (1 - this.phenotype.resistance);
        if (Math.random() < infectionProbability) {
          this.status = 'Infected';
          this.infectionTimer = 0;
          this.updateMeshColor();
        }
      }
    }

    this.forage(environment);

    const observation = this.getObservation(environment, agents);
    const action = this.learningPolicy.getAction(observation);
    this.applyAction(action, environment);

    this.updatePosition();

    const reproductionThreshold = Math.max(30, this.genotype.reproductionThreshold * 0.7);
    const populationPressure = agents.length < 15 ? 2.0 : agents.length > 50 ? 0.5 : 1.0;
    const baseRate = 0.015 * populationPressure;
    
    if (this.energy > reproductionThreshold && 
        this.reproductionCooldown === 0 && 
        this.age > 20 && 
        Math.random() < baseRate) {
      return 'reproduce';
    }

    return 'continue';
  }

  forage(environment) {
    environment.resources.forEach((resource, id) => {
      const distance = Math.sqrt(
        Math.pow(this.position.x - resource.position.x, 2) +
        Math.pow(this.position.z - resource.position.z, 2)
      );
      
      if (distance < 3) {
        const baseGain = resource.value * this.phenotype.efficiency;
        const efficiencyBonus = this.status === 'Recovered' ? 1.2 : 1.0;
        const energyGain = baseGain * efficiencyBonus;
        
        this.energy = Math.min(100, this.energy + energyGain);
        environment.consumeResource(id);
        
        if (this.energy > 80 && this.reproductionCooldown === 0) {
          this.reproductionCooldown = Math.max(0, this.reproductionCooldown - 20);
        }
      }
    });
  }

  getObservation(environment, agents) {
    const nearbyAgents = agents.filter(agent => 
      agent.id !== this.id && this.distanceTo(agent) < 8
    );
    
    const nearestResource = this.findNearestResource(environment);
    
    return {
      position: this.position,
      energy: this.energy,
      nearbyCount: nearbyAgents.length,
      nearbyInfected: nearbyAgents.filter(a => a.status === 'Infected').length,
      age: this.age,
      nearestResourceDistance: nearestResource ? nearestResource.distance : 100,
      status: this.status
    };
  }

  findNearestResource(environment) {
    let nearest = null;
    let minDistance = Infinity;
    
    environment.resources.forEach((resource) => {
      const distance = Math.sqrt(
        Math.pow(this.position.x - resource.position.x, 2) +
        Math.pow(this.position.z - resource.position.z, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { resource, distance };
      }
    });
    
    return nearest;
  }

  applyAction(action, environment) {
    // Don't apply actions if not active
    if (!this.isActive) return;
    
    const moveIntensity = action.intensity * this.phenotype.maxSpeed;
    
    if (this.energy < 40) {
      const nearestResource = this.findNearestResource(environment);
      if (nearestResource) {
        const dx = nearestResource.resource.position.x - this.position.x;
        const dz = nearestResource.resource.position.z - this.position.z;
        const magnitude = Math.sqrt(dx * dx + dz * dz);
        
        this.velocity.x += (dx / magnitude) * moveIntensity * 0.3;
        this.velocity.z += (dz / magnitude) * moveIntensity * 0.3;
      }
    }
    
    this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.2;
    this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.2;
    
    if (this.status === 'Susceptible') {
      const avoidanceForce = action.avoidance || 0;
      this.velocity.x += (Math.random() - 0.5) * avoidanceForce;
      this.velocity.z += (Math.random() - 0.5) * avoidanceForce;
    }
  }

  updatePosition() {
    // Only update if active (simulation running)
    if (!this.isActive && !this.isPlayer) return;
    
    this.position.x += this.velocity.x;
    this.position.z += this.velocity.z;
    
    this.velocity.x *= 0.8;
    this.velocity.z *= 0.8;
    
    const bounds = 20;
    if (Math.abs(this.position.x) > bounds) {
      this.position.x = Math.sign(this.position.x) * bounds;
      this.velocity.x *= -0.5;
    }
    if (Math.abs(this.position.z) > bounds) {
      this.position.z = Math.sign(this.position.z) * bounds;
      this.velocity.z *= -0.5;
    }
    
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }
  }

  distanceTo(other) {
    const dx = this.position.x - other.position.x;
    const dz = this.position.z - other.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  updateMeshColor() {
    if (this.mesh && this.mesh.material) {
      let color;
      switch (this.status) {
        case 'Infected':
          color = new THREE.Color(1, 0, 0);
          break;
        case 'Recovered':
          color = new THREE.Color(0, 1, 0);
          break;
        default:
          color = new THREE.Color(0, 0.5, 1);
      }
      this.mesh.material.color = color;
    }
  }

  reproduce(partner = null) {
    const newGenotype = {};
    Object.keys(this.genotype).forEach(trait => {
      newGenotype[trait] = this.genotype[trait];
      
      if (Math.random() < 0.15) {
        const mutationFactor = 0.8 + Math.random() * 0.4;
        newGenotype[trait] *= mutationFactor;
        
        if (trait === 'infectionResistance' || trait === 'aggressiveness' || trait === 'forageEfficiency') {
          newGenotype[trait] = Math.max(0, Math.min(1, newGenotype[trait]));
        }
      }
    });
    
    const offspring = new Agent(
      `agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      { 
        x: this.position.x + (Math.random() - 0.5) * 3, 
        y: 1, 
        z: this.position.z + (Math.random() - 0.5) * 3 
      },
      newGenotype
    );
    
    this.reproductionCooldown = 60;
    this.energy -= 15;
    
    return offspring;
  }
}

// LLM-Powered Causal Agent
class CausalAgent extends Agent {
  constructor(id, position, genotype = null) {
    super(id, position, genotype);
    this.reasoningHistory = [];
    this.lastReasoning = null;
    this.reasoningMode = false; // Start with simulated reasoning
    this.decisionCount = 0;
    this.reasoningSuccessRate = 0;
    this.llmAvailable = false; // Will be set when user enables LLM
    this.personality = this.generatePersonality();
    this.pendingReasoning = null;
    this.queuedAction = null;
    this.reasoningFrequency = 0.3;
    this.socialMemory = new SocialMemory();
    this.communicationCooldown = 0;
    this.messageQueue = [];
    this.lastCommunication = null;
    this.isActive = false; // Inherit activation flag
    
    // Phase 1: Active Communication Storage
    this.knownResourceLocations = []; // Shared resource tips
    this.dangerZones = []; // Warned danger areas
    this.helpRequests = []; // Agents needing help
    this.socialInfoInfluence = 0.7; // How much social info affects decisions
    this.informationDecay = 300; // Steps before info becomes stale
  }

  generatePersonality() {
    const traits = ['cautious', 'aggressive', 'social', 'solitary', 'curious', 'conservative'];
    return traits[Math.floor(Math.random() * traits.length)];
  }

  async simulateLLMReasoning(observation, agents) {
    const prompt = this.buildCausalPrompt(observation, agents);
    const chainOfThought = this.generateChainOfThought(prompt, observation);
    const action = this.reasonToAction(chainOfThought, observation);
    
    this.decisionCount++;
    
    return {
      action: action,
      chainOfThought: chainOfThought,
      confidence: Math.random() * 0.4 + 0.6,
      reasoning: chainOfThought.conclusion
    };
  }

  buildCausalPrompt(observation, agents) {
    return {
      role: `You are a ${this.personality} agent in a competitive ecosystem`,
      situation: this.analyzeSituation(observation, agents),
      goals: this.defineGoals(observation),
      constraints: this.identifyConstraints(observation, agents),
      examples: this.getRelevantExamples()
    };
  }

  analyzeSituation(observation, agents) {
    const nearbyThreats = agents.filter(a => 
      a.status === 'Infected' && this.distanceTo(a) < 5
    ).length;
    
    const resourceDistance = observation.nearestResourceDistance;
    const energyStatus = observation.energy < 30 ? 'critical' : 
                        observation.energy > 70 ? 'abundant' : 'moderate';
    
    return {
      energyStatus,
      nearbyThreats,
      resourceDistance,
      populationDensity: observation.nearbyCount,
      age: observation.age,
      season: 'current',
      weatherCondition: 'clear'
    };
  }

  defineGoals(observation) {
    const goals = [];
    
    if (observation.energy < 40) {
      goals.push({ priority: 'high', goal: 'find_food', urgency: 10 - (observation.energy / 10) });
    }
    
    if (observation.nearbyInfected > 0) {
      goals.push({ priority: 'high', goal: 'avoid_infection', urgency: observation.nearbyInfected * 2 });
    }
    
    if (observation.energy > 60 && this.age > 30) {
      goals.push({ priority: 'medium', goal: 'reproduce', urgency: 3 });
    }
    
    goals.push({ priority: 'low', goal: 'explore', urgency: 1 });
    
    return goals.sort((a, b) => b.urgency - a.urgency);
  }

  identifyConstraints(observation, agents) {
    return {
      energyLimitation: observation.energy < 20,
      infectionRisk: observation.nearbyInfected > 0,
      crowding: observation.nearbyCount > 5,
      ageFactors: this.age > this.maxLifespan * 0.8,
      reproductionCooldown: this.reproductionCooldown > 0
    };
  }

  getRelevantExamples() {
    return [
      {
        situation: "Low energy, nearby food, no threats",
        decision: "Move directly to food source",
        outcome: "Energy restored, survival extended",
        reasoning: "Direct action was optimal - no competing priorities"
      },
      {
        situation: "Moderate energy, infected agents nearby, distant food",
        decision: "Maintain distance, search for alternative food",
        outcome: "Avoided infection, found alternative resources",
        reasoning: "Infection risk outweighed immediate food need"
      }
    ];
  }

  generateChainOfThought(prompt, observation) {
    const thoughts = [];
    
    thoughts.push({
      step: 1,
      type: "situation_analysis",
      content: `Current situation: Energy at ${observation.energy}%, ${observation.nearbyInfected} infected nearby, nearest resource ${Math.round(observation.nearestResourceDistance)} units away.`
    });
    
    const primaryGoal = prompt.goals[0];
    thoughts.push({
      step: 2,
      type: "goal_prioritization", 
      content: `Primary goal: ${primaryGoal?.goal || 'survive'} (urgency: ${primaryGoal?.urgency || 1}). This takes priority because ${this.explainGoalReasoning(primaryGoal, observation)}.`
    });
    
    const riskLevel = this.assessRisks(observation);
    thoughts.push({
      step: 3,
      type: "risk_assessment",
      content: `Risk assessment: ${riskLevel.level} risk. Main concerns: ${riskLevel.factors.join(', ')}. Risk tolerance based on ${this.personality} personality.`
    });
    
    const actionPlan = this.planAction(observation, primaryGoal, riskLevel);
    thoughts.push({
      step: 4,
      type: "action_planning",
      content: `Action plan: ${actionPlan.description}. Expected outcome: ${actionPlan.expectedOutcome}. Alternatives considered: ${actionPlan.alternatives.join(', ')}.`
    });
    
    thoughts.push({
      step: 5,
      type: "conclusion",
      content: `Decision: ${actionPlan.action}. Reasoning: ${actionPlan.justification}`
    });
    
    return {
      thoughts,
      conclusion: actionPlan.justification,
      confidence: actionPlan.confidence
    };
  }

  explainGoalReasoning(goal, observation) {
    if (!goal) return "survival is the baseline imperative";
    
    switch (goal.goal) {
      case 'find_food':
        return `energy is ${observation.energy < 20 ? 'critically' : 'dangerously'} low`;
      case 'avoid_infection':
        return "infection would severely compromise survival chances";
      case 'reproduce':
        return "energy reserves allow for genetic contribution to next generation";
      default:
        return "exploration maintains adaptive flexibility";
    }
  }

  assessRisks(observation) {
    const factors = [];
    let riskScore = 0;
    
    if (observation.energy < 30) {
      factors.push('energy depletion');
      riskScore += 3;
    }
    
    if (observation.nearbyInfected > 0) {
      factors.push('infection exposure');
      riskScore += observation.nearbyInfected * 2;
    }
    
    if (observation.nearbyCount > 5) {
      factors.push('resource competition');
      riskScore += 1;
    }
    
    if (this.age > this.maxLifespan * 0.8) {
      factors.push('advanced age');
      riskScore += 2;
    }
    
    const level = riskScore < 2 ? 'low' : riskScore < 5 ? 'moderate' : 'high';
    
    return { level, factors, score: riskScore };
  }

  planAction(observation, goal, riskLevel) {
    const alternatives = ['explore', 'rest', 'forage', 'socialize', 'isolate'];
    let selectedAction = 'explore';
    let description = 'Continue current behavior';
    let expectedOutcome = 'Maintain status quo';
    let justification = 'Default action when no clear priority emerges';
    let confidence = 0.5;
    
    if (goal?.goal === 'find_food' && observation.nearestResourceDistance < 10) {
      selectedAction = 'forage';
      description = 'Move toward nearest resource';
      expectedOutcome = 'Energy restoration';
      justification = `Food is accessible (${Math.round(observation.nearestResourceDistance)} units) and energy need is urgent`;
      confidence = 0.8;
    } else if (observation.nearbyInfected > 0 && this.status === 'Susceptible') {
      selectedAction = 'avoid';
      description = 'Maintain distance from infected agents';
      expectedOutcome = 'Reduce infection probability';
      justification = `${observation.nearbyInfected} infected agents nearby pose ${Math.round(observation.nearbyInfected * 3)}% infection risk`;
      confidence = 0.9;
    } else if (observation.energy > 70 && this.reproductionCooldown === 0 && this.age > 30) {
      selectedAction = 'reproduce';
      description = 'Seek reproduction opportunity';
      expectedOutcome = 'Genetic propagation';
      justification = 'High energy reserves and maturity enable reproduction without survival risk';
      confidence = 0.7;
    }
    
    return {
      action: selectedAction,
      description,
      expectedOutcome,
      justification,
      alternatives: alternatives.filter(a => a !== selectedAction),
      confidence
    };
  }

  reasonToAction(chainOfThought, observation) {
    const conclusion = chainOfThought.thoughts.find(t => t.type === 'conclusion');
    const actionType = conclusion?.content.match(/Decision: (\w+)/)?.[1] || 'explore';
    
    switch (actionType) {
      case 'forage':
        return {
          type: 'forage',
          intensity: 0.9,
          direction: this.getResourceDirection(observation),
          reasoning: 'Moving toward food source'
        };
      case 'avoid':
        return {
          type: 'avoid',
          intensity: 0.7,
          direction: this.getAvoidanceDirection(observation),
          reasoning: 'Avoiding infection risk'
        };
      case 'reproduce':
        return {
          type: 'reproduce',
          intensity: 0.3,
          direction: 0,
          reasoning: 'Seeking reproductive opportunity'
        };
      default:
        return {
          type: 'explore',
          intensity: 0.5,
          direction: Math.random() * Math.PI * 2,
          reasoning: 'Exploratory behavior'
        };
    }
  }

  getResourceDirection(observation) {
    return Math.random() * Math.PI * 2;
  }

  getAvoidanceDirection(observation) {
    return Math.random() * Math.PI * 2;
  }

  calculateAverageTrust() {
    if (this.socialMemory.knownAgents.size === 0) return 0.5;
    
    let totalTrust = 0;
    let count = 0;
    
    this.socialMemory.knownAgents.forEach((memory, agentId) => {
      totalTrust += memory.trust;
      count++;
    });
    
    return count > 0 ? totalTrust / count : 0.5;
  }

  updateMeshColor() {
    if (this.mesh && this.mesh.material) {
      let color;
      switch (this.status) {
        case 'Infected':
          color = new THREE.Color(1, 0, 0);
          break;
        case 'Recovered':
          color = new THREE.Color(0, 1, 0);
          break;
        default:
          color = new THREE.Color(1, 0.8, 0.2); // Gold for causal agents
      }
      this.mesh.material.color = color;
    }
  }

  // Override update method to add communication
  update(environment, agents, isSimulationRunning = true) {
    // Call parent update first
    const result = super.update(environment, agents, isSimulationRunning);
    
    // Add communication logic if simulation is running
    if (isSimulationRunning && this.isActive) {
      this.handleCommunication(agents, environment);
      this.updateSocialMemory(agents);
    }
    
    return result;
  }

  handleCommunication(agents, environment) {
    // Decrease communication cooldown
    this.communicationCooldown = Math.max(0, this.communicationCooldown - 1);
    
    // Try to communicate every few steps when not on cooldown
    if (this.communicationCooldown === 0 && Math.random() < 0.3) {
      const nearbyAgents = agents.filter(agent => 
        agent !== this && 
        agent instanceof CausalAgent && 
        this.distanceTo(agent) < 8
      );
      
      if (nearbyAgents.length > 0) {
        const recipient = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
        const message = this.createMessage(environment, agents);
        
        if (message) {
          this.sendMessage(recipient, message);
          this.communicationCooldown = 10; // 10 step cooldown
          
          // Update stats for tracking
          if (typeof window !== 'undefined' && window.ecosystemStats) {
            window.ecosystemStats.communicationEvents++;
          }
        }
      }
    }
  }

  createMessage(environment, agents) {
    const messageTypes = [];
    
    // Resource sharing
    if (this.energy > 70) {
      const nearbyResources = Array.from(environment.resources.values())
        .filter(r => this.distanceTo(r) < 15);
      if (nearbyResources.length > 0) {
        messageTypes.push({
          type: 'resource_tip',
          content: { 
            location: nearbyResources[0].position,
            confidence: 0.8
          }
        });
      }
    }
    
    // Warning about infection
    if (this.status === 'Recovered') {
      const infectedNearby = agents.filter(a => 
        a.status === 'Infected' && this.distanceTo(a) < 10
      );
      if (infectedNearby.length > 0) {
        messageTypes.push({
          type: 'infection_warning',
          content: {
            location: infectedNearby[0].position,
            severity: infectedNearby.length,
            confidence: 0.9
          }
        });
      }
    }
    
    return messageTypes.length > 0 ? messageTypes[0] : null;
  }

  sendMessage(recipient, message) {
    if (!recipient.socialMemory) return;
    
    recipient.socialMemory.receiveMessage({
      from: this.id,
      type: message.type,
      content: message.content,
      timestamp: Date.now(),
      trust: recipient.socialMemory.getTrust(this.id)
    });
    
    // Update trust based on message quality
    const trustChange = message.content.confidence > 0.7 ? 0.05 : -0.02;
    recipient.socialMemory.updateTrust(this.id, trustChange);
    
    this.lastCommunication = {
      recipient: recipient.id,
      message: message,
      timestamp: Date.now()
    };
    
    // Record communication in analytics if available
    if (typeof window !== 'undefined' && window.ecosystemAnalytics) {
      const fromType = this.constructor.name === 'CausalAgent' ? 'Causal' : 'RL';
      const toType = recipient.constructor.name === 'CausalAgent' ? 'Causal' : 'RL';
      const success = trustChange > 0; // Consider successful if trust increased
      
      window.ecosystemAnalytics.recordCommunication(fromType, toType, message.type, success);
    }
  }

  updateSocialMemory(agents) {
    // Update memory about nearby agents
    const nearbyAgents = agents.filter(agent => 
      agent !== this && this.distanceTo(agent) < 12
    );
    
    nearbyAgents.forEach(agent => {
      this.socialMemory.updateAgentMemory(agent.id, {
        lastSeen: Date.now(),
        location: { ...agent.position },
        status: agent.status,
        energy: agent.energy,
        behavior: 'observed'
      });
    });
  }
}

// Dynamic Environment System
class Environment {
  constructor() {
    this.resources = new Map();
    this.weather = 'clear';
    this.temperature = 20;
    this.season = 'spring';
    this.cycleStep = 0;
    this.carryingCapacity = 100;
  }

  update() {
    this.cycleStep++;
    
    const seasonLength = 150;
    const seasonPhase = (this.cycleStep % (seasonLength * 4)) / seasonLength;
    
    if (seasonPhase < 1) this.season = 'spring';
    else if (seasonPhase < 2) this.season = 'summer';
    else if (seasonPhase < 3) this.season = 'autumn';
    else this.season = 'winter';
    
    this.temperature = 20 + Math.sin((seasonPhase - 1) * Math.PI) * 15;
    
    this.regenerateResources();
    
    if (Math.random() < 0.02) {
      this.weather = Math.random() < 0.7 ? 'clear' : Math.random() < 0.5 ? 'rain' : 'storm';
    }

    return this.clone();
  }

  clone() {
    const newEnv = new Environment();
    newEnv.resources = new Map(this.resources);
    newEnv.weather = this.weather;
    newEnv.temperature = this.temperature;
    newEnv.season = this.season;
    newEnv.cycleStep = this.cycleStep;
    newEnv.carryingCapacity = this.carryingCapacity;
    return newEnv;
  }

  regenerateResources() {
    const resourceCount = this.resources.size;
    const seasonMultiplier = this.season === 'winter' ? 0.4 : 
                           this.season === 'spring' ? 1.0 : 
                           this.season === 'summer' ? 0.8 : 0.6;
    
    // Reduced max resources to create scarcity
    const maxResources = Math.floor((this.season === 'winter' ? 20 : 30) * seasonMultiplier);
    
    // Reduced spawn chance and rate
    if (resourceCount < maxResources && Math.random() < 0.3) {
      const numNewResources = Math.min(1, maxResources - resourceCount);
      
      for (let i = 0; i < numNewResources; i++) {
        const quality = Math.random();
        const id = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${i}`;
        
        const distance = Math.random() * 15 + 3;
        const angle = Math.random() * Math.PI * 2;
        
        this.resources.set(id, {
          position: {
            x: Math.cos(angle) * distance,
            z: Math.sin(angle) * distance
          },
          value: quality * 20 + 10,
          quality: quality
        });
      }
    }
    
    // Reduced emergency threshold and spawn rate
    if (resourceCount < 5) {
      for (let i = 0; i < 2; i++) {
        const id = `emergency_${Date.now()}_${i}`;
        this.resources.set(id, {
          position: {
            x: (Math.random() - 0.5) * 20,
            z: (Math.random() - 0.5) * 20
          },
          value: 25,
          quality: 0.8
        });
      }
    }
  }

  consumeResource(id) {
    this.resources.delete(id);
  }

  getDynamicSurvivalThreshold(populationSize) {
    const pressureFactor = populationSize / this.carryingCapacity;
    return Math.max(10, 30 * pressureFactor);
  }
}

// Player-Controlled Agent
class PlayerAgent extends Agent {
  constructor(id, position, genotype = null) {
    super(id, position, genotype);
    this.isPlayer = true;
    this.targetPosition = null;
    this.moveSpeed = 2.0;
    this.isActive = false; // Start inactive
  }

  setTargetPosition(x, z) {
    this.targetPosition = { x, z };
  }

  update(environment, agents, isSimulationRunning = true) {
    // Player can still move even when paused for better control
    if (!isSimulationRunning && !this.targetPosition) return 'continue';
    
    // Call parent update for basic mechanics
    this.age++;
    
    const baseLoss = 0.25; // Slightly less energy loss for player
    const infectionPenalty = this.status === 'Infected' ? 0.3 : 0;
    const agePenalty = this.age > this.maxLifespan * 0.8 ? 0.2 : 0;
    
    this.energy = Math.max(0, this.energy - (baseLoss + infectionPenalty + agePenalty));
    this.reproductionCooldown = Math.max(0, this.reproductionCooldown - 1);

    const criticalEnergy = 5;
    const oldAge = this.age >= this.maxLifespan;
    
    if (oldAge || this.energy <= criticalEnergy) {
      const deathChance = oldAge ? 0.05 : (criticalEnergy - this.energy) * 0.03; // More forgiving for player
      if (Math.random() < deathChance) {
        return 'die';
      }
    }

    // SIR mechanics
    if (this.status === 'Infected') {
      this.infectionTimer++;
      if (this.infectionTimer > 40) {
        this.status = 'Recovered';
        this.energy = Math.min(100, this.energy + 15); // Better recovery bonus
        this.updateMeshColor();
      }
    }

    if (this.status === 'Susceptible') {
      const nearbyInfected = agents.filter(agent => 
        agent.status === 'Infected' && 
        this.distanceTo(agent) < this.phenotype.socialDistance
      );
      
      if (nearbyInfected.length > 0) {
        const infectionProbability = 0.02 * (1 - this.phenotype.resistance); // Lower infection rate for player
        if (Math.random() < infectionProbability) {
          this.status = 'Infected';
          this.infectionTimer = 0;
          this.updateMeshColor();
        }
      }
    }

    // Foraging
    this.forage(environment);

    // Player movement
    if (this.targetPosition) {
      const dx = this.targetPosition.x - this.position.x;
      const dz = this.targetPosition.z - this.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > 0.5) {
        this.velocity.x = (dx / distance) * this.moveSpeed;
        this.velocity.z = (dz / distance) * this.moveSpeed;
      } else {
        this.targetPosition = null;
        this.velocity.x *= 0.5;
        this.velocity.z *= 0.5;
      }
    }

    this.updatePosition();

    // Manual reproduction control would go here
    return 'continue';
  }

  updateMeshColor() {
    if (this.mesh && this.mesh.material) {
      let color;
      switch (this.status) {
        case 'Infected':
          color = new THREE.Color(1, 0, 0);
          break;
        case 'Recovered':
          color = new THREE.Color(0, 1, 0);
          break;
        default:
          color = new THREE.Color(1, 1, 1); // White for player
      }
      this.mesh.material.color = color;
      this.mesh.material.emissive = new THREE.Color(0.2, 0.2, 0.2); // Slight glow
    }
  }
}

// Main Ecosystem Simulator Component
const EcosystemSimulator = () => {
  // Initialize global stats tracking for communication
  if (typeof window !== 'undefined' && !window.ecosystemStats) {
    window.ecosystemStats = {
      communicationEvents: 0,
      activeMessages: 0,
      step: 0
    };
  }

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const resourceMeshesRef = useRef(new Map());
  const playerAgentRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isInitializedRef = useRef(false);
  
  const [agents, setAgents] = useState([]);
  const [environment, setEnvironment] = useState(new Environment());
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [playerStats, setPlayerStats] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [cameraMode, setCameraMode] = useState('overview');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [populationHistory, setPopulationHistory] = useState([]);
  const [notification, setNotification] = useState(null);
  const [performanceData, setPerformanceData] = useState({ memory: 0, fps: 0, lastTime: 0 });
  const [llmConfig, setLLMConfig] = useState({
    enabled: false,
    ollamaStatus: 'checking', // 'checking', 'connected', 'disconnected'
    endpoint: 'http://localhost:11434'
  });
  
  // Initialize lean analytics system
  const analyticsRef = useRef(null);
  if (!analyticsRef.current) {
    analyticsRef.current = new EcosystemAnalytics(100, 1000); // 100-step windows, 1000-step checkpoints
    // Make analytics globally available for agents
    if (typeof window !== 'undefined') {
      window.ecosystemAnalytics = analyticsRef.current;
    }
  }
  
  const [stats, setStats] = useState({
    susceptible: 0,
    infected: 0,
    recovered: 0,
    total: 0,
    avgAge: 0,
    avgEnergy: 0,
    causalAgents: 0,
    rlAgents: 0,
    reasoningEvents: 0,
    communicationEvents: 0,
    activeMessages: 0
  });

  // Analysis utility functions
  const exportSimulationState = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      step: step,
      agents: agents.map(a => ({
        id: a.id,
        type: a.constructor.name,
        energy: Math.round(a.energy),
        age: a.age,
        status: a.status,
        position: {
          x: Math.round(a.position.x * 100) / 100,
          y: Math.round(a.position.y * 100) / 100,
          z: Math.round(a.position.z * 100) / 100
        },
        memorySize: a.socialMemory ? Object.keys(a.socialMemory).length : 0,
        trustLevel: a.trustNetwork ? Object.keys(a.trustNetwork).length : 0
      })),
      stats: stats,
      environment: {
        season: environment.season,
        temperature: Math.round(environment.temperature * 100) / 100,
        resourceCount: environment.resources.size,
        diseaseSpread: environment.diseaseSpread
      },
      performance: performanceData
    };
    
    console.log('=== ECOSYSTEM SIMULATION STATE ===');
    console.log(JSON.stringify(data, null, 2));
    console.log('=== END SIMULATION STATE ===');
    
    // Also save to downloadable file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecosystem-state-step-${step}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [step, agents, stats, environment, performanceData]);

  const trackPerformance = useCallback(() => {
    const currentTime = performance.now();
    const memUsage = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
    const timeDiff = currentTime - performanceData.lastTime;
    const fps = timeDiff > 0 ? Math.round(1000 / timeDiff) : 0;
    
    setPerformanceData(prev => ({
      memory: Math.round(memUsage * 100) / 100,
      fps: fps,
      lastTime: currentTime
    }));

    // Log performance every 500 steps
    if (step % 500 === 0 && step > 0) {
      console.log(`🔧 Performance [Step ${step}]: Memory=${memUsage.toFixed(2)}MB, Est.FPS=${fps}`);
    }
  }, [step, performanceData.lastTime]);

  const logPopulationDynamics = useCallback(() => {
    // Log every 100 steps
    if (step % 100 === 0 && step > 0) {
      const agentTypes = agents.reduce((acc, agent) => {
        const type = agent.constructor.name;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      console.log(`📊 Step ${step}: Population=${stats.total}, Infected=${stats.infected}%, ` +
                 `Avg Energy=${stats.avgEnergy.toFixed(1)}, Types=${JSON.stringify(agentTypes)}`);
    }

    // Major milestone logging
    if (step % 1000 === 0 && step > 0) {
      const causalAgents = agents.filter(a => a instanceof CausalAgent);
      const llmEnabledAgents = causalAgents.filter(a => a.llmAvailable);
      
      console.log(`🎯 MILESTONE [Step ${step}]: Major population dynamics analysis`);
      console.log(`   Population Distribution: ${JSON.stringify(agents.reduce((acc, agent) => {
        const type = agent.constructor.name;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}))}`);
      console.log(`   Disease Status: S=${stats.susceptible}, I=${stats.infected}, R=${stats.recovered}`);
      console.log(`   Resource Pressure: ${environment.resources.size} resources for ${stats.total} agents`);
      console.log(`   🧠 AI Reasoning: ${llmEnabledAgents.length}/${causalAgents.length} Causal agents using real LLM`);
    }
  }, [step, stats, agents, environment, llmConfig]);

  // Show notification helper
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const updateResourceVisualization = (scene, resources) => {
    if (!scene) return;
    
    resourceMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
    });
    resourceMeshesRef.current.clear();
    
    resources.forEach((resource, id) => {
      const geometry = new THREE.BoxGeometry(0.5, 0.3, 0.5);
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.3, 0.8, 0.3 + resource.quality * 0.4)
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(resource.position.x, 0.15, resource.position.z);
      scene.add(mesh);
      resourceMeshesRef.current.set(id, mesh);
    });
  };

  const createAgentMesh = (agent, scene) => {
    const geometry = new THREE.SphereGeometry(agent.phenotype.radius, 8, 6);
    
    let baseColor;
    if (agent.isPlayer) {
      baseColor = agent.status === 'Infected' ? 0xff0000 :
                  agent.status === 'Recovered' ? 0x00ff00 : 0xffffff;
    } else if (agent instanceof CausalAgent) {
      baseColor = agent.status === 'Infected' ? 0xff0000 :
                  agent.status === 'Recovered' ? 0x00ff00 : 0xffcc00;
    } else {
      baseColor = agent.status === 'Infected' ? 0xff0000 :
                  agent.status === 'Recovered' ? 0x00ff00 : 0x0080ff;
    }
    
    const material = new THREE.MeshLambertMaterial({ 
      color: baseColor,
      emissive: agent.isPlayer ? new THREE.Color(0.2, 0.2, 0.2) : new THREE.Color(0, 0, 0)
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(agent.position.x, agent.position.y, agent.position.z);
    mesh.castShadow = true;
    agent.mesh = mesh;
    scene.add(mesh);
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || isInitializedRef.current) return;
    
    isInitializedRef.current = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(30, 25, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 20, 20);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x4a6741 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    // Create initial agents
    if (agents.length === 0) {
      const initialAgents = [];
      
      for (let i = 0; i < 25; i++) {
        let agent;
        if (i < 8) {
          // Causal agents (8 agents)
          agent = new CausalAgent(`causal_${i}`, { 
            x: (Math.random() - 0.5) * 30, 
            y: 1, 
            z: (Math.random() - 0.5) * 30 
          });
          // Set initial LLM status (will be updated by connection check)
          agent.llmAvailable = llmConfig.enabled;
          agent.reasoningMode = true;
        } else if (i < 16) {
          // Basic agents (8 agents) - regular Agent class
          agent = new Agent(`basic_${i}`, { 
            x: (Math.random() - 0.5) * 30, 
            y: 1, 
            z: (Math.random() - 0.5) * 30 
          });
        } else {
          // RL agents (9 agents) - enhanced Agent class
          agent = new Agent(`rl_${i}`, { 
            x: (Math.random() - 0.5) * 30, 
            y: 1, 
            z: (Math.random() - 0.5) * 30 
          });
        }
        
        // Seed multiple infected agents for observable epidemic dynamics
        if (i < 3) {
          agent.status = 'Infected';
          agent.infectionTimer = Math.floor(Math.random() * 20); // Random infection stage
        }
        
        createAgentMesh(agent, scene);
        initialAgents.push(agent);
      }
      
      setAgents(initialAgents);
    }

    updateResourceVisualization(scene, environment.resources);

    // Mouse click handler for agent selection only
    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const agentMeshes = agents.map(a => a.mesh).filter(m => m);
      const intersects = raycasterRef.current.intersectObjects(agentMeshes);
      
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const clickedAgent = agents.find(a => a.mesh === clickedMesh);
        
        if (clickedAgent instanceof CausalAgent && clickedAgent.lastReasoning) {
          setSelectedAgent({
            id: clickedAgent.id,
            personality: clickedAgent.personality,
            reasoning: clickedAgent.lastReasoning.reasoning,
            confidence: clickedAgent.lastReasoning.confidence,
            age: clickedAgent.age,
            energy: Math.round(clickedAgent.energy),
            status: clickedAgent.status,
            history: clickedAgent.reasoningHistory.slice(-5),
            communications: clickedAgent.socialMemory.receivedMessages.slice(-3),
            knownAgents: clickedAgent.socialMemory.knownAgents.size,
            knownResources: clickedAgent.knownResourceLocations?.length || 0,
            dangerZones: clickedAgent.dangerZones?.length || 0,
            helpRequests: clickedAgent.helpRequests?.length || 0,
            avgTrust: clickedAgent.calculateAverageTrust ? clickedAgent.calculateAverageTrust() : 0.5
          });
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (agents && agents.length > 0) {
        agents.forEach(agent => {
          if (agent.mesh && agent.position) {
            agent.mesh.position.set(agent.position.x, agent.position.y, agent.position.z);
          }
        });
      }
      
      // Follow camera mode - follow a random causal agent instead of player
      if (cameraMode === 'follow' && !gameOver) {
        const causalAgents = agents.filter(a => a instanceof CausalAgent);
        if (causalAgents.length > 0) {
          const followAgent = causalAgents[0]; // Follow first causal agent
          const agentPos = followAgent.position;
          camera.position.set(agentPos.x + 10, 15, agentPos.z + 10);
          camera.lookAt(agentPos.x, agentPos.y, agentPos.z);
        }
      }
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (mountRef.current) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (mountRef.current && rendererRef.current) {
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('click', handleClick);
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
        rendererRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []);

  // Check LLM (Ollama) connection status
  useEffect(() => {
    let isCancelled = false;
    let checkInterval;
    
    const checkOllamaConnection = async () => {
      if (isCancelled) return;
      
      try {
        const endpoint = llmConfig.endpoint || 'http://localhost:11434';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // Reduced timeout
        
        const response = await fetch(`${endpoint}/api/tags`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok && !isCancelled) {
          const data = await response.json();
          const hasModel = data.models?.some(m => 
            m.name.includes('gpt') || 
            m.name.includes('llama') || 
            m.name.includes('mistral') || 
            m.name.includes('codellama')
          );
          
          // Only update if status actually changed
          setLLMConfig(prev => {
            if (prev.ollamaStatus !== 'connected' || prev.enabled !== hasModel) {
              console.log(`🤖 Ollama Status: Connected. LLM ${hasModel ? 'ENABLED' : 'NO MODELS'}`);
              
              // Update agents only when status changes
              setTimeout(() => {
                setAgents(currentAgents => {
                  return currentAgents.map(agent => {
                    if (agent instanceof CausalAgent && agent.llmAvailable !== hasModel) {
                      agent.llmAvailable = hasModel;
                      agent.reasoningMode = hasModel;
                    }
                    return agent;
                  });
                });
              }, 0);
              
              if (hasModel && prev.ollamaStatus !== 'connected') {
                showNotification('🧠 LLM Connected & Ready!', 'success');
              }
            }
            
            return { 
              ...prev, 
              ollamaStatus: 'connected',
              enabled: hasModel
            };
          });
        } else if (!isCancelled) {
          throw new Error('Ollama not responding');
        }
      } catch (error) {
        if (!isCancelled) {
          setLLMConfig(prev => {
            if (prev.ollamaStatus !== 'disconnected') {
              console.log('🤖 Ollama disconnected - Using simulated reasoning');
              
              // Update agents only when status changes
              setTimeout(() => {
                setAgents(currentAgents => {
                  return currentAgents.map(agent => {
                    if (agent instanceof CausalAgent && agent.llmAvailable !== false) {
                      agent.llmAvailable = false;
                      agent.reasoningMode = true; // Still use reasoning, but simulated
                    }
                    return agent;
                  });
                });
              }, 0);
            }
            
            return { ...prev, ollamaStatus: 'disconnected', enabled: false };
          });
        }
      }
    };
    
    // Initial connection check
    checkOllamaConnection();
    
    // Recheck every 60 seconds (less frequent)
    checkInterval = setInterval(checkOllamaConnection, 60000);
    
    return () => {
      isCancelled = true;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []); // Remove dependencies to prevent constant re-running

  const simulationStep = useCallback(() => {
    if (!sceneRef.current || !isRunning) return;

    setAgents(currentAgents => {
      const newAgents = [...currentAgents];
      const toRemove = [];
      const toAdd = [];
      
      newAgents.forEach(agent => {
        agent.isActive = true;
      });

      newAgents.forEach((agent, index) => {
        const result = agent.update(environment, newAgents, true);
        
        switch (result) {
          case 'die':
            toRemove.push(index);
            // Record death event in analytics
            if (analyticsRef.current) {
              const agentType = agent.constructor.name === 'CausalAgent' ? 'Causal' : 
                              (agent.id.includes('basic') ? 'Basic' : 'RL');
              const deathCause = agent.energy <= 5 ? 'starvation' : 
                               agent.status === 'Infected' ? 'infection' : 'old_age';
              analyticsRef.current.recordEvent('death', {
                agent_id: agent.id,
                agent_type: agentType,
                cause: deathCause,
                age: agent.age,
                energy: agent.energy
              });
            }
            break;
          case 'reproduce':
            if (newAgents.length < 120) {
              let offspring;
              
              if (agent instanceof CausalAgent) {
                offspring = new CausalAgent(
                  `causal_offspring_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  { 
                    x: agent.position.x + (Math.random() - 0.5) * 3, 
                    y: 1, 
                    z: agent.position.z + (Math.random() - 0.5) * 3 
                  },
                  agent.reproduce().genotype
                );
                // Inherit LLM capabilities from parent
                offspring.llmAvailable = agent.llmAvailable;
                offspring.reasoningMode = agent.reasoningMode;
              } else {
                offspring = agent.reproduce();
              }
              
              createAgentMesh(offspring, sceneRef.current);
              toAdd.push(offspring);
              
              // Record birth event in analytics
              if (analyticsRef.current) {
                const parentType = agent.constructor.name === 'CausalAgent' ? 'Causal' : 
                                 (agent.id.includes('basic') ? 'Basic' : 'RL');
                const offspringType = offspring.constructor.name === 'CausalAgent' ? 'Causal' : 
                                    (offspring.id.includes('basic') ? 'Basic' : 'RL');
                analyticsRef.current.recordEvent('birth', {
                  parent_id: agent.id,
                  parent_type: parentType,
                  offspring_id: offspring.id,
                  offspring_type: offspringType,
                  parent_age: agent.age,
                  parent_energy: agent.energy
                });
              }
            }
            break;
        }
      });

      toRemove.reverse().forEach(index => {
        const agent = newAgents[index];
        if (agent.mesh) {
          sceneRef.current.remove(agent.mesh);
        }
        newAgents.splice(index, 1);
      });

      toAdd.forEach(agent => newAgents.push(agent));

      // Update stats - no more player stats needed
      const susceptible = newAgents.filter(a => a.status === 'Susceptible').length;
      const infected = newAgents.filter(a => a.status === 'Infected').length;
      const recovered = newAgents.filter(a => a.status === 'Recovered').length;
      const totalAge = newAgents.reduce((sum, a) => sum + a.age, 0);
      const totalEnergy = newAgents.reduce((sum, a) => sum + a.energy, 0);
      const causalAgents = newAgents.filter(a => a instanceof CausalAgent).length;
      const rlAgents = newAgents.filter(a => !(a instanceof CausalAgent)).length;
      
      setStats({
        susceptible,
        infected,
        recovered,
        total: newAgents.length,
        avgAge: newAgents.length > 0 ? Math.round(totalAge / newAgents.length) : 0,
        avgEnergy: newAgents.length > 0 ? Math.round(totalEnergy / newAgents.length) : 0,
        causalAgents,
        rlAgents,
        reasoningEvents: 0,
        communicationEvents: window.ecosystemStats?.communicationEvents || 0,
        activeMessages: window.ecosystemStats?.activeMessages || 0
      });

      // Record analytics data for current step
      if (analyticsRef.current) {
        analyticsRef.current.recordStep(step, newAgents, newEnvironment, {
          susceptible,
          infected,
          recovered,
          total: newAgents.length,
          avgAge: newAgents.length > 0 ? Math.round(totalAge / newAgents.length) : 0,
          avgEnergy: newAgents.length > 0 ? Math.round(totalEnergy / newAgents.length) : 0,
          fps: performanceData.fps
        });
      }

      return newAgents;
    });

    const newEnvironment = environment.update();
    setEnvironment(newEnvironment);
    
    if (sceneRef.current) {
      updateResourceVisualization(sceneRef.current, newEnvironment.resources);
    }

    setStep(s => {
      const newStep = s + 1;
      
      // Track performance data
      trackPerformance();
      
      // Log population dynamics
      logPopulationDynamics();
      
      if (newStep % 10 === 0) {
        setPopulationHistory(history => {
          const newHistory = [...history, {
            step: newStep,
            total: stats.total,
            infected: stats.infected,
            susceptible: stats.susceptible,
            recovered: stats.recovered
          }];
          return newHistory.slice(-50);
        });
      }
      return newStep;
    });
  }, [environment, stats, gameOver, isRunning, trackPerformance, logPopulationDynamics]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      simulationStep();
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, simulationStep]);

  const resetSimulation = () => {
    setIsRunning(false);
    setStep(0);
    setPopulationHistory([]);
    setGameOver(false);
    setPlayerStats(null);
    
    // Clear existing agent meshes
    agents.forEach(agent => {
      if (agent.mesh && sceneRef.current) {
        sceneRef.current.remove(agent.mesh);
        agent.mesh = null;
      }
    });

    resourceMeshesRef.current.forEach((mesh) => {
      if (sceneRef.current) {
        sceneRef.current.remove(mesh);
      }
    });
    resourceMeshesRef.current.clear();

    const newEnvironment = new Environment();
    setEnvironment(newEnvironment);

    // Create new agents - no player needed
    const newAgents = [];
    
    for (let i = 0; i < 25; i++) {
      let agent;
      
      if (i < 8) {
        // Causal agents (8 agents)
        agent = new CausalAgent(`causal_reset_${i}_${Date.now()}`, { 
          x: (Math.random() - 0.5) * 30, 
          y: 1, 
          z: (Math.random() - 0.5) * 30 
        });
        // Inherit current LLM status
        agent.llmAvailable = llmConfig.enabled && llmConfig.ollamaStatus === 'connected';
        agent.reasoningMode = true;
      } else if (i < 16) {
        // Basic agents (8 agents)
        agent = new Agent(`basic_reset_${i}_${Date.now()}`, { 
          x: (Math.random() - 0.5) * 30, 
          y: 1, 
          z: (Math.random() - 0.5) * 30 
        });
      } else {
        // RL agents (9 agents)
        agent = new Agent(`rl_reset_${i}_${Date.now()}`, { 
          x: (Math.random() - 0.5) * 30, 
          y: 1, 
          z: (Math.random() - 0.5) * 30 
        });
      }
      
      // Seed multiple infected agents for observable epidemic dynamics
      if (i < 3) {
        agent.status = 'Infected';
        agent.infectionTimer = Math.floor(Math.random() * 20); // Random infection stage
      }
      
      createAgentMesh(agent, sceneRef.current);
      newAgents.push(agent);
    }
    
    setAgents(newAgents);
    
    if (sceneRef.current) {
      updateResourceVisualization(sceneRef.current, newEnvironment.resources);
    }
  };

  const PopulationChart = () => {
    const svgRef = useRef();

    useEffect(() => {
      if (populationHistory.length < 2) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const margin = { top: 20, right: 30, bottom: 30, left: 40 };
      const width = 300 - margin.left - margin.right;
      const height = 150 - margin.top - margin.bottom;

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear()
        .domain(d3.extent(populationHistory, d => d.step))
        .range([0, width]);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(populationHistory, d => d.total)])
        .range([height, 0]);

      const line = d3.line()
        .x(d => xScale(d.step))
        .y(d => yScale(d.total))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(populationHistory)
        .attr("fill", "none")
        .attr("stroke", "#0080ff")
        .attr("stroke-width", 2)
        .attr("d", line);

      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

      g.append("g")
        .call(d3.axisLeft(yScale));

    }, [populationHistory]);

    return <svg ref={svgRef} width="300" height="150"></svg>;
  };

  return (
    <div className="w-full h-screen bg-gray-900 flex">
      <div className="flex-1 relative">
        <div 
          ref={mountRef} 
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
        
        {/* Notification Toast */}
        {notification && (
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-lg transition-all ${
            notification.type === 'success' ? 'bg-green-600' :
            notification.type === 'warning' ? 'bg-yellow-600' :
            notification.type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          }`}>
            {notification.message}
          </div>
        )}
        
        {/* Control Overlay */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-80 p-4 rounded-lg text-white max-w-md">
          <h2 className="text-xl font-bold mb-2">🔬 Ecosystem Observer Mode</h2>
          <p className="text-sm mb-3 text-gray-300">
            Watch autonomous agents survive, evolve, and interact in this complex ecosystem simulation.
          </p>
          
          {gameOver ? (
            <div className="bg-red-900 p-3 rounded mb-3">
              <h3 className="text-lg font-bold text-red-300">🏁 Simulation Complete</h3>
              <p className="text-sm">Population dynamics observed for {step} steps</p>
            </div>
          ) : null}
          
          <div className="space-y-2">
            <button
              onClick={() => {
                setIsRunning(!isRunning);
                agents.forEach(agent => {
                  agent.isActive = !isRunning;
                });
              }}
              className={`px-4 py-2 rounded ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isRunning ? '⏸ Pause' : '▶ Start'} Simulation
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded ml-2"
            >
              🔄 Reset
            </button>
            <button
              onClick={() => setCameraMode(cameraMode === 'overview' ? 'follow' : 'overview')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded ml-2"
            >
              📷 {cameraMode === 'overview' ? 'Follow Agent' : 'Overview'}
            </button>
          </div>
          
          {/* Analysis Controls */}
          <div className="mt-2 space-y-2">
            <button
              onClick={() => analyticsRef.current?.exportAnalytics()}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-sm mr-2"
              title="Export lean windowed analytics (optimized for analysis)"
            >
              📊 Export Analytics
            </button>
            <button
              onClick={exportSimulationState}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm mr-2"
              title="Export full simulation state (detailed snapshot)"
            >
              � Export Snapshot
            </button>
            <div className="text-xs text-cyan-300 mt-1">
              Performance: {performanceData.memory}MB RAM, {performanceData.fps} FPS
            </div>
            <div className="text-xs text-purple-300 mt-1">
              Windows: {analyticsRef.current?.windowHistory?.length || 0} | 
              Checkpoints: {analyticsRef.current?.checkpoints?.length || 0}
            </div>
            <div className={`text-xs mt-1 ${
              llmConfig.ollamaStatus === 'connected' && llmConfig.enabled 
                ? 'text-green-300' 
                : llmConfig.ollamaStatus === 'checking' 
                  ? 'text-yellow-300' 
                  : 'text-red-300'
            }`}>
              🧠 LLM: {(() => {
                if (llmConfig.ollamaStatus === 'checking') return 'Checking Ollama...';
                if (llmConfig.ollamaStatus === 'connected' && llmConfig.enabled) return 'Real AI Active';
                return 'Simulated Only';
              })()}
            </div>
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            <p>• <strong>Click Agent:</strong> View reasoning details</p>
            <p>• <strong>Right Drag:</strong> Rotate camera</p>
            <p>• <strong>Scroll:</strong> Zoom in/out</p>
            <p>• <strong>Export Analytics:</strong> Lean windowed data for analysis</p>
            <p>• <strong>Export Snapshot:</strong> Full current state</p>
            <p>• <strong className="text-yellow-300">Gold agents:</strong> Advanced AI reasoning</p>
            <p>• <strong className="text-blue-300">Blue agents:</strong> Reinforcement learning</p>
            <p>• <strong className="text-red-300">Red agents:</strong> Infected (spreading disease)</p>
            <p>• <strong className="text-green-300">Green cubes:</strong> Resources to collect</p>
            <p className="text-purple-300 mt-1">� Analytics: Event-driven windows every 100 steps, checkpoints every 1000</p>
          </div>
        </div>
        
        {/* Agent Details Display */}
        {selectedAgent && (
          <div className="absolute top-20 right-4 bg-black bg-opacity-95 p-4 rounded-lg max-w-md border border-yellow-400">
            <h3 className="text-lg font-bold text-yellow-300 mb-2">
              🧠 Agent {selectedAgent.id}
            </h3>
            <button 
              onClick={() => setSelectedAgent(null)}
              className="mt-3 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs w-full"
            >
              Close
            </button>
          </div>
        )}
      </div>

      <div className="w-96 bg-gray-800 text-white p-4 overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">🔬 Scientific Dashboard</h3>
        
        <div className="mb-6 p-3 bg-gray-700 rounded border-l-4 border-yellow-400">
          <h4 className="text-md font-semibold mb-2 text-yellow-300">🧠 AI Agents</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-yellow-400">🟡 Causal Agents:</span>
              <span className="font-mono">{stats.causalAgents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-400">🔵 RL Agents:</span>
              <span className="font-mono">{stats.rlAgents}</span>
            </div>
          </div>
        </div>

        <div className="mb-6 p-3 bg-gray-700 rounded">
          <h4 className="text-md font-semibold mb-2 text-blue-300">📊 SIR Disease Model</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-400">🔵 Susceptible:</span>
              <span className="font-mono">{stats.susceptible}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">🔴 Infected:</span>
              <span className="font-mono">{stats.infected}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">🟢 Recovered:</span>
              <span className="font-mono">{stats.recovered}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>👥 Population:</span>
              <span className="font-mono">{stats.total}</span>
            </div>
          </div>
        </div>

        {populationHistory.length > 1 && (
          <div className="mb-6 p-3 bg-gray-700 rounded">
            <h4 className="text-md font-semibold mb-2 text-purple-300">📈 Population Dynamics</h4>
            <PopulationChart />
          </div>
        )}

        <div className="mb-6 p-3 bg-gray-700 rounded">
          <h4 className="text-md font-semibold mb-2 text-yellow-300">🧠 Agent Intelligence</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Avg Age:</span>
              <span className="font-mono">{stats.avgAge} steps</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Energy:</span>
              <span className="font-mono">{stats.avgEnergy}%</span>
            </div>
            <div className="flex justify-between">
              <span>Learning:</span>
              <span className="text-green-400">MARL Active</span>
            </div>
          </div>
        </div>

        <div className="mb-6 p-3 bg-gray-700 rounded">
          <h4 className="text-md font-semibold mb-2 text-green-300">🌍 Environment</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Season:</span>
              <span className="capitalize font-mono">{environment.season}</span>
            </div>
            <div className="flex justify-between">
              <span>Temperature:</span>
              <span className="font-mono">{Math.round(environment.temperature)}°C</span>
            </div>
            <div className="flex justify-between">
              <span>Resources:</span>
              <span className="font-mono">{environment.resources.size}</span>
            </div>
            <div className="flex justify-between">
              <span>Weather:</span>
              <span className="capitalize font-mono">{environment.weather}</span>
            </div>
          </div>
        </div>

        <div className="mb-6 p-3 bg-gray-700 rounded">
          <h4 className="text-md font-semibold mb-2 text-cyan-300">⚡ Runtime</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Step:</span>
              <span className="font-mono">{step.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={`font-mono ${isRunning ? 'text-green-400' : 'text-red-400'}`}>
                {isRunning ? 'EVOLVING' : 'PAUSED'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          <h4 className="font-semibold mb-2">🎮 Controls:</h4>
          <p>• Click to move white player agent</p>
          <p>• Survive and watch AI evolve!</p>
        </div>
      </div>
    </div>
  );
};

export default EcosystemSimulator;