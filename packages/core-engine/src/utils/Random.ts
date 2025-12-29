/**
 * Random.ts - Seeded random number generator for deterministic simulations
 *
 * Uses a Mulberry32 PRNG algorithm for fast, deterministic pseudo-randomness.
 */

export class SeededRandom {
  private state: number;
  private initialSeed: number;

  constructor(seed?: number) {
    this.initialSeed = seed ?? Date.now();
    this.state = this.initialSeed;
  }

  /**
   * Get the current seed
   */
  getSeed(): number {
    return this.initialSeed;
  }

  /**
   * Reset to initial seed
   */
  reset(): void {
    this.state = this.initialSeed;
  }

  /**
   * Set a new seed and reset state
   */
  setSeed(seed: number): void {
    this.initialSeed = seed;
    this.state = seed;
  }

  /**
   * Generate a random number in [0, 1)
   * Uses Mulberry32 algorithm
   */
  random(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate a random integer in [min, max] (inclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a random float in [min, max)
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  /**
   * Generate a random boolean with given probability of true
   */
  randomBool(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(this.random() * array.length)];
  }

  /**
   * Shuffle an array in place (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Generate a random angle in radians [0, 2π)
   */
  randomAngle(): number {
    return this.random() * 2 * Math.PI;
  }

  /**
   * Generate a random position within bounds
   */
  randomPosition(width: number, height: number): { x: number; y: number } {
    return {
      x: this.random() * width,
      y: this.random() * height,
    };
  }

  /**
   * Generate a Gaussian (normal) distributed random number
   * Uses Box-Muller transform
   */
  gaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Create a snapshot of current state for later restoration
   */
  getState(): number {
    return this.state;
  }

  /**
   * Restore state from a snapshot
   */
  setState(state: number): void {
    this.state = state;
  }
}

/**
 * Global random instance (non-deterministic by default)
 */
let globalRandom = new SeededRandom();

/**
 * Get the global random instance
 */
export function getRandom(): SeededRandom {
  return globalRandom;
}

/**
 * Set a global seed for deterministic mode
 */
export function setGlobalSeed(seed: number): void {
  globalRandom.setSeed(seed);
}

/**
 * Reset global random to initial seed
 */
export function resetGlobalRandom(): void {
  globalRandom.reset();
}

/**
 * Create a new isolated random instance
 */
export function createRandom(seed?: number): SeededRandom {
  return new SeededRandom(seed);
}
