/**
 * Ecosystem Engine Unit Tests
 * 
 * Tests for the core ecosystem simulation engine including:
 * - Time system (TIME_V1)
 * - Message system
 * - Analytics system
 * - Hazard probability calculations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  TIME_V1, 
  hazardProbability, 
  Message, 
  MessageTypes, 
  EcosystemAnalytics 
} from './EcosystemEngine.js';

describe('TIME_V1 System', () => {
  describe('Time Constants', () => {
    it('should have 1 hour per step', () => {
      expect(TIME_V1.dtHours).toBe(1);
    });

    it('should calculate days from hours', () => {
      expect(TIME_V1.dtDays).toBe(1/24);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(TIME_V1)).toBe(true);
      expect(() => {
        TIME_V1.dtHours = 2;
      }).toThrow();
    });
  });

  describe('Time Conversions', () => {
    it('should convert steps to hours', () => {
      expect(TIME_V1.stepToHours(1)).toBe(1);
      expect(TIME_V1.stepToHours(24)).toBe(24);
      expect(TIME_V1.stepToHours(100)).toBe(100);
    });

    it('should convert steps to days', () => {
      expect(TIME_V1.stepToDays(24)).toBe(1);
      expect(TIME_V1.stepToDays(48)).toBe(2);
      expect(TIME_V1.stepToDays(240)).toBe(10);
    });

    it('should convert hours to steps', () => {
      expect(TIME_V1.hoursToSteps(1)).toBe(1);
      expect(TIME_V1.hoursToSteps(24)).toBe(24);
      expect(TIME_V1.hoursToSteps(100)).toBe(100);
    });

    it('should convert days to steps', () => {
      expect(TIME_V1.daysToSteps(1)).toBe(24);
      expect(TIME_V1.daysToSteps(2)).toBe(48);
      expect(TIME_V1.daysToSteps(10)).toBe(240);
    });

    it('should handle fractional conversions', () => {
      expect(TIME_V1.stepToDays(12)).toBe(0.5);
      expect(TIME_V1.daysToSteps(0.5)).toBe(12);
    });
  });
});

describe('Hazard Probability', () => {
  it('should calculate probability from rate', () => {
    const prob = hazardProbability(1.0, 1); // 1 per day, 1 hour step
    
    expect(prob).toBeGreaterThan(0);
    expect(prob).toBeLessThan(1);
  });

  it('should return 0 for invalid rates', () => {
    expect(hazardProbability(0, 1)).toBe(0);
    expect(hazardProbability(-1, 1)).toBe(0);
    expect(hazardProbability(Infinity, 1)).toBe(0);
    expect(hazardProbability(NaN, 1)).toBe(0);
  });

  it('should return 0 for invalid time steps', () => {
    expect(hazardProbability(1.0, 0)).toBe(0);
    expect(hazardProbability(1.0, -1)).toBe(0);
  });

  it('should increase with rate', () => {
    const prob1 = hazardProbability(0.5, 1);
    const prob2 = hazardProbability(1.0, 1);
    const prob3 = hazardProbability(2.0, 1);
    
    expect(prob2).toBeGreaterThan(prob1);
    expect(prob3).toBeGreaterThan(prob2);
  });

  it('should increase with time step', () => {
    const prob1 = hazardProbability(1.0, 1);
    const prob2 = hazardProbability(1.0, 2);
    const prob3 = hazardProbability(1.0, 24);
    
    expect(prob2).toBeGreaterThan(prob1);
    expect(prob3).toBeGreaterThan(prob2);
  });

  it('should approach 1 for high rates', () => {
    const prob = hazardProbability(100.0, 24); // Very high rate over a day
    
    expect(prob).toBeGreaterThan(0.99);
    expect(prob).toBeLessThanOrEqual(1);
  });

  it('should use TIME_V1 default if no dt specified', () => {
    const prob1 = hazardProbability(1.0);
    const prob2 = hazardProbability(1.0, TIME_V1.dtHours);
    
    expect(prob1).toBe(prob2);
  });
});

describe('Message System', () => {
  describe('MessageTypes', () => {
    it('should define all message types', () => {
      expect(MessageTypes.RESOURCE_LOCATION).toBeDefined();
      expect(MessageTypes.THREAT_WARNING).toBeDefined();
      expect(MessageTypes.ALLIANCE_PROPOSAL).toBeDefined();
      expect(MessageTypes.HELP_REQUEST).toBeDefined();
      expect(MessageTypes.KNOWLEDGE_SHARE).toBeDefined();
    });
  });

  describe('Message Creation', () => {
    it('should create a message with required fields', () => {
      const msg = new Message('agent1', MessageTypes.RESOURCE_LOCATION, { x: 10, y: 20 });
      
      expect(msg.sender).toBe('agent1');
      expect(msg.type).toBe(MessageTypes.RESOURCE_LOCATION);
      expect(msg.content).toEqual({ x: 10, y: 20 });
      expect(msg.priority).toBe('normal');
      expect(msg.range).toBe(10);
    });

    it('should generate unique message IDs', () => {
      const msg1 = new Message('agent1', MessageTypes.HELP_REQUEST, 'Help!');
      const msg2 = new Message('agent1', MessageTypes.HELP_REQUEST, 'Help!');
      
      expect(msg1.id).not.toBe(msg2.id);
      expect(msg1.id).toMatch(/^msg_/);
    });

    it('should support custom priority', () => {
      const msg = new Message('agent1', MessageTypes.THREAT_WARNING, 'Danger!', 'high');
      
      expect(msg.priority).toBe('high');
    });

    it('should have timestamp', () => {
      const before = Date.now();
      const msg = new Message('agent1', MessageTypes.ALLIANCE_PROPOSAL, 'Join me');
      const after = Date.now();
      
      expect(msg.timestamp).toBeGreaterThanOrEqual(before);
      expect(msg.timestamp).toBeLessThanOrEqual(after);
    });
  });
});

describe('EcosystemAnalytics', () => {
  let analytics;

  beforeEach(() => {
    analytics = new EcosystemAnalytics(100, 1000);
  });

  describe('Initialization', () => {
    it('should create analytics with default parameters', () => {
      expect(analytics).toBeDefined();
      expect(analytics.windowSize).toBe(100);
      expect(analytics.checkpointInterval).toBe(1000);
      expect(analytics.currentStep).toBe(0);
    });

    it('should initialize with empty data structures', () => {
      expect(analytics.windowHistory).toEqual([]);
      expect(analytics.checkpoints).toEqual([]);
      expect(analytics.panelSample).toBeInstanceOf(Map);
      expect(analytics.consoleLogs).toEqual([]);
    });

    it('should have event emitter capabilities', () => {
      expect(typeof analytics.on).toBe('function');
      expect(typeof analytics.emit).toBe('function');
    });

    it('should initialize window data', () => {
      expect(analytics.windowData).toBeDefined();
      expect(analytics.windowData.contacts_by_type).toBeInstanceOf(Map);
      expect(analytics.windowData.resources_consumed).toBe(0);
      expect(analytics.windowData.resources_spawned).toBe(0);
    });
  });

  describe('Window Management', () => {
    it('should reset window data', () => {
      analytics.windowData.resources_consumed = 100;
      analytics.windowData.resources_spawned = 50;
      
      analytics.resetWindow();
      
      expect(analytics.windowData.resources_consumed).toBe(0);
      expect(analytics.windowData.resources_spawned).toBe(0);
    });

    it('should maintain window start position', () => {
      expect(analytics.windowStart).toBe(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit analytics update events', () => {
      const listener = vi.fn();
      analytics.on('analytics:update', listener);
      
      // Mock environment with resources
      const mockEnvironment = {
        resources: new Map()
      };
      
      analytics.recordStep(1, [], mockEnvironment, {});
      
      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 1,
          windowHistory: expect.any(Array),
          checkpoints: expect.any(Array),
          panelSampleSize: expect.any(Number)
        })
      );
    });
  });

  describe('Step Recording', () => {
    it('should update current step', () => {
      const mockEnvironment = {
        resources: new Map()
      };
      
      analytics.recordStep(10, [], mockEnvironment, {});
      
      expect(analytics.currentStep).toBe(10);
    });

    it('should handle multiple step recordings', () => {
      const mockEnvironment = {
        resources: new Map()
      };
      
      analytics.recordStep(1, [], mockEnvironment, {});
      analytics.recordStep(2, [], mockEnvironment, {});
      analytics.recordStep(3, [], mockEnvironment, {});
      
      expect(analytics.currentStep).toBe(3);
    });
  });

  describe('Configuration', () => {
    it('should allow custom window sizes', () => {
      const customAnalytics = new EcosystemAnalytics(50, 500);
      
      expect(customAnalytics.windowSize).toBe(50);
      expect(customAnalytics.checkpointInterval).toBe(500);
    });

    it('should have panel sample size limit', () => {
      expect(analytics.panelSize).toBe(200);
    });

    it('should have contact matrix decay rate', () => {
      expect(analytics.decayRate).toBe(0.05);
    });

    it('should have max log entries limit', () => {
      expect(analytics.maxLogEntries).toBe(1000);
    });
  });
});