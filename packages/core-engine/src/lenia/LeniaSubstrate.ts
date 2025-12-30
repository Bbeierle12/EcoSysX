/**
 * LeniaSubstrate.ts - Flow-Lenia cellular substrate
 *
 * Implements a continuous cellular automaton with multiple channels,
 * flow dynamics, and agent interaction capabilities.
 */

import {
  LeniaSubstrateConfig,
  ChannelConfig,
  FlowFieldConfig,
  SubstrateSensing,
  DepositConfig,
  SubstrateStats,
  SerializedSubstrate,
  LeniaPreset,
  LENIA_PRESETS,
  DEFAULT_LENIA_CONFIG,
  LeniaChannel,
} from './types';
import { LeniaKernel, GrowthFunction } from './LeniaKernel';

// ============================================================================
// LeniaSubstrate Class
// ============================================================================

export class LeniaSubstrate {
  private config: LeniaSubstrateConfig;
  private width: number;
  private height: number;
  private cellCount: number;

  // State buffers (double-buffered for updates)
  private channels: Float32Array[];
  private channelsTemp: Float32Array[];

  // Flow field
  private velocityX: Float32Array;
  private velocityY: Float32Array;
  private velocityXTemp: Float32Array;
  private velocityYTemp: Float32Array;

  // Kernels and growth functions
  private kernels: LeniaKernel[];
  private growthFunctions: GrowthFunction[];

  // Temporary buffers for convolution
  private convolutionBuffer: Float32Array;

  // Statistics
  private stats: SubstrateStats;
  private tickCount: number = 0;

  constructor(config?: Partial<LeniaSubstrateConfig>) {
    this.config = { ...DEFAULT_LENIA_CONFIG, ...config };
    this.width = this.config.width;
    this.height = this.config.height;
    this.cellCount = this.width * this.height;

    // Initialize channel buffers
    this.channels = [];
    this.channelsTemp = [];
    for (let i = 0; i < this.config.channelCount; i++) {
      this.channels.push(new Float32Array(this.cellCount));
      this.channelsTemp.push(new Float32Array(this.cellCount));
    }

    // Initialize flow field
    this.velocityX = new Float32Array(this.cellCount);
    this.velocityY = new Float32Array(this.cellCount);
    this.velocityXTemp = new Float32Array(this.cellCount);
    this.velocityYTemp = new Float32Array(this.cellCount);

    // Initialize kernels
    this.kernels = this.config.kernels.map(kc => new LeniaKernel(kc));

    // Initialize growth functions
    this.growthFunctions = this.config.growthFunctions.map(gc => new GrowthFunction(gc));

    // Temporary buffer
    this.convolutionBuffer = new Float32Array(this.cellCount);

    // Initialize stats
    this.stats = {
      totalMass: new Array(this.config.channelCount).fill(0),
      maxValue: new Array(this.config.channelCount).fill(0),
      avgValue: new Array(this.config.channelCount).fill(0),
      flowEnergy: 0,
      updateTimeMs: 0,
      tickCount: 0,
    };
  }

  /**
   * Create substrate from preset
   */
  static fromPreset(preset: LeniaPreset, config?: Partial<LeniaSubstrateConfig>): LeniaSubstrate {
    const presetConfig = LENIA_PRESETS[preset] || {};
    const fullConfig = { ...DEFAULT_LENIA_CONFIG, ...presetConfig, ...config };
    const substrate = new LeniaSubstrate(fullConfig);

    // Initialize with preset pattern
    substrate.initializePreset(preset);

    return substrate;
  }

  /**
   * Initialize with preset pattern
   */
  private initializePreset(preset: LeniaPreset): void {
    switch (preset) {
      case 'noise':
        this.initializeNoise(0, 0.5);
        break;

      case 'blob':
        this.initializeBlob(0, this.width / 2, this.height / 2, 20);
        break;

      case 'orbium':
        this.initializeOrbium();
        break;

      case 'geminium':
        this.initializeGeminium();
        break;

      case 'empty':
      default:
        // Already initialized to zero
        break;
    }
  }

