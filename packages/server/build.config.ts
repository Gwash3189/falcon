import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
    inlineDependencies: true,
  },
  externals: [
    'hono',
    '@hono/node-server',
    'drizzle-orm',
    'drizzle-orm/postgres-js',
    'postgres',
    'zod',
    'ioredis',
  ],
});
