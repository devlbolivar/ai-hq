import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'domain',
          environment: 'node',
          include: ['packages/domain/test/**/*.test.ts'],
        },
      },
      {
        extends: './apps/web/vite.config.ts',
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['apps/web/test/**/*.test.{ts,tsx}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/server/src/**/*.ts'],
      thresholds: {
        lines: 80,
        'packages/domain/src/**': { lines: 95 },
      },
    },
  },
});
