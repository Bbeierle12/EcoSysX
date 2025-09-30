/**
 * Agent classes for EcoSysX Core Engine
 * 
 * These classes contain the pure agent logic separated from any UI concerns.
 * They can run independently of React, Three.js, or any visualization framework.
 */

import { TIME_V1, hazardProbability } from './EcosystemEngine.js';

// Message types for agent communication
export const MessageTypes = {
  RESOURCE_TIP: 'resource_tip',
  INFECTION_WARNING: 'infection_warning',
  HELP_REQUEST: 'help_request',
  ALLIANCE_REQUEST: 'alliance_request',
  TRADE_OFFER: 'trade_offer'
};

export class Message {
  constructor(from, to, type, content, priority = 'normal') {
    this.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.from = from;
    this.to = to;
    this.type = type;
    this.content = content;
    this.priority = priority;
    this.timestamp = Date.now();
    this.processed = false;
  }
}

// ================================
// REINFORCEMENT LEARNING POLICY
// ================================

export class ReinforcementLearningPolicy {
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

// ================================
// SOCIAL MEMORY SYSTEM
// ================================

export class SocialMemory {
  constructor() {
    this.knownAgents = new Map();
    this.receivedMessages = [];
    this.maxMessages = 20;
    this.maxKnownAgents = 200;
    this.trustDecayRate = 0.001;
    this.minTrust = 0.0;
    this.maxTrust = 1.0;
    this.neutralTrust = 0.5;
    this.pruneStats = { knownAgentsRemoved: 0 };
  }

  rememberAgent(agentId, interaction) {
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
    memory.interactions++;
    memory.lastSeen = Date.now();
    
    if (interaction) {
      memory.sharedInfo.push({
        type: interaction.type,
        timestamp: Date.now()
      });
      
      if (memory.sharedInfo.length > 50) {
        memory.sharedInfo.shift();
      }
    }

    // Prune if over cap
    if (this.knownAgents.size > this.maxKnownAgents) {
      const before = this.knownAgents.size;
      const toRemove = Array.from(this.knownAgents.entries())
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen)
        .slice(0, this.knownAgents.size - this.maxKnownAgents);
      toRemove.forEach(([id]) => this.knownAgents.delete(id));
      const removed = before - this.knownAgents.size;
      if (removed > 0) this.pruneStats.knownAgentsRemoved += removed;
    }
  }

  updateTrust(agentId, change, reason = 'interaction') {
    const memory = this.knownAgents.get(agentId);
    if (!memory) return;
    
    const oldTrust = memory.trust;
    memory.trust = Math.max(this.minTrust, Math.min(this.maxTrust, memory.trust + change));
    
    memory.sharedInfo.push({
      type: 'trust_change',
      reason: reason,
      change: change,
      newTrust: memory.trust,
      timestamp: Date.now()
    });
  }

  getTrust(agentId) {
    const memory = this.knownAgents.get(agentId);
    return memory ? memory.trust : this.neutralTrust;
  }

  isAgentTrusted(agentId, threshold = 0.4) {
    return this.getTrust(agentId) >= threshold;
  }

