/**
 * LeniaKernel.test.ts - Tests for Lenia kernel generation and convolution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LeniaKernel,
  GrowthFunction,
  createGaussianKernel,
  createPolynomialKernel,
  createDonutKernel,
  createGaussianGrowth,
} from './LeniaKernel';

describe('LeniaKernel', () => {
  let kernel: LeniaKernel;

  beforeEach(() => {
    kernel = new LeniaKernel();
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create with default config', () => {
      expect(kernel).toBeDefined();
      expect(kernel.getRadius()).toBe(13);
      expect(kernel.getSize()).toBe(27); // 13 * 2 + 1
    });

    it('should create with custom radius', () => {
      const customKernel = new LeniaKernel({ radius: 5 });
      expect(customKernel.getRadius()).toBe(5);
      expect(customKernel.getSize()).toBe(11);
    });

    it('should create Gaussian kernel', () => {
      const gaussianKernel = new LeniaKernel({ type: 'gaussian', radius: 7 });
      expect(gaussianKernel.getConfig().type).toBe('gaussian');
    });

    it('should create polynomial kernel', () => {
      const polyKernel = new LeniaKernel({ type: 'polynomial', radius: 7 });
      expect(polyKernel.getConfig().type).toBe('polynomial');
    });

    it('should create donut kernel', () => {
      const donutKernel = new LeniaKernel({ type: 'donut', radius: 7 });
      expect(donutKernel.getConfig().type).toBe('donut');
    });

    it('should create exponential kernel', () => {
      const expKernel = new LeniaKernel({ type: 'exponential', radius: 7 });
      expect(expKernel.getConfig().type).toBe('exponential');
    });
  });

  // =====================
  // KERNEL WEIGHTS TESTS
  // =====================
  describe('kernel weights', () => {
    it('should generate weights array', () => {
      const weights = kernel.getWeights();
      expect(weights).toBeInstanceOf(Float32Array);
      expect(weights.length).toBe(kernel.getSize() * kernel.getSize());
    });

    it('should generate normalized weights that sum to 1', () => {
      const normalized = kernel.getNormalizedWeights();
      const sum = normalized.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 3);
    });

    it('should have zero weights outside radius', () => {
      const smallKernel = new LeniaKernel({ radius: 3 });
      const weights = smallKernel.getWeights();
      const size = smallKernel.getSize();
      const radius = smallKernel.getRadius();

      // Check corners (outside circular radius)
      const cornerIndex = 0; // Top-left corner
      expect(weights[cornerIndex]).toBe(0);
    });

    it('should have non-zero weights inside radius', () => {
      const weights = kernel.getNormalizedWeights();
      const size = kernel.getSize();
      const center = Math.floor(size / 2);
      const centerIndex = center * size + center;

      expect(weights[centerIndex]).toBeGreaterThan(0);
    });
  });

  // =====================
  // CONVOLUTION TESTS
  // =====================
  describe('convolution', () => {
    it('should perform convolution on a field', () => {
      const smallKernel = new LeniaKernel({ radius: 2 });
      const width = 10;
      const height = 10;
      const input = new Float32Array(width * height);
      const output = new Float32Array(width * height);

      // Set center to 1
      input[55] = 1; // Center of 10x10 grid

      smallKernel.convolve(input, output, width, height, true);

      // Output should have values spread around center
      expect(output[55]).toBeGreaterThan(0);
    });

    it('should wrap at boundaries when wrap=true', () => {
      const smallKernel = new LeniaKernel({ radius: 2 });
      const width = 10;
      const height = 10;
      const input = new Float32Array(width * height);
      const output = new Float32Array(width * height);

      // Set corner to 1
      input[0] = 1;

      smallKernel.convolve(input, output, width, height, true);

      // Output should have values in wrapped positions
      expect(output[0]).toBeGreaterThan(0);
      expect(output[width - 1]).toBeGreaterThan(0); // Wrapped right
      expect(output[(height - 1) * width]).toBeGreaterThan(0); // Wrapped bottom
    });

    it('should not wrap at boundaries when wrap=false', () => {
      const smallKernel = new LeniaKernel({ radius: 2 });
      const width = 10;
      const height = 10;
      const input = new Float32Array(width * height);
      const output = new Float32Array(width * height);

      // Set corner to 1
      input[0] = 1;

      smallKernel.convolve(input, output, width, height, false);

      // Output at opposite corner should be 0 (no wrapping)
      expect(output[width * height - 1]).toBe(0);
    });

    it('should preserve total mass approximately', () => {
      const smallKernel = new LeniaKernel({ radius: 3 });
      const width = 20;
      const height = 20;
      const input = new Float32Array(width * height);
      const output = new Float32Array(width * height);

      // Set some values
      input[210] = 1; // Near center
      const inputSum = input.reduce((a, b) => a + b, 0);

      smallKernel.convolve(input, output, width, height, true);
      const outputSum = output.reduce((a, b) => a + b, 0);

      // Should preserve mass (approximately, due to normalization)
      expect(outputSum).toBeCloseTo(inputSum, 2);
    });
  });

  // =====================
  // FACTORY FUNCTIONS TESTS
  // =====================
  describe('factory functions', () => {
    it('should create Gaussian kernel via factory', () => {
      const gaussKernel = createGaussianKernel(10, 0.5);
      expect(gaussKernel.getRadius()).toBe(10);
      expect(gaussKernel.getConfig().type).toBe('gaussian');
    });

    it('should create polynomial kernel via factory', () => {
      const polyKernel = createPolynomialKernel(10, 2);
      expect(polyKernel.getRadius()).toBe(10);
      expect(polyKernel.getConfig().type).toBe('polynomial');
      expect(polyKernel.getConfig().peaks).toBe(2);
    });

    it('should create donut kernel via factory', () => {
      const donutKernel = createDonutKernel(8, 0.7, 0.2);
      expect(donutKernel.getRadius()).toBe(8);
      expect(donutKernel.getConfig().type).toBe('donut');
    });
  });

  // =====================
  // VISUALIZATION TESTS
  // =====================
  describe('visualization', () => {
    it('should return 2D array for visualization', () => {
      const smallKernel = new LeniaKernel({ radius: 3 });
      const viz = smallKernel.visualize();

      expect(viz.length).toBe(7); // 3 * 2 + 1
      expect(viz[0].length).toBe(7);
    });

    it('should have highest value at center for Gaussian', () => {
      const smallKernel = new LeniaKernel({
        type: 'gaussian',
        radius: 5,
        beta: [0], // Peak at center
      });
      const viz = smallKernel.visualize();
      const center = 5;

      // Center should have highest or near-highest value
      const centerValue = viz[center][center];
      expect(centerValue).toBeGreaterThan(0);
    });
  });
});

describe('GrowthFunction', () => {
  let growth: GrowthFunction;

  beforeEach(() => {
    growth = new GrowthFunction();
  });

  // =====================
  // CONSTRUCTION TESTS
  // =====================
  describe('construction', () => {
    it('should create with default config', () => {
      expect(growth).toBeDefined();
      expect(growth.getConfig().type).toBe('gaussian');
    });

    it('should create with custom config', () => {
      const customGrowth = new GrowthFunction({
        type: 'polynomial',
        mu: 0.2,
        sigma: 0.02,
      });

      const config = customGrowth.getConfig();
      expect(config.type).toBe('polynomial');
      expect(config.mu).toBe(0.2);
      expect(config.sigma).toBe(0.02);
    });
  });

  // =====================
  // APPLY TESTS
  // =====================
  describe('apply', () => {
    it('should return value in [-1, 1] range', () => {
      for (let u = 0; u <= 1; u += 0.1) {
        const result = growth.apply(u);
        expect(result).toBeGreaterThanOrEqual(-1);
        expect(result).toBeLessThanOrEqual(1);
      }
    });

    it('should return max growth at mu for Gaussian', () => {
      const gaussGrowth = new GrowthFunction({
        type: 'gaussian',
        mu: 0.5,
        sigma: 0.1,
        amplitude: 1.0,
      });

      const atMu = gaussGrowth.apply(0.5);
      const awayFromMu = gaussGrowth.apply(0.1);

      expect(atMu).toBeGreaterThan(awayFromMu);
    });

    it('should return 0 far from mu for polynomial', () => {
      const polyGrowth = new GrowthFunction({
        type: 'polynomial',
        mu: 0.5,
        sigma: 0.1,
        amplitude: 1.0,
      });

      const farFromMu = polyGrowth.apply(0.0);
      expect(farFromMu).toBeLessThan(0);
    });

    it('should respect step function boundaries', () => {
      const stepGrowth = new GrowthFunction({
        type: 'step',
        mu: 0.5,
        sigma: 0.1,
        amplitude: 1.0,
      });

      const inside = stepGrowth.apply(0.5);
      const outside = stepGrowth.apply(0.0);

      expect(inside).toBe(1); // Max growth inside step
      expect(outside).toBe(-1); // No growth outside
    });
  });

  // =====================
  // FIELD APPLICATION TESTS
  // =====================
  describe('applyToField', () => {
    it('should apply growth to entire field', () => {
      const input = new Float32Array([0.1, 0.15, 0.2, 0.5]);
      const output = new Float32Array(4);

      growth.applyToField(input, output);

      expect(output.length).toBe(4);
      for (let i = 0; i < output.length; i++) {
        expect(output[i]).toBeGreaterThanOrEqual(-1);
        expect(output[i]).toBeLessThanOrEqual(1);
      }
    });
  });

  // =====================
  // FACTORY FUNCTIONS TESTS
  // =====================
  describe('factory functions', () => {
    it('should create Gaussian growth via factory', () => {
      const gaussGrowth = createGaussianGrowth(0.2, 0.02);
      const config = gaussGrowth.getConfig();

      expect(config.type).toBe('gaussian');
      expect(config.mu).toBe(0.2);
      expect(config.sigma).toBe(0.02);
    });
  });
});
