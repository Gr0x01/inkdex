import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node', // Use 'jsdom' for React component tests
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'scripts', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        '.next',
        '**/*.stories.{ts,tsx}',
        '**/*.d.ts',
        'scripts/**',
        'e2e/**',
        'vitest.config.ts',
        'vitest.setup.ts',
      ],
    },
    // Increase timeout for integration tests
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