  decayTrust() {
    this.knownAgents.forEach((memory, agentId) => {
      const timeSinceLastSeen = Date.now() - memory.lastSeen;
      if (timeSinceLastSeen > 5000) {
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

  receiveMessage(message) {
    this.addReceivedMessage(message);
    
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
    
    if (!memory.recentObservations) {
      memory.recentObservations = [];
    }
    memory.recentObservations.push(observation);
    if (memory.recentObservations.length > 10) {
      memory.recentObservations.shift();
    }

    if (this.knownAgents.size > this.maxKnownAgents) {
      const before = this.knownAgents.size;
      const toRemove = Array.from(this.knownAgents.entries())
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen)
        .slice(0, this.knownAgents.size - this.maxKnownAgents);
      toRemove.forEach(([id]) => this.knownAgents.delete(id));
      const removed = before - this.knownAgents.size;
      if (removed > 0) this.pruneStats.knownAgentsRemoved += removed;
    }
  }
}

// ================================
// BASE AGENT CLASS
// ================================

export class Agent {
  constructor(id, position, genotype = null, currentStep = 0) {
    this.id = id;
    this.position = { ...position };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.genotype = genotype || this.generateRandomGenotype();
    this.phenotype = this.expressPhenotype();
    this.birth_step = currentStep;
    this.energy = 100;
    this.status = 'Susceptible';
    this.infectionTimer = 0;
    this.maxLifespan = this.genotype.lifespan;
    this.learningPolicy = new ReinforcementLearningPolicy();
    this.reproductionCooldown = 0;
    this.isActive = false;
    
    // For UI compatibility - will be set by UI layer
    this.mesh = null;
  }

  // Age calculation based on birth_step and current simulation step
  getAge(currentStep) {
    return Math.max(0, currentStep - this.birth_step);
  }

  // Age in days for biological processes
  getAgeDays(currentStep) {
    return TIME_V1.stepToDays(this.getAge(currentStep));
  }

  // Temporary fallback getter for backwards compatibility
  get age() {
    if (typeof this.birth_step === 'undefined' || this.birth_step === null) {
      return 0;
    }
    const estimatedCurrentStep = 100;
    return Math.max(0, estimatedCurrentStep - this.birth_step);
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

  update(environment, agents, currentStep, isSimulationRunning = true) {
    if (!isSimulationRunning) return 'continue';
    
    const age = this.getAge(currentStep);
    const ageDays = this.getAgeDays(currentStep);
    
    // Get weather effects
    const weatherEffects = environment.getWeatherEffects();
    const terrainEffects = environment.getTerrainEffects(this.position);
    
    // Energy consumption with environmental effects
    const baseLoss = 0.5;
    const infectionPenalty = this.status === 'Infected' ? 0.6 : 0;
    const agePenalty = age > this.maxLifespan * 0.8 ? 0.3 : 0;
    
    const weatherEnergyPenalty = (weatherEffects.energyConsumptionMultiplier - 1.0) * 0.4;
    const shelterPenalty = (weatherEffects.shelterNeed > 0.5 && !terrainEffects.isInShelter) ? 0.3 : 0;
    const terrainEnergyBonus = terrainEffects.energyBonus;
    const exposurePenalty = terrainEffects.weatherExposureMultiplier > 1.0 ? 
      (terrainEffects.weatherExposureMultiplier - 1.0) * weatherEffects.energyConsumptionMultiplier * 0.2 : 0;
    
    const totalEnergyLoss = baseLoss + infectionPenalty + agePenalty + weatherEnergyPenalty + 
                           shelterPenalty + exposurePenalty - terrainEnergyBonus;
    
    this.energy = Math.max(0, this.energy - totalEnergyLoss);
    this.reproductionCooldown = Math.max(0, this.reproductionCooldown - 1);

    // Death conditions
    const baseCriticalEnergy = 5;
    const weatherCriticalEnergy = Math.max(2, baseCriticalEnergy - (weatherEffects.shelterNeed * 3));
    const oldAge = age >= this.maxLifespan;
    
    if (oldAge || this.energy <= weatherCriticalEnergy) {
      let deathChance = oldAge ? 0.1 : (weatherCriticalEnergy - this.energy) * 0.05;
      
      if (environment.environmentalStress.heatStress > 0.7) deathChance += 0.15;
      if (environment.environmentalStress.coldStress > 0.7) deathChance += 0.12;
      if (environment.environmentalStress.stormStress > 0.8) deathChance += 0.1;
      
      if (Math.random() < deathChance) {
        return 'die';
      }
    }

    // Infection mechanics
    if (this.status === 'Infected') {
      this.infectionTimer++;
      let recoveryTime = 40;
      
      if (environment.environmentalStress.coldStress > 0.3) recoveryTime *= 0.8;
      if (environment.environmentalStress.heatStress > 0.5) recoveryTime *= 1.3;
      
      if (this.infectionTimer > recoveryTime) {
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
        const baseInfectionRate = 0.15;
        const weatherInfectionMultiplier = weatherEffects.infectionSpreadMultiplier;
        const terrainInfectionModifier = 1.0 + terrainEffects.infectionRiskModifier;
        const shelterProtection = terrainEffects.weatherProtection;
        
        const finalInfectionMultiplier = weatherInfectionMultiplier * terrainInfectionModifier * (1 - shelterProtection * 0.6);
        const infectionProbability = baseInfectionRate * finalInfectionMultiplier * (1 - this.phenotype.resistance);
        
        if (Math.random() < infectionProbability) {
          this.status = 'Infected';
          this.infectionTimer = 0;
          this.updateMeshColor();
        }
      }
    }

    // Foraging
    this.forageWithWeatherEffects(environment, weatherEffects);

    // Movement and actions
    const observation = this.getObservation(environment, agents, currentStep);
    const action = this.learningPolicy.getAction(observation);
    
    action.intensity *= weatherEffects.movementSpeedMultiplier;
    
    this.applyAction(action, environment);
    this.updatePosition();

    // Reproduction
    const reproductionThreshold = Math.max(30, this.genotype.reproductionThreshold * 0.7);
    let populationPressure = agents.length < 15 ? 2.0 : agents.length > 50 ? 0.5 : 1.0;
    
    if (weatherEffects.shelterNeed > 0.6) populationPressure *= 0.5;
    if (environment.environmentalStress.stormStress > 0.5) populationPressure *= 0.3;
    
    const baseRate = 0.015 * populationPressure;
    
    if (this.energy > reproductionThreshold && 
        this.reproductionCooldown === 0 && 
        age > 20 && 
        Math.random() < baseRate) {
      return 'reproduce';
    }

    return 'continue';
  }

  forageWithWeatherEffects(environment, weatherEffects) {
    environment.resources.forEach((resource, id) => {
      const distance = Math.sqrt(
        Math.pow(this.position.x - resource.position.x, 2) +
        Math.pow(this.position.z - resource.position.z, 2)
      );
      
      if (distance < 3) {
        let baseGain = resource.value * this.phenotype.efficiency;
        const weatherForagingEfficiency = Math.max(0.3, 1.0 - (weatherEffects.shelterNeed * 0.4));
        
        if (resource.weatherResistant && weatherEffects.shelterNeed > 0.5) {
          baseGain *= 1.5;
        }
        
        const efficiencyBonus = this.status === 'Recovered' ? 1.2 : 1.0;
        const energyGain = baseGain * efficiencyBonus * weatherForagingEfficiency;
        
        this.energy = Math.min(100, this.energy + energyGain);
        environment.consumeResource(id);
        
        if (weatherEffects.shelterNeed > 0.5 && this.reproductionCooldown > 0) {
          this.reproductionCooldown = Math.max(0, this.reproductionCooldown - 30);
        }
      }
    });
  }

  getObservation(environment, agents, currentStep) {
    const nearbyAgents = agents.filter(agent => 
      agent.id !== this.id && this.distanceTo(agent) < 8
    );
    
    const nearestResource = this.findNearestResource(environment);
    
    return {
      position: this.position,
      energy: this.energy,
      nearbyCount: nearbyAgents.length,
      nearbyInfected: nearbyAgents.filter(a => a.status === 'Infected').length,
      age: this.getAge(currentStep),
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
    if (!this.isActive) return;
    
    const moveIntensity = action.intensity * this.phenotype.maxSpeed;
    
    if (action.type || action.llmAction) {
      const actionType = action.type || action.llmAction;
      
      switch (actionType) {
        case 'forage':
          this.applyForageAction(action, environment, moveIntensity);
          break;
        case 'avoid':
          this.applyAvoidanceAction(action, environment.agents, moveIntensity);
          break;
        case 'reproduce':
          this.applyReproductionAction(action, moveIntensity);
          break;
        case 'rest':
          this.applyRestAction(action, moveIntensity);
          break;
        case 'explore':
        default:
          this.applyExploreAction(action, moveIntensity);
          break;
      }
    } else {
      this.applyDefaultAction(action, environment, moveIntensity);
    }
  }

  applyForageAction(action, environment, moveIntensity) {
    const nearestResource = this.findNearestResource(environment);
    if (nearestResource) {
      const dx = nearestResource.resource.position.x - this.position.x;
      const dz = nearestResource.resource.position.z - this.position.z;
      const magnitude = Math.sqrt(dx * dx + dz * dz);
      
      if (magnitude > 0) {
        this.velocity.x += (dx / magnitude) * moveIntensity * 0.8;
        this.velocity.z += (dz / magnitude) * moveIntensity * 0.8;
      }
    } else {
      this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.3;
      this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.3;
    }
  }

  applyAvoidanceAction(action, agents, moveIntensity) {
    const infectedAgents = (agents || []).filter(a => 
      a.status === 'Infected' && 
      a.id !== this.id && 
      this.distanceTo(a) < 10
    );
    
    if (infectedAgents.length > 0) {
      let avoidX = 0;
      let avoidZ = 0;
      
      infectedAgents.forEach(infected => {
        const dx = this.position.x - infected.position.x;
        const dz = this.position.z - infected.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance > 0) {
          avoidX += (dx / distance) / infectedAgents.length;
          avoidZ += (dz / distance) / infectedAgents.length;
        }
      });
      
      this.velocity.x += avoidX * moveIntensity;
      this.velocity.z += avoidZ * moveIntensity;
    } else {
      this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.3;
      this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.3;
    }
  }

  applyReproductionAction(action, moveIntensity) {
    this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.4;
    this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.4;
  }

  applyRestAction(action, moveIntensity) {
    this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.1;
    this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.1;
  }

  applyExploreAction(action, moveIntensity) {
    this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.5;
    this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.5;
  }

  applyDefaultAction(action, environment, moveIntensity) {
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
  }

  distanceTo(other) {
    const dx = this.position.x - other.position.x;
    const dz = this.position.z - other.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  // Placeholder for UI compatibility
  updateMeshColor() {
    // This will be handled by UI layer
  }

  reproduce(partner = null, currentStep = 0) {
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
      newGenotype,
      currentStep
    );
    
    this.reproductionCooldown = 60;
    this.energy -= 15;
    
    return offspring;
  }
}

// ================================
// CAUSAL AGENT CLASS
// ================================

export class CausalAgent extends Agent {
  constructor(id, position, genotype = null, currentStep = 0) {
    super(id, position, genotype, currentStep);
    this.reasoningHistory = [];
    this.lastReasoning = null;
    this.reasoningMode = false;
    this.decisionCount = 0;
    this.reasoningSuccessRate = 0;
    this.llmAvailable = false;
    this.personality = this.generatePersonality();
    this.pendingReasoning = null;
    this.queuedAction = null;
    this.reasoningFrequency = 0.3;
    this.socialMemory = new SocialMemory();
    this.communicationCooldown = 0;
    this.messageQueue = [];
    this.lastCommunication = null;
    this.isActive = false;
    
    // Advanced social systems
    this.knownResourceLocations = [];
    this.dangerZones = [];
    this.helpRequests = [];
    this.maxKnownResources = 30;
    this.maxDangerZones = 40;
    this.maxHelpRequests = 50;
    
    // Influence tracking system
    this.decisionHistory = [];
    this.currentDecisionInfluences = {
      social: 0,
      individual: 0,
      environmental: 0,
      random: 0
    };
    this.influenceMetrics = {
      totalDecisions: 0,
      socialInfluenceRatio: 0,
      individualInfluenceRatio: 0,
      environmentalInfluenceRatio: 0,
      recentSocialInfluence: 0,
      decisionQuality: 0,
      socialDecisionSuccess: 0,
      individualDecisionSuccess: 0
    };
    this.maxDecisionHistory = 100;
    this.socialInfoInfluence = 0.7;
    this.informationDecay = 300;
    this.lastInfoUpdate = 0;
    this.helpRequestCooldown = 0;
    this.resourceSharingRange = 12;
    
    // Alliance system
    this.alliances = new Map();
    this.allianceInvitations = [];
    this.allianceCooldown = 0;
    this.maxAlliances = 3;
    
    // Territorial system
    this.territory = null;
    this.territorialInstinct = Math.random() * 0.8 + 0.2;
    this.territoryDefensiveness = Math.random() * 0.9 + 0.1;
    this.territoryPatrolRadius = 10;
    
    // Resource trading system
    this.resourceInventory = new Map();
    this.tradeOffers = [];
    this.tradingReputation = 0.5;
    this.maxInventorySize = 3;
    this.tradingRange = 8;
    
    // Enhanced help request system
    this.helpRequestCooldown = 0;
    this.helpResponseHistory = [];
    this.currentHelpRequest = null;
    this.helpingReputation = 0.5;
    this.reciprocityMemory = new Map();
  }

  generatePersonality() {
    const traits = ['cautious', 'aggressive', 'social', 'solitary', 'curious', 'conservative'];
    return traits[Math.floor(Math.random() * traits.length)];
  }

  // Core reasoning method - this would integrate with LLM service
  async simulateLLMReasoning(observation, agents) {
    // This method would call external LLM service
    // For now, return simulated reasoning
    return this.fallbackSimulatedReasoning(observation, agents);
  }

  fallbackSimulatedReasoning(observation, agents) {
    const prompt = this.buildCausalPrompt(observation, agents);
    const chainOfThought = this.generateChainOfThought(prompt, observation);
    const action = this.reasonToAction(chainOfThought, observation);
    
    this.decisionCount++;
    
    const result = {
      action: action,
      chainOfThought: chainOfThought,
      confidence: Math.random() * 0.4 + 0.6,
      reasoning: chainOfThought.conclusion,
      isRealLLM: false
    };
    
    this.lastReasoning = result;
    
    return result;
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
    
    const socialIntelligence = this.analyzeSocialInformation();
    
    return {
      energyStatus,
      nearbyThreats,
      resourceDistance,
      populationDensity: observation.nearbyCount,
      age: observation.age,
      season: 'current',
      weatherCondition: 'clear',
      socialInfo: socialIntelligence
    };
  }

  analyzeSocialInformation() {
    const currentTime = this.lastInfoUpdate || 0;
    
    const validResources = this.knownResourceLocations.filter(resource => {
      const age = currentTime - resource.timestamp;
      return age < this.informationDecay && resource.confidence > 0.3;
    });
    
    const activeDangerZones = this.dangerZones.filter(danger => {
      const age = currentTime - danger.timestamp;
      return age < this.informationDecay * 0.5;
    });
    
    const urgentHelp = this.helpRequests.filter(request => 
      !request.processed && request.priority === 'high'
    ).length;
    
    return {
      knownResourceCount: validResources.length,
      dangerZoneCount: activeDangerZones.length,
      urgentHelpRequests: urgentHelp,
      socialInfluenceFactors: this.calculateSocialInfluenceFactors(validResources, activeDangerZones)
    };
  }

  calculateSocialInfluenceFactors(resources, dangerZones) {
    return {
      resourceSocialInfluence: resources.length > 0 ? 0.7 : 0,
      threatSocialInfluence: dangerZones.length > 0 ? 0.8 : 0,
      overallSocialInfluence: (resources.length + dangerZones.length) > 0 ? 0.6 : 0.1
    };
  }

  defineGoals(observation) {
    const goals = [];
    const socialInfo = observation.socialInfo || {};
    
    if (observation.energy < 40) {
      goals.push({ 
        priority: 'high', 
        goal: 'find_food', 
        urgency: 10 - (observation.energy / 10),
        sociallyInformed: socialInfo.knownResourceCount > 0
      });
    }
    
    if (observation.nearbyInfected > 0) {
      goals.push({ 
        priority: 'critical', 
        goal: 'avoid_infection', 
        urgency: observation.nearbyInfected * 3
      });
    }
    
    if (observation.energy > 60 && this.age > 30) {
      goals.push({ priority: 'medium', goal: 'reproduce', urgency: 3 });
    }
    
    goals.push({ priority: 'low', goal: 'explore', urgency: 1 });
    
    return goals.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : b.urgency - a.urgency;
    });
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
        reasoning: "Direct action was optimal"
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
      content: `Primary goal: ${primaryGoal?.goal || 'survive'} (urgency: ${primaryGoal?.urgency || 1}).`
    });
    
    const actionPlan = this.planAction(observation, primaryGoal);
    thoughts.push({
      step: 3,
      type: "action_planning",
      content: `Action plan: ${actionPlan.description}. Expected outcome: ${actionPlan.expectedOutcome}.`
    });
    
    return {
      thoughts,
      conclusion: actionPlan.justification,
      confidence: actionPlan.confidence
    };
  }

