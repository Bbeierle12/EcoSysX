import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';
import { llmService } from './LLMService.js';

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
    this.maxKnownAgents = 200; // Cap to avoid unbounded growth
    this.trustDecayRate = 0.001; // Trust slowly decays without interaction
    this.minTrust = 0.0;
    this.maxTrust = 1.0;
    this.neutralTrust = 0.5;
    this.pruneStats = { knownAgentsRemoved: 0 }; // Track pruning events for reporting
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

    // Prune if over cap (remove oldest by lastSeen)
    if (this.knownAgents.size > this.maxKnownAgents) {
      const before = this.knownAgents.size;
      const toRemove = Array.from(this.knownAgents.entries())
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen) // oldest first
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
    
    // Console log capture for export
    this.consoleLogs = [];
    this.maxLogEntries = 1000;
    this.captureConsoleLogs();
  this.compressLogs = true; // runtime toggle (can be changed via debug panel)
  this.pruneStats = { logsCompressed: 0, duplicateMerged: 0 };

    // Export folder selection
    this.exportDirectoryHandle = null;
    this.requestingDirectoryHandle = false;
    this.exportDirectoryLabel = 'Default Downloads Folder';
    this.customExportPath = null;
    
    console.log(`📊 EcoSysX Analytics: Window=${windowSize} steps, Checkpoints every ${checkpointInterval} steps`);
    console.log(`📁 Export target: ${this.exportDirectoryLabel}`);
  }

  // Folder selection methods
  async selectExportFolder() {
    try {
      console.log('📂 Opening folder selection dialog...');
      
      // Check if File System Access API is supported
      if ('showDirectoryPicker' in window) {
        this.requestingDirectoryHandle = true;
        const directoryHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'downloads'
        });
        
        this.exportDirectoryHandle = directoryHandle;
        this.exportDirectoryLabel = directoryHandle.name;
        this.customExportPath = directoryHandle;
        
        // Update React state if callback is available
        if (this.updateUICallback) {
          this.updateUICallback(this.exportDirectoryLabel);
        }
        
        console.log(`✅ Selected export folder: ${this.exportDirectoryLabel}`);
        return {
          success: true,
          folder: this.exportDirectoryLabel,
          handle: directoryHandle
        };
      } else {
        // Fallback for browsers without File System Access API
        console.warn('⚠️ File System Access API not supported');
        return this.promptForCustomPath();
      }
    } catch (error) {
      console.error('❌ Folder selection failed:', error);
      if (error.name === 'AbortError') {
        console.log('📂 Folder selection cancelled by user');
      }
      return { success: false, error: error.message };
    } finally {
      this.requestingDirectoryHandle = false;
    }
  }

  promptForCustomPath() {
    const customPath = prompt(
      'Enter your preferred export folder path:\n(e.g., C:\\Users\\YourName\\Documents\\EcoSysX Analytics)',
      'C:\\Users\\Bbeie\\Downloads\\EcoSysX Analytics'
    );
    
    if (customPath && customPath.trim()) {
      this.customExportPath = customPath.trim();
      this.exportDirectoryLabel = customPath.trim();
      
      // Update React state if callback is available
      if (this.updateUICallback) {
        this.updateUICallback(this.exportDirectoryLabel);
      }
      
      console.log(`📁 Custom export path set: ${this.exportDirectoryLabel}`);
      return { success: true, folder: this.exportDirectoryLabel };
    }
    
    return { success: false, error: 'No path provided' };
  }

  resetExportFolder() {
    this.exportDirectoryHandle = null;
    this.customExportPath = null;
    this.exportDirectoryLabel = 'Default Downloads';
    
    // Update React state if callback is available
    if (this.updateUICallback) {
      this.updateUICallback(this.exportDirectoryLabel);
    }
    
    console.log('🔄 Reset to default export location');
  }

  // Set callback to update React UI
  setUIUpdateCallback(callback) {
    this.updateUICallback = callback;
  }

  setDebugCallback(callback) {
    this.debugCallback = callback;
  }

  captureConsoleLogs() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.log = (...args) => {
      this.addLogEntry('LOG', args);
      originalLog.apply(console, args);
    };
    
    console.warn = (...args) => {
      this.addLogEntry('WARN', args);
      originalWarn.apply(console, args);
    };
    
    console.error = (...args) => {
      this.addLogEntry('ERROR', args);
      originalError.apply(console, args);
    };
  }

  async promptForExportDirectory() {
    if (typeof window === 'undefined' || !window.showDirectoryPicker) {
      console.warn('[EcoSysX] File System Access API not available; using browser downloads.');
      return false;
    }

    if (this.requestingDirectoryHandle) {
      console.warn('[EcoSysX] Directory request already in progress.');
      return false;
    }

    this.requestingDirectoryHandle = true;

    try {
      const directoryHandle = await window.showDirectoryPicker({
        id: 'ecosysx-analytics',
        mode: 'readwrite',
        startIn: 'downloads'
      });

      let targetHandle = directoryHandle;

      try {
        if (directoryHandle.name && directoryHandle.name.toLowerCase() !== 'ecosysx analytics') {
          targetHandle = await directoryHandle.getDirectoryHandle('EcoSysX Analytics', { create: true });
        }
      } catch (error) {
        console.warn('[EcoSysX] Unable to create EcoSysX Analytics subdirectory; using the selected folder.', error);
      }

      this.exportDirectoryHandle = targetHandle;
      console.log(`[EcoSysX] Analytics directory ready at ${this.exportDirectoryLabel}`);
      return true;
    } catch (error) {
      console.warn('[EcoSysX] Directory selection was cancelled or failed.', error);
      return false;
    } finally {
      this.requestingDirectoryHandle = false;
    }
  }

  hasExportDirectory() {
    return !!this.exportDirectoryHandle;
  }

  async saveFile({ contents, filename, type }) {
    if (this.exportDirectoryHandle) {
      try {
        const fileHandle = await this.exportDirectoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(contents);
        await writable.close();
        return { saved: true, method: 'filesystem' };
      } catch (error) {
        console.error('[EcoSysX] Failed to write to analytics directory; falling back to browser download.', error);
      }
    }

    this.triggerBrowserDownload(contents, filename, type);
    return { saved: false, method: 'download' };
  }

  triggerBrowserDownload(contents, filename, type) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  addLogEntry(level, args) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        step: this.currentStep,
        message: args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              // Handle circular references or other JSON.stringify errors
              return `[Object: ${arg?.constructor?.name || 'Unknown'}]`;
            }
          }
          return String(arg);
        }).join(' ')
      };
      if (this.compressLogs && this.consoleLogs.length > 0) {
        const last = this.consoleLogs[this.consoleLogs.length - 1];
        if (last.level === entry.level && last.message === entry.message) {
          // Merge duplicate sequential log
            last.repeat = (last.repeat || 1) + 1;
            last.lastTimestamp = entry.timestamp;
            this.pruneStats.duplicateMerged++;
        } else {
          this.consoleLogs.push(entry);
        }
      } else {
        this.consoleLogs.push(entry);
      }
      
      // Send to debug callback if available
      if (this.debugCallback) {
        this.debugCallback(entry);
      }
      
      // Keep only recent entries to prevent memory issues
      if (this.consoleLogs.length > this.maxLogEntries) {
        const removed = this.consoleLogs.shift();
        if (removed && removed.repeat) {
          this.pruneStats.logsCompressed += removed.repeat;
        }
      }
    } catch (error) {
      // If logging fails, don't break the application
      console.warn('[Analytics] Failed to capture log entry:', error);
    }
  }

  safeSerializeAgents(agents) {
    return agents.map(agent => {
      try {
        // Create a safe copy of agent data without circular references
        return {
          id: agent.id,
          age: agent.age,
          energy: agent.energy,
          status: agent.status,
          position: agent.position ? {
            x: agent.position.x,
            y: agent.position.y,
            z: agent.position.z
          } : null,
          genotype: agent.genotype || {},
          phenotype: agent.phenotype || {},
          maxLifespan: agent.maxLifespan,
          reproductionCooldown: agent.reproductionCooldown,
          constructor_name: agent.constructor.name
        };
      } catch (error) {
        console.warn(`Failed to serialize agent ${agent?.id || 'unknown'}:`, error);
        return {
          id: agent?.id || 'unknown',
          error: 'Serialization failed',
          constructor_name: agent?.constructor?.name || 'Unknown'
        };
      }
    });
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
    
    // Auto-export every 1000 steps or 10 windows
    if (this.currentStep % 1000 === 0 || this.windowHistory.length % 10 === 0) {
      this.autoExportLogs();
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
    
    this.resetWindow();
  }

  autoExportLogs() {
    console.log(`[EcoSysX] Auto-exporting EcoSysX logs at step ${this.currentStep}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const quickExport = {
      metadata: {
        auto_export: true,
        step: this.currentStep,
        timestamp: new Date().toISOString(),
        target_folder: this.exportDirectoryLabel
      },
      console_logs: this.consoleLogs.slice(-200),
      recent_windows: this.windowHistory.slice(-5),
      summary: {
        total_logs: this.consoleLogs.length,
        total_windows: this.windowHistory.length,
        panel_size: this.panelSample.size
      }
    };

    const filename = `EcoSysX-AutoLog-Step${this.currentStep}-${timestamp}.json`;
    const content = JSON.stringify(quickExport, null, 2);

    this.saveFile({
      contents: content,
      filename,
      type: 'application/json'
    }).then(result => {
      if (result && result.saved) {
        console.log(`[EcoSysX] Auto-exported to ${this.exportDirectoryLabel}\\${filename}`);
      } else {
        console.log(`[EcoSysX] Auto-exported via browser download: ${filename}`);
      }
    }).catch(error => {
      console.error('[EcoSysX] Auto-export failed.', error);
    });
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
      panel_sample: this.panelSample ? Array.from(this.panelSample.values()) : [],
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

  async exportAnalytics() {
    try {
      console.log('📊 [Export] Starting analytics export...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const export_data = {
        metadata: {
          current_step: this.currentStep,
          window_size: this.windowSize,
          checkpoint_interval: this.checkpointInterval,
          export_timestamp: new Date().toISOString(),
          session_id: `ecosysx_${timestamp}`,
          export_location: this.exportDirectoryLabel
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
        panel_sample: this.panelSample ? this.safeSerializeAgents(Array.from(this.panelSample.values())) : [],
        contact_matrix: this.contactMatrix ? Array.from(this.contactMatrix.entries()) : [],
        console_logs: this.consoleLogs || []
      };

      console.log('=== ECOSYSX ANALYTICS EXPORT ===');
      console.log(`[EcoSysX] Target: ${this.exportDirectoryLabel}`);
      console.log(`[EcoSysX] Session: ${export_data.metadata.session_id}`);
      console.log(`[EcoSysX] Steps: ${this.currentStep} | Windows: ${this.windowHistory.length} | Checkpoints: ${this.checkpoints.length}`);
      console.log('=== END ECOSYSX ANALYTICS EXPORT ===');

      const filename = `EcoSysX-Analytics-Step${this.currentStep}-${timestamp}.json`;
      
      // Safe JSON serialization with circular reference handling
      let content;
      try {
        content = JSON.stringify(export_data, (key, value) => {
          // Handle circular references and problematic objects
          if (typeof value === 'object' && value !== null) {
            if (value.constructor && value.constructor.name === 'Agent') {
              return '[Agent Object]';
            }
            if (value instanceof HTMLElement) {
              return '[HTML Element]';
            }
            if (value instanceof Function) {
              return '[Function]';
            }
          }
          return value;
        }, 2);
      } catch (jsonError) {
        console.error('📊 [Export] JSON serialization failed, using fallback:', jsonError);
        content = JSON.stringify({
          error: 'Serialization failed',
          message: jsonError.message,
          metadata: export_data.metadata,
          simulation_summary: export_data.simulation_summary
        }, null, 2);
      }
      
      console.log('📊 [Export] Saving main analytics file...');
      const result = await this.saveFile({
        contents: content,
        filename,
        type: 'application/json'
      });

      if (result && result.saved) {
        console.log(`[EcoSysX] Exported analytics to ${this.exportDirectoryLabel}\\${filename}`);
      } else {
        console.log(`[EcoSysX] Exported analytics via browser download: ${filename}`);
      }

      console.log('📊 [Export] Exporting detailed reports...');
      await this.exportDetailedReports(timestamp);
      
      console.log('📊 [Export] Analytics export completed successfully!');
      return export_data;
      
    } catch (error) {
      console.error('📊 [Export] Analytics export failed:', error);
      throw error;
    }
  }

  async exportDetailedReports(timestamp) {
    try {
      console.log('📊 [Export] Starting detailed reports export...');
      const results = [];

      if (this.panelSample.size > 0) {
        console.log('📊 [Export] Generating agent lifecycle CSV...');
        const agents_csv = this.generateAgentLifecycleCSV();
        results.push(await this.downloadFile(agents_csv, `EcoSysX-Agents-${timestamp}.csv`, 'text/csv'));
      }

      if (this.windowHistory.length > 0) {
        console.log('📊 [Export] Generating population dynamics CSV...');
        const population_csv = this.generatePopulationDynamicsCSV();
        results.push(await this.downloadFile(population_csv, `EcoSysX-Population-${timestamp}.csv`, 'text/csv'));
      }

      console.log('📊 [Export] Generating epidemiology CSV...');
      const epi_csv = this.generateEpidemiologicalCSV();
      results.push(await this.downloadFile(epi_csv, `EcoSysX-Epidemiology-${timestamp}.csv`, 'text/csv'));

      const savedToDirectory = results.some(result => result && result.saved);
      if (results.length) {
        if (savedToDirectory) {
          console.log(`[EcoSysX] Exported detailed reports to ${this.exportDirectoryLabel}`);
        } else {
          console.log('[EcoSysX] Exported detailed reports via browser download.');
        }
      }
      
      console.log('📊 [Export] Detailed reports export completed!');
      return results;
      
    } catch (error) {
      console.error('📊 [Export] Detailed reports export failed:', error);
      throw error;
    }
  }

  async downloadFile(content, filename, type) {
    return this.saveFile({
      contents: content,
      filename,
      type
    });
  }

  generateAgentLifecycleCSV() {
    const headers = ['Agent_ID', 'Agent_Type', 'Birth_Step', 'Current_Age', 'Energy', 'Status', 'Infections_Caused', 'Contacts'];
    const rows = [headers.join(',')];
    
    this.panelSample.forEach(agent => {
      const infections = this.windowData.infections_caused.get(agent.id) || 0;
      const contacts = Array.from(this.contactMatrix.entries())
        .filter(([key, value]) => key.includes(agent.id)).length;
      
      rows.push([
        agent.id,
        agent.constructor.name || 'Agent',
        agent.birth_step || 0,
        agent.age || 0,
        agent.energy || 0,
        agent.status || 'Unknown',
        infections,
        contacts
      ].join(','));
    });
    
    return rows.join('\n');
  }

  generatePopulationDynamicsCSV() {
    const headers = ['Window_Start', 'Window_End', 'Susceptible', 'Infected', 'Recovered', 'Total_Births', 'Total_Deaths', 'Avg_Energy'];
    const rows = [headers.join(',')];
    
    this.windowHistory.forEach((window, index) => {
      const births = window.births_by_type ? Array.from(window.births_by_type.values()).reduce((sum, count) => sum + count, 0) : 0;
      const deaths = window.deaths_by_cause ? Array.from(window.deaths_by_cause.values()).reduce((sum, count) => sum + count, 0) : 0;
      const avgEnergy = window.avg_energy || 0;
      
      rows.push([
        window.step_start || (index * this.windowSize),
        window.step_end || ((index + 1) * this.windowSize),
        window.susceptible || 0,
        window.infected || 0,
        window.recovered || 0,
        births,
        deaths,
        avgEnergy
      ].join(','));
    });
    
    return rows.join('\n');
  }

  generateEpidemiologicalCSV() {
    const headers = ['Metric', 'Value', 'Description'];
    const rows = [headers.join(',')];
    
    // Calculate R0 and other epi metrics
    const totalInfections = this.windowData && this.windowData.infections_caused ? 
      Array.from(this.windowData.infections_caused.values()).reduce((sum, count) => sum + count, 0) : 0;
    const totalInfectious = this.panelSample && this.panelSample.size > 0 ? 
      Array.from(this.panelSample.values()).filter(a => a.status === 'Infected').length : 0;
    
    rows.push(['Total_Infections', totalInfections, 'Total infections caused this session']);
    rows.push(['Current_Infectious', totalInfectious, 'Currently infectious agents']);
    rows.push(['Contact_Matrix_Size', this.contactMatrix.size, 'Unique agent-agent contacts recorded']);
    rows.push(['Panel_Sample_Size', this.panelSample.size, 'Agents in longitudinal panel']);
    rows.push(['Resources_Consumed', this.windowData.resources_consumed || 0, 'Total resources consumed']);
    
    return rows.join('\n');
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
    console.log(`Agent ${id} created with age: ${this.age}`); // DEBUG
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
    
    // Get weather effects for this step
    const weatherEffects = environment.getWeatherEffects();
    const terrainEffects = environment.getTerrainEffects(this.position);
    
    // Weather and terrain adjusted energy consumption
    const baseLoss = 0.5; // Increased from 0.3
    const infectionPenalty = this.status === 'Infected' ? 0.6 : 0; // Increased from 0.4
    const agePenalty = this.age > this.maxLifespan * 0.8 ? 0.3 : 0; // Increased from 0.2
    
    // Environmental stress effects
    const weatherEnergyPenalty = (weatherEffects.energyConsumptionMultiplier - 1.0) * 0.4;
    const shelterPenalty = (weatherEffects.shelterNeed > 0.5 && !terrainEffects.isInShelter) ? 0.3 : 0;
    
    // Terrain effects on energy
    const terrainEnergyBonus = terrainEffects.energyBonus; // Can be positive (oasis) or negative (contaminated)
    const exposurePenalty = terrainEffects.weatherExposureMultiplier > 1.0 ? 
      (terrainEffects.weatherExposureMultiplier - 1.0) * weatherEffects.energyConsumptionMultiplier * 0.2 : 0;
    
    const totalEnergyLoss = baseLoss + infectionPenalty + agePenalty + weatherEnergyPenalty + 
                           shelterPenalty + exposurePenalty - terrainEnergyBonus;
    
    this.energy = Math.max(0, this.energy - totalEnergyLoss);
    this.reproductionCooldown = Math.max(0, this.reproductionCooldown - 1);

    // Weather affects survival thresholds
    const baseCriticalEnergy = 5;
    const weatherCriticalEnergy = Math.max(2, baseCriticalEnergy - (weatherEffects.shelterNeed * 3));
    const oldAge = this.age >= this.maxLifespan;
    
    if (oldAge || this.energy <= weatherCriticalEnergy) {
      let deathChance = oldAge ? 0.1 : (weatherCriticalEnergy - this.energy) * 0.05;
      
      // Environmental hazards increase death chance
      if (environment.environmentalStress.heatStress > 0.7) deathChance += 0.15;
      if (environment.environmentalStress.coldStress > 0.7) deathChance += 0.12;
      if (environment.environmentalStress.stormStress > 0.8) deathChance += 0.1;
      
      if (Math.random() < deathChance) {
        return 'die';
      }
    }

    // Weather affects infection mechanics
    if (this.status === 'Infected') {
      this.infectionTimer++;
      let recoveryTime = 40;
      
      // Cold weather helps recovery, heat makes it worse
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
        // Weather and terrain affect infection spread
        const baseInfectionRate = 0.15;
        const weatherInfectionMultiplier = weatherEffects.infectionSpreadMultiplier;
        const terrainInfectionModifier = 1.0 + terrainEffects.infectionRiskModifier; // Contaminated areas increase risk
        const shelterProtection = terrainEffects.weatherProtection; // Shelter reduces infection risk
        
        const finalInfectionMultiplier = weatherInfectionMultiplier * terrainInfectionModifier * (1 - shelterProtection * 0.6);
        const infectionProbability = baseInfectionRate * finalInfectionMultiplier * (1 - this.phenotype.resistance);
        
        if (Math.random() < infectionProbability) {
          this.status = 'Infected';
          this.infectionTimer = 0;
          this.updateMeshColor();
        }
      }
    }

    // Weather-adjusted foraging
    this.forageWithWeatherEffects(environment, weatherEffects);

    // Get observation and apply weather-adjusted actions
    const observation = this.getObservation(environment, agents);
    const action = this.learningPolicy.getAction(observation);
    
    // Weather affects movement
    action.intensity *= weatherEffects.movementSpeedMultiplier;
    
    this.applyAction(action, environment);
    this.updatePosition();

    // Weather affects reproduction
    const reproductionThreshold = Math.max(30, this.genotype.reproductionThreshold * 0.7);
    let populationPressure = agents.length < 15 ? 2.0 : agents.length > 50 ? 0.5 : 1.0;
    
    // Harsh weather reduces reproduction rates
    if (weatherEffects.shelterNeed > 0.6) populationPressure *= 0.5;
    if (environment.environmentalStress.stormStress > 0.5) populationPressure *= 0.3;
    
    const baseRate = 0.015 * populationPressure;
    
    if (this.energy > reproductionThreshold && 
        this.reproductionCooldown === 0 && 
        this.age > 20 && 
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
        // Weather affects foraging efficiency
        let baseGain = resource.value * this.phenotype.efficiency;
        const weatherForagingEfficiency = Math.max(0.3, 1.0 - (weatherEffects.shelterNeed * 0.4));
        
        // Weather-resistant resources are better in harsh conditions
        if (resource.weatherResistant && weatherEffects.shelterNeed > 0.5) {
          baseGain *= 1.5;
        }
        
        const efficiencyBonus = this.status === 'Recovered' ? 1.2 : 1.0;
        const energyGain = baseGain * efficiencyBonus * weatherForagingEfficiency;
        
        this.energy = Math.min(100, this.energy + energyGain);
        environment.consumeResource(id);
        
        // Successful foraging in harsh weather improves fitness
        if (weatherEffects.shelterNeed > 0.5 && this.reproductionCooldown > 0) {
          this.reproductionCooldown = Math.max(0, this.reproductionCooldown - 30);
        }
      }
    });
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
    
    // For CausalAgent, check if there's a queued LLM action to override
    if (this instanceof CausalAgent && this.queuedAction) {
      action = this.queuedAction;
      this.queuedAction = null; // Clear after use
    }
    
    const moveIntensity = action.intensity * this.phenotype.maxSpeed;
    
    // Handle different action types
    if (action.type || action.llmAction) {
      const actionType = action.type || action.llmAction;
      
      switch (actionType) {
        case 'forage':
          this.applyForageAction(action, environment, moveIntensity);
          break;
        case 'avoid':
          this.applyAvoidanceAction(action, agents, moveIntensity);
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
      // Fallback to original behavior for basic agents
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
      // No resources found, explore randomly
      this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.3;
      this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.3;
    }
  }

  applyAvoidanceAction(action, agents, moveIntensity) {
    // Find infected agents to avoid
    const infectedAgents = agents?.filter(a => 
      a.status === 'Infected' && 
      a.id !== this.id && 
      this.distanceTo(a) < 10
    ) || [];
    
    if (infectedAgents.length > 0) {
      // Calculate avoidance vector
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
      // No infected nearby, move randomly
      this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.3;
      this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.3;
    }
  }

  applyReproductionAction(action, moveIntensity) {
    // Gentle movement to find potential mates
    this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.4;
    this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.4;
  }

  applyRestAction(action, moveIntensity) {
    // Minimal movement, conserve energy
    this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.1;
    this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.1;
  }

  applyExploreAction(action, moveIntensity) {
    // Standard exploration movement
    this.velocity.x += (Math.random() - 0.5) * moveIntensity * 0.5;
    this.velocity.z += (Math.random() - 0.5) * moveIntensity * 0.5;
  }

  applyDefaultAction(action, environment, moveIntensity) {
    // Original logic for backward compatibility
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
    
    console.log(`Offspring ${offspring.id} born with age: ${offspring.age}`); // DEBUG
    
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
    
    // Phase 2: Advanced Communication Storage with Decay
    this.knownResourceLocations = []; // Shared resource tips with timestamps
    this.dangerZones = []; // Warned danger areas with expiration
    this.helpRequests = [];
  this.maxKnownResources = 30;
  this.maxDangerZones = 40;
  this.maxHelpRequests = 50;
    
    // Influence Tracking System
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
      recentSocialInfluence: 0, // Last 10 decisions
      decisionQuality: 0, // Success rate of decisions
      socialDecisionSuccess: 0,
      individualDecisionSuccess: 0
    };
    this.maxDecisionHistory = 100; // Agents needing help with priority
    this.socialInfoInfluence = 0.7; // How much social info affects decisions
    this.informationDecay = 300; // Steps before info becomes stale
    this.lastInfoUpdate = 0; // Track when we last processed information
    this.helpRequestCooldown = 0;
    this.resourceSharingRange = 12; // Distance for resource sharing
    
    // Alliance System
    this.alliances = new Map(); // allianceId -> alliance data
    this.allianceInvitations = []; // Pending alliance invitations
    this.allianceCooldown = 0; // Cooldown between alliance actions
    this.maxAlliances = 3; // Maximum number of alliances
    
    // Territorial System
    this.territory = null; // Current claimed territory
    this.territorialInstinct = Math.random() * 0.8 + 0.2; // How territorial this agent is
    this.territoryDefensiveness = Math.random() * 0.9 + 0.1; // How aggressively they defend
    this.territoryPatrolRadius = 10; // How far they patrol from territory center
    
    // Resource Trading System
    this.resourceInventory = new Map(); // Stored resources for trading
    this.tradeOffers = []; // Current trade offers
    this.tradingReputation = 0.5; // Reputation for fair trading (0.0 to 1.0)
    this.maxInventorySize = 3; // Maximum stored resources
    this.tradingRange = 8; // Distance for trading interactions
    
    // Enhanced Help Request System
    this.helpRequestCooldown = 0;
    this.helpResponseHistory = [];
    this.currentHelpRequest = null;
    this.helpingReputation = 0.5; // Reputation for helping others
    this.reciprocityMemory = new Map(); // Track who helped us
  }

  generatePersonality() {
    const traits = ['cautious', 'aggressive', 'social', 'solitary', 'curious', 'conservative'];
    return traits[Math.floor(Math.random() * traits.length)];
  }

  async simulateLLMReasoning(observation, agents) {
    // Always try real LLM first if available and enabled
    if (this.llmAvailable && llmService) {
      try {
        // Add retry logic for robustness
        const maxRetries = 2;
        let lastError = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const result = await this.realLLMReasoning(observation, agents);
            
            // Validate LLM result quality
            if (result && result.action && result.chainOfThought) {
              return result;
            } else {
              throw new Error('Invalid LLM response structure');
            }
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
              console.warn(`🤖 LLM attempt ${attempt + 1} failed for agent ${this.id}, retrying...`);
              // Brief delay before retry
              await new Promise(resolve => setTimeout(resolve, 100));
              continue;
            }
          }
        }
        
        throw lastError || new Error('All LLM attempts failed');
      } catch (error) {
        console.warn(`🤖 LLM reasoning failed for agent ${this.id} after retries, falling back to simulation:`, error.message);
        // Update fallback usage statistics
        if (typeof window !== 'undefined' && window.ecosystemStats) {
          window.ecosystemStats.llmFallbacks = (window.ecosystemStats.llmFallbacks || 0) + 1;
        }
        return this.fallbackSimulatedReasoning(observation, agents);
      }
    }
    
    // Use simulated reasoning if LLM not available
    return this.fallbackSimulatedReasoning(observation, agents);
  }

  async realLLMReasoning(observation, agents) {
    const startTime = Date.now();
    
    try {
      // Build agent data for prompt
      const agentData = {
        personality: this.personality,
        id: this.id,
        age: this.age,
        energy: this.energy,
        status: this.status
      };
      
      // Enhanced observation with nearby agents analysis
      const enhancedObservation = {
        ...observation,
        nearbyAgents: agents.filter(a => 
          a.id !== this.id && this.distanceTo(a) < 8
        ).map(a => ({
          id: a.id.substring(0, 10), // Truncate for privacy
          distance: Math.round(this.distanceTo(a) * 10) / 10,
          status: a.status,
          energy: Math.round(a.energy),
          type: a.constructor.name
        }))
      };
      
      // Build optimized prompt
      const prompt = llmService.buildEcosystemPrompt(agentData, enhancedObservation, agents);
      
      // Call LLM service
      const llmResult = await llmService.callLLM(prompt, {
        temperature: 0.7,
        maxTokens: 256
      });
      
      if (!llmResult.success) {
        throw new Error('LLM call unsuccessful');
      }
      
      // Parse the response
      const parsedResponse = llmService.parseLLMResponse(llmResult.response);
      
      if (!parsedResponse.success) {
        throw new Error('Failed to parse LLM response');
      }
      
      // Convert LLM decision to agent action format
      const action = this.convertLLMToAction(parsedResponse, observation);
      
      // Track reasoning history for debugging
      const reasoningResult = {
        action: action,
        chainOfThought: {
          thoughts: [
            {
              step: 1,
              type: "llm_analysis",
              content: `LLM Model: ${llmResult.model} | Response Time: ${llmResult.responseTime}ms`
            },
            {
              step: 2,
              type: "llm_reasoning",
              content: parsedResponse.reasoning
            },
            {
              step: 3,
              type: "action_decision",
              content: `Decided on: ${parsedResponse.action} (intensity: ${parsedResponse.intensity}, confidence: ${parsedResponse.confidence})`
            }
          ],
          conclusion: parsedResponse.reasoning
        },
        confidence: parsedResponse.confidence,
        reasoning: parsedResponse.reasoning,
        llmData: {
          model: llmResult.model,
          responseTime: llmResult.responseTime,
          parsed: parsedResponse.parsed,
          raw: parsedResponse.raw
        },
        isRealLLM: true
      };
      
      // Store for agent inspection
      this.lastReasoning = reasoningResult;
      this.reasoningHistory.push({
        timestamp: Date.now(),
        observation: observation,
        decision: parsedResponse,
        success: true,
        method: 'real_llm'
      });
      
      // Limit history size
      if (this.reasoningHistory.length > 10) {
        this.reasoningHistory.shift();
      }
      
      this.decisionCount++;
      
      // Update success rate tracking
      const successfulDecisions = this.reasoningHistory.filter(r => r.success).length;
      this.reasoningSuccessRate = successfulDecisions / this.reasoningHistory.length;
      
      console.log(`🧠 Agent ${this.id}: Real LLM reasoning complete (${llmResult.responseTime}ms) - Action: ${parsedResponse.action}`);
      
      return reasoningResult;
      
    } catch (error) {
      // Track failed reasoning attempt
      this.reasoningHistory.push({
        timestamp: Date.now(),
        observation: observation,
        decision: null,
        success: false,
        method: 'real_llm',
        error: error.message
      });
      
      console.error(`🤖 Real LLM reasoning failed for agent ${this.id}:`, error.message);
      
      // Re-throw to trigger fallback
      throw error;
    }
  }

  convertLLMToAction(parsedResponse, observation) {
    const { action, intensity, direction, confidence } = parsedResponse;
    
    // Get enhanced social intelligence analysis
    const socialInfo = this.analyzeSocialInformation();
    
    // Determine the primary goal from the parsed response
    const goal = this.mapLLMActionToGoal(action, socialInfo);
    
    // Calculate decision influences
    const influences = this.calculateDecisionInfluences(goal, observation, socialInfo);
    
    // Track this decision
    const decisionRecord = this.trackDecision(goal, influences, observation, socialInfo);
    
    // Base intensity and direction
    let moveIntensity = intensity * this.phenotype.maxSpeed;
    let moveDirection = Math.random() * Math.PI * 2; // Default random
    let avoidance = 0;
    
    // Use intelligent direction finding for social goals
    if (goal.sociallyInformed || goal.sociallyMotivated) {
      moveDirection = this.calculateOptimalSocialDirection(goal, observation, socialInfo);
    }
    
    switch (action) {
      case 'forage':
        // Enhanced resource seeking with social prioritization
        if (socialInfo.bestResourceUtility > 0.5) {
          // Use social resource seeking
          moveIntensity = Math.max(0.7, intensity) * this.phenotype.maxSpeed;
          moveDirection = this.calculateSocialResourceDirection(socialInfo, goal);
        } else if (observation.nearestResourceDistance < 50) {
          // Fall back to individual resource seeking
          moveIntensity = Math.max(0.6, intensity) * this.phenotype.maxSpeed;
          // Direction will be set by applyAction method toward resource
        }
        break;
        
      case 'avoid':
        // Enhanced threat avoidance with social intelligence
        const threatLevel = Math.max(observation.nearbyInfected, socialInfo.compoundThreatLevel || 0);
        avoidance = Math.max(0.5, intensity, threatLevel * 0.3);
        moveIntensity = Math.max(0.7, intensity) * this.phenotype.maxSpeed;
        
        if (socialInfo.compoundThreatLevel > 0.3) {
          moveDirection = this.calculateEnhancedAvoidanceDirection(socialInfo, goal);
        }
        break;
        
      case 'reproduce':
        // Lower movement, seek other agents
        moveIntensity = Math.min(0.4, intensity) * this.phenotype.maxSpeed;
        break;
        
      case 'rest':
        // Minimal movement
        moveIntensity = Math.min(0.2, intensity) * this.phenotype.maxSpeed;
        break;
        
      case 'help':
        // Move toward agents needing help
        moveIntensity = Math.max(0.5, intensity) * this.phenotype.maxSpeed;
        moveDirection = this.calculateHelpDirection(socialInfo);
        break;
        
      case 'explore':
      default:
        // Smart exploration influenced by social information gaps
        moveIntensity = intensity * this.phenotype.maxSpeed;
        if (socialInfo.knownResourceCount > 2) {
          // Reduce exploration intensity if we have good social information
          moveIntensity *= (1 - socialInfo.overallSocialInfluence * 0.3);
        }
        moveDirection = this.calculateSmartExplorationDirection(socialInfo, observation);
        break;
    }

    const finalAction = {
      type: action,
      intensity: moveIntensity / this.phenotype.maxSpeed, // Normalize back
      direction: moveDirection,
      avoidance: avoidance,
      reasoning: parsedResponse.reasoning,
      confidence: confidence,
      llmAction: action,
      socialInfluence: influences.social,
      decisionId: decisionRecord.id,
      sociallyOptimized: influences.social > influences.individual
    };

    // Evaluate decision outcome after a short delay
    setTimeout(() => {
      this.evaluateDecisionOutcome(decisionRecord.id, observation, 5);
    }, 5000); // Evaluate after 5 seconds

    return finalAction;
  }

  // Map LLM actions to goal objects for consistency with social intelligence system
  mapLLMActionToGoal(action, socialInfo) {
    switch (action) {
      case 'forage':
        return socialInfo.bestResourceUtility > 0.5 ? 
          { goal: 'find_social_food', sociallyInformed: true, resourceUtility: socialInfo.bestResourceUtility } :
          { goal: 'find_food', sociallyInformed: false };
      
      case 'avoid':
        return socialInfo.compoundThreatLevel > 0.3 ?
          { goal: 'enhanced_avoid_threats', threatSources: [{ type: 'social', level: socialInfo.compoundThreatLevel }] } :
          { goal: 'avoid_infection' };
      
      case 'help':
        return { goal: 'help_others', sociallyMotivated: true };
      
      case 'explore':
        return socialInfo.knownResourceCount > 0 ?
          { goal: 'smart_explore', socialInformationGaps: 1 - this.calculateSocialInformationCompleteness(socialInfo) } :
          { goal: 'explore' };
      
      default:
        return { goal: action };
    }
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
    
    // Store for agent inspection
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
    
    // Incorporate social information into situation analysis
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

  // Enhanced Social Intelligence Analysis with Quality Tracking
  analyzeSocialInformation() {
    const currentTime = this.lastInfoUpdate || 0;
    
    // Enhanced resource analysis with quality tracking
    const validResources = this.knownResourceLocations.filter(resource => {
      const age = currentTime - resource.timestamp;
      return age < this.informationDecay && resource.confidence > 0.3;
    }).map(resource => {
      // Calculate resource quality score from social intelligence
      const socialQuality = this.calculateResourceQuality(resource);
      const distance = Math.sqrt(
        Math.pow(resource.location.x - this.position.x, 2) +
        Math.pow(resource.location.z - this.position.z, 2)
      );
      
      return {
        ...resource,
        socialQuality,
        distance,
        utilityScore: socialQuality * resource.confidence / Math.max(1, distance * 0.1)
      };
    });
    
    // Sort resources by utility score (quality * confidence / distance)
    const prioritizedResources = validResources.sort((a, b) => b.utilityScore - a.utilityScore);
    const bestSocialResource = prioritizedResources[0] || null;
    
    // Enhanced danger zone analysis with compound threat assessment
    const activeDangerZones = this.dangerZones.filter(danger => {
      const age = currentTime - danger.timestamp;
      return age < this.informationDecay * 0.5;
    }).map(danger => ({
      ...danger,
      distance: Math.sqrt(
        Math.pow(danger.location.x - this.position.x, 2) +
        Math.pow(danger.location.z - this.position.z, 2)
      )
    }));
    
    // Calculate compound threat level
    const compoundThreatLevel = this.calculateCompoundThreatLevel(activeDangerZones);
    
    // Analyze help requests with social priority
    const urgentHelp = this.helpRequests.filter(request => 
      !request.processed && request.priority === 'high'
    ).length;
    
    return {
      knownResourceCount: validResources.length,
      prioritizedResources: prioritizedResources.slice(0, 3), // Top 3 resources
      bestResourceConfidence: bestSocialResource?.confidence || 0,
      bestResourceDistance: bestSocialResource?.distance || Infinity,
      bestResourceQuality: bestSocialResource?.socialQuality || 0,
      bestResourceUtility: bestSocialResource?.utilityScore || 0,
      dangerZoneCount: activeDangerZones.length,
      activeDangerZones: activeDangerZones,
      nearestDangerDistance: activeDangerZones.length > 0 ? Math.min(...activeDangerZones.map(d => d.distance)) : Infinity,
      compoundThreatLevel,
      urgentHelpRequests: urgentHelp,
      socialInfluenceFactors: this.calculateSocialInfluenceFactors(prioritizedResources, activeDangerZones)
    };
  }

  // Calculate resource quality from social intelligence data
  calculateResourceQuality(resource) {
    let quality = 0.5; // Base quality
    
    // Factor in multiple reports about the same resource
    const relatedReports = this.knownResourceLocations.filter(r => {
      const distance = Math.sqrt(
        Math.pow(r.location.x - resource.location.x, 2) +
        Math.pow(r.location.z - resource.location.z, 2)
      );
      return distance < 3; // Resources within 3 units are considered the same
    });
    
    // More reports = higher quality (social validation)
    quality += Math.min(0.3, relatedReports.length * 0.1);
    
    // Recent reports are more valuable
    const recency = 1 - ((Date.now() - resource.timestamp) / this.informationDecay);
    quality *= (0.5 + recency * 0.5);
    
    // High-confidence sources boost quality
    if (resource.confidence > 0.7) {
      quality *= 1.2;
    }
    
    // Factor in successful past experiences with this resource type
    if (resource.successHistory) {
      quality += resource.successHistory * 0.1;
    }
    
    return Math.min(1, quality);
  }

  // Calculate compound threat level from multiple danger zones
  calculateCompoundThreatLevel(dangerZones) {
    if (dangerZones.length === 0) return 0;
    
    let compoundThreat = 0;
    
    dangerZones.forEach(danger => {
      // Distance-based threat calculation
      const distanceThreat = Math.max(0, 1 - danger.distance / 15);
      
      // Severity-based threat
      const severityMultiplier = danger.severity || 1;
      
      // Age-based decay
      const age = Date.now() - danger.timestamp;
      const freshness = Math.max(0.2, 1 - age / (this.informationDecay * 0.5));
      
      compoundThreat += distanceThreat * severityMultiplier * freshness;
    });
    
    // Account for overlapping danger zones (amplification effect)
    if (dangerZones.length > 1) {
      const overlapBonus = Math.min(0.5, (dangerZones.length - 1) * 0.2);
      compoundThreat *= (1 + overlapBonus);
    }
    
    return Math.min(2, compoundThreat);
  }

  // Calculate factors that indicate social vs individual decision influence
  calculateSocialInfluenceFactors(resources, dangerZones) {
    const factors = {
      resourceSocialInfluence: 0,
      threatSocialInfluence: 0,
      overallSocialInfluence: 0
    };
    
    // Resource influence: how much social knowledge affects resource seeking
    if (resources.length > 0) {
      const topResource = resources[0];
      factors.resourceSocialInfluence = topResource.confidence * topResource.socialQuality;
    }
    
    // Threat influence: how much social warnings affect threat avoidance
    if (dangerZones.length > 0) {
      factors.threatSocialInfluence = Math.min(1, dangerZones.length * 0.3);
    }
    
    // Overall social influence score
    factors.overallSocialInfluence = (factors.resourceSocialInfluence + factors.threatSocialInfluence) / 2;
    
    return factors;
  }

  defineGoals(observation) {
    const goals = [];
    const socialInfo = observation.socialInfo || {};
    
    // Enhanced food seeking with social resource prioritization
    if (observation.energy < 40) {
      let foodUrgency = 10 - (observation.energy / 10);
      
      // Prioritize socially known good resources over random exploration
      if (socialInfo.bestResourceQuality > 0.6 && socialInfo.bestResourceDistance < 15) {
        foodUrgency *= 1.4; // Higher multiplier for quality resources
        goals.push({ 
          priority: 'high', 
          goal: 'find_social_food', 
          urgency: foodUrgency,
          sociallyInformed: true,
          resourceQuality: socialInfo.bestResourceQuality,
          resourceUtility: socialInfo.bestResourceUtility
        });
      } else if (socialInfo.prioritizedResources && socialInfo.prioritizedResources.length > 0) {
        // Use secondary social resources if available
        const secondBest = socialInfo.prioritizedResources[0];
        foodUrgency *= 1.2;
        goals.push({ 
          priority: 'high', 
          goal: 'find_social_food', 
          urgency: foodUrgency,
          sociallyInformed: true,
          resourceQuality: secondBest.socialQuality,
          resourceUtility: secondBest.utilityScore
        });
      } else {
        // Fallback to individual exploration (but with lower priority if social info exists)
        if (socialInfo.knownResourceCount > 0) {
          foodUrgency *= 0.8; // Reduce urgency for random exploration when social info exists
        }
        goals.push({ 
          priority: 'high', 
          goal: 'find_food', 
          urgency: foodUrgency,
          sociallyInformed: false
        });
      }
    }
    
    // Enhanced infection avoidance combining direct and social threat detection
    const directThreatLevel = observation.nearbyInfected;
    const socialThreatLevel = socialInfo.compoundThreatLevel || 0;
    const combinedThreatLevel = Math.max(directThreatLevel, socialThreatLevel * 0.7);
    
    if (combinedThreatLevel > 0) {
      let avoidanceUrgency = combinedThreatLevel * 3;
      
      // Enhanced avoidance with social danger zone integration
      const threatSources = [];
      
      if (directThreatLevel > 0) {
        threatSources.push({
          type: 'direct',
          level: directThreatLevel,
          multiplier: 1.0
        });
      }
      
      if (socialThreatLevel > 0.3) {
        threatSources.push({
          type: 'social',
          level: socialThreatLevel,
          multiplier: 0.8,
          dangerZones: socialInfo.activeDangerZones
        });
      }
      
      // Amplify urgency if multiple threat types detected
      if (threatSources.length > 1) {
        avoidanceUrgency *= 1.3;
      }
      
      goals.push({ 
        priority: 'critical', 
        goal: 'enhanced_avoid_threats', 
        urgency: avoidanceUrgency,
        threatSources,
        combinedThreatLevel,
        socialThreatData: socialInfo.activeDangerZones
      });
    }
    
    // Help others if we have received help requests and are capable
    if (socialInfo.urgentHelpRequests > 0 && observation.energy > 60) {
      goals.push({ 
        priority: 'medium', 
        goal: 'help_others', 
        urgency: socialInfo.urgentHelpRequests * 2,
        sociallyMotivated: true 
      });
    }
    
    if (observation.energy > 60 && this.age > 30) {
      goals.push({ priority: 'medium', goal: 'reproduce', urgency: 3 });
    }
    
    // Intelligent exploration influenced by social information completeness
    let exploreUrgency = 1;
    const socialInformationCompleteness = this.calculateSocialInformationCompleteness(socialInfo);
    
    if (socialInformationCompleteness > 0.7) {
      exploreUrgency *= 0.5; // Significantly less need to explore if we have comprehensive social info
    } else if (socialInformationCompleteness > 0.4) {
      exploreUrgency *= 0.7; // Moderate reduction in exploration need
    }
    
    goals.push({ 
      priority: 'low', 
      goal: 'smart_explore', 
      urgency: exploreUrgency,
      socialInformationGaps: 1 - socialInformationCompleteness
    });
    
    return goals.sort((a, b) => {
      // Prioritize critical goals first, then by urgency
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : b.urgency - a.urgency;
    });
  }

  // Calculate how complete our social information is
  calculateSocialInformationCompleteness(socialInfo) {
    let completeness = 0;
    let maxCompleteness = 0;
    
    // Resource information completeness
    maxCompleteness += 0.4;
    if (socialInfo.knownResourceCount > 0) {
      completeness += Math.min(0.4, socialInfo.knownResourceCount * 0.1);
    }
    
    // Threat information completeness
    maxCompleteness += 0.3;
    if (socialInfo.dangerZoneCount > 0) {
      completeness += Math.min(0.3, socialInfo.dangerZoneCount * 0.1);
    }
    
    // Social network completeness
    maxCompleteness += 0.3;
    const socialConnections = this.alliances.length + this.communicationHistory.length;
    completeness += Math.min(0.3, socialConnections * 0.05);
    
    return completeness / maxCompleteness;
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
    const alternatives = ['explore', 'rest', 'forage', 'socialize', 'isolate', 'help_others'];
    let selectedAction = 'explore';
    let description = 'Continue current behavior';
    let expectedOutcome = 'Maintain status quo';
    let justification = 'Default action when no clear priority emerges';
    let confidence = 0.5;
    
    const socialInfo = observation.socialInfo || {};
    
    // Social information-based food seeking
    if (goal?.goal === 'find_social_food' && goal.sociallyInformed) {
      selectedAction = 'seek_social_resource';
      description = 'Move toward socially-known resource location';
      expectedOutcome = 'Energy restoration via social intelligence';
      justification = `Social information indicates ${socialInfo.bestResourceConfidence * 100}% confidence resource at ${Math.round(socialInfo.bestResourceDistance)} units`;
      confidence = socialInfo.bestResourceConfidence || 0.8;
    } else if (goal?.goal === 'find_food' && observation.nearestResourceDistance < 10) {
      selectedAction = 'forage';
      description = 'Move toward nearest resource';
      expectedOutcome = 'Energy restoration';
      justification = `Food is accessible (${Math.round(observation.nearestResourceDistance)} units) and energy need is urgent`;
      confidence = 0.8;
    } 
    // Help others based on social requests
    else if (goal?.goal === 'help_others' && goal.sociallyMotivated) {
      selectedAction = 'help_nearby';
      description = 'Assist agents in need based on help requests';
      expectedOutcome = 'Increased trust and reciprocal relationships';
      justification = `${socialInfo.urgentHelpRequests} urgent help requests from trusted agents`;
      confidence = 0.7;
    }
    // Enhanced infection avoidance with social information
    else if (observation.nearbyInfected > 0 && this.status === 'Susceptible') {
      selectedAction = 'avoid';
      description = 'Maintain distance from infected agents and known danger zones';
      expectedOutcome = 'Reduce infection probability';
      const riskText = socialInfo.nearestDangerDistance < 8 ? 
        `${observation.nearbyInfected} infected nearby + social warning of danger zone at ${Math.round(socialInfo.nearestDangerDistance)} units` :
        `${observation.nearbyInfected} infected agents nearby pose ${Math.round(observation.nearbyInfected * 3)}% infection risk`;
      justification = riskText;
      confidence = socialInfo.dangerZoneCount > 0 ? 0.95 : 0.9;
    } 
    else if (observation.energy > 70 && this.reproductionCooldown === 0 && this.age > 30) {
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
      confidence,
      sociallyInfluenced: socialInfo.knownResourceCount > 0 || socialInfo.dangerZoneCount > 0
    };
  }

  reasonToAction(chainOfThought, observation) {
    const conclusion = chainOfThought.thoughts.find(t => t.type === 'conclusion');
    const actionType = conclusion?.content.match(/Decision: (\w+)/)?.[1] || 'explore';
    const socialInfo = observation.socialInfo || {};
    
    switch (actionType) {
      case 'seek_social_resource':
        return {
          type: 'seek_social_resource',
          intensity: 0.9,
          direction: this.getSocialResourceDirection(socialInfo),
          reasoning: 'Using social intelligence to find resources',
          targetLocation: this.getBestKnownResource()?.location
        };
      case 'help_nearby':
        return {
          type: 'help_nearby',
          intensity: 0.6,
          direction: this.getHelpDirection(),
          reasoning: 'Assisting agents based on help requests'
        };
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
          direction: this.getAvoidanceDirection(observation, socialInfo),
          reasoning: 'Avoiding infection risk and danger zones'
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

  // Intelligent Direction Finding System
  
  // Calculate optimal movement toward social goals with pathfinding
  calculateOptimalSocialDirection(goal, observation, socialInfo) {
    switch (goal.goal) {
      case 'find_social_food':
        return this.calculateSocialResourceDirection(socialInfo, goal);
      case 'enhanced_avoid_threats':
        return this.calculateEnhancedAvoidanceDirection(socialInfo, goal);
      case 'help_others':
        return this.calculateHelpDirection(socialInfo);
      case 'smart_explore':
        return this.calculateSmartExplorationDirection(socialInfo, observation);
      default:
        return this.getRandomDirection();
    }
  }

  // Calculate direction toward best social resource with obstacle avoidance
  calculateSocialResourceDirection(socialInfo, goal) {
    if (!socialInfo.prioritizedResources || socialInfo.prioritizedResources.length === 0) {
      return this.getRandomDirection();
    }

    const targetResource = socialInfo.prioritizedResources[0];
    const directDirection = Math.atan2(
      targetResource.location.z - this.position.z,
      targetResource.location.x - this.position.x
    );

    // Apply obstacle avoidance to the path
    const avoidanceAdjustment = this.calculateObstacleAvoidance(directDirection, socialInfo);
    const optimizedDirection = this.combineDirections([
      { direction: directDirection, weight: goal.resourceUtility || 0.7 },
      { direction: avoidanceAdjustment, weight: 0.3 }
    ]);

    // Add waypoint navigation if path is complex
    const waypoints = this.calculateSocialWaypoints(targetResource.location, socialInfo);
    if (waypoints.length > 0) {
      const nextWaypoint = waypoints[0];
      return Math.atan2(
        nextWaypoint.z - this.position.z,
        nextWaypoint.x - this.position.x
      );
    }

    return optimizedDirection;
  }

  // Calculate enhanced avoidance direction using compound threat analysis
  calculateEnhancedAvoidanceDirection(socialInfo, goal) {
    const avoidanceVectors = [];

    // Process all threat sources from the goal
    goal.threatSources.forEach(source => {
      if (source.type === 'direct') {
        // Direct threat avoidance (existing logic)
        const directAvoidanceDirection = this.getRandomDirection(); // Simplified for now
        avoidanceVectors.push({
          direction: directAvoidanceDirection,
          weight: source.level * source.multiplier
        });
      } else if (source.type === 'social' && source.dangerZones) {
        // Social danger zone avoidance
        source.dangerZones.forEach(danger => {
          const dx = danger.location.x - this.position.x;
          const dz = danger.location.z - this.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < danger.radius * 1.5) { // Extended safety margin
            const avoidDirection = Math.atan2(-dz, -dx); // Away from danger
            const strength = (danger.radius * 1.5 - distance) / (danger.radius * 1.5);
            avoidanceVectors.push({
              direction: avoidDirection,
              weight: strength * source.multiplier * (danger.severity || 1)
            });
          }
        });
      }
    });

    // Combine all avoidance vectors
    return this.combineDirections(avoidanceVectors);
  }

  // Calculate direction toward agents requesting help
  calculateHelpDirection(socialInfo) {
    const urgentHelp = this.helpRequests.find(request => 
      !request.processed && request.priority === 'high'
    );
    
    if (urgentHelp) {
      const directDirection = Math.atan2(
        urgentHelp.location.z - this.position.z,
        urgentHelp.location.x - this.position.x
      );

      // Consider safe path to help location
      const safeDirection = this.calculateSafePath(urgentHelp.location, socialInfo);
      return safeDirection || directDirection;
    }

    return this.getRandomDirection();
  }

  // Calculate smart exploration direction based on social information gaps
  calculateSmartExplorationDirection(socialInfo, observation) {
    const explorationVectors = [];

    // Explore areas with limited social information
    const informationGaps = this.identifyInformationGaps(socialInfo);
    
    informationGaps.forEach(gap => {
      const gapDirection = Math.atan2(
        gap.location.z - this.position.z,
        gap.location.x - this.position.x
      );
      explorationVectors.push({
        direction: gapDirection,
        weight: gap.priority
      });
    });

    // Add exploration away from well-known areas
    const knownAreaAvoidance = this.calculateKnownAreaAvoidance(socialInfo);
    if (knownAreaAvoidance) {
      explorationVectors.push({
        direction: knownAreaAvoidance,
        weight: 0.3
      });
    }

    return this.combineDirections(explorationVectors);
  }

  // Calculate social waypoints for complex pathfinding
  calculateSocialWaypoints(targetLocation, socialInfo) {
    const waypoints = [];
    const directDistance = Math.sqrt(
      Math.pow(targetLocation.x - this.position.x, 2) +
      Math.pow(targetLocation.z - this.position.z, 2)
    );

    // Only use waypoints for longer distances or when obstacles are present
    if (directDistance < 10 || !socialInfo.activeDangerZones || socialInfo.activeDangerZones.length === 0) {
      return waypoints;
    }

    // Create waypoints around danger zones
    socialInfo.activeDangerZones.forEach(danger => {
      const dangerToTarget = Math.sqrt(
        Math.pow(targetLocation.x - danger.location.x, 2) +
        Math.pow(targetLocation.z - danger.location.z, 2)
      );

      // If danger is between us and target, create waypoint around it
      if (dangerToTarget < directDistance * 0.8) {
        const safeDistance = danger.radius * 1.5;
        const perpAngle = Math.atan2(
          danger.location.z - this.position.z,
          danger.location.x - this.position.x
        ) + Math.PI / 2;

        const waypoint = {
          x: danger.location.x + Math.cos(perpAngle) * safeDistance,
          z: danger.location.z + Math.sin(perpAngle) * safeDistance
        };

        waypoints.push(waypoint);
      }
    });

    return waypoints.slice(0, 2); // Limit to 2 waypoints for simplicity
  }

  // Calculate obstacle avoidance adjustment
  calculateObstacleAvoidance(desiredDirection, socialInfo) {
    if (!socialInfo.activeDangerZones || socialInfo.activeDangerZones.length === 0) {
      return desiredDirection;
    }

    let avoidanceAdjustment = 0;
    let totalWeight = 0;

    socialInfo.activeDangerZones.forEach(danger => {
      const dx = danger.location.x - this.position.x;
      const dz = danger.location.z - this.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < danger.radius * 2) {
        const dangerDirection = Math.atan2(dz, dx);
        const angleDiff = this.angleDifference(desiredDirection, dangerDirection);
        
        if (Math.abs(angleDiff) < Math.PI / 3) { // Obstacle in path
          const weight = (danger.radius * 2 - distance) / (danger.radius * 2);
          const avoidDirection = dangerDirection + (angleDiff > 0 ? -Math.PI/2 : Math.PI/2);
          
          avoidanceAdjustment += avoidDirection * weight;
          totalWeight += weight;
        }
      }
    });

    return totalWeight > 0 ? avoidanceAdjustment / totalWeight : desiredDirection;
  }

  // Combine multiple directional influences with weights
  combineDirections(directionVectors) {
    if (directionVectors.length === 0) {
      return this.getRandomDirection();
    }

    let totalX = 0, totalY = 0, totalWeight = 0;

    directionVectors.forEach(vector => {
      const weight = vector.weight || 1;
      totalX += Math.cos(vector.direction) * weight;
      totalY += Math.sin(vector.direction) * weight;
      totalWeight += weight;
    });

    if (totalWeight === 0) {
      return this.getRandomDirection();
    }

    return Math.atan2(totalY / totalWeight, totalX / totalWeight);
  }

  // Calculate safe path to destination avoiding danger zones
  calculateSafePath(destination, socialInfo) {
    if (!socialInfo.activeDangerZones || socialInfo.activeDangerZones.length === 0) {
      return Math.atan2(
        destination.z - this.position.z,
        destination.x - this.position.x
      );
    }

    // Use simplified A* pathfinding concept
    const directPath = Math.atan2(
      destination.z - this.position.z,
      destination.x - this.position.x
    );

    // Check if direct path intersects any danger zones
    const pathBlocked = socialInfo.activeDangerZones.some(danger => {
      return this.pathIntersectsDanger(this.position, destination, danger);
    });

    if (!pathBlocked) {
      return directPath;
    }

    // Calculate alternative safe path
    const alternativePaths = [];
    
    // Try paths at different angles around obstacles
    for (let i = 0; i < 8; i++) {
      const testAngle = directPath + (i * Math.PI / 4) - Math.PI;
      const testDirection = this.normalizeAngle(testAngle);
      
      const pathSafety = this.evaluatePathSafety(testDirection, socialInfo);
      alternativePaths.push({
        direction: testDirection,
        safety: pathSafety
      });
    }

    // Choose safest alternative path
    const safestPath = alternativePaths.reduce((best, current) => 
      current.safety > best.safety ? current : best
    );

    return safestPath.direction;
  }

  // Identify areas with limited social information for exploration
  identifyInformationGaps(socialInfo) {
    const gaps = [];
    const searchRadius = 20;
    const gridSize = 5;

    // Simple grid-based gap identification
    for (let x = -searchRadius; x <= searchRadius; x += gridSize) {
      for (let z = -searchRadius; z <= searchRadius; z += gridSize) {
        const testLocation = {
          x: this.position.x + x,
          z: this.position.z + z
        };

        const informationDensity = this.calculateInformationDensity(testLocation, socialInfo);
        
        if (informationDensity < 0.3) { // Low information area
          gaps.push({
            location: testLocation,
            priority: 1 - informationDensity,
            distance: Math.sqrt(x * x + z * z)
          });
        }
      }
    }

    return gaps.sort((a, b) => (b.priority / b.distance) - (a.priority / a.distance)).slice(0, 3);
  }

  // Helper methods
  getRandomDirection() {
    return Math.random() * Math.PI * 2;
  }

  angleDifference(angle1, angle2) {
    let diff = angle1 - angle2;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
  }

  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  pathIntersectsDanger(start, end, danger) {
    // Simple line-circle intersection check
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const fx = start.x - danger.location.x;
    const fz = start.z - danger.location.z;

    const a = dx * dx + dz * dz;
    const b = 2 * (fx * dx + fz * dz);
    const c = (fx * fx + fz * fz) - danger.radius * danger.radius;

    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) return false;

    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  }

  evaluatePathSafety(direction, socialInfo) {
    let safety = 1.0;
    const testDistance = 10;
    
    const testPoint = {
      x: this.position.x + Math.cos(direction) * testDistance,
      z: this.position.z + Math.sin(direction) * testDistance
    };

    socialInfo.activeDangerZones.forEach(danger => {
      const distance = Math.sqrt(
        Math.pow(testPoint.x - danger.location.x, 2) +
        Math.pow(testPoint.z - danger.location.z, 2)
      );
      
      if (distance < danger.radius * 2) {
        safety *= Math.max(0.1, distance / (danger.radius * 2));
      }
    });

    return safety;
  }

  calculateKnownAreaAvoidance(socialInfo) {
    // Calculate direction away from densely known areas
    if (!socialInfo.prioritizedResources || socialInfo.prioritizedResources.length === 0) {
      return null;
    }

    let avgX = 0, avgZ = 0;
    socialInfo.prioritizedResources.forEach(resource => {
      avgX += resource.location.x;
      avgZ += resource.location.z;
    });
    
    avgX /= socialInfo.prioritizedResources.length;
    avgZ /= socialInfo.prioritizedResources.length;

    // Return direction away from average known resource location
    return Math.atan2(
      this.position.z - avgZ,
      this.position.x - avgX
    );
  }

  calculateInformationDensity(location, socialInfo) {
    let density = 0;
    const checkRadius = 8;

    // Check density of known resources
    if (socialInfo.prioritizedResources) {
      socialInfo.prioritizedResources.forEach(resource => {
        const distance = Math.sqrt(
          Math.pow(location.x - resource.location.x, 2) +
          Math.pow(location.z - resource.location.z, 2)
        );
        if (distance < checkRadius) {
          density += resource.confidence * (1 - distance / checkRadius);
        }
      });
    }

    // Check density of danger zones
    if (socialInfo.activeDangerZones) {
      socialInfo.activeDangerZones.forEach(danger => {
        const distance = Math.sqrt(
          Math.pow(location.x - danger.location.x, 2) +
          Math.pow(location.z - danger.location.z, 2)
        );
        if (distance < checkRadius) {
          density += 0.3 * (1 - distance / checkRadius);
        }
      });
    }

    return Math.min(1, density);
  }

  getAvoidanceDirection(observation, socialInfo = {}) {
    return Math.random() * Math.PI * 2;
  }

  // Influence Tracking System - Decision Attribution and Metrics

  // Track a decision with its influence sources
  trackDecision(decision, influences, observation, socialInfo) {
    const decisionRecord = {
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      decision: decision,
      goal: decision.goal,
      influences: influences,
      context: {
        energy: observation.energy,
        nearbyAgents: observation.nearbyCount,
        threats: observation.nearbyInfected,
        socialInfoAvailable: socialInfo && Object.keys(socialInfo).length > 0
      },
      outcome: null, // To be filled later when evaluating success
      sociallyInfluenced: influences.social > influences.individual
    };

    this.decisionHistory.push(decisionRecord);
    
    // Maintain history limit
    if (this.decisionHistory.length > this.maxDecisionHistory) {
      this.decisionHistory.shift();
    }

    // Update current influences
    this.currentDecisionInfluences = influences;
    this.updateInfluenceMetrics();

    return decisionRecord;
  }

  // Calculate influence factors for a decision
  calculateDecisionInfluences(goal, observation, socialInfo) {
    const influences = {
      social: 0,
      individual: 0,
      environmental: 0,
      random: 0
    };

    // Social influence calculation
    if (goal.sociallyInformed || goal.sociallyMotivated) {
      influences.social += 0.4; // Base social influence

      // Additional social influence factors
      if (socialInfo.overallSocialInfluence) {
        influences.social += socialInfo.overallSocialInfluence * 0.3;
      }

      if (goal.resourceUtility && goal.resourceUtility > 0.6) {
        influences.social += 0.2; // High utility social resource
      }

      if (goal.goal === 'enhanced_avoid_threats' && goal.threatSources) {
        const socialThreats = goal.threatSources.filter(t => t.type === 'social').length;
        influences.social += socialThreats * 0.1;
      }

      if (goal.goal === 'help_others') {
        influences.social += 0.3; // Helping is inherently social
      }
    }

    // Individual influence calculation
    const individualFactors = [
      observation.energy < 30 ? 0.3 : 0, // Survival instinct
      this.age > 50 ? 0.2 : 0, // Experience
      observation.nearbyInfected > 0 ? 0.2 : 0, // Direct threat response
      this.phenotype.aggressiveness * 0.1, // Personality trait
      this.phenotype.socialTendency < 0.3 ? 0.2 : 0 // Low social tendency
    ];
    influences.individual = individualFactors.reduce((sum, factor) => sum + factor, 0);

    // Environmental influence calculation
    if (observation.nearbyCount > 5) {
      influences.environmental += 0.15; // Crowding
    }
    if (observation.nearestResourceDistance < 5) {
      influences.environmental += 0.1; // Close resource
    }
    if (observation.nearbyInfected > 2) {
      influences.environmental += 0.2; // High threat environment
    }

    // Random influence (baseline uncertainty)
    influences.random = Math.max(0.05, 0.3 - (influences.social + influences.individual + influences.environmental));

    // Normalize influences to sum to 1
    const total = Object.values(influences).reduce((sum, val) => sum + val, 0);
    if (total > 0) {
      Object.keys(influences).forEach(key => {
        influences[key] = influences[key] / total;
      });
    }

    return influences;
  }

  // Update overall influence metrics
  updateInfluenceMetrics() {
    if (this.decisionHistory.length === 0) return;

    this.influenceMetrics.totalDecisions = this.decisionHistory.length;

    // Calculate overall influence ratios
    let totalSocial = 0, totalIndividual = 0, totalEnvironmental = 0;
    
    this.decisionHistory.forEach(decision => {
      totalSocial += decision.influences.social;
      totalIndividual += decision.influences.individual;
      totalEnvironmental += decision.influences.environmental;
    });

    const count = this.decisionHistory.length;
    this.influenceMetrics.socialInfluenceRatio = totalSocial / count;
    this.influenceMetrics.individualInfluenceRatio = totalIndividual / count;
    this.influenceMetrics.environmentalInfluenceRatio = totalEnvironmental / count;

    // Calculate recent social influence (last 10 decisions)
    const recentDecisions = this.decisionHistory.slice(-10);
    this.influenceMetrics.recentSocialInfluence = recentDecisions.length > 0 ? 
      recentDecisions.reduce((sum, d) => sum + d.influences.social, 0) / recentDecisions.length : 0;

    // Calculate decision success rates
    this.updateDecisionQualityMetrics();
  }

  // Update decision quality and success metrics
  updateDecisionQualityMetrics() {
    const completedDecisions = this.decisionHistory.filter(d => d.outcome !== null);
    
    if (completedDecisions.length === 0) return;

    // Overall decision quality
    const successfulDecisions = completedDecisions.filter(d => d.outcome.success);
    this.influenceMetrics.decisionQuality = successfulDecisions.length / completedDecisions.length;

    // Social vs individual decision success
    const socialDecisions = completedDecisions.filter(d => d.sociallyInfluenced);
    const individualDecisions = completedDecisions.filter(d => !d.sociallyInfluenced);

    this.influenceMetrics.socialDecisionSuccess = socialDecisions.length > 0 ?
      socialDecisions.filter(d => d.outcome.success).length / socialDecisions.length : 0;

    this.influenceMetrics.individualDecisionSuccess = individualDecisions.length > 0 ?
      individualDecisions.filter(d => d.outcome.success).length / individualDecisions.length : 0;
  }

  // Evaluate the outcome of a decision
  evaluateDecisionOutcome(decisionId, currentObservation, timeElapsed) {
    const decision = this.decisionHistory.find(d => d.id === decisionId);
    if (!decision) return;

    const outcome = {
      success: false,
      energyChange: currentObservation.energy - decision.context.energy,
      survivalMaintained: currentObservation.energy > 0,
      threatAvoided: currentObservation.nearbyInfected <= decision.context.threats,
      goalAchieved: this.evaluateGoalAchievement(decision.goal, currentObservation),
      efficiency: this.calculateDecisionEfficiency(decision, timeElapsed)
    };

    // Determine overall success
    outcome.success = outcome.survivalMaintained && 
                     (outcome.energyChange >= -5 || outcome.goalAchieved) &&
                     outcome.efficiency > 0.3;

    decision.outcome = outcome;
    this.updateInfluenceMetrics();
  }

  // Evaluate if a specific goal was achieved
  evaluateGoalAchievement(goal, observation) {
    switch (goal) {
      case 'find_social_food':
      case 'find_food':
        return observation.energy > 50; // Energy restored
      
      case 'enhanced_avoid_threats':
      case 'avoid_infection':
        return observation.nearbyInfected === 0; // Threats avoided
      
      case 'help_others':
        return this.helpRequests.some(r => r.processed); // Help provided
      
      case 'smart_explore':
      case 'explore':
        return this.knownResourceLocations.length > 0; // New information gained
      
      case 'reproduce':
        return this.reproductionCooldown > 0; // Recently reproduced
      
      default:
        return false;
    }
  }

  // Calculate decision efficiency score
  calculateDecisionEfficiency(decision, timeElapsed) {
    let efficiency = 0.5; // Base efficiency
    
    // Time efficiency - faster decisions are better for urgent goals
    if (decision.goal === 'enhanced_avoid_threats' && timeElapsed < 5) {
      efficiency += 0.3;
    } else if (timeElapsed > 20) {
      efficiency -= 0.2; // Slow decisions are less efficient
    }

    // Energy efficiency
    if (decision.outcome && decision.outcome.energyChange > 0) {
      efficiency += Math.min(0.3, decision.outcome.energyChange * 0.01);
    }

    // Social coordination efficiency
    if (decision.sociallyInfluenced && decision.outcome && decision.outcome.success) {
      efficiency += 0.2; // Successful social decisions are highly efficient
    }

    return Math.max(0, Math.min(1, efficiency));
  }

  // Get influence analysis for current agent
  getInfluenceAnalysis() {
    return {
      currentInfluences: { ...this.currentDecisionInfluences },
      overallMetrics: { ...this.influenceMetrics },
      recentDecisions: this.decisionHistory.slice(-5).map(d => ({
        goal: d.goal,
        sociallyInfluenced: d.sociallyInfluenced,
        influences: d.influences,
        success: d.outcome ? d.outcome.success : null,
        timestamp: d.timestamp
      })),
      socialEffectiveness: this.influenceMetrics.socialDecisionSuccess,
      individualEffectiveness: this.influenceMetrics.individualDecisionSuccess,
      adaptability: this.calculateAdaptabilityScore()
    };
  }

  // Calculate how well the agent adapts between social and individual decision making
  calculateAdaptabilityScore() {
    if (this.decisionHistory.length < 5) return 0.5;

    const recentDecisions = this.decisionHistory.slice(-10);
    let adaptabilityScore = 0;

    // Score based on appropriate use of social vs individual information
    recentDecisions.forEach(decision => {
      const contextScore = this.evaluateDecisionContextAppropriateness(decision);
      adaptabilityScore += contextScore;
    });

    return adaptabilityScore / recentDecisions.length;
  }

  // Evaluate if decision-making approach was appropriate for the context
  evaluateDecisionContextAppropriateness(decision) {
    let appropriateness = 0.5; // Base appropriateness

    // Social decisions are appropriate when:
    // - High social information quality available
    // - Low individual confidence
    // - Complex or dangerous situations
    if (decision.sociallyInfluenced) {
      if (decision.context.socialInfoAvailable) appropriateness += 0.2;
      if (decision.context.threats > 0) appropriateness += 0.2;
      if (decision.context.energy < 40) appropriateness += 0.1;
    } else {
      // Individual decisions are appropriate when:
      // - High individual capability
      // - Low social information quality
      // - Simple, immediate needs
      if (!decision.context.socialInfoAvailable) appropriateness += 0.2;
      if (decision.context.energy > 60) appropriateness += 0.1;
      if (decision.context.nearbyAgents < 2) appropriateness += 0.2;
    }

    return Math.max(0, Math.min(1, appropriateness));
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
    
    // Add communication logic and information processing if simulation is running
    if (isSimulationRunning && this.isActive) {
      this.handleCommunication(agents, environment);
      this.updateSocialMemory(agents, environment);
      this.processInformationDecay(environment.cycleStep || 0);
      this.processHelpRequests(agents);
      
      // Trigger LLM reasoning asynchronously if needed
      if (this.llmAvailable && Math.random() < this.reasoningFrequency) {
        this.triggerAsyncReasoning(environment, agents);
      }
    }
    
    return result;
  }

  // Information decay implementation
  processInformationDecay(currentStep) {
    this.lastInfoUpdate = currentStep;
    
    const initialResourceCount = this.knownResourceLocations.length;
    const initialDangerCount = this.dangerZones.length;
    const initialHelpCount = this.helpRequests.length;
    
    // Decay known resource locations
    this.knownResourceLocations = this.knownResourceLocations.filter(resource => {
      const age = currentStep - resource.timestamp;
      if (age > this.informationDecay) {
        return false; // Remove stale information
      }
      // Reduce confidence over time
      resource.confidence = Math.max(0.1, resource.confidence * (1 - age / (this.informationDecay * 2)));
      return true;
    });

    // Decay danger zone warnings
    this.dangerZones = this.dangerZones.filter(danger => {
      const age = currentStep - danger.timestamp;
      return age < this.informationDecay * 0.5; // Danger info expires faster
    });

    // Process help request expiration
    this.helpRequests = this.helpRequests.filter(request => {
      const age = currentStep - request.timestamp;
      return age < this.informationDecay * 1.5; // Help requests last longer
    });

    // Decrease help request cooldown
    this.helpRequestCooldown = Math.max(0, this.helpRequestCooldown - 1);
    
    // Log social information decay activity (every 100 steps)
    if (currentStep % 100 === 0 && (initialResourceCount > 0 || initialDangerCount > 0 || initialHelpCount > 0)) {
      const resourceDecayed = initialResourceCount - this.knownResourceLocations.length;
      const dangerDecayed = initialDangerCount - this.dangerZones.length;
      const helpDecayed = initialHelpCount - this.helpRequests.length;
      
      console.log(`🧠 Agent ${this.id} Social Info Decay [Step ${currentStep}]: ` +
        `Resources: ${initialResourceCount}→${this.knownResourceLocations.length} (-${resourceDecayed}), ` +
        `Dangers: ${initialDangerCount}→${this.dangerZones.length} (-${dangerDecayed}), ` +
        `Help: ${initialHelpCount}→${this.helpRequests.length} (-${helpDecayed})`
      );
    }
  }

  // Advanced help request processing
  processHelpRequests(agents) {
    // Process incoming help requests from others
    this.helpRequests.forEach(request => {
      if (request.processed) return;
      
      const requester = agents.find(a => a.id === request.fromAgentId);
      if (!requester || this.distanceTo(requester) > this.resourceSharingRange) return;
      
      // Decide whether to help based on trust and our own status
      const trustLevel = this.socialMemory.getTrust(request.fromAgentId);
      const canHelp = this.energy > 60 && trustLevel > 0.5;
      
      if (canHelp && Math.random() < trustLevel) {
        this.offerHelp(requester, request.helpType);
        request.processed = true;
      }
    });

    // Send help request if we need it
    if (this.shouldRequestHelp() && this.helpRequestCooldown <= 0) {
      this.requestHelp(agents);
      this.helpRequestCooldown = 50; // 50 step cooldown
    }
  }

  requestHelp(agents) {
    const nearbyTrustedAgents = agents.filter(agent => 
      agent instanceof CausalAgent && 
      agent !== this &&
      this.distanceTo(agent) < this.resourceSharingRange &&
      this.socialMemory.isAgentTrusted(agent.id, 0.4)
    );

    nearbyTrustedAgents.forEach(agent => {
      if (agent.helpRequests) {
        agent.helpRequests.push({
          fromAgentId: this.id,
          helpType: this.energy < 20 ? 'critical_energy' : 'energy_assistance',
          location: { ...this.position },
          timestamp: this.lastInfoUpdate,
          priority: this.energy < 20 ? 'high' : 'medium',
          processed: false
        });
        if (agent.helpRequests.length > (agent.maxHelpRequests || 50)) {
          // Remove oldest first, keeping unprocessed priority requests newer
          agent.helpRequests = agent.helpRequests
            .sort((a, b) => (a.processed === b.processed ? a.timestamp - b.timestamp : a.processed ? -1 : 1))
            .slice(- (agent.maxHelpRequests || 50));
        }
      }
    });
  }

  offerHelp(requester, helpType) {
    if (helpType === 'critical_energy' || helpType === 'energy_assistance') {
      // Energy sharing - transfer some energy to the requester
      const energyToShare = Math.min(20, this.energy * 0.2);
      this.energy -= energyToShare;
      if (requester.energy !== undefined) {
        requester.energy = Math.min(100, requester.energy + energyToShare * 0.8); // Some loss in transfer
      }
      
      // Update trust positively for both agents
      this.socialMemory.updateTrust(requester.id, 0.1, 'helped_agent');
      if (requester.socialMemory) {
        requester.socialMemory.updateTrust(this.id, 0.15, 'received_help');
      }
      
      console.log(`🤝 Agent ${this.id} helped ${requester.id}: Shared ${energyToShare.toFixed(1)} energy (${helpType})`);
    }
  }

  async triggerAsyncReasoning(environment, agents) {
    // Don't start new reasoning if one is already pending
    if (this.pendingReasoning) return;
    
    try {
      this.pendingReasoning = true;
      
      const observation = this.getObservation(environment, agents);
      const reasoningResult = await this.simulateLLMReasoning(observation, agents);
      
      if (reasoningResult && reasoningResult.action) {
        // Queue the action for the next update cycle
        this.queuedAction = reasoningResult.action;
        
        // Update social memory trust based on decision quality
        if (reasoningResult.confidence > 0.8) {
          // High confidence decisions might influence trust of nearby agents
          const nearbyAgents = agents.filter(a => 
            a !== this && 
            a instanceof CausalAgent && 
            this.distanceTo(a) < 6
          );
          
          nearbyAgents.forEach(agent => {
            if (agent.socialMemory) {
              agent.socialMemory.updateTrust(this.id, 0.01, 'high_confidence_decision');
            }
          });
        }
      }
    } catch (error) {
      console.warn(`Async reasoning failed for agent ${this.id}:`, error.message);
    } finally {
      this.pendingReasoning = false;
    }
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
    
    // Resource sharing with social information storage
    if (this.energy > 70) {
      const nearbyResources = Array.from(environment.resources.values())
        .filter(r => this.distanceTo(r) < 15);
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
        
        // Store in our own knowledge for later use
        this.knownResourceLocations.push({
          location: resource.position,
          confidence: 0.8,
          quality: resource.quality || 0.5,
          timestamp: this.lastInfoUpdate || 0,
          source: 'self_observed'
        });
        if (this.knownResourceLocations.length > this.maxKnownResources) {
          this.knownResourceLocations = this.knownResourceLocations
            .sort((a, b) => (b.confidence - a.confidence) || (b.timestamp - a.timestamp))
            .slice(0, this.maxKnownResources);
        }
      }
    }
    
    // Warning about infection with danger zone tracking
    if (this.status === 'Recovered') {
      const infectedNearby = agents.filter(a => 
        a.status === 'Infected' && this.distanceTo(a) < 10
      );
      if (infectedNearby.length > 0) {
        const dangerLocation = infectedNearby[0].position;
        messageTypes.push({
          type: 'infection_warning',
          content: {
            location: dangerLocation,
            severity: infectedNearby.length,
            confidence: 0.9,
            timestamp: this.lastInfoUpdate || 0
          }
        });
        
        // Store danger zone information
        this.dangerZones.push({
          location: dangerLocation,
          severity: infectedNearby.length,
          timestamp: this.lastInfoUpdate || 0,
          radius: 8 // Danger zone radius
        });
        if (this.dangerZones.length > this.maxDangerZones) {
          this.dangerZones = this.dangerZones
            .sort((a, b) => (b.severity - a.severity) || (b.timestamp - a.timestamp))
            .slice(0, this.maxDangerZones);
        }
      }
    }
    
    // Alliance proposals for mutual benefit
    if (this.energy > 50 && Math.random() < 0.1) {
      messageTypes.push({
        type: 'alliance_proposal',
        content: {
          proposalType: 'resource_sharing',
          duration: 100, // steps
          benefits: ['shared_resources', 'infection_warnings'],
          confidence: 0.6,
          timestamp: this.lastInfoUpdate || 0
        }
      });
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
    
    // Process received social information for the recipient
    this.processSocialInformation(recipient, message);
    
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

  // Process social information received from other agents
  processSocialInformation(recipient, message) {
    if (!(recipient instanceof CausalAgent)) return;
    
    const trustLevel = recipient.socialMemory.getTrust(this.id);
    
    // Only process information from trusted sources
    if (trustLevel < 0.3) return;
    
    switch (message.type) {
      case 'resource_tip':
        if (recipient.knownResourceLocations && trustLevel > 0.4) {
          recipient.knownResourceLocations.push({
            location: message.content.location,
            confidence: message.content.confidence * trustLevel, // Adjust confidence by trust
            quality: message.content.quality || 0.5,
            timestamp: message.content.timestamp || 0,
            source: `agent_${this.id}`
          });
          const rCap = recipient.maxKnownResources || 30;
          if (recipient.knownResourceLocations.length > rCap) {
            recipient.knownResourceLocations = recipient.knownResourceLocations
              .sort((a, b) => (b.confidence - a.confidence) || (b.timestamp - a.timestamp))
              .slice(0, rCap);
          }
        }
        break;
        
      case 'infection_warning':
        if (recipient.dangerZones && trustLevel > 0.5) {
          recipient.dangerZones.push({
            location: message.content.location,
            severity: message.content.severity,
            timestamp: message.content.timestamp || 0,
            radius: 8,
            source: `agent_${this.id}`,
            confidence: message.content.confidence * trustLevel
          });
          const dCap = recipient.maxDangerZones || 40;
          if (recipient.dangerZones.length > dCap) {
            recipient.dangerZones = recipient.dangerZones
              .sort((a, b) => (b.severity - a.severity) || (b.timestamp - a.timestamp))
              .slice(0, dCap);
          }
        }
        break;
        
      case 'alliance_proposal':
        if (trustLevel > 0.6 && recipient.energy > 40) {
          // Accept alliance with trusted agents
          recipient.socialMemory.updateTrust(this.id, 0.1, 'alliance_accepted');
          this.socialMemory.updateTrust(recipient.id, 0.1, 'alliance_formed');
        }
        break;
    }
  }

  updateSocialMemory(agents, environment) {
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
    
    // Update alliance and territorial behaviors
    this.updateAlliances(agents);
    this.updateTerritorialBehavior(agents, environment);
    this.processTradeOpportunities(agents);
    this.respondToHelpRequests(agents);
  }

  updateAlliances(agents) {
    this.allianceCooldown = Math.max(0, this.allianceCooldown - 1);
    
    // Process alliance invitations
    this.allianceInvitations = this.allianceInvitations.filter(invitation => {
      if (Date.now() - invitation.timestamp > 30000) return false; // Expire after 30 seconds
      
      if (this.shouldAcceptAlliance(invitation, agents)) {
        this.acceptAlliance(invitation, agents);
        return false; // Remove processed invitation
      }
      return true;
    });
    
    // Consider forming new alliances
    if (this.allianceCooldown <= 0 && this.alliances.size < this.maxAlliances) {
      this.considerFormingAlliance(agents);
    }
    
    // Maintain existing alliances
    this.maintainAlliances(agents);
  }

  shouldAcceptAlliance(invitation, agents) {
    const sender = agents.find(a => a.id === invitation.senderId);
    if (!sender) return false;
    
    const trust = this.socialMemory.getTrust(invitation.senderId);
    const distance = this.distanceTo(sender);
    
    // Accept if high trust, reasonable distance, and mutual benefit
    return trust > 0.6 && distance < 15 && this.energy < 70;
  }

  acceptAlliance(invitation, agents) {
    const allianceId = `alliance_${invitation.senderId}_${this.id}`;
    const sender = agents.find(a => a.id === invitation.senderId);
    
    if (sender instanceof CausalAgent) {
      const allianceData = {
        id: allianceId,
        members: [invitation.senderId, this.id],
        formed: Date.now(),
        strength: 0.7,
        sharedResources: true,
        mutualDefense: true,
        resourceSharingRate: 0.3
      };
      
      this.alliances.set(allianceId, allianceData);
      sender.alliances.set(allianceId, allianceData);
      
      // Update trust
      this.socialMemory.updateTrust(invitation.senderId, 0.1, 'alliance_accepted');
      sender.socialMemory.updateTrust(this.id, 0.1, 'alliance_accepted');
      
      console.log(`🤝 Alliance formed: ${this.id} <-> ${invitation.senderId}`);
    }
  }

  considerFormingAlliance(agents) {
    const nearbyAgents = agents.filter(agent => 
      agent instanceof CausalAgent &&
      agent.id !== this.id && 
      this.distanceTo(agent) < 15 &&
      this.socialMemory.isAgentTrusted(agent.id, 0.5) &&
      agent.alliances.size < agent.maxAlliances
    );
    
    if (nearbyAgents.length === 0) return;
    
    // Select agent based on complementary needs
    const bestCandidate = nearbyAgents.find(agent => {
      const theirTrust = agent.socialMemory.getTrust(this.id);
      return theirTrust > 0.4 && (this.energy < 50 || agent.energy < 50);
    });
    
    if (bestCandidate) {
      this.proposeAlliance(bestCandidate);
      this.allianceCooldown = 100; // Cooldown before next proposal
    }
  }

  proposeAlliance(targetAgent) {
    const invitation = {
      senderId: this.id,
      targetId: targetAgent.id,
      timestamp: Date.now(),
      terms: {
        resourceSharing: true,
        mutualDefense: true,
        informationSharing: true
      }
    };
    
    targetAgent.allianceInvitations.push(invitation);
    console.log(`🤝 ${this.id} proposed alliance to ${targetAgent.id}`);
  }

  maintainAlliances(agents) {
    this.alliances.forEach((alliance, allianceId) => {
      const partner = agents.find(a => 
        alliance.members.includes(a.id) && a.id !== this.id
      );
      
      if (!partner) {
        this.alliances.delete(allianceId); // Partner no longer exists
        return;
      }
      
      // Share resources with alliance partners
      if (alliance.sharedResources && this.energy > 70 && partner.energy < 30) {
        const energyShare = Math.min(10, (this.energy - 70) * alliance.resourceSharingRate);
        this.energy -= energyShare;
        partner.energy = Math.min(100, partner.energy + energyShare);
        
        // Strengthen alliance
        alliance.strength = Math.min(1.0, alliance.strength + 0.02);
      }
      
      // Alliance decay over time if not maintained
      alliance.strength = Math.max(0, alliance.strength - 0.001);
      if (alliance.strength < 0.2) {
        this.alliances.delete(allianceId);
        if (partner instanceof CausalAgent) {
          partner.alliances.delete(allianceId);
        }
      }
    });
  }

  updateTerritorialBehavior(agents, environment) {
    // Claim territory if we don't have one and conditions are right
    if (!this.territory && this.territorialInstinct > 0.5 && this.energy > 60) {
      this.considerClaimingTerritory(agents, environment);
    }
    
    // Defend territory if we have one
    if (this.territory) {
      this.defendTerritory(agents);
      this.patrolTerritory();
    }
  }

  considerClaimingTerritory(agents, environment) {
    // Look for resource-rich areas without strong territorial presence
    const nearbyResources = Array.from(environment.resources.values())
      .filter(resource => this.distanceTo({ position: resource.position }) < 15);
    
    if (nearbyResources.length >= 2) {
      // Find the center of resource cluster
      const avgX = nearbyResources.reduce((sum, r) => sum + r.position.x, 0) / nearbyResources.length;
      const avgZ = nearbyResources.reduce((sum, r) => sum + r.position.z, 0) / nearbyResources.length;
      
      const territoryCenter = { x: avgX, z: avgZ };
      
      // Check if area is contested
      const nearbyTerritorialAgents = agents.filter(agent => 
        agent instanceof CausalAgent &&
        agent.id !== this.id &&
        agent.territory &&
        this.distanceTo({ position: territoryCenter }) < 20
      );
      
      if (nearbyTerritorialAgents.length === 0) {
        this.claimTerritory(territoryCenter);
      }
    }
  }

  claimTerritory(center) {
    this.territory = {
      center: { ...center },
      radius: 8,
      claimedAt: Date.now(),
      strength: this.territorialInstinct,
      patrolPoints: this.generatePatrolPoints(center),
      currentPatrolIndex: 0
    };
    
    console.log(`🏴 ${this.id} claimed territory at (${center.x.toFixed(1)}, ${center.z.toFixed(1)})`);
  }

  generatePatrolPoints(center) {
    const points = [];
    const numPoints = 6;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = this.territoryPatrolRadius * 0.8;
      points.push({
        x: center.x + Math.cos(angle) * radius,
        z: center.z + Math.sin(angle) * radius
      });
    }
    return points;
  }

  defendTerritory(agents) {
    const intruders = agents.filter(agent => 
      agent.id !== this.id &&
      this.distanceTo(agent) < this.territory.radius &&
      !this.isAllyAgent(agent)
    );
    
    intruders.forEach(intruder => {
      const distance = this.distanceTo(intruder);
      const threatLevel = Math.max(0, (this.territory.radius - distance) / this.territory.radius);
      
      if (threatLevel > 0.5 && this.territoryDefensiveness > 0.6) {
        this.defendAgainstIntruder(intruder, threatLevel);
      }
    });
  }

  defendAgainstIntruder(intruder, threatLevel) {
    // Aggressive territorial defense
    const dx = intruder.position.x - this.position.x;
    const dz = intruder.position.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance > 0) {
      // Move towards intruder aggressively
      const intensity = this.territoryDefensiveness * threatLevel;
      this.velocity.x += (dx / distance) * intensity * 0.8;
      this.velocity.z += (dz / distance) * intensity * 0.8;
      
      // Reduce trust with intruder
      this.socialMemory.updateTrust(intruder.id, -0.05, 'territory_intrusion');
    }
  }

  patrolTerritory() {
    if (!this.territory || !this.territory.patrolPoints.length) return;
    
    const currentTarget = this.territory.patrolPoints[this.territory.currentPatrolIndex];
    const distance = Math.sqrt(
      Math.pow(this.position.x - currentTarget.x, 2) +
      Math.pow(this.position.z - currentTarget.z, 2)
    );
    
    if (distance < 3) {
      // Move to next patrol point
      this.territory.currentPatrolIndex = 
        (this.territory.currentPatrolIndex + 1) % this.territory.patrolPoints.length;
    } else {
      // Move towards current patrol point
      const dx = currentTarget.x - this.position.x;
      const dz = currentTarget.z - this.position.z;
      const magnitude = Math.sqrt(dx * dx + dz * dz);
      
      if (magnitude > 0) {
        this.velocity.x += (dx / magnitude) * 0.3;
        this.velocity.z += (dz / magnitude) * 0.3;
      }
    }
  }

  isAllyAgent(agent) {
    if (!(agent instanceof CausalAgent)) return false;
    
    return Array.from(this.alliances.values()).some(alliance => 
      alliance.members.includes(agent.id)
    );
  }

  processTradeOpportunities(agents) {
    // Remove expired trade offers
    this.tradeOffers = this.tradeOffers.filter(offer => 
      Date.now() - offer.timestamp < 60000 // 1 minute expiry
    );
    
    // Process incoming trade offers
    this.tradeOffers.forEach(offer => {
      if (offer.targetId === this.id && !offer.processed) {
        this.evaluateTradeOffer(offer, agents);
        offer.processed = true;
      }
    });
    
    // Consider making trade offers if we have excess resources
    if (this.resourceInventory.size > 0 && Math.random() < 0.1) {
      this.considerMakingTradeOffer(agents);
    }
  }

  evaluateTradeOffer(offer, agents) {
    const trader = agents.find(a => a.id === offer.senderId);
    if (!trader || !(trader instanceof CausalAgent)) return;
    
    const trust = this.socialMemory.getTrust(offer.senderId);
    const ourNeed = this.calculateResourceNeed(offer.wantedResource);
    const theirOffer = this.evaluateOfferedResource(offer.offeredResource);
    
    // Accept trade if beneficial and from trusted source
    if (trust > 0.4 && ourNeed > 0.6 && theirOffer > ourNeed * 0.8) {
      this.acceptTrade(offer, trader);
    } else {
      this.declineTrade(offer, trader);
    }
  }

  acceptTrade(offer, trader) {
    // Execute the trade
    const resourceValue = offer.offeredResource.value;
    this.energy = Math.min(100, this.energy + resourceValue * 0.8);
    
    // Give something in return (energy or resource)
    const returnValue = resourceValue * 0.9; // Slightly less for profit
    trader.energy = Math.min(100, trader.energy + returnValue);
    
    // Update trading reputations
    this.tradingReputation = Math.min(1.0, this.tradingReputation + 0.05);
    trader.tradingReputation = Math.min(1.0, trader.tradingReputation + 0.05);
    
    // Update trust
    this.socialMemory.updateTrust(trader.id, 0.03, 'successful_trade');
    trader.socialMemory.updateTrust(this.id, 0.03, 'successful_trade');
    
    console.log(`💰 Trade completed: ${this.id} <-> ${trader.id} (value: ${resourceValue.toFixed(1)})`);
  }

  declineTrade(offer, trader) {
    // Small trust penalty for declined trades
    this.socialMemory.updateTrust(trader.id, -0.01, 'trade_declined');
  }

  considerMakingTradeOffer(agents) {
    const nearbyTraders = agents.filter(agent => 
      agent instanceof CausalAgent &&
      agent.id !== this.id &&
      this.distanceTo(agent) < this.tradingRange &&
      this.socialMemory.getTrust(agent.id) > 0.3
    );
    
    if (nearbyTraders.length === 0) return;
    
    // Find agents who might need what we have
    const potentialTraders = nearbyTraders.filter(agent => 
      agent.energy < 50 && this.energy > 70
    );
    
    if (potentialTraders.length > 0) {
      const trader = potentialTraders[Math.floor(Math.random() * potentialTraders.length)];
      this.makeTradeOffer(trader);
    }
  }

  makeTradeOffer(targetAgent) {
    const offer = {
      senderId: this.id,
      targetId: targetAgent.id,
      offeredResource: { value: 15, type: 'energy' },
      wantedResource: { value: 10, type: 'energy' },
      timestamp: Date.now(),
      processed: false
    };
    
    targetAgent.tradeOffers.push(offer);
    console.log(`💱 ${this.id} made trade offer to ${targetAgent.id}`);
  }

  calculateResourceNeed(resource) {
    // Calculate how much we need this resource
    if (resource.type === 'energy') {
      return Math.max(0, (80 - this.energy) / 80);
    }
    return 0.5; // Default need level
  }

  evaluateOfferedResource(resource) {
    // Evaluate the value of offered resource to us
    if (resource.type === 'energy') {
      return resource.value / 20; // Normalize energy value
    }
    return resource.value / 30; // Default evaluation
  }

  respondToHelpRequests(agents) {
    this.helpRequestCooldown = Math.max(0, this.helpRequestCooldown - 1);
    
    // Process help requests from other agents
    agents.forEach(agent => {
      if (agent instanceof CausalAgent && 
          agent.currentHelpRequest && 
          agent.currentHelpRequest.targetId === this.id) {
        this.evaluateHelpRequest(agent.currentHelpRequest, agent);
      }
    });
    
    // Send help request if we're in trouble
    if (this.shouldRequestHelp() && this.helpRequestCooldown <= 0) {
      this.sendHelpRequest(agents);
    }
  }

  shouldRequestHelp() {
    return (
      this.energy < 20 || 
      (this.status === 'Infected' && this.infectionTimer > 20) ||
      this.isUnderTerritorialAttack()
    );
  }

  isUnderTerritorialAttack() {
    // Check if we're being aggressively pursued by territorial agents
    return false; // Simplified for now
  }

  sendHelpRequest(agents) {
    const potentialHelpers = agents.filter(agent => 
      agent instanceof CausalAgent &&
      agent.id !== this.id &&
      this.distanceTo(agent) < 20 &&
      this.socialMemory.isAgentTrusted(agent.id, 0.3)
    );
    
    if (potentialHelpers.length > 0) {
      // Send to most trusted agent
      const bestHelper = potentialHelpers.reduce((best, agent) => 
        this.socialMemory.getTrust(agent.id) > this.socialMemory.getTrust(best.id) ? agent : best
      );
      
      this.currentHelpRequest = {
        senderId: this.id,
        targetId: bestHelper.id,
        type: this.energy < 20 ? 'energy' : this.status === 'Infected' ? 'medical' : 'protection',
        urgency: this.calculateHelpUrgency(),
        timestamp: Date.now(),
        location: { ...this.position }
      };
      
      this.helpRequestCooldown = 150; // Cooldown before next request
      console.log(`🆘 ${this.id} requested help from ${bestHelper.id} (${this.currentHelpRequest.type})`);
    }
  }

  calculateHelpUrgency() {
    let urgency = 0;
    if (this.energy < 10) urgency += 0.8;
    else if (this.energy < 30) urgency += 0.4;
    
    if (this.status === 'Infected') urgency += 0.6;
    
    return Math.min(1.0, urgency);
  }

  evaluateHelpRequest(request, requester) {
    if (!request || request.processed) return;
    
    const trust = this.socialMemory.getTrust(request.senderId);
    const distance = this.distanceTo(requester);
    const ourCapacity = this.energy > 50 ? 1.0 : 0.3;
    
    // Help if we trust them, they're nearby, and we have capacity
    if (trust > 0.4 && distance < 15 && ourCapacity > 0.5) {
      this.provideHelp(request, requester);
    }
    
    request.processed = true;
  }

  provideHelp(request, requester) {
    switch (request.type) {
      case 'energy':
        if (this.energy > 60) {
          const helpAmount = Math.min(20, this.energy - 50);
          this.energy -= helpAmount;
          requester.energy = Math.min(100, requester.energy + helpAmount * 0.8);
          
          // Update reputations and trust
          this.helpingReputation = Math.min(1.0, this.helpingReputation + 0.1);
          this.socialMemory.updateTrust(requester.id, 0.05, 'help_provided');
          requester.socialMemory.updateTrust(this.id, 0.15, 'help_received');
          requester.reciprocityMemory.set(this.id, Date.now());
          
          console.log(`💝 ${this.id} provided energy help to ${requester.id} (${helpAmount.toFixed(1)})`);
        }
        break;
        
      case 'medical':
        // Provide medical support (reduce infection time)
        if (requester.status === 'Infected' && this.status === 'Recovered') {
          requester.infectionTimer = Math.min(requester.infectionTimer + 10, 35); // Speed recovery
          this.helpingReputation = Math.min(1.0, this.helpingReputation + 0.08);
          
          console.log(`🏥 ${this.id} provided medical help to ${requester.id}`);
        }
        break;
        
      case 'protection':
        // Move closer to help defend
        const dx = requester.position.x - this.position.x;
        const dz = requester.position.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance > 0) {
          this.velocity.x += (dx / distance) * 0.6;
          this.velocity.z += (dz / distance) * 0.6;
        }
        break;
    }
    
    requester.currentHelpRequest = null; // Clear the request
  }
}

// Advanced Dynamic Environment System
class Environment {
  constructor() {
    this.resources = new Map();
    this.weather = 'clear';
    this.temperature = 20;
    this.season = 'spring';
    this.cycleStep = 0;
    this.carryingCapacity = 100;
    
    // Advanced weather system
    this.weatherIntensity = 0.5; // 0.0 = mild, 1.0 = extreme
    this.weatherDuration = 0;
    this.weatherChangeChance = 0.02;
    this.extremeWeatherChance = 0.005;
    
    // Climate emergency system
    this.climateEvent = null;
    this.climateEventDuration = 0;
    this.climateEventCooldown = 0;
    
    // Environmental stress factors
    this.environmentalStress = {
      heatStress: 0,
      coldStress: 0,
      stormStress: 0,
      droughtStress: 0,
      floodStress: 0
    };
    
    // Resource scarcity due to weather
    this.weatherResourceMultiplier = 1.0;
    
    // Territorial zones for agent competition
    this.territories = new Map();
    this.territorySize = 8; // Radius of territory control
    
    // Terrain features for advanced environmental interaction
    this.terrainFeatures = new Map();
    this.initializeTerrainFeatures();
  }

  initializeTerrainFeatures() {
    // Add shelter areas - provide protection during extreme weather
    for (let i = 0; i < 5; i++) {
      const shelterPos = {
        x: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 40
      };
      this.terrainFeatures.set(`shelter_${i}`, {
        type: 'shelter',
        position: shelterPos,
        radius: 6,
        capacity: 8, // Max agents that can benefit
        currentOccupants: 0,
        weatherProtection: 0.7, // Reduces weather stress by 70%
        energyBonus: 0.1 // Small energy regeneration bonus
      });
    }
    
    // Add resource-rich oases - high resource spawn areas
    for (let i = 0; i < 3; i++) {
      const oasisPos = {
        x: (Math.random() - 0.5) * 35,
        z: (Math.random() - 0.5) * 35
      };
      this.terrainFeatures.set(`oasis_${i}`, {
        type: 'oasis',
        position: oasisPos,
        radius: 8,
        resourceMultiplier: 3.0, // 3x resource spawn rate
        temperatureModifier: -3, // Cooler by 3 degrees
        humidityBonus: 0.5 // Better for survival
      });
    }
    
    // Add elevated areas - strategic advantage but more weather exposure
    for (let i = 0; i < 4; i++) {
      const hillPos = {
        x: (Math.random() - 0.5) * 45,
        z: (Math.random() - 0.5) * 45
      };
      this.terrainFeatures.set(`hill_${i}`, {
        type: 'hill',
        position: hillPos,
        radius: 10,
        elevation: 5,
        visibilityBonus: 2.0, // Can see farther
        weatherExposure: 1.4, // More affected by weather
        windSpeedMultiplier: 1.3
      });
    }
    
    // Add dangerous zones - higher infection risk but more resources
    for (let i = 0; i < 2; i++) {
      const dangerPos = {
        x: (Math.random() - 0.5) * 50,
        z: (Math.random() - 0.5) * 50
      };
      this.terrainFeatures.set(`danger_${i}`, {
        type: 'contaminated',
        position: dangerPos,
        radius: 7,
        infectionRisk: 0.3, // 30% higher infection chance
        resourceMultiplier: 2.5, // High rewards for high risk
        energyDrain: 0.2 // Constant energy drain
      });
    }
  }

  update() {
    this.cycleStep++;
    
    // Advanced seasonal progression
    const seasonLength = 150;
    const seasonPhase = (this.cycleStep % (seasonLength * 4)) / seasonLength;
    
    if (seasonPhase < 1) this.season = 'spring';
    else if (seasonPhase < 2) this.season = 'summer';
    else if (seasonPhase < 3) this.season = 'autumn';
    else this.season = 'winter';
    
    // Dynamic temperature with weather effects
    const baseTemp = 20 + Math.sin((seasonPhase - 1) * Math.PI) * 15;
    this.updateWeatherSystem();
    this.temperature = this.calculateTemperatureWithWeather(baseTemp);
    
    // Update climate emergencies
    this.updateClimateEvents();
    
    // Calculate environmental stress
    this.calculateEnvironmentalStress();
    
    // Update resources based on environmental conditions
    this.regenerateResourcesAdvanced();
    
    // Update territorial zones
    this.updateTerritories();
    
    // Update terrain feature occupancy (for shelters)
    // Note: agents parameter will be passed from main simulation loop

    return this.clone();
  }

  updateWeatherSystem() {
    this.weatherDuration = Math.max(0, this.weatherDuration - 1);
    
    // Weather change logic
    if (this.weatherDuration <= 0 || Math.random() < this.weatherChangeChance) {
      this.selectNewWeather();
    }
    
    // Extreme weather events
    if (Math.random() < this.extremeWeatherChance && this.climateEventCooldown <= 0) {
      this.triggerClimateEmergency();
    }
  }

  selectNewWeather() {
    const seasonalWeatherChances = {
      spring: { clear: 0.4, rain: 0.3, cloudy: 0.2, windy: 0.1 },
      summer: { clear: 0.6, storm: 0.1, hot: 0.2, drought: 0.1 },
      autumn: { cloudy: 0.3, rain: 0.3, windy: 0.2, clear: 0.2 },
      winter: { cold: 0.4, snow: 0.2, blizzard: 0.1, clear: 0.3 }
    };
    
    const chances = seasonalWeatherChances[this.season] || seasonalWeatherChances.spring;
    const weatherTypes = Object.keys(chances);
    const weights = Object.values(chances);
    
    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weatherTypes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        this.weather = weatherTypes[i];
        break;
      }
    }
    
    // Set weather duration and intensity
    this.weatherDuration = Math.floor(Math.random() * 50 + 20); // 20-70 steps
    this.weatherIntensity = Math.random() * 0.6 + 0.2; // 0.2-0.8 intensity
    
    console.log(`🌤️ Weather changed to ${this.weather} (intensity: ${this.weatherIntensity.toFixed(2)}, duration: ${this.weatherDuration})`);
  }

  triggerClimateEmergency() {
    const emergencyTypes = ['heatwave', 'coldsnap', 'hurricane', 'drought', 'flood'];
    const seasonalEmergencies = {
      spring: ['flood', 'hurricane'],
      summer: ['heatwave', 'drought', 'hurricane'],
      autumn: ['hurricane', 'flood'],
      winter: ['coldsnap', 'blizzard']
    };
    
    const possibleEmergencies = seasonalEmergencies[this.season] || emergencyTypes;
    this.climateEvent = possibleEmergencies[Math.floor(Math.random() * possibleEmergencies.length)];
    this.climateEventDuration = Math.floor(Math.random() * 100 + 50); // 50-150 steps
    this.climateEventCooldown = 200; // Cooldown between events
    
    console.log(`⚠️ CLIMATE EMERGENCY: ${this.climateEvent} for ${this.climateEventDuration} steps`);
  }

  updateClimateEvents() {
    this.climateEventCooldown = Math.max(0, this.climateEventCooldown - 1);
    
    if (this.climateEvent) {
      this.climateEventDuration--;
      if (this.climateEventDuration <= 0) {
        console.log(`✅ Climate emergency ${this.climateEvent} has ended`);
        this.climateEvent = null;
      }
    }
  }

  calculateTemperatureWithWeather(baseTemp) {
    let adjustedTemp = baseTemp;
    
    // Weather modifiers
    const weatherModifiers = {
      hot: 8,
      heatwave: 15,
      cold: -8,
      coldsnap: -15,
      snow: -5,
      blizzard: -12,
      clear: 0,
      cloudy: -2,
      rain: -3,
      storm: -4,
      hurricane: -6,
      drought: 3,
      flood: -1
    };
    
    const modifier = weatherModifiers[this.weather] || 0;
    adjustedTemp += modifier;
    
    // Climate event modifiers
    const climateModifiers = {
      heatwave: 20,
      coldsnap: -18,
      drought: 10,
      hurricane: -10,
      flood: -5
    };
    
    if (this.climateEvent) {
      adjustedTemp += (climateModifiers[this.climateEvent] || 0) * this.weatherIntensity;
    }
    
    return adjustedTemp;
  }

  calculateEnvironmentalStress() {
    // Reset stress factors
    Object.keys(this.environmentalStress).forEach(key => {
      this.environmentalStress[key] = 0;
    });
    
    // Temperature stress
    if (this.temperature > 30) {
      this.environmentalStress.heatStress = Math.min(1.0, (this.temperature - 30) / 20);
    } else if (this.temperature < 0) {
      this.environmentalStress.coldStress = Math.min(1.0, Math.abs(this.temperature) / 20);
    }
    
    // Weather stress
    const weatherStress = {
      storm: 'stormStress',
      hurricane: 'stormStress',
      blizzard: 'stormStress',
      drought: 'droughtStress',
      flood: 'floodStress'
    };
    
    if (weatherStress[this.weather]) {
      this.environmentalStress[weatherStress[this.weather]] = this.weatherIntensity;
    }
    
    // Climate event stress
    if (this.climateEvent) {
      const eventStress = {
        heatwave: 'heatStress',
        coldsnap: 'coldStress',
        hurricane: 'stormStress',
        drought: 'droughtStress',
        flood: 'floodStress'
      };
      
      if (eventStress[this.climateEvent]) {
        this.environmentalStress[eventStress[this.climateEvent]] = Math.max(
          this.environmentalStress[eventStress[this.climateEvent]],
          0.8 + this.weatherIntensity * 0.2
        );
      }
    }
  }

  getWeatherEffects() {
    return {
      energyConsumptionMultiplier: this.calculateEnergyMultiplier(),
      movementSpeedMultiplier: this.calculateMovementMultiplier(),
      infectionSpreadMultiplier: this.calculateInfectionMultiplier(),
      resourceSpawnMultiplier: this.calculateResourceMultiplier(),
      visibilityMultiplier: this.calculateVisibilityMultiplier(),
      shelterNeed: this.calculateShelterNeed()
    };
  }

  calculateEnergyMultiplier() {
    let multiplier = 1.0;
    
    // Temperature effects
    multiplier += this.environmentalStress.heatStress * 0.8; // Heat increases energy consumption
    multiplier += this.environmentalStress.coldStress * 1.2; // Cold increases energy consumption more
    
    // Weather effects
    multiplier += this.environmentalStress.stormStress * 0.5; // Storms require more energy
    multiplier += this.environmentalStress.droughtStress * 0.3; // Drought stress
    
    return Math.max(0.5, Math.min(3.0, multiplier));
  }

  calculateMovementMultiplier() {
    let multiplier = 1.0;
    
    // Harsh conditions slow movement
    multiplier -= this.environmentalStress.stormStress * 0.4;
    multiplier -= this.environmentalStress.coldStress * 0.3;
    multiplier -= this.environmentalStress.floodStress * 0.6;
    
    // Some conditions might speed up movement (fleeing)
    if (this.environmentalStress.heatStress > 0.5) {
      multiplier += 0.2; // Urgency in extreme heat
    }
    
    return Math.max(0.3, Math.min(1.5, multiplier));
  }

  calculateInfectionMultiplier() {
    let multiplier = 1.0;
    
    // Cold weather reduces infection spread
    multiplier -= this.environmentalStress.coldStress * 0.4;
    
    // Warm, humid conditions increase spread
    if (this.weather === 'rain' || this.weather === 'flood') {
      multiplier += 0.3;
    }
    
    // Storms force agents closer together
    multiplier += this.environmentalStress.stormStress * 0.2;
    
    return Math.max(0.2, Math.min(2.0, multiplier));
  }

  calculateResourceMultiplier() {
    let multiplier = 1.0;
    
    // Seasonal effects
    const seasonMultipliers = {
      spring: 1.2,
      summer: 0.9,
      autumn: 1.0,
      winter: 0.6
    };
    
    multiplier *= seasonMultipliers[this.season] || 1.0;
    
    // Weather effects
    if (this.weather === 'rain') multiplier *= 1.1; // Rain helps growth
    if (this.environmentalStress.droughtStress > 0.5) multiplier *= 0.4; // Severe drought
    if (this.environmentalStress.floodStress > 0.5) multiplier *= 0.3; // Floods destroy resources
    
    return Math.max(0.1, Math.min(2.0, multiplier));
  }

  calculateVisibilityMultiplier() {
    let multiplier = 1.0;
    
    // Weather reduces visibility
    const visibilityEffects = {
      storm: 0.6,
      hurricane: 0.4,
      blizzard: 0.3,
      rain: 0.8,
      fog: 0.5
    };
    
    multiplier *= visibilityEffects[this.weather] || 1.0;
    
    return Math.max(0.2, Math.min(1.0, multiplier));
  }

  calculateShelterNeed() {
    let shelterNeed = 0;
    
    shelterNeed += this.environmentalStress.heatStress * 0.8;
    shelterNeed += this.environmentalStress.coldStress * 1.0;
    shelterNeed += this.environmentalStress.stormStress * 1.2;
    
    return Math.max(0, Math.min(1.0, shelterNeed));
  }

  updateTerritories() {
    // Territories decay over time if not maintained
    this.territories.forEach((territory, id) => {
      territory.strength = Math.max(0, territory.strength - 0.01);
      if (territory.strength <= 0.1) {
        this.territories.delete(id);
      }
    });
  }

  clone() {
    const newEnv = new Environment();
    
    // Basic properties
    newEnv.resources = new Map(this.resources);
    newEnv.weather = this.weather;
    newEnv.temperature = this.temperature;
    newEnv.season = this.season;
    newEnv.cycleStep = this.cycleStep;
    newEnv.carryingCapacity = this.carryingCapacity;
    
    // Advanced weather system properties
    newEnv.weatherIntensity = this.weatherIntensity;
    newEnv.weatherDuration = this.weatherDuration;
    newEnv.weatherChangeChance = this.weatherChangeChance;
    newEnv.extremeWeatherChance = this.extremeWeatherChance;
    
    // Climate emergency system
    newEnv.climateEvent = this.climateEvent;
    newEnv.climateEventDuration = this.climateEventDuration;
    newEnv.climateEventCooldown = this.climateEventCooldown;
    
    // Environmental stress factors (deep copy)
    newEnv.environmentalStress = { ...this.environmentalStress };
    
    // Resource scarcity
    newEnv.weatherResourceMultiplier = this.weatherResourceMultiplier;
    
    // Territorial zones (deep copy Map)
    newEnv.territories = new Map();
    this.territories.forEach((territory, id) => {
      newEnv.territories.set(id, {
        ...territory,
        center: { ...territory.center },
        resources: territory.resources ? [...territory.resources] : []
      });
    });
    
    newEnv.territorySize = this.territorySize;
    
    // Terrain features (deep copy Map)
    newEnv.terrainFeatures = new Map();
    this.terrainFeatures.forEach((feature, id) => {
      newEnv.terrainFeatures.set(id, {
        ...feature,
        position: { ...feature.position }
      });
    });
    
    return newEnv;
  }

  regenerateResourcesAdvanced() {
    const resourceCount = this.resources.size;
    const weatherEffects = this.getWeatherEffects();
    const resourceMultiplier = weatherEffects.resourceSpawnMultiplier;
    
    // Dynamic max resources based on conditions
    const baseMaxResources = this.season === 'winter' ? 20 : 35;
    const maxResources = Math.floor(baseMaxResources * resourceMultiplier);
    
    // Reduced spawn chance in harsh conditions
    const baseSpawnChance = 0.25;
    let spawnChance = baseSpawnChance * resourceMultiplier;
    
    if (resourceCount < maxResources && Math.random() < spawnChance) {
      const numNewResources = Math.min(2, maxResources - resourceCount);
      
      for (let i = 0; i < numNewResources; i++) {
        this.spawnResource(i);
      }
    }
    
    // Emergency resource spawn when critically low
    if (resourceCount < 3) {
      for (let i = 0; i < 2; i++) {
        this.spawnResource(i, true);
      }
    }
  }

  spawnResource(index, isEmergency = false) {
    const quality = Math.random();
    const id = `${isEmergency ? 'emergency' : 'resource'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${index}`;
    
    // Weather affects resource quality and quantity
    const weatherEffects = this.getWeatherEffects();
    let resourceValue = quality * 20 + 10;
    
    // Environmental conditions affect resource value
    if (this.environmentalStress.droughtStress > 0.3) {
      resourceValue *= 0.7; // Drought reduces resource value
    }
    if (this.weather === 'rain') {
      resourceValue *= 1.2; // Rain improves resource quality
    }
    
    const distance = Math.random() * 18 + 2;
    const angle = Math.random() * Math.PI * 2;
    
    this.resources.set(id, {
      position: {
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance
      },
      value: Math.max(5, resourceValue),
      quality: quality,
      spawnTime: this.cycleStep,
      weatherResistant: Math.random() < 0.3 // Some resources are weather-resistant
    });
  }

  claimTerritory(agentId, position, strength = 0.5) {
    const territoryId = `${agentId}_territory`;
    
    this.territories.set(territoryId, {
      ownerId: agentId,
      center: { ...position },
      radius: this.territorySize,
      strength: strength,
      claimedAt: this.cycleStep,
      resources: this.getResourcesInTerritory(position, this.territorySize)
    });
    
    return territoryId;
  }

  getTerritoryOwner(position) {
    for (const [territoryId, territory] of this.territories) {
      const distance = Math.sqrt(
        Math.pow(position.x - territory.center.x, 2) +
        Math.pow(position.z - territory.center.z, 2)
      );
      
      if (distance <= territory.radius) {
        return {
          territoryId: territoryId,
          ownerId: territory.ownerId,
          strength: territory.strength,
          distance: distance
        };
      }
    }
    return null;
  }

  getResourcesInTerritory(position, radius) {
    const resourcesInTerritory = [];
    
    this.resources.forEach((resource, id) => {
      const distance = Math.sqrt(
        Math.pow(position.x - resource.position.x, 2) +
        Math.pow(position.z - resource.position.z, 2)
      );
      
      if (distance <= radius) {
        resourcesInTerritory.push({ id, resource, distance });
      }
    });
    
    return resourcesInTerritory;
  }

  consumeResource(id) {
    this.resources.delete(id);
  }

  // Get terrain effects for a position
  getTerrainEffects(position) {
    const effects = {
      weatherProtection: 0,
      energyBonus: 0,
      resourceMultiplier: 1.0,
      temperatureModifier: 0,
      visibilityMultiplier: 1.0,
      infectionRiskModifier: 0,
      weatherExposureMultiplier: 1.0,
      isInShelter: false,
      terrainType: 'normal',
      elevationBonus: 0
    };

    this.terrainFeatures.forEach((feature, id) => {
      const distance = Math.sqrt(
        Math.pow(position.x - feature.position.x, 2) + 
        Math.pow(position.z - feature.position.z, 2)
      );

      if (distance <= feature.radius) {
        switch (feature.type) {
          case 'shelter':
            if (feature.currentOccupants < feature.capacity) {
              effects.weatherProtection = Math.max(effects.weatherProtection, feature.weatherProtection);
              effects.energyBonus += feature.energyBonus;
              effects.isInShelter = true;
              effects.terrainType = 'shelter';
            }
            break;

          case 'oasis':
            effects.resourceMultiplier *= feature.resourceMultiplier;
            effects.temperatureModifier += feature.temperatureModifier;
            effects.energyBonus += 0.15; // Oasis provides energy bonus
            effects.terrainType = 'oasis';
            break;

          case 'hill':
            effects.visibilityMultiplier *= feature.visibilityBonus;
            effects.weatherExposureMultiplier *= feature.weatherExposure;
            effects.elevationBonus = feature.elevation;
            effects.terrainType = 'elevated';
            break;

          case 'contaminated':
            effects.infectionRiskModifier += feature.infectionRisk;
            effects.resourceMultiplier *= feature.resourceMultiplier;
            effects.energyBonus -= feature.energyDrain; // Energy drain
            effects.terrainType = 'contaminated';
            break;
        }
      }
    });

    return effects;
  }

  // Update terrain feature occupancy
  updateTerrainOccupancy(agents) {
    // Reset occupancy counts
    this.terrainFeatures.forEach(feature => {
      if (feature.type === 'shelter') {
        feature.currentOccupants = 0;
      }
    });

    // Count current occupants
    agents.forEach(agent => {
      this.terrainFeatures.forEach((feature, id) => {
        if (feature.type === 'shelter') {
          const distance = Math.sqrt(
            Math.pow(agent.position.x - feature.position.x, 2) + 
            Math.pow(agent.position.z - feature.position.z, 2)
          );
          if (distance <= feature.radius) {
            feature.currentOccupants++;
          }
        }
      });
    });
  }

  getDynamicSurvivalThreshold(populationSize) {
    const pressureFactor = populationSize / this.carryingCapacity;
    return Math.max(10, 30 * pressureFactor);
  }
}

// Player-Controlled Agent with Enhanced Manual Controls
class PlayerAgent extends Agent {
  constructor(id, position, genotype = null) {
    super(id, position, genotype);
    this.isPlayer = true;
    this.targetPosition = null;
    this.moveSpeed = 2.5; // Slightly faster than AI agents
    this.isActive = false;
    this.manualReproductionActive = false;
    this.communicationRadius = 12;
    this.helpRadius = 8;
    this.resourceBonus = 1.2; // 20% better at collecting resources
    
    // Player special abilities
    this.abilities = {
      reproductionReady: false,
      canScanEnvironment: true,
      canCallForHelp: true,
      canShareResources: true,
      hasExtendedVision: true
    };
    
    // Player stats tracking
    this.playerStats = {
      resourcesCollected: 0,
      agentsHelped: 0,
      reproductions: 0,
      survivalTime: 0,
      infectionsAvoided: 0,
      decisionsInfluenced: 0
    };
  }

  setTargetPosition(x, z) {
    this.targetPosition = { x, z };
  }

  // Enhanced manual reproduction with mate selection
  attemptManualReproduction(agents) {
    if (!this.canReproduce()) return null;
    
    // Find suitable mates within range
    const potentialMates = agents.filter(agent => 
      agent !== this && 
      !agent.isPlayer && 
      agent.age > 20 && 
      agent.energy > 50 && 
      agent.status !== 'Infected' &&
      this.distanceTo(agent) < 8 &&
      agent.reproductionCooldown === 0
    );
    
    if (potentialMates.length === 0) return null;
    
    // Select best mate (highest energy + lowest age combination)
    const bestMate = potentialMates.reduce((best, agent) => {
      const bestScore = best.energy * 0.7 + (200 - best.age) * 0.3;
      const agentScore = agent.energy * 0.7 + (200 - agent.age) * 0.3;
      return agentScore > bestScore ? agent : best;
    });
    
    // Create enhanced offspring with player bonuses
    const offspring = this.reproduceWithMate(bestMate);
    
    if (offspring) {
      this.playerStats.reproductions++;
      this.manualReproductionActive = false;
      return offspring;
    }
    
    return null;
  }

  reproduceWithMate(mate) {
    // Hybrid genotype combining player and mate traits
    const newGenotype = {};
    Object.keys(this.genotype).forEach(trait => {
      // Blend traits with slight player advantage
      const playerContribution = this.genotype[trait] * 0.6;
      const mateContribution = mate.genotype[trait] * 0.4;
      newGenotype[trait] = playerContribution + mateContribution;
      
      // Player offspring have slight bonuses
      if (trait === 'infectionResistance') {
        newGenotype[trait] = Math.min(1, newGenotype[trait] * 1.1);
      } else if (trait === 'forageEfficiency') {
        newGenotype[trait] = Math.min(1, newGenotype[trait] * 1.05);
      }
      
      // Mutation chance
      if (Math.random() < 0.12) { // Slightly lower mutation rate
        const mutationFactor = 0.9 + Math.random() * 0.2; // Gentler mutations
        newGenotype[trait] *= mutationFactor;
        
        if (trait === 'infectionResistance' || trait === 'aggressiveness' || trait === 'forageEfficiency') {
          newGenotype[trait] = Math.max(0, Math.min(1, newGenotype[trait]));
        }
      }
    });
    
    const offspring = new Agent(
      `player_offspring_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      { 
        x: this.position.x + (Math.random() - 0.5) * 4, 
        y: 1, 
        z: this.position.z + (Math.random() - 0.5) * 4 
      },
      newGenotype
    );
    
    // Apply reproduction costs
    this.energy -= 20;
    mate.energy -= 15;
    this.reproductionCooldown = 80; // Longer cooldown for player
    mate.reproductionCooldown = 60;
    
    return offspring;
  }

  canReproduce() {
    return this.energy > 60 && 
           this.age > 25 && 
           this.reproductionCooldown === 0 && 
           this.status !== 'Infected' &&
           this.manualReproductionActive;
  }

  // Player-specific environmental scan
  scanEnvironment(environment, agents) {
    const scanRadius = this.abilities.hasExtendedVision ? 20 : 15;
    const scan = {
      timestamp: Date.now(),
      nearbyResources: [],
      nearbyAgents: [],
      threats: [],
      opportunities: [],
      environmentalCondition: environment.weather,
      temperature: Math.round(environment.temperature),
      season: environment.season
    };
    
    // Scan resources
    environment.resources.forEach((resource, id) => {
      const distance = this.distanceTo({ position: resource.position });
      if (distance <= scanRadius) {
        scan.nearbyResources.push({
          id,
          distance: Math.round(distance * 10) / 10,
          value: Math.round(resource.value * 10) / 10,
          quality: Math.round(resource.quality * 100) / 100,
          weatherResistant: resource.weatherResistant
        });
      }
    });
    
    // Scan terrain features
    const currentTerrainEffects = environment.getTerrainEffects(this.position);
    scan.currentTerrain = currentTerrainEffects.terrainType;
    scan.terrainBonuses = [];
    
    if (currentTerrainEffects.isInShelter) {
      scan.terrainBonuses.push(`Weather protection: ${Math.round(currentTerrainEffects.weatherProtection * 100)}%`);
    }
    if (currentTerrainEffects.energyBonus > 0) {
      scan.terrainBonuses.push(`Energy bonus: +${currentTerrainEffects.energyBonus.toFixed(1)}`);
    }
    if (currentTerrainEffects.visibilityMultiplier > 1.0) {
      scan.terrainBonuses.push(`Enhanced visibility: ${currentTerrainEffects.visibilityMultiplier.toFixed(1)}x`);
    }
    if (currentTerrainEffects.infectionRiskModifier > 0) {
      scan.terrainBonuses.push(`⚠️ Infection risk: +${Math.round(currentTerrainEffects.infectionRiskModifier * 100)}%`);
    }
    
    // Identify nearby terrain features
    scan.nearbyTerrain = [];
    environment.terrainFeatures.forEach((feature, id) => {
      const distance = Math.sqrt(
        Math.pow(this.position.x - feature.position.x, 2) + 
        Math.pow(this.position.z - feature.position.z, 2)
      );
      
      if (distance <= scanRadius) {
        let description = '';
        switch (feature.type) {
          case 'shelter':
            description = `🏠 Shelter (${feature.currentOccupants}/${feature.capacity} occupied)`;
            break;
          case 'oasis':
            description = `🌿 Oasis (3x resources, cooling)`;
            break;
          case 'hill':
            description = `⛰️ Hill (2x visibility, weather exposure)`;
            break;
          case 'contaminated':
            description = `☢️ Danger Zone (2.5x resources, infection risk)`;
            break;
        }
        
        scan.nearbyTerrain.push({
          type: feature.type,
          distance: Math.round(distance * 10) / 10,
          description: description
        });
      }
    });
    
    // Scan agents
    agents.forEach(agent => {
      if (agent !== this && this.distanceTo(agent) <= scanRadius) {
        const distance = this.distanceTo(agent);
        const agentInfo = {
          id: agent.id.substring(0, 12),
          type: agent.constructor.name,
          distance: Math.round(distance * 10) / 10,
          status: agent.status,
          energy: Math.round(agent.energy),
          age: agent.age
        };
        
        scan.nearbyAgents.push(agentInfo);
        
        // Identify threats and opportunities
        if (agent.status === 'Infected' && distance < 10) {
          scan.threats.push({
            type: 'infection',
            source: agentInfo.id,
            distance: distance,
            severity: distance < 5 ? 'high' : 'medium'
          });
        }
        
        if (agent.energy < 30 && distance < this.helpRadius) {
          scan.opportunities.push({
            type: 'help_needed',
            target: agentInfo.id,
            distance: distance,
            urgency: agent.energy < 15 ? 'critical' : 'moderate'
          });
        }
      }
    });
    
    return scan;
  }

  // Player can share resources with nearby agents
  shareResourcesWith(targetAgent, amount = 15) {
    if (this.energy <= amount + 20) return false; // Keep minimum for self
    if (this.distanceTo(targetAgent) > this.helpRadius) return false;
    
    this.energy -= amount;
    targetAgent.energy = Math.min(100, targetAgent.energy + amount * 0.9); // Small loss in transfer
    
    this.playerStats.agentsHelped++;
    return true;
  }

  // Enhanced player update with special abilities
  update(environment, agents, isSimulationRunning = true) {
    // Player can still move even when paused for better control
    if (!isSimulationRunning && !this.targetPosition) return 'continue';
    
    this.age++;
    this.playerStats.survivalTime++;
    
    // More forgiving energy loss for player
    const baseLoss = 0.2; // Lower than NPC agents
    const infectionPenalty = this.status === 'Infected' ? 0.25 : 0;
    const agePenalty = this.age > this.maxLifespan * 0.9 ? 0.15 : 0;
    
    this.energy = Math.max(0, this.energy - (baseLoss + infectionPenalty + agePenalty));
    this.reproductionCooldown = Math.max(0, this.reproductionCooldown - 1);

    // More forgiving death conditions for player
    const criticalEnergy = 3;
    const oldAge = this.age >= this.maxLifespan * 1.2; // 20% longer lifespan
    
    if (oldAge || this.energy <= criticalEnergy) {
      const deathChance = oldAge ? 0.02 : (criticalEnergy - this.energy) * 0.02; // Much lower death chance
      if (Math.random() < deathChance) {
        return 'die';
      }
    }

    // Enhanced SIR mechanics for player
    if (this.status === 'Infected') {
      this.infectionTimer++;
      // Player recovers 25% faster
      if (this.infectionTimer > 30) {
        this.status = 'Recovered';
        this.energy = Math.min(100, this.energy + 20); // Better recovery bonus
        this.updateMeshColor();
      }
    }

    if (this.status === 'Susceptible') {
      const nearbyInfected = agents.filter(agent => 
        agent.status === 'Infected' && 
        this.distanceTo(agent) < this.phenotype.socialDistance
      );
      
      if (nearbyInfected.length > 0) {
        // Lower infection rate for player with bonus resistance
        const playerResistance = Math.min(0.95, this.phenotype.resistance * 1.3);
        const infectionProbability = 0.01 * (1 - playerResistance);
        if (Math.random() < infectionProbability) {
          this.status = 'Infected';
          this.infectionTimer = 0;
          this.updateMeshColor();
        } else {
          this.playerStats.infectionsAvoided++;
        }
      }
    }

    // Enhanced foraging with player bonus
    this.enhancedForage(environment);

    // Player movement with smart pathfinding
    if (this.targetPosition) {
      const dx = this.targetPosition.x - this.position.x;
      const dz = this.targetPosition.z - this.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > 1.0) {
        // Smart movement avoiding infected agents
        const moveDirection = this.calculateSmartMovement(dx, dz, distance, agents);
        this.velocity.x = moveDirection.x * this.moveSpeed;
        this.velocity.z = moveDirection.z * this.moveSpeed;
      } else {
        this.targetPosition = null;
        this.velocity.x *= 0.3;
        this.velocity.z *= 0.3;
      }
    }

    this.updatePosition();

    // Check reproduction readiness
    this.abilities.reproductionReady = this.canReproduce();

    return 'continue';
  }

  enhancedForage(environment) {
    environment.resources.forEach((resource, id) => {
      const distance = Math.sqrt(
        Math.pow(this.position.x - resource.position.x, 2) +
        Math.pow(this.position.z - resource.position.z, 2)
      );
      
      if (distance < 3.5) { // Slightly larger collection radius
        const baseGain = resource.value * this.phenotype.efficiency * this.resourceBonus;
        const efficiencyBonus = this.status === 'Recovered' ? 1.3 : 1.0;
        const energyGain = baseGain * efficiencyBonus;
        
        this.energy = Math.min(100, this.energy + energyGain);
        environment.consumeResource(id);
        this.playerStats.resourcesCollected++;
      }
    });
  }

  calculateSmartMovement(dx, dz, distance, agents) {
    const baseDirection = { x: dx / distance, z: dz / distance };
    
    // Check for nearby infected agents and adjust path
    const nearbyInfected = agents.filter(agent => 
      agent.status === 'Infected' && 
      this.distanceTo(agent) < 8
    );
    
    if (nearbyInfected.length > 0) {
      // Calculate avoidance vector
      let avoidX = 0, avoidZ = 0;
      nearbyInfected.forEach(infected => {
        const dx_avoid = this.position.x - infected.position.x;
        const dz_avoid = this.position.z - infected.position.z;
        const dist_avoid = Math.sqrt(dx_avoid * dx_avoid + dz_avoid * dz_avoid);
        if (dist_avoid > 0) {
          avoidX += (dx_avoid / dist_avoid) / nearbyInfected.length;
          avoidZ += (dz_avoid / dist_avoid) / nearbyInfected.length;
        }
      });
      
      // Blend movement toward target with infection avoidance
      const avoidanceWeight = 0.6;
      const targetWeight = 0.4;
      
      return {
        x: baseDirection.x * targetWeight + avoidX * avoidanceWeight,
        z: baseDirection.z * targetWeight + avoidZ * avoidanceWeight
      };
    }
    
    return baseDirection;
  }

  updateMeshColor() {
    if (this.mesh && this.mesh.material) {
      let color;
      switch (this.status) {
        case 'Infected':
          color = new THREE.Color(1, 0.3, 0.3); // Slightly less intense red
          break;
        case 'Recovered':
          color = new THREE.Color(0.3, 1, 0.3); // Slightly less intense green
          break;
        default:
          color = new THREE.Color(1, 1, 1); // White for player
      }
      this.mesh.material.color = color;
      this.mesh.material.emissive = new THREE.Color(0.3, 0.3, 0.3); // Stronger glow for visibility
    }
  }

  // Activate manual reproduction mode
  activateReproduction() {
    if (this.energy > 60 && this.age > 25 && this.reproductionCooldown === 0 && this.status !== 'Infected') {
      this.manualReproductionActive = true;
      return true;
    }
    return false;
  }

  // Get player performance summary
  getPerformanceSummary() {
    return {
      ...this.playerStats,
      survivalRating: this.calculateSurvivalRating(),
      efficiency: this.calculateEfficiency(),
      socialImpact: this.calculateSocialImpact()
    };
  }

  calculateSurvivalRating() {
    const ageBonus = Math.min(100, this.age / 2);
    const energyBonus = this.energy;
    const avoidanceBonus = Math.min(50, this.playerStats.infectionsAvoided * 10);
    return Math.round((ageBonus + energyBonus + avoidanceBonus) / 2);
  }

  calculateEfficiency() {
    const resourcesPerAge = this.age > 0 ? this.playerStats.resourcesCollected / this.age * 100 : 0;
    return Math.round(resourcesPerAge);
  }

  calculateSocialImpact() {
    return this.playerStats.agentsHelped * 10 + this.playerStats.reproductions * 20;
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
  // Track persistent terrain & territory meshes separately to avoid recreating every frame
  const terrainMeshesRef = useRef(new Map());
  const territoryMeshesRef = useRef(new Map());
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
  const [cameraMode, setCameraMode] = useState('follow'); // Changed to follow mode for player
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [populationHistory, setPopulationHistory] = useState([]);
  const [notification, setNotification] = useState(null);
  const [performanceData, setPerformanceData] = useState({ memory: 0, fps: 0, lastTime: 0 });
  const [watchdogAlerts, setWatchdogAlerts] = useState([]);
  const [exportFolderLabel, setExportFolderLabel] = useState('Default Downloads');
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [llmConfig, setLLMConfig] = useState({
    enabled: false,
    ollamaStatus: 'checking', // 'checking', 'connected', 'disconnected'
    endpoint: 'http://localhost:11434'
  });
  const [debugSettings, setDebugSettings] = useState({
    maxKnownAgents: 200,
    maxKnownResources: 30,
    maxDangerZones: 40,
    maxHelpRequests: 50,
    adaptiveReproduction: true,
    reproductionComplexityThreshold: 18000, // agents * avgKnownAgents
    reproductionHardCap: 140,
    logCompression: true,
    pruneSummaryInterval: 1000
  });
  const [systemMetrics, setSystemMetrics] = useState({
    complexity: 0,
    reproductionSuppressed: false,
    pruneStats: { knownAgentsRemoved: 0, logsCompressed: 0, duplicatesMerged: 0 },
    lastPruneUpdate: 0
  });
  
  // Initialize lean analytics system
  const analyticsRef = useRef(null);
  if (!analyticsRef.current) {
    analyticsRef.current = new EcosystemAnalytics(100, 1000); // 100-step windows, 1000-step checkpoints
    // Make analytics globally available for agents
    if (typeof window !== 'undefined') {
      window.ecosystemAnalytics = analyticsRef.current;
      console.log('🚀 EcoSysX Analytics System Initialized');
      console.log('📁 Auto-exports will be saved to: C:\\Users\\Bbeie\\Downloads\\EcoSysX Analytics\\');
      console.log('🔄 Auto-export triggers: Every 1000 steps OR every 10 windows');
      console.log('📊 Manual export: Click "Export to EcoSysX Analytics" button');
    }
    
    // Connect analytics to React state for UI updates
    analyticsRef.current.setUIUpdateCallback((folderLabel) => {
      setExportFolderLabel(folderLabel);
    });
    
    // Connect debug logging to React state
    analyticsRef.current.setDebugCallback((logEntry) => {
      setDebugLogs(prev => {
        const newLogs = [logEntry, ...prev];
        return newLogs.slice(0, 100); // Keep only last 100 entries
      });
    });
  }

  // Debug logging functions for sharing errors
  const addDebugLog = (level, message, data = null) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null,
      step
    };
    
    setDebugLogs(prev => [logEntry, ...prev.slice(0, 99)]);
    
    // Also log to console
    console[level.toLowerCase()] || console.log(`[${level}] ${message}`, data || '');
  };

  const exportDebugLogs = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      currentStep: step,
      totalLogs: debugLogs.length,
      logs: debugLogs,
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        performance: performanceData
      }
    };
    
    const content = JSON.stringify(debugData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EcoSysX-Debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addDebugLog('INFO', 'Debug logs exported successfully');
  };

  const copyDebugLogs = () => {
    const logsText = debugLogs.slice(0, 20).map(log => 
      `[${log.timestamp}] ${log.level}: ${log.message}${log.data ? '\nData: ' + log.data : ''}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(logsText).then(() => {
      addDebugLog('INFO', 'Debug logs copied to clipboard (last 20 entries)');
    }).catch(() => {
      addDebugLog('ERROR', 'Failed to copy logs to clipboard');
    });
  };
  
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
    activeMessages: 0,
    llmStats: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      successRate: 0,
      fallbackUsed: 0
    }
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

    // Watchdog: detect abnormal growth that could lead to crash ~1500 steps
    if (step > 0 && step % 250 === 0) {
      const alertList = [];
      if (memUsage > 400) {
        alertList.push(`High memory usage ${memUsage.toFixed(1)}MB`);
      }
      // Collections to monitor for unbounded growth
      const aRef = analyticsRef.current;
      if (aRef) {
        if (aRef.consoleLogs.length > 1200) alertList.push(`Console log buffer large (${aRef.consoleLogs.length})`);
        if (aRef.windowHistory.length > 55) alertList.push(`Window history length ${aRef.windowHistory.length}`);
        if (aRef.checkpoints.length > 12) alertList.push(`Checkpoint count ${aRef.checkpoints.length}`);
      }
      // Agent level
      if (agents.length > 130) alertList.push(`Agent count high (${agents.length})`);
      // Resource map size from environment
      if (environment.resources.size > 120) alertList.push(`Resource map large (${environment.resources.size})`);
      if (alertList.length) {
        setWatchdogAlerts(prev => [
          { step, alerts: alertList, ts: Date.now() },
          ...prev.slice(0, 19)
        ]);
        console.warn(`🛑 Watchdog (step ${step}): ` + alertList.join(' | '));
      }
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

    // --- Resources (diff instead of full rebuild to prevent GPU leak) ---
    const existingIds = new Set(resourceMeshesRef.current.keys());
    resources.forEach((resource, id) => {
      // Territory / terrain keys live elsewhere now, skip those in resource map
      if (id.startsWith('territory_') || id.startsWith('terrain_')) return;
      existingIds.delete(id);
      let mesh = resourceMeshesRef.current.get(id);
      if (!mesh) {
        const geometry = new THREE.BoxGeometry(0.5, 0.3, 0.5);
        let color = new THREE.Color().setHSL(0.3, 0.8, 0.3 + resource.quality * 0.4);
        if (resource.weatherResistant) {
          color = new THREE.Color().setHSL(0.15, 0.9, 0.6);
        }
        const material = new THREE.MeshLambertMaterial({ color });
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        resourceMeshesRef.current.set(id, mesh);
      }
      mesh.position.set(resource.position.x, 0.15, resource.position.z);
    });
    // Dispose removed
    existingIds.forEach(id => {
      const mesh = resourceMeshesRef.current.get(id);
      if (mesh) {
        if (mesh.geometry) mesh.geometry.dispose?.();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose?.());
          else mesh.material.dispose?.();
        }
        scene.remove(mesh);
        resourceMeshesRef.current.delete(id);
      }
    });

    // --- Territories (rebuild only when count changes) ---
    const territoryCount = environment.territories?.size || 0;
    if (territoryMeshesRef.current._lastCount !== territoryCount) {
      // Dispose previous
      territoryMeshesRef.current.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose?.();
        if (mesh.material) mesh.material.dispose?.();
        scene.remove(mesh);
      });
      territoryMeshesRef.current.clear();
      if (environment.territories) {
        environment.territories.forEach((territory, id) => {
          const ringGeometry = new THREE.RingGeometry(territory.radius * 0.9, territory.radius, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
              color: 0x444444,
              transparent: true,
              opacity: 0.2,
              side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(territory.center.x, 0.05, territory.center.z);
            ring.rotation.x = -Math.PI / 2;
            scene.add(ring);
            territoryMeshesRef.current.set(`territory_${id}`, ring);
        });
      }
      territoryMeshesRef.current._lastCount = territoryCount;
    }

    // --- Terrain Features (created once) ---
    if (!terrainMeshesRef.current._initialized && environment.terrainFeatures) {
      environment.terrainFeatures.forEach((feature, id) => {
        let geometry, material, mesh;
        switch (feature.type) {
          case 'shelter':
            geometry = new THREE.SphereGeometry(1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
            material = new THREE.MeshLambertMaterial({ color: 0x8B4513, transparent: true, opacity: 0.6 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(feature.position.x, 0.2, feature.position.z);
            break;
          case 'oasis':
            geometry = new THREE.CircleGeometry(feature.radius * 0.8, 16);
            material = new THREE.MeshLambertMaterial({ color: 0x20B2AA, transparent: true, opacity: 0.4 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(feature.position.x, 0.02, feature.position.z);
            mesh.rotation.x = -Math.PI / 2;
            break;
          case 'hill':
            geometry = new THREE.ConeGeometry(feature.radius * 0.6, feature.elevation, 8);
            material = new THREE.MeshLambertMaterial({ color: 0x8FBC8F, transparent: true, opacity: 0.5 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(feature.position.x, feature.elevation / 2, feature.position.z);
            break;
          case 'contaminated':
            geometry = new THREE.RingGeometry(feature.radius * 0.5, feature.radius, 16);
            material = new THREE.MeshBasicMaterial({ color: 0xFF4500, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(feature.position.x, 0.03, feature.position.z);
            mesh.rotation.x = -Math.PI / 2;
            break;
        }
        if (mesh) {
          scene.add(mesh);
          terrainMeshesRef.current.set(`terrain_${id}`, mesh);
        }
      });
      terrainMeshesRef.current._initialized = true;
    }
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

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      preserveDrawingBuffer: true  // Essential for screenshots
    });
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
        
        // Ensure age is 0 (should be from constructor but let's be explicit)
        agent.age = 0;
        console.log(`Created initial agent ${agent.id} with age ${agent.age}`); // DEBUG
        
        createAgentMesh(agent, scene);
        initialAgents.push(agent);
      }
      
      setAgents(initialAgents);
    }

    updateResourceVisualization(scene, environment.resources);

    // Mouse click handler for player control and agent selection
    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      
      // First check if we clicked on an agent for selection
      const agentMeshes = agents.map(a => a.mesh).filter(m => m);
      const intersects = raycasterRef.current.intersectObjects(agentMeshes);
      
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const clickedAgent = agents.find(a => a.mesh === clickedMesh);
        
        // If we clicked on the player agent, don't show selection panel
        if (clickedAgent && clickedAgent.isPlayer) {
          return;
        }
        
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
            avgTrust: clickedAgent.calculateAverageTrust ? clickedAgent.calculateAverageTrust() : 0.5,
            isRealLLM: clickedAgent.lastReasoning.isRealLLM,
            llmData: clickedAgent.lastReasoning.llmData,
            
            // Enhanced social information
            alliances: Array.from(clickedAgent.alliances.values()),
            territory: clickedAgent.territory,
            tradingReputation: clickedAgent.tradingReputation,
            helpingReputation: clickedAgent.helpingReputation,
            territorialInstinct: clickedAgent.territorialInstinct,
            
            // Social Intelligence & Influence Tracking
            influenceAnalysis: clickedAgent.getInfluenceAnalysis ? clickedAgent.getInfluenceAnalysis() : null
          });
        }
      } else {
        // No agent clicked - move player to clicked ground position
        if (playerAgentRef.current && isRunning) {
          // Cast ray to the ground plane (y = 1)
          const planeIntersect = raycasterRef.current.intersectObject(new THREE.Mesh(
            new THREE.PlaneGeometry(1000, 1000), 
            new THREE.MeshBasicMaterial({visible: false})
          ).rotateX(-Math.PI / 2).translateY(1));
          
          if (planeIntersect.length > 0) {
            const targetPos = planeIntersect[0].point;
            // Set player target position for smart movement
            playerAgentRef.current.moveToPosition(targetPos, environment, agents);
            showNotification(`🎯 Moving to (${targetPos.x.toFixed(1)}, ${targetPos.z.toFixed(1)})`, 'info');
          }
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
      
      // Follow camera mode - follow the player agent
      if (cameraMode === 'follow' && !gameOver && playerAgentRef.current) {
        const agentPos = playerAgentRef.current.position;
        camera.position.set(agentPos.x + 10, 15, agentPos.z + 10);
        camera.lookAt(agentPos.x, agentPos.y, agentPos.z);
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

  // Check LLM (Ollama) connection status with enhanced error handling
  useEffect(() => {
    let isCancelled = false;
    let checkInterval;
    
    const checkOllamaConnection = async () => {
      if (isCancelled) return;
      
      try {
        // Update LLM service with current config
        if (llmService && llmConfig.endpoint) {
          llmService.updateConfig({ 
            endpoint: llmConfig.endpoint,
            debug: true
          });
        }
        
        const isConnected = await llmService.checkConnection();
        
        if (isConnected && !isCancelled) {
          const stats = llmService.getStats();
          
          // Only update if status actually changed
          setLLMConfig(prev => {
            if (prev.ollamaStatus !== 'connected' || prev.enabled !== isConnected) {
              console.log(`🤖 Ollama Status: Connected to ${llmService.getBestAvailableModel()}`);
              
              // Update agents only when status changes
              setTimeout(() => {
                setAgents(currentAgents => {
                  return currentAgents.map(agent => {
                    if (agent instanceof CausalAgent && agent.llmAvailable !== isConnected) {
                      agent.llmAvailable = isConnected;
                      agent.reasoningMode = true;
                      console.log(`🧠 Agent ${agent.id}: LLM capabilities updated`);
                    }
                    return agent;
                  });
                });
              }, 0);
              
              if (isConnected && prev.ollamaStatus !== 'connected') {
                showNotification(`🧠 LLM Connected: ${llmService.getBestAvailableModel()}`, 'success');
              }
            }
            
            return { 
              ...prev, 
              ollamaStatus: 'connected',
              enabled: isConnected,
              currentModel: llmService.getBestAvailableModel(),
              availableModels: stats.availableModels || 0
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
            
            return { 
              ...prev, 
              ollamaStatus: 'disconnected', 
              enabled: false,
              currentModel: null,
              availableModels: 0
            };
          });
        }
      }
    };
    
    // Initial connection check
    checkOllamaConnection();
    
    // Recheck every 30 seconds (more frequent for better UX)
    checkInterval = setInterval(checkOllamaConnection, 30000);
    
    return () => {
      isCancelled = true;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [llmConfig.endpoint]); // Re-check when endpoint changes

  const simulationStep = useCallback(() => {
    if (!sceneRef.current || !isRunning) return;

    // Update environment FIRST to avoid temporal dead zone for newEnvironment usage
    const updatedEnvironment = environment.update();
    // Update terrain occupancy with latest agents snapshot (pre-mutation)
    updatedEnvironment.updateTerrainOccupancy(agents);

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
            // Adaptive reproduction slowdown
            let allow = newAgents.length < 120;
            let reproductionSuppressed = false;
            if (debugSettings.adaptiveReproduction) {
              // Compute complexity metric (agents * avg knownAgents for causal agents)
              const causalAgentsList = newAgents.filter(a => a instanceof CausalAgent);
              const avgKnown = causalAgentsList.length > 0 ? Math.round(
                causalAgentsList.reduce((sum, a) => sum + (a.socialMemory?.knownAgents.size || 0), 0) / causalAgentsList.length
              ) : 0;
              const complexity = newAgents.length * avgKnown;
              
              // Update system metrics for UI display
              setSystemMetrics(prev => ({ ...prev, complexity, reproductionSuppressed: false }));
              
              if (complexity > debugSettings.reproductionComplexityThreshold || newAgents.length >= debugSettings.reproductionHardCap) {
                allow = false;
                reproductionSuppressed = true;
                setSystemMetrics(prev => ({ ...prev, reproductionSuppressed: true }));
                
                if (step % 100 === 0) {
                  console.log(`⚖️ Adaptive reproduction paused (complexity=${complexity}, agents=${newAgents.length}, avgKnown=${avgKnown})`);
                }
              }
            }
            if (allow) {
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
      console.log(`Step ${step}: Agent ages:`, newAgents.map(a => `${a.id}:${a.age}`).slice(0, 5)); // DEBUG first 5
      console.log(`Step ${step}: Total age: ${totalAge}, Avg age: ${Math.round(totalAge / newAgents.length)}, Count: ${newAgents.length}`); // DEBUG
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
        activeMessages: window.ecosystemStats?.activeMessages || 0,
        llmStats: llmService ? llmService.getStats() : {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0,
          successRate: 0,
          fallbackUsed: 0
        }
      });

      // Record analytics data for current step (use updatedEnvironment)
      if (analyticsRef.current) {
        analyticsRef.current.recordStep(step, newAgents, updatedEnvironment, {
          susceptible,
          infected,
          recovered,
          total: newAgents.length,
          avgAge: newAgents.length > 0 ? Math.round(totalAge / newAgents.length) : 0,
          avgEnergy: newAgents.length > 0 ? Math.round(totalEnergy / newAgents.length) : 0,
          fps: performanceData.fps
        });
        // Periodic prune summary
        if (step > 0 && step % (debugSettings.pruneSummaryInterval || 1000) === 0) {
          const aRef = analyticsRef.current;
          const causalSample = newAgents.filter(a => a instanceof CausalAgent).slice(0, 5);
          const socialPruneStats = causalSample.map(a => a.socialMemory?.pruneStats?.knownAgentsRemoved || 0)
            .reduce((s, v) => s + v, 0);
          
          const currentPruneStats = {
            knownAgentsRemoved: socialPruneStats,
            logsCompressed: aRef.pruneStats?.logsCompressed || 0,
            duplicatesMerged: aRef.pruneStats?.duplicateMerged || 0
          };
          
          setSystemMetrics(prev => ({ 
            ...prev, 
            pruneStats: currentPruneStats, 
            lastPruneUpdate: step 
          }));
          
          console.log(`🧹 Prune Summary [Step ${step}]: ` +
            `LogMerged=${currentPruneStats.duplicatesMerged}, ` +
            `LogCompressedReps=${currentPruneStats.logsCompressed}, ` +
            `KnownAgentsRemoved(sample5)=${socialPruneStats}`);
        }
      }

      return newAgents;
    });
    // Commit environment state AFTER agents processed
    setEnvironment(updatedEnvironment);
    if (sceneRef.current) {
      updateResourceVisualization(sceneRef.current, updatedEnvironment.resources);
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
  }, [environment, agents, stats, gameOver, isRunning, trackPerformance, logPopulationDynamics]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      simulationStep();
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, simulationStep]);

  // Screenshot function
  const takeScreenshot = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      console.warn('Renderer not available for screenshot');
      return;
    }
    
    try {
      // Ensure renderer has preserveDrawingBuffer enabled
      const canvas = rendererRef.current.domElement;
      
      // Force a render to make sure canvas is up to date
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Convert canvas to data URL
      const dataURL = canvas.toDataURL('image/png', 1.0);
      
      if (dataURL === 'data:,' || dataURL.length < 100) {
        throw new Error('Canvas data is empty or corrupted');
      }
      
      // Create download link
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `ecosystem-screenshot-step-${step}-${timestamp}.png`;
      link.href = dataURL;
      link.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`📸 Screenshot saved at step ${step}`);
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('Screenshot failed: ' + error.message);
    }
  }, [step]);

  const resetSimulation = () => {
    console.log('🔄 Resetting simulation...'); // DEBUG
    setIsRunning(false);
    setStep(0);
    setPopulationHistory([]);
    setGameOver(false);
    setPlayerStats(null);
    
    // Clear existing agent meshes
    console.log(`Clearing ${agents.length} existing agents`); // DEBUG
    agents.forEach(agent => {
      console.log(`Clearing agent ${agent.id} with age ${agent.age}`); // DEBUG
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

    // Create new agents - include one player agent
    const newAgents = [];
    
    // Create player agent first
    const playerAgent = new PlayerAgent(`player_${Date.now()}`, { 
      x: 0, 
      y: 1, 
      z: 0 
    });
    playerAgent.isPlayer = true;
    playerAgentRef.current = playerAgent;
    newAgents.push(playerAgent);
    
    for (let i = 1; i < 25; i++) { // Start from 1 since we already added player
      let agent;
      
      if (i < 8) {
        // Causal agents (7 agents + player)
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
      
      // Ensure age is 0 (it should be from constructor but let's be explicit)
      agent.age = 0;
      console.log(`Created reset agent ${agent.id} with age ${agent.age}`); // DEBUG
      
      createAgentMesh(agent, sceneRef.current);
      newAgents.push(agent);
    }
    
    console.log(`🔄 Reset complete: ${newAgents.length} new agents created`); // DEBUG
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
        
        {/* Control Overlay with Enhanced Player Controls */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-80 p-4 rounded-lg text-white max-w-md">
          <h2 className="text-xl font-bold mb-2">🎮 Ecosystem Player Mode</h2>
          <p className="text-sm mb-3 text-gray-300">
            Control your white agent and interact with the ecosystem. Survive, evolve, and influence the simulation.
          </p>
          
          {gameOver ? (
            <div className="bg-red-900 p-3 rounded mb-3">
              <h3 className="text-lg font-bold text-red-300">🏁 Game Over</h3>
              {playerStats ? (
                <div className="text-sm">
                  <p>Survival Time: {playerStats.survivalTime} steps</p>
                  <p>Resources Collected: {playerStats.resourcesCollected}</p>
                  <p>Agents Helped: {playerStats.agentsHelped}</p>
                  <p>Survival Rating: {playerStats.survivalRating}/100</p>
                </div>
              ) : (
                <p className="text-sm">Final simulation step: {step}</p>
              )}
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
              📷 {cameraMode === 'overview' ? 'Follow Player' : 'Overview'}
            </button>
            <button
              onClick={takeScreenshot}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded ml-2"
              title="Take a screenshot of the current simulation view"
            >
              📸 Screenshot
            </button>
          </div>
          
          {/* Player-specific controls */}
          {playerAgentRef.current && (
            <div className="mt-3 p-2 bg-gray-800 rounded border border-white">
              <h3 className="text-sm font-bold text-white mb-2">🎯 Player Controls</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    if (playerAgentRef.current.activateReproduction()) {
                      showNotification('💕 Reproduction mode activated - Move near a healthy agent', 'info');
                    } else {
                      showNotification('❌ Cannot reproduce - Need energy >60, age >25, no infection', 'warning');
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs ${
                    playerAgentRef.current?.abilities?.reproductionReady 
                      ? 'bg-pink-600 hover:bg-pink-700' 
                      : 'bg-gray-600'
                  }`}
                  disabled={!playerAgentRef.current?.abilities?.reproductionReady}
                >
                  💕 Reproduce
                </button>
                
                <button
                  onClick={() => {
                    const scan = playerAgentRef.current.scanEnvironment(environment, agents);
                    console.log('🔍 Environmental Scan:', scan);
                    setSelectedAgent({
                      id: 'environmental_scan',
                      scanData: scan,
                      isEnvironmentalScan: true
                    });
                    showNotification('🔍 Environment scanned - Check console or agent panel', 'info');
                  }}
                  className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-xs"
                >
                  🔍 Scan
                </button>
                
                <button
                  onClick={() => {
                    // Find nearby agent needing help
                    const needyAgents = agents.filter(a => 
                      a !== playerAgentRef.current && 
                      a.energy < 40 && 
                      playerAgentRef.current.distanceTo(a) < playerAgentRef.current.helpRadius
                    );
                    
                    if (needyAgents.length > 0 && playerAgentRef.current.energy > 35) {
                      const target = needyAgents[0];
                      if (playerAgentRef.current.shareResourcesWith(target)) {
                        showNotification(`💝 Helped ${target.id.substring(0, 8)} (+15 energy)`, 'success');
                      }
                    } else {
                      showNotification('❌ No nearby agents need help or insufficient energy', 'warning');
                    }
                  }}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                >
                  💝 Help
                </button>
                
                <button
                  onClick={() => {
                    const stats = playerAgentRef.current.getPerformanceSummary();
                    console.log('📊 Player Performance:', stats);
                    showNotification(`📊 Performance - Survival: ${stats.survivalRating}/100`, 'info');
                  }}
                  className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
                >
                  📊 Stats
                </button>
              </div>
              
              {playerAgentRef.current.manualReproductionActive && (
                <div className="mt-2 p-1 bg-pink-900 rounded text-xs">
                  <span className="text-pink-300">💕 Reproduction Active</span>
                  <br />
                  <span className="text-gray-300">Move near a healthy agent to reproduce</span>
                  <button
                    onClick={() => {
                      playerAgentRef.current.manualReproductionActive = false;
                      showNotification('💔 Reproduction mode deactivated', 'info');
                    }}
                    className="ml-2 px-1 py-0.5 bg-red-700 hover:bg-red-800 rounded"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Analysis Controls */}
          <div className="mt-2 space-y-2">
            <button
              onClick={async () => {
                try {
                  addDebugLog('INFO', '🔄 Starting EcoSysX Analytics export...');
                  addDebugLog('INFO', 'Analytics ref check', { hasAnalytics: !!analyticsRef.current });
                  
                  if (!analyticsRef.current) {
                    throw new Error('Analytics system not initialized');
                  }
                  
                  const result = await analyticsRef.current.exportAnalytics();
                  addDebugLog('INFO', '✅ Export completed successfully', { resultKeys: Object.keys(result) });
                  alert('✅ Export completed successfully!');
                  
                } catch (error) {
                  addDebugLog('ERROR', '❌ Export failed', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                  });
                  alert(`Export failed: ${error.message}\n\nCheck Debug Console for full details.`);
                }
              }}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-sm mr-2"
              title="Export comprehensive EcoSysX logs to Downloads/EcoSysX Analytics folder"
            >
              📊 Export to EcoSysX Analytics
            </button>
            
            {/* Folder Selection Controls */}
            <div className="flex items-center gap-2 mt-2 mb-2">
              <button
                onClick={async () => {
                  try {
                    const result = await analyticsRef.current?.selectExportFolder();
                    if (result?.success) {
                      alert(`✅ Export folder selected: ${result.folder}`);
                    }
                  } catch (error) {
                    console.error('❌ Folder selection failed:', error);
                    alert(`Folder selection failed: ${error.message}`);
                  }
                }}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                title="Choose export folder location"
              >
                📂 Select Export Folder
              </button>
              
              <span className="text-xs text-green-300">
                📁 {exportFolderLabel}
              </span>
              
              <button
                onClick={() => {
                  analyticsRef.current?.resetExportFolder();
                }}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
                title="Reset to default downloads folder"
              >
                🔄 Reset
              </button>
            </div>
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
            
            {/* Debug Console */}
            <div className="mt-3 border-t border-gray-600 pt-3">
              <button
                onClick={() => setShowDebugConsole(!showDebugConsole)}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm mr-2"
                title="Toggle debug console for error reporting"
              >
                🐛 Debug Console ({debugLogs.length})
              </button>
              {/* Runtime Debug Settings */}
              <div className="mt-3 p-2 bg-gray-800 rounded border border-gray-700">
                <div className="text-xs font-bold text-cyan-300 mb-2">⚙️ Runtime Debug Settings</div>
                
                {/* System Metrics Display */}
                <div className="mb-3 p-2 bg-black rounded border border-gray-600">
                  <div className="text-xs font-bold text-green-300 mb-1">📊 System Metrics</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Complexity:</span>
                      <span className={`ml-1 font-mono ${systemMetrics.complexity > debugSettings.reproductionComplexityThreshold ? 'text-red-300' : 'text-green-300'}`}>
                        {systemMetrics.complexity}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Reproduction:</span>
                      <span className={`ml-1 font-mono ${systemMetrics.reproductionSuppressed ? 'text-red-300' : 'text-green-300'}`}>
                        {systemMetrics.reproductionSuppressed ? '🚫 Suppressed' : '✅ Active'}
                      </span>
                    </div>
                  </div>
                  {systemMetrics.lastPruneUpdate > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-xs text-purple-300 mb-1">🧹 Prune Stats (Last: Step {systemMetrics.lastPruneUpdate})</div>
                      <div className="text-xs grid grid-cols-3 gap-1">
                        <div>Known: {systemMetrics.pruneStats.knownAgentsRemoved}</div>
                        <div>Logs: {systemMetrics.pruneStats.logsCompressed}</div>
                        <div>Merged: {systemMetrics.pruneStats.duplicatesMerged}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['maxKnownAgents','maxKnownResources','maxDangerZones','maxHelpRequests','reproductionComplexityThreshold','reproductionHardCap','pruneSummaryInterval'].map(key => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-gray-400">{key}</span>
                      <input
                        type="number"
                        className="bg-black border border-gray-600 rounded px-1 py-0.5 text-xs"
                        value={debugSettings[key]}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setDebugSettings(prev => ({ ...prev, [key]: val }));
                          if (key === 'maxKnownAgents') {
                            // Apply to existing agents
                            agents.forEach(a => { if (a.socialMemory) a.socialMemory.maxKnownAgents = val; });
                          }
                          if (['maxKnownResources','maxDangerZones','maxHelpRequests'].includes(key)) {
                            agents.forEach(a => {
                              if (a instanceof CausalAgent) {
                                if (key === 'maxKnownResources') a.maxKnownResources = val;
                                if (key === 'maxDangerZones') a.maxDangerZones = val;
                                if (key === 'maxHelpRequests') a.maxHelpRequests = val;
                              }
                            });
                          }
                          if (key === 'pruneSummaryInterval') {
                            analyticsRef.current && (analyticsRef.current.pruneSummaryInterval = val);
                          }
                        }}
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="flex items-center gap-1 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={debugSettings.adaptiveReproduction}
                      onChange={e => setDebugSettings(prev => ({ ...prev, adaptiveReproduction: e.target.checked }))}
                    /> Adaptive Reproduction
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={debugSettings.logCompression}
                      onChange={e => {
                        setDebugSettings(prev => ({ ...prev, logCompression: e.target.checked }));
                        if (analyticsRef.current) analyticsRef.current.compressLogs = e.target.checked;
                      }}
                    /> Log Compression
                  </label>
                </div>
              </div>
              
              {showDebugConsole && (
                <div className="mt-2 bg-black border border-gray-600 rounded p-2 max-h-64 overflow-y-auto">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-300">Debug Console - Last {Math.min(debugLogs.length, 100)} entries</span>
                    <div className="space-x-1">
                      <button
                        onClick={copyDebugLogs}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                        title="Copy recent logs to clipboard for sharing"
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={exportDebugLogs}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                        title="Export full debug logs as JSON file"
                      >
                        📄 Export
                      </button>
                      <button
                        onClick={() => setDebugLogs([])}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        title="Clear debug logs"
                      >
                        🗑️ Clear
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs font-mono">
                    {debugLogs.length === 0 ? (
                      <div className="text-gray-500 italic">No debug logs yet</div>
                    ) : (
                      debugLogs.slice(0, 50).map((log, index) => (
                        <div key={index} className={`p-1 rounded ${
                          log.level === 'ERROR' ? 'bg-red-900 text-red-200' :
                          log.level === 'WARN' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-gray-800 text-gray-200'
                        }`}>
                          <div className="flex justify-between">
                            <span className="font-bold">[{log.level}] {log.message}</span>
                            <span className="text-gray-400">Step {log.step}</span>
                          </div>
                          {log.data && (
                            <pre className="mt-1 text-xs text-gray-300 whitespace-pre-wrap">{log.data}</pre>
                          )}
                          <div className="text-gray-500 text-xs mt-1">{new Date(log.timestamp).toLocaleTimeString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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
                if (llmConfig.ollamaStatus === 'connected' && llmConfig.enabled) {
                  return `Real AI Active (${llmConfig.currentModel || 'Unknown model'})`;
                }
                return 'Simulated Only - Install Ollama + llama3.2 for real AI';
              })()}
            </div>
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            <p>• <strong>Click Agent:</strong> View reasoning details</p>
            <p>• <strong>Right Drag:</strong> Rotate camera</p>
            <p>• <strong>Scroll:</strong> Zoom in/out</p>
            <p>• <strong>Export to EcoSysX Analytics:</strong> Comprehensive logs and CSV reports exported to your selected folder</p>
            <p>• <strong>Select Export Folder:</strong> Choose where to save your analytics files (requires supported browser)</p>
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
            
            {/* Basic Info */}
            <div className="mb-3 p-2 bg-gray-800 rounded">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Personality:</span>
                  <div className="font-mono text-yellow-200">{selectedAgent.personality}</div>
                </div>
                <div>
                  <span className="text-gray-400">Energy:</span>
                  <div className="font-mono text-green-300">{selectedAgent.energy}%</div>
                </div>
                <div>
                  <span className="text-gray-400">Age:</span>
                  <div className="font-mono text-blue-300">{selectedAgent.age}</div>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <div className={`font-mono ${
                    selectedAgent.status === 'Infected' ? 'text-red-400' :
                    selectedAgent.status === 'Recovered' ? 'text-green-400' :
                    'text-blue-400'
                  }`}>{selectedAgent.status}</div>
                </div>
              </div>
            </div>

            {/* LLM Reasoning Info */}
            <div className="mb-3 p-2 bg-gray-800 rounded border border-purple-400">
              <h4 className="text-sm font-semibold text-purple-300 mb-1">
                {selectedAgent.isRealLLM ? '🤖 Real LLM Reasoning' : '🎭 Simulated Reasoning'}
              </h4>
              
              {selectedAgent.isRealLLM && selectedAgent.llmData && (
                <div className="mb-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model:</span>
                    <span className="font-mono text-cyan-300">{selectedAgent.llmData.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Response Time:</span>
                    <span className="font-mono text-yellow-300">{selectedAgent.llmData.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Parsed JSON:</span>
                    <span className={`font-mono ${
                      selectedAgent.llmData.parsed ? 'text-green-300' : 'text-orange-300'
                    }`}>
                      {selectedAgent.llmData.parsed ? 'Yes' : 'Natural Language'}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">Confidence:</span>
                <span className="font-mono text-yellow-300">
                  {Math.round(selectedAgent.confidence * 100)}%
                </span>
              </div>
              
              <div className="text-sm">
                <span className="text-gray-400">Decision:</span>
                <div className="mt-1 p-2 bg-black rounded text-gray-200 text-xs max-h-20 overflow-y-auto">
                  {selectedAgent.reasoning}
                </div>
              </div>
            </div>

            {/* Social Info */}
            <div className="mb-3 p-2 bg-gray-800 rounded">
              <h4 className="text-sm font-semibold text-cyan-300 mb-1">🤝 Social Network</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Known Agents:</span>
                  <div className="font-mono text-cyan-200">{selectedAgent.knownAgents}</div>
                </div>
                <div>
                  <span className="text-gray-400">Avg Trust:</span>
                  <div className="font-mono text-green-200">
                    {Math.round(selectedAgent.avgTrust * 100)}%
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Resources:</span>
                  <div className="font-mono text-yellow-200">{selectedAgent.knownResources}</div>
                </div>
                <div>
                  <span className="text-gray-400">Dangers:</span>
                  <div className="font-mono text-red-200">{selectedAgent.dangerZones}</div>
                </div>
              </div>
              
              {/* Alliance Information */}
              {selectedAgent.alliances && selectedAgent.alliances.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-xs text-green-300 mb-1">Active Alliances ({selectedAgent.alliances.length}):</div>
                  {selectedAgent.alliances.slice(0, 2).map((alliance, idx) => (
                    <div key={idx} className="text-xs p-1 bg-black rounded mb-1">
                      <div className="flex justify-between">
                        <span className="text-green-300">
                          {alliance.members?.filter(id => id !== selectedAgent.id)[0]?.substring(0, 8) || 'Unknown'}
                        </span>
                        <span className="text-yellow-300">
                          {Math.round((alliance.strength || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Territory Information */}
              {selectedAgent.territory && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-xs text-purple-300 mb-1">🏴 Territory:</div>
                  <div className="text-xs p-1 bg-black rounded">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Center:</span>
                      <span className="font-mono text-purple-200">
                        ({Math.round(selectedAgent.territory.center?.x || 0)}, {Math.round(selectedAgent.territory.center?.z || 0)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Strength:</span>
                      <span className="font-mono text-purple-200">
                        {Math.round((selectedAgent.territory.strength || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Reputation Information */}
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="text-xs text-orange-300 mb-1">Reputation:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Trading:</span>
                    <div className="font-mono text-orange-200">
                      {Math.round((selectedAgent.tradingReputation || 0.5) * 100)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Helping:</span>
                    <div className="font-mono text-orange-200">
                      {Math.round((selectedAgent.helpingReputation || 0.5) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent History */}
            {selectedAgent.history && selectedAgent.history.length > 0 && (
              <div className="mb-3 p-2 bg-gray-800 rounded">
                <h4 className="text-sm font-semibold text-orange-300 mb-1">📜 Recent Decisions</h4>
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {selectedAgent.history.slice(-3).reverse().map((decision, idx) => (
                    <div key={idx} className="text-xs p-1 bg-black rounded">
                      <div className="flex justify-between">
                        <span className={`font-mono ${
                          decision.success ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {decision.method === 'real_llm' ? '🤖' : '🎭'}
                        </span>
                        <span className="text-gray-400">
                          {new Date(decision.timestamp).toLocaleTimeString().slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Intelligence & Decision Influence Tracking */}
            {selectedAgent.influenceAnalysis && (
              <div className="mb-3 p-2 bg-gray-800 rounded border border-indigo-400">
                <h4 className="text-sm font-semibold text-indigo-300 mb-2">🧠 Decision Intelligence</h4>
                
                {/* Current Decision Influences */}
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Current Decision Influences:</div>
                  <div className="space-y-1">
                    {Object.entries(selectedAgent.influenceAnalysis.currentInfluences).map(([type, value]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-xs text-gray-300 capitalize">{type}:</span>
                        <div className="flex items-center">
                          <div className="w-16 h-2 bg-gray-700 rounded mr-2 overflow-hidden">
                            <div 
                              className={`h-full ${
                                type === 'social' ? 'bg-cyan-400' :
                                type === 'individual' ? 'bg-green-400' :
                                type === 'environmental' ? 'bg-yellow-400' : 'bg-gray-400'
                              }`}
                              style={{ width: `${Math.round(value * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-white">
                            {Math.round(value * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision Effectiveness */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Social Decisions:</span>
                    <div className={`font-mono ${
                      selectedAgent.influenceAnalysis.socialEffectiveness > 0.6 ? 'text-green-300' :
                      selectedAgent.influenceAnalysis.socialEffectiveness > 0.4 ? 'text-yellow-300' : 'text-red-300'
                    }`}>
                      {Math.round(selectedAgent.influenceAnalysis.socialEffectiveness * 100)}% Success
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Individual:</span>
                    <div className={`font-mono ${
                      selectedAgent.influenceAnalysis.individualEffectiveness > 0.6 ? 'text-green-300' :
                      selectedAgent.influenceAnalysis.individualEffectiveness > 0.4 ? 'text-yellow-300' : 'text-red-300'
                    }`}>
                      {Math.round(selectedAgent.influenceAnalysis.individualEffectiveness * 100)}% Success
                    </div>
                  </div>
                </div>

                {/* Overall Metrics */}
                <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Adaptability:</span>
                    <span className={`font-mono ${
                      selectedAgent.influenceAnalysis.adaptability > 0.6 ? 'text-green-300' :
                      selectedAgent.influenceAnalysis.adaptability > 0.4 ? 'text-yellow-300' : 'text-red-300'
                    }`}>
                      {Math.round(selectedAgent.influenceAnalysis.adaptability * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Decisions:</span>
                    <span className="font-mono text-blue-300">
                      {selectedAgent.influenceAnalysis.overallMetrics.totalDecisions}
                    </span>
                  </div>
                </div>

                {/* Recent Decision Pattern */}
                {selectedAgent.influenceAnalysis.recentDecisions && selectedAgent.influenceAnalysis.recentDecisions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div className="text-xs text-gray-400 mb-1">Recent Pattern:</div>
                    <div className="flex space-x-1">
                      {selectedAgent.influenceAnalysis.recentDecisions.slice(-10).map((decision, idx) => (
                        <div 
                          key={idx}
                          className={`w-2 h-2 rounded-full ${
                            decision.sociallyInfluenced ? 'bg-cyan-400' : 'bg-green-400'
                          } ${decision.success === true ? 'opacity-100' : 
                              decision.success === false ? 'opacity-40' : 'opacity-70'}`}
                          title={`${decision.goal} - ${decision.sociallyInfluenced ? 'Social' : 'Individual'} - ${decision.success ? 'Success' : 'Pending/Failed'}`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                      <span>🔵 Social</span>
                      <span>🟢 Individual</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
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

        {/* LLM Performance Dashboard */}
        <div className="mb-6 p-3 bg-gray-700 rounded border-l-4 border-purple-400">
          <h4 className="text-md font-semibold mb-2 text-purple-300">🤖 LLM Performance</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={`${
                llmConfig.ollamaStatus === 'connected' && llmConfig.enabled 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                Status:
              </span>
              <span className="font-mono text-xs">
                {llmConfig.ollamaStatus === 'connected' && llmConfig.enabled 
                  ? 'Real AI' 
                  : 'Simulated'}
              </span>
            </div>
            {llmConfig.enabled && (
              <>
                <div className="flex justify-between">
                  <span className="text-cyan-400">Requests:</span>
                  <span className="font-mono">{stats.llmStats.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Success Rate:</span>
                  <span className="font-mono">{Math.round(stats.llmStats.successRate * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">Avg Response:</span>
                  <span className="font-mono">{Math.round(stats.llmStats.avgResponseTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-400">Fallbacks:</span>
                  <span className="font-mono">{stats.llmStats.fallbackUsed}</span>
                </div>
              </>
            )}
            <div className="mt-2 pt-2 border-t border-gray-600">
              <button
                onClick={() => {
                  // Update LLM service configuration
                  const newEndpoint = prompt('Enter Ollama endpoint:', llmConfig.endpoint);
                  if (newEndpoint && newEndpoint.trim()) {
                    llmService.updateConfig({ endpoint: newEndpoint.trim() });
                    setLLMConfig(prev => ({ ...prev, endpoint: newEndpoint.trim() }));
                    showNotification('🔧 LLM endpoint updated', 'info');
                  }
                }}
                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs mr-2"
                title="Configure LLM endpoint"
              >
                🔧 Config
              </button>
              <button
                onClick={async () => {
                  try {
                    showNotification('🤖 Testing LLM...', 'info');
                    const testPrompt = llmService.buildEcosystemPrompt(
                      { personality: 'curious', id: 'test', age: 50, energy: 75, status: 'Susceptible' },
                      { nearbyAgents: [], nearbyInfected: 0, nearestResourceDistance: 15, nearbyCount: 2 },
                      []
                    );
                    
                    const result = await llmService.callLLM(testPrompt, { maxTokens: 128 });
                    const parsed = llmService.parseLLMResponse(result.response);
                    
                    showNotification(`✅ LLM Test: ${parsed.action} (${result.responseTime}ms)`, 'success');
                    console.log('🧪 LLM Test Result:', { result, parsed });
                  } catch (error) {
                    showNotification(`❌ LLM Test Failed: ${error.message}`, 'error');
                    console.error('🧪 LLM Test Error:', error);
                  }
                }}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs mr-2"
                title="Test LLM connection with sample reasoning"
                disabled={!llmConfig.enabled}
              >
                🧪 Test
              </button>
              <button
                onClick={() => {
                  if (llmService) {
                    llmService.resetStats();
                    showNotification('📊 LLM stats reset', 'info');
                  }
                }}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
                title="Reset LLM performance statistics"
              >
                🔄 Reset
              </button>
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
              <span>Weather:</span>
              <span className={`capitalize font-mono ${
                environment.climateEvent ? 'text-red-400 font-bold' : 
                environment.weather === 'storm' || environment.weather === 'hurricane' ? 'text-orange-400' :
                'text-green-400'
              }`}>
                {environment.climateEvent ? `${environment.climateEvent}!` : environment.weather}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Resources:</span>
              <span className="font-mono">{environment.resources.size}</span>
            </div>
            <div className="flex justify-between">
              <span>Territories:</span>
              <span className="font-mono">{environment.territories?.size || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Terrain Features:</span>
              <span className="font-mono">{environment.terrainFeatures?.size || 0}</span>
            </div>
            
            {/* Terrain Feature Summary */}
            {environment.terrainFeatures && environment.terrainFeatures.size > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
                <div className="text-gray-300 mb-1">Terrain Features:</div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex justify-between">
                    <span className="text-yellow-300">🏠 Shelters:</span>
                    <span className="font-mono">{Array.from(environment.terrainFeatures.values()).filter(f => f.type === 'shelter').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-300">🌿 Oases:</span>
                    <span className="font-mono">{Array.from(environment.terrainFeatures.values()).filter(f => f.type === 'oasis').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-300">⛰️ Hills:</span>
                    <span className="font-mono">{Array.from(environment.terrainFeatures.values()).filter(f => f.type === 'hill').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-300">☢️ Danger:</span>
                    <span className="font-mono">{Array.from(environment.terrainFeatures.values()).filter(f => f.type === 'contaminated').length}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Environmental Stress Indicators */}
            {environment.environmentalStress && Object.values(environment.environmentalStress).some(stress => stress > 0.1) && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="text-xs text-red-300">Environmental Stress:</div>
                {Object.entries(environment.environmentalStress).map(([type, level]) => 
                  level > 0.1 && (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="capitalize">{type.replace('Stress', '')}:</span>
                      <span className={`font-mono ${level > 0.7 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {Math.round(level * 100)}%
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Social Systems Dashboard */}
        <div className="mb-6 p-3 bg-gray-700 rounded border-l-4 border-cyan-400">
          <h4 className="text-md font-semibold mb-2 text-cyan-300">🤝 Social Systems</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-400">Active Alliances:</span>
              <span className="font-mono">{agents.reduce((count, agent) => 
                count + (agent instanceof CausalAgent ? agent.alliances?.size || 0 : 0), 0) / 2}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-400">Trade Offers:</span>
              <span className="font-mono">{agents.reduce((count, agent) => 
                count + (agent instanceof CausalAgent ? agent.tradeOffers?.length || 0 : 0), 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-400">Help Requests:</span>
              <span className="font-mono">{agents.reduce((count, agent) => 
                count + (agent instanceof CausalAgent && agent.currentHelpRequest ? 1 : 0), 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">Territorial Claims:</span>
              <span className="font-mono">{agents.reduce((count, agent) => 
                count + (agent instanceof CausalAgent && agent.territory ? 1 : 0), 0)}</span>
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
          <p>• Use player controls to reproduce, scan, help others</p>
          <p>• Survive and watch AI evolve!</p>
        </div>
      </div>

      {/* Notification Display */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notif, index) => (
          <div
            key={index}
            className={`px-4 py-2 rounded-lg shadow-lg transition-all duration-300 max-w-md ${
              notif.type === 'success' ? 'bg-green-600 text-white' :
              notif.type === 'error' ? 'bg-red-600 text-white' :
              notif.type === 'warning' ? 'bg-yellow-600 text-black' :
              'bg-blue-600 text-white'
            }`}
          >
            {notif.message}
          </div>
        ))}
      </div>

      {/* Environmental Scan Panel */}
      {selectedAgent && selectedAgent.isEnvironmentalScan && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 p-4 rounded-lg text-white max-w-md z-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-cyan-300">🔍 Environmental Scan</h3>
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-300">Nearby Agents:</span>
                <span className="text-white ml-2">{selectedAgent.scanData?.nearbyAgents?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-300">Infected:</span>
                <span className="text-red-300 ml-2">{selectedAgent.scanData?.nearbyAgents?.filter(a => a.status === 'Infected').length || 0}</span>
              </div>
              <div>
                <span className="text-gray-300">Resources:</span>
                <span className="text-green-300 ml-2">{selectedAgent.scanData?.nearbyResources?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-300">Temperature:</span>
                <span className="text-blue-300 ml-2">{selectedAgent.scanData?.temperature || 'N/A'}°</span>
              </div>
            </div>
            
            {/* Current Terrain Status */}
            {selectedAgent.scanData?.currentTerrain && selectedAgent.scanData.currentTerrain !== 'normal' && (
              <div className="mt-2 p-2 bg-green-900 rounded">
                <span className="text-green-300 font-semibold">🗺️ Current Terrain: {selectedAgent.scanData.currentTerrain}</span>
                {selectedAgent.scanData.terrainBonuses && selectedAgent.scanData.terrainBonuses.length > 0 && (
                  <ul className="text-xs mt-1">
                    {selectedAgent.scanData.terrainBonuses.map((bonus, i) => (
                      <li key={i} className="text-green-200">• {bonus}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            
            {/* Nearby Terrain Features */}
            {selectedAgent.scanData?.nearbyTerrain && selectedAgent.scanData.nearbyTerrain.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-900 rounded">
                <span className="text-yellow-300 font-semibold">🗺️ Nearby Terrain:</span>
                <ul className="text-xs mt-1 max-h-20 overflow-y-auto">
                  {selectedAgent.scanData.nearbyTerrain.map((terrain, i) => (
                    <li key={i} className="text-yellow-200">
                      • {terrain.description} ({terrain.distance}m)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedAgent.scanData?.threats && selectedAgent.scanData.threats.length > 0 && (
              <div className="mt-2 p-2 bg-red-900 rounded">
                <span className="text-red-300 font-semibold">⚠ Threats Detected:</span>
                <ul className="text-xs mt-1">
                  {selectedAgent.scanData.threats.map((threat, i) => (
                    <li key={i} className="text-red-200">• {threat}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedAgent.scanData?.recommendations && selectedAgent.scanData.recommendations.length > 0 && (
              <div className="mt-2 p-2 bg-blue-900 rounded">
                <span className="text-blue-300 font-semibold">💡 Recommendations:</span>
                <ul className="text-xs mt-1">
                  {selectedAgent.scanData.recommendations.map((rec, i) => (
                    <li key={i} className="text-blue-200">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EcosystemSimulator;