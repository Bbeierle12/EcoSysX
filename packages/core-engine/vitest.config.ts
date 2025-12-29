import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    isolate: true,
    testTimeout: 5000,
    hookTimeout: 10000,
    reporters: ['verbose'],
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@genetics': resolve(__dirname, './src/genetics'),
      '@neural': resolve(__dirname, './src/neural'),
      '@events': resolve(__dirname, './src/events'),
      '@world': resolve(__dirname, './src/world'),
      '@species': resolve(__dirname, './src/species'),
      '@engine': resolve(__dirname, './src/engine'),
      '@lineage': resolve(__dirname, './src/lineage'),
    },
  },
});
