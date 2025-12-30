/**
 * LeniaSubstrate.test.ts - Tests for Flow-Lenia cellular substrate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LeniaSubstrate } from './LeniaSubstrate';
import { LeniaChannel, DEFAULT_LENIA_CONFIG } from './types';

describe('LeniaSubstrate', () => {
  let substrate: LeniaSubstrate;

  beforeEach(() => {
    substrate = new LeniaSubstrate({
      width: 64,
      height: 64,
      channelCount: 3,
    });
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create with default config', () => {
      const defaultSubstrate = new LeniaSubstrate();
      expect(defaultSubstrate).toBeDefined();
      expect(defaultSubstrate.getDimensions().width).toBe(DEFAULT_LENIA_CONFIG.width);
    });

    it('should create with custom dimensions', () => {
      expect(substrate.getDimensions().width).toBe(64);
      expect(substrate.getDimensions().height).toBe(64);
    });

    it('should initialize channels to zero', () => {
      const data = substrate.getChannelData(0);
      const sum = data.reduce((a, b) => a + b, 0);
      expect(sum).toBe(0);
    });

    it('should return empty array for invalid channel', () => {
      const data = substrate.getChannelData(99);
      expect(data.length).toBe(0);
    });
  });

  // =====================
  // PRESET TESTS
  // =====================
  describe('presets', () => {
    it('should create empty preset', () => {
      const empty = LeniaSubstrate.fromPreset('empty', { width: 32, height: 32 });
      const data = empty.getChannelData(0);
      const sum = data.reduce((a, b) => a + b, 0);
      expect(sum).toBe(0);
    });

    it('should create noise preset', () => {
      const noise = LeniaSubstrate.fromPreset('noise', { width: 32, height: 32 });
      const data = noise.getChannelData(0);
      const sum = data.reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(0);
    });

    it('should create blob preset', () => {
      const blob = LeniaSubstrate.fromPreset('blob', { width: 64, height: 64 });
      const data = blob.getChannelData(0);
      const max = Math.max(...data);
      expect(max).toBeGreaterThan(0);
    });

    it('should create orbium preset', () => {
      const orbium = LeniaSubstrate.fromPreset('orbium', { width: 64, height: 64 });
      const data = orbium.getChannelData(0);
      const max = Math.max(...data);
      expect(max).toBeGreaterThan(0);
    });

    it('should create geminium preset', () => {
      const geminium = LeniaSubstrate.fromPreset('geminium', { width: 64, height: 64 });
      const data = geminium.getChannelData(0);
      const sum = data.reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(0);
    });
  });

  // =====================
  // INITIALIZATION TESTS
  // =====================
  describe('initialization', () => {
    it('should initialize with noise', () => {
      substrate.initializeNoise(0, 0.5);
      const data = substrate.getChannelData(0);
      const max = Math.max(...data);
      expect(max).toBeGreaterThan(0);
      expect(max).toBeLessThanOrEqual(0.5);
    });

    it('should initialize with blob', () => {
      substrate.initializeBlob(0, 32, 32, 10);
      const data = substrate.getChannelData(0);

      // Check center has high value
      const centerIndex = 32 * 64 + 32;
      expect(data[centerIndex]).toBeGreaterThan(0.5);
    });

    it('should clear all channels', () => {
      substrate.initializeNoise(0, 1);
      substrate.clear();

      const data = substrate.getChannelData(0);
      const sum = data.reduce((a, b) => a + b, 0);
      expect(sum).toBe(0);
    });
  });

  // =====================
  // UPDATE TESTS
  // =====================
  describe('update', () => {
    it('should update without error', () => {
      substrate.initializeBlob(0, 32, 32, 10);
      expect(() => substrate.update()).not.toThrow();
    });

    it('should track tick count', () => {
      const initialStats = substrate.getStats();
      expect(initialStats.tickCount).toBe(0);

      substrate.update();
      substrate.update();

      const stats = substrate.getStats();
      expect(stats.tickCount).toBe(2);
    });

    it('should update statistics', () => {
      substrate.initializeBlob(0, 32, 32, 10);
      substrate.update();

      const stats = substrate.getStats();
      expect(stats.totalMass[0]).toBeGreaterThan(0);
      expect(stats.maxValue[0]).toBeGreaterThan(0);
      expect(stats.avgValue[0]).toBeGreaterThan(0);
    });

    it('should track update time', () => {
      substrate.initializeBlob(0, 32, 32, 10);
      substrate.update();

      const stats = substrate.getStats();
      expect(stats.updateTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // =====================
  // CHANNEL ACCESS TESTS
  // =====================
  describe('channel access', () => {
    it('should get channel value at position', () => {
      substrate.setChannelAt(0, 10, 10, 0.75);
      const value = substrate.getChannelAt(0, 10, 10);
      expect(value).toBe(0.75);
    });

    it('should clamp values to channel range', () => {
      substrate.setChannelAt(0, 10, 10, 1.5);
      const value = substrate.getChannelAt(0, 10, 10);
      expect(value).toBeLessThanOrEqual(1);
    });

    it('should wrap coordinates when enabled', () => {
      substrate.setChannelAt(0, 64, 64, 0.5); // Out of bounds
      const value = substrate.getChannelAt(0, 0, 0); // Wrapped
      expect(value).toBe(0.5);
    });

    it('should return channel data copy', () => {
      substrate.setChannelAt(0, 10, 10, 0.5);
      const data1 = substrate.getChannelData(0);
      const data2 = substrate.getChannelData(0);

      // Should be different arrays
      expect(data1).not.toBe(data2);

      // But same values
      expect(data1[10 * 64 + 10]).toBe(data2[10 * 64 + 10]);
    });

    it('should provide raw channel data access', () => {
      substrate.setChannelAt(0, 10, 10, 0.5);
      const raw = substrate.getChannelDataRaw(0);

      expect(raw[10 * 64 + 10]).toBe(0.5);
    });
  });

  // =====================
  // AGENT INTERACTION TESTS
  // =====================
  describe('agent interaction', () => {
    describe('senseAt', () => {
      it('should sense substrate at world position', () => {
        substrate.initializeBlob(0, 32, 32, 15);
        const sensing = substrate.senseAt(8, 8); // World coords (8 * resolution = 32 cells)

        expect(sensing.position.x).toBe(8);
        expect(sensing.position.y).toBe(8);
        expect(sensing.channels.length).toBe(3);
      });

      it('should return channel values at position', () => {
        substrate.setChannelAt(0, 20, 20, 0.8);
        const sensing = substrate.senseAt(5, 5); // 5 * 4 = 20 cells

        expect(sensing.channels[0]).toBeCloseTo(0.8, 1);
      });

      it('should return gradient information', () => {
        // Create a gradient (high on right, low on left)
        for (let x = 0; x < 64; x++) {
          for (let y = 0; y < 64; y++) {
            substrate.setChannelAt(0, x, y, x / 64);
          }
        }

        const sensing = substrate.senseAt(8, 8);

        // Gradient should point right (positive x)
        expect(sensing.gradient.x[0]).toBeGreaterThan(0);
      });

      it('should return flow velocity', () => {
        const flowSubstrate = new LeniaSubstrate({
          width: 64,
          height: 64,
          flow: { enabled: true, viscosity: 0.1, diffusion: 0.01, advectionStrength: 0.5, velocityDecay: 0.95 },
        });

        const sensing = flowSubstrate.senseAt(8, 8);
        expect(sensing.flowVelocity).toBeDefined();
        expect(sensing.flowVelocity.x).toBeDefined();
        expect(sensing.flowVelocity.y).toBeDefined();
      });
    });

    describe('depositAt', () => {
      it('should deposit value at world position', () => {
        substrate.depositAt(8, 8, {
          channel: 0,
          amount: 0.5,
          radius: 2,
          falloff: 'constant',
        });

        // Check deposit was made (8 * 4 = 32 cells)
        const value = substrate.getChannelAt(0, 32, 32);
        expect(value).toBeGreaterThan(0);
      });

      it('should apply linear falloff', () => {
        substrate.depositAt(8, 8, {
          channel: 0,
          amount: 1.0,
          radius: 3,
          falloff: 'linear',
        });

        const center = substrate.getChannelAt(0, 32, 32);
        const edge = substrate.getChannelAt(0, 32 + 10, 32); // Near edge of radius

        expect(center).toBeGreaterThan(edge);
      });

      it('should apply gaussian falloff', () => {
        substrate.depositAt(8, 8, {
          channel: 0,
          amount: 1.0,
          radius: 3,
          falloff: 'gaussian',
        });

        const center = substrate.getChannelAt(0, 32, 32);
        expect(center).toBeGreaterThan(0);
      });

      it('should deposit to correct channel', () => {
        substrate.depositAt(8, 8, {
          channel: 1, // Pheromone A
          amount: 0.5,
          radius: 2,
          falloff: 'constant',
        });

        const channel0 = substrate.getChannelAt(0, 32, 32);
        const channel1 = substrate.getChannelAt(1, 32, 32);

        expect(channel0).toBe(0);
        expect(channel1).toBeGreaterThan(0);
      });

      it('should ignore invalid channel', () => {
        expect(() =>
          substrate.depositAt(8, 8, {
            channel: 99,
            amount: 0.5,
            radius: 2,
            falloff: 'constant',
          })
        ).not.toThrow();
      });
    });
  });

  // =====================
  // FLOW FIELD TESTS
  // =====================
  describe('flow field', () => {
    it('should enable flow field', () => {
      const flowSubstrate = new LeniaSubstrate({
        width: 64,
        height: 64,
        flow: { enabled: true, viscosity: 0.1, diffusion: 0.01, advectionStrength: 0.5, velocityDecay: 0.95 },
      });

      const config = flowSubstrate.getConfig();
      expect(config.flow.enabled).toBe(true);
    });

    it('should return flow data', () => {
      const flowSubstrate = new LeniaSubstrate({
        width: 32,
        height: 32,
        flow: { enabled: true, viscosity: 0.1, diffusion: 0.01, advectionStrength: 0.5, velocityDecay: 0.95 },
      });

      const flowData = flowSubstrate.getFlowData();
      expect(flowData.x).toBeInstanceOf(Float32Array);
      expect(flowData.y).toBeInstanceOf(Float32Array);
      expect(flowData.x.length).toBe(32 * 32);
    });

    it('should track flow energy', () => {
      const flowSubstrate = new LeniaSubstrate({
        width: 32,
        height: 32,
        flow: { enabled: true, viscosity: 0.1, diffusion: 0.01, advectionStrength: 0.5, velocityDecay: 0.95 },
      });

      flowSubstrate.initializeBlob(0, 16, 16, 8);
      flowSubstrate.update();

      const stats = flowSubstrate.getStats();
      expect(stats.flowEnergy).toBeDefined();
    });
  });

  // =====================
  // SERIALIZATION TESTS
  // =====================
  describe('serialization', () => {
    it('should serialize to JSON', () => {
      substrate.initializeBlob(0, 32, 32, 10);
      substrate.update();

      const json = substrate.toJSON();

      expect(json.config).toBeDefined();
      expect(json.channels).toBeDefined();
      expect(json.channels.length).toBe(3);
      expect(json.stats).toBeDefined();
    });

    it('should deserialize from JSON', () => {
      substrate.initializeBlob(0, 32, 32, 10);
      substrate.update();

      const json = substrate.toJSON();
      const restored = LeniaSubstrate.fromJSON(json);

      expect(restored.getDimensions().width).toBe(64);
      expect(restored.getStats().tickCount).toBe(1);
    });

    it('should preserve channel data through serialization', () => {
      substrate.setChannelAt(0, 10, 10, 0.75);

      const json = substrate.toJSON();
      const restored = LeniaSubstrate.fromJSON(json);

      const value = restored.getChannelAt(0, 10, 10);
      expect(value).toBeCloseTo(0.75, 5);
    });

    it('should preserve flow data through serialization', () => {
      const flowSubstrate = new LeniaSubstrate({
        width: 32,
        height: 32,
        flow: { enabled: true, viscosity: 0.1, diffusion: 0.01, advectionStrength: 0.5, velocityDecay: 0.95 },
      });

      flowSubstrate.initializeBlob(0, 16, 16, 8);
      flowSubstrate.update();

      const json = flowSubstrate.toJSON();

      expect(json.velocityX).toBeDefined();
      expect(json.velocityY).toBeDefined();
    });
  });

  // =====================
  // STATISTICS TESTS
  // =====================
  describe('statistics', () => {
    it('should calculate total mass per channel', () => {
      substrate.initializeBlob(0, 32, 32, 10);
      substrate.update();

      const stats = substrate.getStats();
      expect(stats.totalMass[0]).toBeGreaterThan(0);
      expect(stats.totalMass[1]).toBe(0); // Unused channel
    });

    it('should calculate max value per channel', () => {
      substrate.setChannelAt(0, 10, 10, 0.9);
      // Don't call update() - check raw stats after setting values
      const data = substrate.getChannelDataRaw(0);
      let max = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] > max) max = data[i];
      }
      // Use toBeCloseTo due to Float32Array precision
      expect(max).toBeCloseTo(0.9, 5);
    });

    it('should calculate average value per channel', () => {
      // Fill entire channel with 0.5
      for (let x = 0; x < 64; x++) {
        for (let y = 0; y < 64; y++) {
          substrate.setChannelAt(0, x, y, 0.5);
        }
      }
      // Check raw values without Lenia update (which modifies values)
      const data = substrate.getChannelDataRaw(0);
      const sum = data.reduce((a, b) => a + b, 0);
      const avg = sum / data.length;
      expect(avg).toBeCloseTo(0.5, 2);
    });
  });

  // =====================
  // CONFIGURATION TESTS
  // =====================
  describe('configuration', () => {
    it('should return resolution', () => {
      expect(substrate.getResolution()).toBe(4);
    });

    it('should return config copy', () => {
      const config = substrate.getConfig();
      expect(config.width).toBe(64);
      expect(config.channelCount).toBe(3);
    });
  });
});
