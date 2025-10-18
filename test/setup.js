/**
 * Vitest Setup File
 * 
 * Global setup for all test files.
 * Runs before each test file.
 */

import { expect, afterEach } from 'vitest';

// Extend Vitest's expect with custom matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Mock console methods to keep test output clean (optional)
global.console = {
  ...console,
  // Uncomment to suppress specific console methods during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};