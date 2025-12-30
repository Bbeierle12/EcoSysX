/**
 * LeniaKernel.ts - Kernel generation and convolution for Lenia
 *
 * Implements various kernel types (Gaussian, polynomial, etc.) for
 * continuous cellular automaton dynamics.
 */

import {
  LeniaKernelConfig,
  GrowthFunctionConfig,
  KernelType,
  GrowthFunctionType,
  DEFAULT_KERNEL_CONFIG,
  DEFAULT_GROWTH_CONFIG,
} from './types';

// ============================================================================
// LeniaKernel Class
// ============================================================================

export class LeniaKernel {
  private config: LeniaKernelConfig;
  private weights: Float32Array;
  private size: number;
  private normalizedWeights: Float32Array;

  constructor(config?: Partial<LeniaKernelConfig>) {
    this.config = { ...DEFAULT_KERNEL_CONFIG, ...config };
    this.size = this.config.radius * 2 + 1;
    this.weights = new Float32Array(this.size * this.size);
    this.normalizedWeights = new Float32Array(this.size * this.size);

    this.generateKernel();
  }

  /**
   * Generate kernel weights based on configuration
   */
  private generateKernel(): void {
    const { type, radius, peaks, beta, alpha } = this.config;

    if (type === 'custom' && this.config.weights) {
      this.weights.set(this.config.weights);
    } else {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const distance = Math.sqrt(dx * dx + dy * dy) / radius;
          const index = (dy + radius) * this.size + (dx + radius);

          if (distance > 1) {
            this.weights[index] = 0;
          } else {
            this.weights[index] = this.calculateKernelValue(type, distance, peaks, beta, alpha);
          }
        }
      }
    }

    // Normalize weights
    this.normalizeWeights();
  }

  /**
   * Calculate kernel value at a given distance
   */
  private calculateKernelValue(
    type: KernelType,
    distance: number,
    peaks: number,
    beta: number[],
    alpha: number
  ): number {
    switch (type) {
      case 'gaussian':
        return this.gaussianKernel(distance, beta[0] || 0.5, alpha);

      case 'polynomial':
        return this.polynomialKernel(distance, peaks, beta, alpha);

      case 'exponential':
        return this.exponentialKernel(distance, beta[0] || 0.5, alpha);

      case 'donut':
        return this.donutKernel(distance, beta[0] || 0.5, beta[1] || 0.3);

      default:
        return this.gaussianKernel(distance, beta[0] || 0.5, alpha);
    }
  }

  /**
   * Gaussian kernel: exp(-(r - peak)^2 / (2 * sigma^2))
   */
  private gaussianKernel(r: number, peak: number, alpha: number): number {
    const sigma = 1.0 / alpha;
    const diff = r - peak;
    return Math.exp(-(diff * diff) / (2 * sigma * sigma));
  }

  /**
   * Polynomial kernel (original Lenia): shell function
   */
  private polynomialKernel(r: number, peaks: number, beta: number[], alpha: number): number {
    if (peaks === 1) {
      // Single peak polynomial
      const peak = beta[0] || 0.5;
      const x = Math.abs(r - peak) * alpha;
      return Math.max(0, 1 - x * x);
    }

    // Multi-ring kernel
    let sum = 0;
    for (let p = 0; p < Math.min(peaks, beta.length); p++) {
      const x = Math.abs(r - beta[p]) * alpha;
      sum += Math.max(0, 1 - x * x);
    }
    return sum / peaks;
  }

  /**
   * Exponential decay kernel
   */
  private exponentialKernel(r: number, peak: number, alpha: number): number {
    const diff = Math.abs(r - peak);
    return Math.exp(-alpha * diff);
  }

  /**
   * Donut/ring kernel
   */
  private donutKernel(r: number, center: number, width: number): number {
    const diff = Math.abs(r - center);
    if (diff > width) return 0;
    return 1 - (diff / width);
  }

  /**
   * Normalize weights so they sum to 1
   */
  private normalizeWeights(): void {
    let sum = 0;
    for (let i = 0; i < this.weights.length; i++) {
      sum += this.weights[i];
    }

    if (sum > 0) {
      for (let i = 0; i < this.weights.length; i++) {
        this.normalizedWeights[i] = this.weights[i] / sum;
      }
    } else {
      this.normalizedWeights.fill(0);
    }
  }

  /**
   * Perform convolution on a field
   */
  convolve(
    input: Float32Array,
    output: Float32Array,
    width: number,
    height: number,
    wrap: boolean = true
  ): void {
    const radius = this.config.radius;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            let sx = x + kx;
            let sy = y + ky;

            if (wrap) {
              sx = ((sx % width) + width) % width;
              sy = ((sy % height) + height) % height;
            } else {
              if (sx < 0 || sx >= width || sy < 0 || sy >= height) {
                continue;
              }
            }

            const kernelIdx = (ky + radius) * this.size + (kx + radius);
            const fieldIdx = sy * width + sx;
            sum += input[fieldIdx] * this.normalizedWeights[kernelIdx];
          }
        }

        output[y * width + x] = sum;
      }
    }
  }

  /**
   * Get kernel weights (raw)
   */
  getWeights(): Float32Array {
    return new Float32Array(this.weights);
  }

  /**
   * Get normalized kernel weights
   */
  getNormalizedWeights(): Float32Array {
    return new Float32Array(this.normalizedWeights);
  }

  /**
   * Get kernel size (diameter)
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get kernel radius
   */
  getRadius(): number {
    return this.config.radius;
  }

  /**
   * Get configuration
   */
  getConfig(): LeniaKernelConfig {
    return { ...this.config };
  }

  /**
   * Visualize kernel as 2D array (for debugging)
   */
  visualize(): number[][] {
    const result: number[][] = [];
    for (let y = 0; y < this.size; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.size; x++) {
        row.push(this.normalizedWeights[y * this.size + x]);
      }
      result.push(row);
    }
    return result;
  }
}

