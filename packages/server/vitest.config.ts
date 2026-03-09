import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @falcon/shared from source during tests (no build step needed)
      '@falcon/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  test: {
    name: 'server',
    environment: 'node',
    setupFiles: ['./tests-setup.ts'],
  },
});
