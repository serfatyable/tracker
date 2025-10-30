import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@app': path.resolve(__dirname, './app'),
      '@components': path.resolve(__dirname, './components'),
      '@lib': path.resolve(__dirname, './lib'),
      '@types': path.resolve(__dirname, './types'),
      '@i18n': path.resolve(__dirname, './i18n'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary'],
      // Coverage thresholds - tests will fail if coverage is below these values
      // Current baseline: Set to current coverage levels to prevent regression
      // Target: Gradually increase to 80% as specified in CLAUDE.md
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
      // Files to exclude from coverage
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.{js,ts}',
        '**/types/**',
        '**/*.d.ts',
        'coverage/**',
        '.next/**',
        // Config files
        'next.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        'eslint.config.mjs',
        'vitest.config.ts',
        // Sentry config (instrumentation, no logic to test)
        'instrumentation.ts',
        'sentry.*.config.ts',
        // Test setup
        'test/setup.ts',
      ],
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});
