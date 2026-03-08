import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/shared/vitest.config.ts',
      'packages/server/vitest.config.ts',
      'packages/cli/vitest.config.ts',
      'packages/sdk-node/vitest.config.ts',
      'packages/web/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
