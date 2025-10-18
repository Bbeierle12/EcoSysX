import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './test/setup.js',
    include: ['src/**/*.test.{js,jsx,ts,tsx}', 'packages/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/dist/**',
        '**/build/**'
      ]
    }
  },
});