  planAction(observation, goal) {
    let selectedAction = 'explore';
    let description = 'Continue exploration';
    let expectedOutcome = 'Maintain status quo';
    let justification = 'Default action';
    let confidence = 0.5;
    
    if (goal?.goal === 'find_food' && observation.nearestResourceDistance < 10) {
      selectedAction = 'forage';
      description = 'Move toward nearest resource';
      expectedOutcome = 'Energy restoration';
      justification = `Food is accessible (${Math.round(observation.nearestResourceDistance)} units)`;
      confidence = 0.8;
    } else if (observation.nearbyInfected > 0 && this.status === 'Susceptible') {
      selectedAction = 'avoid';
      description = 'Maintain distance from infected agents';
      expectedOutcome = 'Reduce infection probability';
      justification = `${observation.nearbyInfected} infected agents nearby`;
      confidence = 0.9;
    } else if (observation.energy > 70 && this.reproductionCooldown === 0 && this.age > 30) {
      selectedAction = 'reproduce';
      description = 'Seek reproduction opportunity';
      expectedOutcome = 'Genetic propagation';
      justification = 'High energy reserves enable reproduction';
      confidence = 0.7;
    }
    
    return {
      action: selectedAction,
      description,
      expectedOutcome,
      justification,
      confidence
    };
  }

