/**
 * Agent Classes Unit Tests
 * 
 * Tests for the core agent logic including:
 * - Message system
 * - Reinforcement learning
 * - Social memory
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  Message, 
  MessageTypes, 
  ReinforcementLearningPolicy, 
  SocialMemory 
} from './AgentClasses.js';

describe('Message System', () => {
  describe('Message', () => {
    it('should create a message with all required fields', () => {
      const message = new Message('agent1', 'agent2', MessageTypes.RESOURCE_TIP, 'Resource at (10, 20)');
      
      expect(message).toBeDefined();
      expect(message.from).toBe('agent1');
      expect(message.to).toBe('agent2');
      expect(message.type).toBe(MessageTypes.RESOURCE_TIP);
      expect(message.content).toBe('Resource at (10, 20)');
      expect(message.priority).toBe('normal');
      expect(message.processed).toBe(false);
    });

    it('should generate unique message IDs', () => {
      const msg1 = new Message('a1', 'a2', MessageTypes.HELP_REQUEST, 'Help!');
      const msg2 = new Message('a1', 'a2', MessageTypes.HELP_REQUEST, 'Help!');
      
      expect(msg1.id).not.toBe(msg2.id);
    });

    it('should support custom priority levels', () => {
      const urgentMsg = new Message('a1', 'a2', MessageTypes.INFECTION_WARNING, 'Outbreak!', 'high');
      
      expect(urgentMsg.priority).toBe('high');
    });

    it('should have a timestamp', () => {
      const msg = new Message('a1', 'a2', MessageTypes.ALLIANCE_REQUEST, 'Join me');
      
      expect(msg.timestamp).toBeGreaterThan(0);
      expect(typeof msg.timestamp).toBe('number');
    });
  });

  describe('MessageTypes', () => {
    it('should define all required message types', () => {
      expect(MessageTypes.RESOURCE_TIP).toBeDefined();
      expect(MessageTypes.INFECTION_WARNING).toBeDefined();
      expect(MessageTypes.HELP_REQUEST).toBeDefined();
      expect(MessageTypes.ALLIANCE_REQUEST).toBeDefined();
      expect(MessageTypes.TRADE_OFFER).toBeDefined();
    });
  });
});

describe('ReinforcementLearningPolicy', () => {
  let policy;

  beforeEach(() => {
    policy = new ReinforcementLearningPolicy();
  });

  describe('Initialization', () => {
    it('should create a policy with default parameters', () => {
      expect(policy).toBeDefined();
      expect(policy.epsilon).toBe(0.15);
      expect(policy.alpha).toBe(0.1);
      expect(policy.gamma).toBe(0.9);
      expect(policy.qTable).toBeInstanceOf(Map);
    });

    it('should initialize with empty Q-table', () => {
      expect(policy.qTable.size).toBe(0);
    });

    it('should have null initial state and action', () => {
      expect(policy.lastState).toBeNull();
      expect(policy.lastAction).toBeNull();
    });
  });

  describe('State Discretization', () => {
    it('should discretize observation into state string', () => {
      const observation = {
        energy: 75,
        nearbyCount: 2,
        nearbyInfected: 1,
        nearestResourceDistance: 3,
        status: 'healthy',
        age: 100
      };

      const state = policy.discretizeState(observation);
      
      expect(typeof state).toBe('string');
      expect(state).toContain('healthy');
    });

    it('should bucket energy levels', () => {
      const lowEnergy = { energy: 20, nearbyCount: 0, nearbyInfected: 0, nearestResourceDistance: 10, status: 'healthy', age: 0 };
      const highEnergy = { energy: 90, nearbyCount: 0, nearbyInfected: 0, nearestResourceDistance: 10, status: 'healthy', age: 0 };

      const lowState = policy.discretizeState(lowEnergy);
      const highState = policy.discretizeState(highEnergy);

      expect(lowState).not.toBe(highState);
    });

    it('should limit nearby count buckets', () => {
      const obs = {
        energy: 50,
        nearbyCount: 10, // Should be capped
        nearbyInfected: 0,
        nearestResourceDistance: 10,
        status: 'healthy',
        age: 0
      };

      const state = policy.discretizeState(obs);
      expect(state).toBeDefined();
    });
  });

  describe('Reward Calculation', () => {
    it('should calculate positive reward for high energy', () => {
      const observation = {
        energy: 100,
        nearbyInfected: 0,
        nearestResourceDistance: 10,
        age: 0
      };

      const reward = policy.calculateReward(observation);
      
      expect(reward).toBeGreaterThan(0);
    });

    it('should penalize proximity to infected agents', () => {
      const observation = {
        energy: 50,
        nearbyInfected: 3,
        nearestResourceDistance: 10,
        age: 0
      };

      const reward = policy.calculateReward(observation);
      
      expect(reward).toBeLessThan(0);
    });

    it('should reward low energy agents near resources', () => {
      const observation = {
        energy: 30,
        nearbyInfected: 0,
        nearestResourceDistance: 3,
        age: 0
      };

      const reward = policy.calculateReward(observation);
      
      expect(reward).toBeGreaterThan(0);
    });
  });

  describe('Action Selection', () => {
    it('should return a valid action', () => {
      const observation = {
        energy: 75,
        nearbyCount: 2,
        nearbyInfected: 0,
        nearestResourceDistance: 5,
        status: 'healthy',
        age: 10
      };

      const action = policy.getAction(observation);
      
      expect(action).toBeDefined();
      expect(action.intensity).toBeGreaterThanOrEqual(0);
      expect(action.direction).toBeDefined();
    });

    it('should update Q-values over time', () => {
      const obs1 = {
        energy: 75,
        nearbyCount: 2,
        nearbyInfected: 0,
        nearestResourceDistance: 5,
        status: 'healthy',
        age: 10
      };

      policy.getAction(obs1);
      
      const obs2 = {
        energy: 80,
        nearbyCount: 1,
        nearbyInfected: 0,
        nearestResourceDistance: 3,
        status: 'healthy',
        age: 11
      };

      policy.getAction(obs2);

      expect(policy.qTable.size).toBeGreaterThan(0);
    });
  });

  describe('Q-Value Management', () => {
    it('should return 0 for unknown state-action pairs', () => {
      const maxQ = policy.getMaxQValue('unknown_state');
      expect(maxQ).toBe(0);
    });

    it('should get best action from Q-table', () => {
      const state = 'test_state';
      const action = policy.getBestAction(state);
      
      expect(action).toBeDefined();
      expect(action.intensity).toBeDefined();
      expect(action.direction).toBeDefined();
    });
  });
});

describe('SocialMemory', () => {
  let memory;

  beforeEach(() => {
    memory = new SocialMemory();
  });

  describe('Initialization', () => {
    it('should create social memory with defaults', () => {
      expect(memory).toBeDefined();
      expect(memory.knownAgents).toBeInstanceOf(Map);
      expect(memory.receivedMessages).toEqual([]);
      expect(memory.maxMessages).toBe(20);
      expect(memory.neutralTrust).toBe(0.5);
    });

    it('should have trust bounds', () => {
      expect(memory.minTrust).toBe(0.0);
      expect(memory.maxTrust).toBe(1.0);
    });
  });

  describe('Agent Memory', () => {
    it('should remember new agent with initial trust', () => {
      memory.rememberAgent('agent123', { type: 'greeting' });
      
      expect(memory.knownAgents.has('agent123')).toBe(true);
      
      const agentMemory = memory.knownAgents.get('agent123');
      expect(agentMemory.trust).toBe(0.5);
      expect(agentMemory.interactions).toBe(1);
    });

    it('should update interaction count', () => {
      memory.rememberAgent('agent456', { type: 'trade' });
      memory.rememberAgent('agent456', { type: 'help' });
      
      const agentMemory = memory.knownAgents.get('agent456');
      expect(agentMemory.interactions).toBe(2);
    });

    it('should track shared information', () => {
      memory.rememberAgent('agent789', { type: 'resource_tip' });
      
      const agentMemory = memory.knownAgents.get('agent789');
      expect(agentMemory.sharedInfo).toHaveLength(1);
      expect(agentMemory.sharedInfo[0].type).toBe('resource_tip');
    });

    it('should update last seen timestamp', () => {
      const before = Date.now();
      memory.rememberAgent('agent999', null);
      const after = Date.now();
      
      const agentMemory = memory.knownAgents.get('agent999');
      expect(agentMemory.lastSeen).toBeGreaterThanOrEqual(before);
      expect(agentMemory.lastSeen).toBeLessThanOrEqual(after);
    });

    it('should initialize help counters', () => {
      memory.rememberAgent('agent_helper', null);
      
      const agentMemory = memory.knownAgents.get('agent_helper');
      expect(agentMemory.helpGiven).toBe(0);
      expect(agentMemory.helpReceived).toBe(0);
    });

    it('should initialize info accuracy counters', () => {
      memory.rememberAgent('agent_info', null);
      
      const agentMemory = memory.knownAgents.get('agent_info');
      expect(agentMemory.accurateInfo).toBe(0);
      expect(agentMemory.falseInfo).toBe(0);
      expect(agentMemory.totalInfo).toBe(0);
    });
  });

  describe('Memory Limits', () => {
    it('should limit shared info per agent', () => {
      const agentId = 'chatty_agent';
      
      // Add many interactions
      for (let i = 0; i < 60; i++) {
        memory.rememberAgent(agentId, { type: 'message' });
      }
      
      const agentMemory = memory.knownAgents.get(agentId);
      expect(agentMemory.sharedInfo.length).toBeLessThanOrEqual(50);
    });
  });
});