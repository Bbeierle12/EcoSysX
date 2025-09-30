/**
 * EcoSysX Core Engine
 * 
 * This module contains the pure simulation logic separated from UI concerns.
 * It provides a framework-agnostic ecosystem simulation engine that can run
 * independently of React, Three.js, or any specific UI framework.
 */

import EventEmitter from 'eventemitter3';

// ================================
// TIME SYSTEM
// ================================

// Global time configuration for TIME_V1 clock semantics
export const TIME_V1 = Object.freeze({
  dtHours: 1, // 1 hour per simulation step
  get dtDays() {
    return this.dtHours / 24;
  },
  stepToHours(step) {
    return step * this.dtHours;
  },
  stepToDays(step) {
    return this.stepToHours(step) / 24;
  },
  hoursToSteps(hours) {
    return hours / this.dtHours;
  },
  daysToSteps(days) {
    return this.hoursToSteps(days * 24);
  }
});

// Hazard probability function for continuous-time processes
export const hazardProbability = (ratePerDay, dtHours = TIME_V1.dtHours) => {
  const dtDays = dtHours / 24;
  if (!Number.isFinite(ratePerDay) || ratePerDay <= 0 || dtDays <= 0) {
    return 0;
  }
  return 1 - Math.exp(-ratePerDay * dtDays);
};

// ================================
// MESSAGE SYSTEM
// ================================

// Message Types - Define globally
export const MessageTypes = {
  RESOURCE_LOCATION: 'resource',
  THREAT_WARNING: 'threat',
  ALLIANCE_PROPOSAL: 'alliance',
  HELP_REQUEST: 'help',
  KNOWLEDGE_SHARE: 'knowledge'
};

// Message System for Agent Communication
export class Message {
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

// ================================
// ANALYTICS SYSTEM
// ================================

// Lean Analytics System - Event-driven windowed logging
export class EcosystemAnalytics extends EventEmitter {
  constructor(windowSize = 100, checkpointInterval = 1000) {
    super();
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
    
    // Console log capture for export
    this.consoleLogs = [];
    this.maxLogEntries = 1000;
    this.compressLogs = true;
    this.pruneStats = { logsCompressed: 0, duplicateMerged: 0 };
    
    console.log(`📊 EcoSysX Analytics: Window=${windowSize} steps, Checkpoints every ${checkpointInterval} steps`);
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

    // Emit analytics update event
    this.emit('analytics:update', {
      step,
      windowHistory: this.windowHistory.slice(-5),
      checkpoints: this.checkpoints.slice(-3),
      panelSampleSize: this.panelSample.size
    });
  }