// ============================================================================
// Growth Function Class
// ============================================================================

export class GrowthFunction {
  private config: GrowthFunctionConfig;

  constructor(config?: Partial<GrowthFunctionConfig>) {
    this.config = { ...DEFAULT_GROWTH_CONFIG, ...config };
  }

  /**
   * Apply growth function to convolved value
   */
  apply(convolutionValue: number): number {
    const { type, mu, sigma, amplitude } = this.config;

    let growth: number;

    switch (type) {
      case 'gaussian':
        growth = this.gaussianGrowth(convolutionValue, mu, sigma);
        break;

      case 'polynomial':
        growth = this.polynomialGrowth(convolutionValue, mu, sigma);
        break;

      case 'step':
        growth = this.stepGrowth(convolutionValue, mu, sigma);
        break;

      default:
        growth = this.gaussianGrowth(convolutionValue, mu, sigma);
    }

    // Scale to [-1, 1] range and apply amplitude
    return (growth * 2 - 1) * amplitude;
  }

  /**
   * Gaussian growth function
   */
  private gaussianGrowth(u: number, mu: number, sigma: number): number {
    const diff = u - mu;
    return Math.exp(-(diff * diff) / (2 * sigma * sigma));
  }

  /**
   * Polynomial growth function
   */
  private polynomialGrowth(u: number, mu: number, sigma: number): number {
    const x = Math.abs(u - mu) / sigma;
    return Math.max(0, 1 - x * x);
  }

  /**
   * Step growth function (Game of Life style)
   */
  private stepGrowth(u: number, mu: number, sigma: number): number {
    const lower = mu - sigma;
    const upper = mu + sigma;
    return u >= lower && u <= upper ? 1 : 0;
  }

  /**
   * Apply growth to an entire field
   */
  applyToField(
    input: Float32Array,
    output: Float32Array
  ): void {
    for (let i = 0; i < input.length; i++) {
      output[i] = this.apply(input[i]);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): GrowthFunctionConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a standard Gaussian kernel
 */
export function createGaussianKernel(radius: number = 13, peak: number = 0.5): LeniaKernel {
  return new LeniaKernel({
    type: 'gaussian',
    radius,
    peaks: 1,
    beta: [peak],
    alpha: 4,
  });
}

/**
 * Create a polynomial (Lenia-style) kernel
 */
export function createPolynomialKernel(radius: number = 13, peaks: number = 1): LeniaKernel {
  const beta: number[] = [];
  for (let i = 0; i < peaks; i++) {
    beta.push((i + 0.5) / peaks);
  }

  return new LeniaKernel({
    type: 'polynomial',
    radius,
    peaks,
    beta,
    alpha: 4,
  });
}

/**
 * Create a donut/ring kernel
 */
export function createDonutKernel(radius: number = 13, ringCenter: number = 0.7, ringWidth: number = 0.2): LeniaKernel {
  return new LeniaKernel({
    type: 'donut',
    radius,
    peaks: 1,
    beta: [ringCenter, ringWidth],
    alpha: 4,
  });
}

/**
 * Create a standard Gaussian growth function
 */
export function createGaussianGrowth(mu: number = 0.15, sigma: number = 0.015): GrowthFunction {
  return new GrowthFunction({
    type: 'gaussian',
    mu,
    sigma,
    amplitude: 1.0,
  });
}

export default LeniaKernel;
