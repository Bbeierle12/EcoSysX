/**
 * Test setup file for GenesisX core-engine
 * Provides global test utilities and configuration
 */

import { beforeEach, afterEach, vi } from 'vitest';

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Creates a seeded random number generator for reproducible tests.
 * Uses the mulberry32 algorithm (same as World.ts).
 */
export function createSeededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Make seeded RNG available globally in tests
declare global {
  function createSeededRng(seed: number): () => number;
}

(globalThis as unknown as { createSeededRng: typeof createSeededRng }).createSeededRng = createSeededRng;