  recordContacts(agents) {
    const contactDistance = 8;
    const contactHours = TIME_V1.dtHours;
    
    agents.forEach(agentA => {
      const typeA = this.getAgentType(agentA);
      
      agents.forEach(agentB => {
        if (agentA.id !== agentB.id && agentA.distanceTo(agentB) < contactDistance) {
          const typeB = this.getAgentType(agentB);
          const key = `${typeA}_${typeB}`;
          
          this.windowData.contacts_by_type.set(key, 
            (this.windowData.contacts_by_type.get(key) || 0) + 1);
          
          // Contact-hours matrix tracking
          const pairKey = `${agentA.id}:${agentB.id}`;
          const reversePairKey = `${agentB.id}:${agentA.id}`;
          const contactKey = agentA.id < agentB.id ? pairKey : reversePairKey;
          
          const existingContactHours = this.contactMatrix.get(contactKey) || {
            totalHours: 0,
            lastContact: this.currentStep,
            agentA_id: agentA.id < agentB.id ? agentA.id : agentB.id,
            agentB_id: agentA.id < agentB.id ? agentB.id : agentA.id,
            agentA_type: agentA.id < agentB.id ? typeA : typeB,
            agentB_type: agentA.id < agentB.id ? typeB : typeA,
            infections_transmitted: 0
          };
          
          existingContactHours.totalHours += contactHours;
          existingContactHours.lastContact = this.currentStep;
          this.contactMatrix.set(contactKey, existingContactHours);
          
          // Enhanced infection tracking
          if (agentA.status === 'Infected' && agentB.status === 'Susceptible') {
            const transmissionRate = 0.1;
            const transmissionProb = hazardProbability(transmissionRate, contactHours);
            
            if (Math.random() < transmissionProb) {
              this.windowData.infections_caused.set(agentA.id, 
                (this.windowData.infections_caused.get(agentA.id) || 0) + 1);
              
              existingContactHours.infections_transmitted += 1;
              this.contactMatrix.set(contactKey, existingContactHours);
              
              if (agentB.status === 'Susceptible') {
                agentB.status = 'Infected';
                agentB.infectionTimer = 0;
              }
            }
          }
          
          // Reverse case
          if (agentB.status === 'Infected' && agentA.status === 'Susceptible') {
            const transmissionRate = 0.1;
            const transmissionProb = hazardProbability(transmissionRate, contactHours);
            
            if (Math.random() < transmissionProb) {
              this.windowData.infections_caused.set(agentB.id, 
                (this.windowData.infections_caused.get(agentB.id) || 0) + 1);
              
              existingContactHours.infections_transmitted += 1;
              this.contactMatrix.set(contactKey, existingContactHours);
              
              if (agentA.status === 'Susceptible') {
                agentA.status = 'Infected';
                agentA.infectionTimer = 0;
              }
            }
          }
        }
      });
      
      // Record infectious time
      if (agentA.status === 'Infected') {
        this.windowData.infectious_time.set(this.getAgentType(agentA), 
          (this.windowData.infectious_time.get(this.getAgentType(agentA)) || 0) + TIME_V1.dtHours);
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
        pct_at_cap: Math.round(atCap * 1000) / 10
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

    // Emit event for real-time UI updates
    this.emit('event:recorded', { type, data, step: this.currentStep });
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

    // Emit window completed event
    this.emit('window:completed', windowSummary);
    
    this.resetWindow();
  }

  updatePanelSample(agents) {
    agents.forEach(agent => {
      if (this.panelSample.size < this.panelSize) {
        this.panelSample.set(agent.id, this.captureAgentState(agent));
      } else if (Math.random() < this.panelSize / (this.currentStep + 1)) {
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
      age: agent.getAge ? agent.getAge(this.currentStep) : 0,
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
      panel_sample: this.panelSample ? Array.from(this.panelSample.values()) : [],
      recent_windows: this.windowHistory.slice(-5),
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

    // Emit checkpoint event
    this.emit('checkpoint:created', checkpoint);
    
    console.log(`🎯 CHECKPOINT [Step ${this.currentStep}]: ` +
      `${checkpoint.population_total} agents, ` +
      `${this.windowHistory.length} windows analyzed`);
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

  // Export methods
  exportAnalytics() {
    const data = {
      metadata: {
        current_step: this.currentStep,
        window_size: this.windowSize,
        checkpoint_interval: this.checkpointInterval,
        export_timestamp: new Date().toISOString()
      },
      simulation_summary: {
        total_steps: this.currentStep,
        total_windows: this.windowHistory.length,
        total_checkpoints: this.checkpoints.length,
        panel_agents: this.panelSample ? this.panelSample.size : 0,
        contact_matrix_entries: this.contactMatrix ? this.contactMatrix.size : 0
      },
      recent_windows: this.windowHistory || [],
      checkpoints: this.checkpoints || [],
      panel_sample: this.panelSample ? Array.from(this.panelSample.values()) : [],
      contact_matrix: this.contactMatrix ? Array.from(this.contactMatrix.entries()) : []
    };

    // Emit export event for UI handling
    this.emit('analytics:export', data);
    
    return data;
  }
}

// ================================
// CORE ENGINE CLASS
// ================================

export class EcosystemEngine extends EventEmitter {
  constructor(environment) {
    super();
    
    // Core simulation state
    this.agents = [];
    this.environment = environment;
    this.currentStep = 0;
    this.isRunning = false;
    this.speed = 1.0;
    
    // Initialize analytics system
    this.analytics = new EcosystemAnalytics(100, 1000);
    
    // LLM service reference (optional)
    this.llmService = null;
    
    // Auto-update loop
    this.updateInterval = null;
    
    console.log('🚀 EcosystemEngine initialized');
  }

  // Set LLM service from external dependency
  setLLMService(llmService) {
    this.llmService = llmService;
    console.log('🧠 LLM Service connected to engine');
  }

  // Set simulation speed
  setSpeed(speed) {
    this.speed = speed;
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // Add agent to simulation
  addAgent(agent) {
    this.agents.push(agent);
    this.emit('agentAdded', agent);
  }

  // Remove agent from simulation
  removeAgent(agent) {
    const index = this.agents.indexOf(agent);
    if (index !== -1) {
      this.agents.splice(index, 1);
      this.emit('agentRemoved', agent);
    }
  }

  // Start simulation
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Calculate update interval based on speed
    const baseInterval = 100; // 100ms base interval
    const interval = Math.max(10, baseInterval / this.speed);
    
    this.updateInterval = setInterval(() => {
      this.step();
    }, interval);
    
    this.emit('stateChanged', { isRunning: true });
    console.log('▶️ Simulation started');
  }

  // Pause simulation
  pause() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.emit('stateChanged', { isRunning: false });
    console.log('⏸️ Simulation paused');
  }

  // Stop simulation (alias for pause)
  stop() {
    this.pause();
  }

  // Reset simulation
  reset() {
    this.pause();
    this.agents = [];
    this.currentStep = 0;
    
    if (this.analytics) {
      this.analytics.currentStep = 0;
      this.analytics.windowStart = 0;
      this.analytics.resetWindow();
    }
    
    // Reset environment if it has a reset method
    if (this.environment && typeof this.environment.reset === 'function') {
      this.environment.reset();
    }

    this.emit('simulationReset');
    console.log('🔄 Simulation reset');
  }

  // Execute single simulation step
  step() {
    if (!this.environment) {
      console.warn('⚠️ Cannot step: missing environment');
      return;
    }

    const stepStartTime = Date.now();
    
    // Update environment first
    this.environment.update(this.currentStep);
    
    // Store agents to update (snapshot to avoid modification during iteration)
    const agentsToUpdate = [...this.agents];
    const agentsToRemove = [];
    const newAgents = [];
    
    // Update each agent
    agentsToUpdate.forEach(agent => {
      const result = agent.update(this.environment, this.agents, this.currentStep, this.isRunning);
      
      if (result === 'die') {
        agentsToRemove.push(agent);
        this.analytics.logEvent('agent_death', {
          agentId: agent.id,
          step: this.currentStep,
          age: agent.getAge ? agent.getAge(this.currentStep) : agent.age,
          energy: agent.energy,
          status: agent.status
        });
      } else if (result === 'reproduce') {
        const offspring = agent.reproduce(null, this.currentStep);
        if (offspring) {
          newAgents.push(offspring);
          this.analytics.logEvent('agent_birth', {
            parentId: agent.id,
            offspringId: offspring.id,
            step: this.currentStep
          });
        }
      }
    });
    
    // Remove dead agents
    agentsToRemove.forEach(agent => {
      this.removeAgent(agent);
    });
    
    // Add new agents
    newAgents.forEach(agent => {
      this.addAgent(agent);
    });
    
    // Update analytics
    this.analytics.logStep(this.currentStep, this.agents, this.environment);
    
    // Increment step
    this.currentStep++;
    
    // Calculate step performance
    const stepDuration = Date.now() - stepStartTime;
    this.analytics.logPerformance('step_duration', stepDuration);
    
    // Emit events for UI
    this.emit('stepCompleted', this.currentStep);
    this.emit('stepUpdated', this.currentStep);
    this.emit('agentsUpdated', this.agents);
    this.emit('resourcesUpdated', Array.from(this.environment.resources.values()));
    this.emit('environmentUpdated', this.environment);
    this.emit('statisticsUpdated', this.analytics.getCurrentStatistics());
    
    // Check for simulation end conditions
    if (this.agents.length === 0) {
      this.emit('simulationEnded', { reason: 'extinction', step: this.currentStep });
      this.pause();
    }
  }

  // Get current simulation state
  getState() {
    return {
      currentStep: this.currentStep,
      isRunning: this.isRunning,
      agentCount: this.agents.length,
      speed: this.speed
    };
  }

  // Get current statistics
  getCurrentStatistics() {
    return this.analytics ? this.analytics.getCurrentStatistics() : null;
  }

  // Dispose of engine resources
  dispose() {
    this.pause();
    this.agents = [];
    this.environment = null;
    this.removeAllListeners();
    console.log('🧹 EcosystemEngine disposed');
  }
}

export default EcosystemEngine;