  reasonToAction(chainOfThought, observation) {
    const conclusion = chainOfThought.thoughts.find(t => t.type === 'action_planning');
    const actionType = conclusion?.content.match(/Action plan: (\w+)/)?.[1] || 'explore';
    
    switch (actionType) {
      case 'forage':
        return {
          type: 'forage',
          intensity: 0.9,
          reasoning: 'Moving toward food source'
        };
      case 'avoid':
        return {
          type: 'avoid',
          intensity: 0.7,
          reasoning: 'Avoiding infection risk'
        };
      case 'reproduce':
        return {
          type: 'reproduce',
          intensity: 0.3,
          reasoning: 'Seeking reproductive opportunity'
        };
      default:
        return {
          type: 'explore',
          intensity: 0.5,
          reasoning: 'Exploratory behavior'
        };
    }
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

  // Override update method to add social behaviors
  update(environment, agents, currentStep, isSimulationRunning = true) {
    const result = super.update(environment, agents, currentStep, isSimulationRunning);
    
    if (isSimulationRunning && this.isActive) {
      this.handleCommunication(agents, environment);
      this.updateSocialMemory(agents, environment);
      this.processInformationDecay(currentStep);
      this.processHelpRequests(agents);
      
      if (this.llmAvailable && Math.random() < this.reasoningFrequency) {
        this.triggerAsyncReasoning(environment, agents, currentStep);
      }
    }
    
    return result;
  }

  handleCommunication(agents, environment) {
    this.communicationCooldown = Math.max(0, this.communicationCooldown - 1);
    
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
          this.communicationCooldown = 10;
        }
      }
    }
  }

  createMessage(environment, agents) {
    const messageTypes = [];
    
    if (this.energy > 70) {
      const nearbyResources = Array.from(environment.resources.values())
        .filter(r => this.distanceTo({ position: r.position }) < 15);
      if (nearbyResources.length > 0) {
        const resource = nearbyResources[0];
        messageTypes.push({
          type: 'resource_tip',
          content: { 
            location: resource.position,
            confidence: 0.8,
            quality: resource.quality || 0.5,
            timestamp: this.lastInfoUpdate || 0
          }
        });
      }
    }
    
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
            confidence: 0.9,
            timestamp: this.lastInfoUpdate || 0
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
    
    const trustChange = message.content.confidence > 0.7 ? 0.05 : -0.02;
    recipient.socialMemory.updateTrust(this.id, trustChange);
    
    this.lastCommunication = {
      recipient: recipient.id,
      message: message,
      timestamp: Date.now()
    };
  }

  updateSocialMemory(agents, environment) {
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

  processInformationDecay(currentStep) {
    this.lastInfoUpdate = currentStep;
    
    this.knownResourceLocations = this.knownResourceLocations.filter(resource => {
      const age = currentStep - resource.timestamp;
      if (age > this.informationDecay) {
        return false;
      }
      resource.confidence = Math.max(0.1, resource.confidence * (1 - age / (this.informationDecay * 2)));
      return true;
    });

    this.dangerZones = this.dangerZones.filter(danger => {
      const age = currentStep - danger.timestamp;
      return age < this.informationDecay * 0.5;
    });

    this.helpRequests = this.helpRequests.filter(request => {
      const age = currentStep - request.timestamp;
      return age < this.informationDecay * 1.5;
    });

    this.helpRequestCooldown = Math.max(0, this.helpRequestCooldown - 1);
  }

  processHelpRequests(agents) {
    // Simplified help request processing
    if (this.shouldRequestHelp() && this.helpRequestCooldown <= 0) {
      this.requestHelp(agents);
      this.helpRequestCooldown = 50;
    }
  }

  shouldRequestHelp() {
    return this.energy < 20 || (this.status === 'Infected' && this.infectionTimer > 20);
  }

  requestHelp(agents) {
    const nearbyTrustedAgents = agents.filter(agent => 
      agent instanceof CausalAgent && 
      agent !== this &&
      this.distanceTo(agent) < this.resourceSharingRange &&
      this.socialMemory.isAgentTrusted(agent.id, 0.4)
    );

    if (nearbyTrustedAgents.length > 0) {
      this.currentHelpRequest = {
        senderId: this.id,
        type: this.energy < 20 ? 'energy' : 'medical',
        urgency: this.calculateHelpUrgency(),
        timestamp: Date.now(),
        location: { ...this.position }
      };
    }
  }

  calculateHelpUrgency() {
    let urgency = 0;
    if (this.energy < 10) urgency += 0.8;
    else if (this.energy < 30) urgency += 0.4;
    
    if (this.status === 'Infected') urgency += 0.6;
    
    return Math.min(1.0, urgency);
  }

  async triggerAsyncReasoning(environment, agents, currentStep) {
    if (this.pendingReasoning) return;
    
    try {
      this.pendingReasoning = true;
      
      const observation = this.getObservation(environment, agents, currentStep);
      const reasoningResult = await this.simulateLLMReasoning(observation, agents);
      
      if (reasoningResult && reasoningResult.action) {
        this.queuedAction = reasoningResult.action;
      }
    } catch (error) {
      console.warn(`Async reasoning failed for agent ${this.id}:`, error.message);
    } finally {
      this.pendingReasoning = false;
    }
  }

  // Get influence analysis for UI
  getInfluenceAnalysis() {
    return {
      currentInfluences: { ...this.currentDecisionInfluences },
      overallMetrics: { ...this.influenceMetrics },
      recentDecisions: this.decisionHistory.slice(-5),
      socialEffectiveness: this.influenceMetrics.socialDecisionSuccess,
      individualEffectiveness: this.influenceMetrics.individualDecisionSuccess,
      adaptability: this.calculateAdaptabilityScore()
    };
  }

  calculateAdaptabilityScore() {
    if (this.decisionHistory.length < 5) return 0.5;
    return 0.7; // Simplified calculation
  }

  reproduce(partner = null, currentStep = 0) {
    const offspring = super.reproduce(partner, currentStep);
    
    // Convert to CausalAgent
    const causalOffspring = new CausalAgent(
      offspring.id,
      offspring.position,
      offspring.genotype,
      currentStep
    );
    
    // Inherit some properties
    causalOffspring.llmAvailable = this.llmAvailable;
    causalOffspring.reasoningMode = this.reasoningMode;
    
    return causalOffspring;
  }
}

export default { Agent, CausalAgent, ReinforcementLearningPolicy, SocialMemory };