  /**
   * Initialize channel with random noise
   */
  initializeNoise(channel: number = 0, maxValue: number = 1): void {
    const buffer = this.channels[channel];
    if (!buffer) return;

    for (let i = 0; i < this.cellCount; i++) {
      buffer[i] = Math.random() * maxValue;
    }
  }

  /**
   * Initialize with a circular blob
   */
  initializeBlob(channel: number, cx: number, cy: number, radius: number): void {
    const buffer = this.channels[channel];
    if (!buffer) return;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < radius) {
          const value = 1 - (distance / radius);
          buffer[y * this.width + x] = value;
        }
      }
    }
  }

  /**
   * Initialize with Orbium pattern (classic Lenia organism)
   */
  private initializeOrbium(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = 15;

    // Create a Gaussian blob that will evolve into an Orbium
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.sqrt(dx * dx + dy * dy) / radius;

        if (r < 1) {
          const angle = Math.atan2(dy, dx);
          const asymmetry = 1 + 0.3 * Math.cos(angle); // Slight asymmetry for movement
          this.channels[0][y * this.width + x] = Math.exp(-r * r * 2) * asymmetry;
        }
      }
    }
  }

  /**
   * Initialize with Geminium pattern (dividing organism)
   */
  private initializeGeminium(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Two overlapping blobs
    this.initializeBlob(0, cx - 10, cy, 12);
    this.initializeBlob(0, cx + 10, cy, 12);
  }

  // =====================
  // Update Methods
  // =====================

  /**
   * Main update step - advances the substrate by one tick
   */
  update(): void {
    const startTime = performance.now();

    for (let step = 0; step < this.config.stepsPerTick; step++) {
      this.step();
    }

    this.tickCount++;
    this.updateStatistics();

    this.stats.updateTimeMs = performance.now() - startTime;
    this.stats.tickCount = this.tickCount;
  }

  /**
   * Single Lenia step
   */
  private step(): void {
    const dt = this.config.dt;

    // Update each channel
    for (let c = 0; c < this.config.channelCount; c++) {
      this.updateChannel(c, dt);
    }

    // Update flow field if enabled
    if (this.config.flow.enabled) {
      this.updateFlowField(dt);
    }

    // Swap buffers
    this.swapBuffers();
  }

  /**
   * Update a single channel
   */
  private updateChannel(channelIndex: number, dt: number): void {
    const channelConfig = this.config.channels[channelIndex];
    if (!channelConfig) return;

    const input = this.channels[channelIndex];
    const output = this.channelsTemp[channelIndex];

    // Get kernel and growth function
    const kernel = this.kernels[channelConfig.kernelIndex] || this.kernels[0];
    const growth = this.growthFunctions[channelConfig.growthIndex] || this.growthFunctions[0];

    // Perform convolution
    kernel.convolve(input, this.convolutionBuffer, this.width, this.height, this.config.wrapBoundary);

    // Apply growth function and update
    for (let i = 0; i < this.cellCount; i++) {
      const growthValue = growth.apply(this.convolutionBuffer[i]);
      let newValue = input[i] + growthValue * dt;

      // Apply decay
      newValue *= (1 - channelConfig.decayRate * dt);

      // Apply diffusion
      if (channelConfig.diffusionRate > 0) {
        newValue = this.applyDiffusion(input, i, newValue, channelConfig.diffusionRate * dt);
      }

      // Apply flow advection if enabled
      if (this.config.flow.enabled) {
        newValue = this.applyAdvection(input, i, newValue, dt);
      }

      // Clamp to valid range
      output[i] = Math.max(channelConfig.minValue, Math.min(channelConfig.maxValue, newValue));
    }
  }

  /**
   * Apply diffusion to a cell
   */
  private applyDiffusion(field: Float32Array, index: number, value: number, rate: number): number {
    const x = index % this.width;
    const y = Math.floor(index / this.width);

    // Get neighbor values
    const neighbors = this.getNeighborValues(field, x, y);
    const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;

    // Blend toward neighbor average
    return value + (avgNeighbor - value) * rate;
  }

  /**
   * Apply flow advection
   */
  private applyAdvection(field: Float32Array, index: number, value: number, dt: number): number {
    const strength = this.config.flow.advectionStrength;
    const vx = this.velocityX[index] * strength * dt;
    const vy = this.velocityY[index] * strength * dt;

    if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001) {
      return value;
    }

    const x = index % this.width;
    const y = Math.floor(index / this.width);

    // Sample from upstream position (semi-Lagrangian)
    const upstreamValue = this.sampleBilinear(field, x - vx, y - vy);

    return value * (1 - strength) + upstreamValue * strength;
  }

  /**
   * Update flow field based on density gradients
   */
  private updateFlowField(dt: number): void {
    const flow = this.config.flow;
    const primaryChannel = this.channels[0];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;

        // Calculate density gradient
        const gradient = this.calculateGradient(primaryChannel, x, y);

        // Update velocity based on gradient (mass flows down gradient)
        let vx = this.velocityX[index];
        let vy = this.velocityY[index];

        vx -= gradient.x * dt;
        vy -= gradient.y * dt;

        // Apply viscosity (damping)
        vx *= flow.velocityDecay;
        vy *= flow.velocityDecay;

        // Diffuse velocity field
        if (flow.viscosity > 0) {
          const neighborVx = this.getNeighborValues(this.velocityX, x, y);
          const neighborVy = this.getNeighborValues(this.velocityY, x, y);
          const avgVx = neighborVx.reduce((a, b) => a + b, 0) / neighborVx.length;
          const avgVy = neighborVy.reduce((a, b) => a + b, 0) / neighborVy.length;

          vx = vx * (1 - flow.viscosity) + avgVx * flow.viscosity;
          vy = vy * (1 - flow.viscosity) + avgVy * flow.viscosity;
        }

        this.velocityXTemp[index] = vx;
        this.velocityYTemp[index] = vy;
      }
    }
  }

  /**
   * Swap double buffers
   */
  private swapBuffers(): void {
    // Swap channel buffers
    for (let c = 0; c < this.config.channelCount; c++) {
      const temp = this.channels[c];
      this.channels[c] = this.channelsTemp[c];
      this.channelsTemp[c] = temp;
    }

    // Swap velocity buffers
    if (this.config.flow.enabled) {
      let temp = this.velocityX;
      this.velocityX = this.velocityXTemp;
      this.velocityXTemp = temp;

      temp = this.velocityY;
      this.velocityY = this.velocityYTemp;
      this.velocityYTemp = temp;
    }
  }

  // =====================
  // Agent Interaction
  // =====================

  /**
   * Sense substrate state at a world position
   */
  senseAt(worldX: number, worldY: number): SubstrateSensing {
    // Convert world coordinates to cell coordinates
    const cellX = worldX * this.config.resolution;
    const cellY = worldY * this.config.resolution;

    // Sample channel values
    const channelValues: number[] = [];
    const gradientX: number[] = [];
    const gradientY: number[] = [];

    for (let c = 0; c < this.config.channelCount; c++) {
      const value = this.sampleBilinear(this.channels[c], cellX, cellY);
      channelValues.push(value);

      const grad = this.calculateGradientAt(this.channels[c], cellX, cellY);
      gradientX.push(grad.x);
      gradientY.push(grad.y);
    }

    // Sample flow velocity
    const flowVx = this.sampleBilinear(this.velocityX, cellX, cellY);
    const flowVy = this.sampleBilinear(this.velocityY, cellX, cellY);

    return {
      position: { x: worldX, y: worldY },
      channels: channelValues,
      gradient: { x: gradientX, y: gradientY },
      flowVelocity: { x: flowVx, y: flowVy },
    };
  }

  /**
   * Deposit value at a world position
   */
  depositAt(worldX: number, worldY: number, deposit: DepositConfig): void {
    const cellX = worldX * this.config.resolution;
    const cellY = worldY * this.config.resolution;

    const { channel, amount, radius, falloff } = deposit;
    if (channel < 0 || channel >= this.config.channelCount) return;

    const buffer = this.channels[channel];
    const channelConfig = this.config.channels[channel];
    const radiusCells = radius * this.config.resolution;

    for (let dy = -radiusCells; dy <= radiusCells; dy++) {
      for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > radiusCells) continue;

        let x = Math.floor(cellX + dx);
        let y = Math.floor(cellY + dy);

        if (this.config.wrapBoundary) {
          x = ((x % this.width) + this.width) % this.width;
          y = ((y % this.height) + this.height) % this.height;
        } else {
          if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
        }

        // Calculate falloff factor
        let factor: number;
        switch (falloff) {
          case 'linear':
            factor = 1 - (distance / radiusCells);
            break;
          case 'gaussian':
            factor = Math.exp(-(distance * distance) / (2 * (radiusCells / 2) * (radiusCells / 2)));
            break;
          case 'constant':
          default:
            factor = 1;
        }

        const index = y * this.width + x;
        const newValue = buffer[index] + amount * factor;
        buffer[index] = Math.max(channelConfig.minValue, Math.min(channelConfig.maxValue, newValue));
      }
    }
  }

  /**
   * Get channel value at cell position
   */
  getChannelAt(channel: number, x: number, y: number): number {
    if (channel < 0 || channel >= this.config.channelCount) return 0;

    const buffer = this.channels[channel];
    x = Math.floor(x);
    y = Math.floor(y);

    if (this.config.wrapBoundary) {
      x = ((x % this.width) + this.width) % this.width;
      y = ((y % this.height) + this.height) % this.height;
    } else {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    }

    return buffer[y * this.width + x];
  }

  /**
   * Set channel value at cell position
   */
  setChannelAt(channel: number, x: number, y: number, value: number): void {
    if (channel < 0 || channel >= this.config.channelCount) return;

    const buffer = this.channels[channel];
    const config = this.config.channels[channel];

    x = Math.floor(x);
    y = Math.floor(y);

    if (this.config.wrapBoundary) {
      x = ((x % this.width) + this.width) % this.width;
      y = ((y % this.height) + this.height) % this.height;
    } else {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    }

    buffer[y * this.width + x] = Math.max(config.minValue, Math.min(config.maxValue, value));
  }

  // =====================
  // Helper Methods
  // =====================

  /**
   * Bilinear interpolation sampling
   */
  private sampleBilinear(field: Float32Array, x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;

    const v00 = this.getWrappedValue(field, x0, y0);
    const v10 = this.getWrappedValue(field, x0 + 1, y0);
    const v01 = this.getWrappedValue(field, x0, y0 + 1);
    const v11 = this.getWrappedValue(field, x0 + 1, y0 + 1);

    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;

    return v0 * (1 - fy) + v1 * fy;
  }

  /**
   * Get value with boundary wrapping
   */
  private getWrappedValue(field: Float32Array, x: number, y: number): number {
    if (this.config.wrapBoundary) {
      x = ((x % this.width) + this.width) % this.width;
      y = ((y % this.height) + this.height) % this.height;
    } else {
      x = Math.max(0, Math.min(this.width - 1, x));
      y = Math.max(0, Math.min(this.height - 1, y));
    }
    return field[y * this.width + x];
  }

  /**
   * Get neighbor values for a cell
   */
  private getNeighborValues(field: Float32Array, x: number, y: number): number[] {
    return [
      this.getWrappedValue(field, x - 1, y),
      this.getWrappedValue(field, x + 1, y),
      this.getWrappedValue(field, x, y - 1),
      this.getWrappedValue(field, x, y + 1),
    ];
  }

  /**
   * Calculate gradient at cell position
   */
  private calculateGradient(field: Float32Array, x: number, y: number): { x: number; y: number } {
    const left = this.getWrappedValue(field, x - 1, y);
    const right = this.getWrappedValue(field, x + 1, y);
    const up = this.getWrappedValue(field, x, y - 1);
    const down = this.getWrappedValue(field, x, y + 1);

    return {
      x: (right - left) / 2,
      y: (down - up) / 2,
    };
  }

  /**
   * Calculate gradient at arbitrary position (with interpolation)
   */
  private calculateGradientAt(field: Float32Array, x: number, y: number): { x: number; y: number } {
    const epsilon = 0.5;
    const left = this.sampleBilinear(field, x - epsilon, y);
    const right = this.sampleBilinear(field, x + epsilon, y);
    const up = this.sampleBilinear(field, x, y - epsilon);
    const down = this.sampleBilinear(field, x, y + epsilon);

    return {
      x: (right - left) / (2 * epsilon),
      y: (down - up) / (2 * epsilon),
    };
  }

  /**
   * Update statistics
   */
  private updateStatistics(): void {
    for (let c = 0; c < this.config.channelCount; c++) {
      const buffer = this.channels[c];
      let sum = 0;
      let max = 0;

      for (let i = 0; i < this.cellCount; i++) {
        sum += buffer[i];
        if (buffer[i] > max) max = buffer[i];
      }

      this.stats.totalMass[c] = sum;
      this.stats.maxValue[c] = max;
      this.stats.avgValue[c] = sum / this.cellCount;
    }

    // Calculate flow energy
    if (this.config.flow.enabled) {
      let energy = 0;
      for (let i = 0; i < this.cellCount; i++) {
        const vx = this.velocityX[i];
        const vy = this.velocityY[i];
        energy += vx * vx + vy * vy;
      }
      this.stats.flowEnergy = energy / 2;
    }
  }

  // =====================
  // Accessors
  // =====================

  /**
   * Get channel data (read-only copy)
   */
  getChannelData(channel: number): Float32Array {
    if (channel < 0 || channel >= this.config.channelCount) {
      return new Float32Array(0);
    }
    return new Float32Array(this.channels[channel]);
  }

  /**
   * Get raw channel data (for rendering - use with caution)
   */
  getChannelDataRaw(channel: number): Float32Array {
    if (channel < 0 || channel >= this.config.channelCount) {
      return new Float32Array(0);
    }
    return this.channels[channel];
  }

  /**
   * Get flow velocity data
   */
  getFlowData(): { x: Float32Array; y: Float32Array } {
    return {
      x: new Float32Array(this.velocityX),
      y: new Float32Array(this.velocityY),
    };
  }

  /**
   * Get dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Get resolution (cells per world unit)
   */
  getResolution(): number {
    return this.config.resolution;
  }

  /**
   * Get statistics
   */
  getStats(): SubstrateStats {
    return { ...this.stats };
  }

  /**
   * Get configuration
   */
  getConfig(): LeniaSubstrateConfig {
    return { ...this.config };
  }

  /**
   * Clear all channels to zero
   */
  clear(): void {
    for (const channel of this.channels) {
      channel.fill(0);
    }
    this.velocityX.fill(0);
    this.velocityY.fill(0);
    this.tickCount = 0;
  }

  // =====================
  // Serialization
  // =====================

  /**
   * Serialize substrate state
   */
  toJSON(): SerializedSubstrate {
    const channelData: number[][] = [];
    for (const channel of this.channels) {
      channelData.push(Array.from(channel));
    }

    return {
      config: this.config,
      channels: channelData,
      velocityX: this.config.flow.enabled ? Array.from(this.velocityX) : undefined,
      velocityY: this.config.flow.enabled ? Array.from(this.velocityY) : undefined,
      stats: { ...this.stats },
    };
  }

  /**
   * Deserialize substrate state
   */
  static fromJSON(data: SerializedSubstrate): LeniaSubstrate {
    const substrate = new LeniaSubstrate(data.config);

    // Restore channel data
    for (let c = 0; c < data.channels.length && c < substrate.channels.length; c++) {
      substrate.channels[c].set(data.channels[c]);
    }

    // Restore flow data
    if (data.velocityX && data.velocityY) {
      substrate.velocityX.set(data.velocityX);
      substrate.velocityY.set(data.velocityY);
    }

    // Restore stats
    substrate.stats = { ...data.stats };
    substrate.tickCount = data.stats.tickCount;

    return substrate;
  }
}

export default LeniaSubstrate;
