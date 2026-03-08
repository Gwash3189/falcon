Falcon Improvement Plan

    How to Read This Plan

    Cards are grouped into phases. Cards within a phase can be worked in parallel. A phase must be complete before the next phase begins. Each card
    has acceptance criteria so you know when it's done.

    ---

    Phase 1 — Observability & Error Handling Foundation

    > These improvements unlock better debugging and set up patterns for everything else. All cards can be worked in parallel.

    ---

    CARD-001: Centralized Error Handling

    Goal: One error handler for the entire app. Controllers stop catching errors manually.

    Work:
     1. Create packages/server/src/errors.ts:

      1    export class AppError extends Error {
      2      constructor(
      3        public code: string,
      4        public status: number,
      5        message: string
      6      ) {
      7        super(message);
      8      }
      9    }
     10    export class NotFoundError extends AppError { constructor(msg) { super('NOT_FOUND', 404, msg); } }
     11    export class ConflictError extends AppError { constructor(msg) { super('CONFLICT', 409, msg); } }
     12    export class UnauthorizedError extends AppError { constructor(msg) { super('UNAUTHORIZED', 401, msg); } }
     13    export class BadRequestError extends AppError { constructor(msg) { super('BAD_REQUEST', 400, msg); } }

     2. Update packages/server/src/app.ts — add global error handler:

     1    app.onError((err, c) => {
     2      if (err instanceof AppError) {
     3        return c.json({ error: { code: err.code, message: err.message } }, err.status);
     4      }
     5      // Log full error for debugging
     6      console.error('Unhandled error:', err);
     7      return c.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, 500);
     8    });

     3. Update packages/server/src/services/flags.ts:
        - Replace isUniqueViolation() catch with throw new ConflictError('Flag already exists')

     4. Update controllers to remove try/catch blocks — let errors bubble up

    Acceptance:
     - Duplicate flag creation returns 409 with { error: { code: 'CONFLICT', ... } }
     - Missing resource returns 404 with { error: { code: 'NOT_FOUND', ... } }
     - No try/catch in controllers for error handling
     - All existing tests still pass

    ---

    CARD-002: Request Logging Middleware

    Goal: Every HTTP request is logged with method, path, status, and duration.

    Work:
     1. Create packages/server/src/middleware/logger.ts:

     1    import { createMiddleware } from 'hono/factory';
     2    export const requestLogger = createMiddleware(async (c, next) => {
     3      const start = Date.now();
     4      await next();
     5      const duration = Date.now() - start;
     6      console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`);
     7    });

     2. In packages/server/src/app.ts, add middleware at the top:

     1    app.use('*', requestLogger);

     3. Add test in packages/server/src/middleware/__tests__/logger.test.ts:
        - Spy on console.log, assert it's called with correct format

    Acceptance:
     - Every request logs: GET /health 200 12ms
     - Tests pass
     - No logging on health checks in test environment (optional: add if (config.NODE_ENV === 'test') return next())

    ---

    CARD-003: Redis Health Check

    Goal: /health returns 503 if Redis is unreachable.

    Work:
     1. Create packages/server/src/db/redis-health.ts:

     1    import type { Redis } from 'iovalkey';
     2    export async function checkRedis(redis: Redis): Promise<boolean> {
     3      try {
     4        await redis.ping();
     5        return true;
     6      } catch {
     7        return false;
     8      }
     9    }

     2. Update packages/server/src/app.ts health route:

      1    app.get('/health', async (c) => {
      2      const [dbHealthy, redisHealthy] = await Promise.all([
      3        checkDatabase(db),
      4        checkRedis(redis)
      5      ]);
      6      const timestamp = new Date().toISOString();
      7      if (dbHealthy && redisHealthy) {
      8        return c.json({ status: 'ok', timestamp }, 200);
      9      }
     10      return c.json({ status: 'unavailable', timestamp }, 503);
     11    });

     3. Update tests in packages/server/src/__tests__/health.test.ts:
        - Add test: returns 503 when Redis is down
        - Update mock Redis to support ping()

    Acceptance:
     - With Redis stopped: curl /health returns 503
     - With both healthy: returns 200
     - Tests cover all 4 combinations (db up/down × redis up/down)

    ---

    Phase 2 — Security & Stability

    > These cards protect the server from abuse and ensure clean shutdowns. Can be worked in parallel.

    ---

    CARD-004: Rate Limiting on /evaluate

    Goal: API key rate limiting on the evaluation endpoint (1000 req/min per key).

    Work:
     1. Create packages/server/src/middleware/rate-limit.ts:

      1    import { createMiddleware } from 'hono/factory';
      2    import type { Redis } from 'iovalkey';
      3    export function rateLimit(redis: Redis, windowMs: number, max: number) {
      4      return createMiddleware(async (c, next) => {
      5        const key = `ratelimit:${c.get('auth')?.keyPrefix || 'anon'}:${Date.now() - (Date.now() % windowMs)}`;
      6        const current = await redis.incr(key);
      7        if (current === 1) await redis.pexpire(key, windowMs);
      8        if (current > max) {
      9          return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
     10        }
     11        await next();
     12      });
     13    }

     2. Update packages/server/src/routes/evaluate.ts:

     1    router.post('/', rateLimit(redis, 60_000, 1000), apiKeyAuth(db), ...)

     3. Add test in packages/server/src/middleware/__tests__/rate-limit.test.ts:
        - Make 1001 requests, assert 429 on the last one

    Acceptance:
     - 1000 requests in 60s succeed
     - 1001st request returns 429
     - Rate limit resets after 60s
     - Tests pass

    ---

    CARD-005: Graceful Shutdown

    Goal: Server handles SIGTERM/SIGINT — closes connections, drains queue, exits cleanly.

    Work:
     1. Update packages/server/src/index.ts:

      1    const server = serve({ fetch: app.fetch, port: config.PORT }, () => {
      2      console.log(`falcon server listening on :${config.PORT}`);
      3    });
      4
      5    async function shutdown() {
      6      console.log('Shutting down...');
      7      server.close();
      8      await worker.close();
      9      await queue.close();
     10      await redis.quit();
     11      await db.$client.end();
     12      process.exit(0);
     13    }
     14
     15    process.on('SIGTERM', shutdown);
     16    process.on('SIGINT', shutdown);

     2. Add test: mock all dependencies, call shutdown(), assert all close methods called

    Acceptance:
     - kill -TERM <pid> shuts down cleanly in under 5 seconds
     - No "connection reset" errors in logs
     - BullMQ worker stops processing new jobs
     - All connections closed (no hanging handles)

    ---

    CARD-006: Input Validation on Path Parameters

    Goal: Invalid UUIDs in path params return 400 immediately.

    Work:
     1. Create packages/server/src/lib/validation.ts:

     1    import { z } from 'zod';
     2    export const uuidSchema = z.string().uuid();
     3    export const slugSchema = z.string().regex(/^[a-z0-9-]+$/);

     2. Update route files to validate params:

     1    // routes/flags.ts
     2    const paramsSchema = z.object({
     3      projectId: uuidSchema,
     4      envId: uuidSchema,
     5      flagKey: z.string().regex(/^[a-z0-9_-]+$/),
     6    });
     7    router.get('/:flagKey', zValidator('param', paramsSchema), ctrl.list);

     3. Update controllers to use validated params:

     1    const { projectId, envId } = c.req.valid('param');

    Acceptance:
     - GET /api/not-a-uuid/environments/... returns 400
     - Valid UUIDs pass through
     - All existing tests still pass

    ---

    Phase 3 — Code Quality & Maintainability

    > These cards reduce technical debt and make future development easier. Can be worked in parallel.

    ---

    CARD-007: Extract Server Factory

    Goal: createServer() function for easier testing and embedding.

    Work:
     1. Create packages/server/src/server.ts:

      1    import { parseEnv } from '@falcon/shared';
      2    import { createApp } from './app.js';
      3    import { createDb } from './db/connection.js';
      4    import { createAuditQueue } from './queue/client.js';
      5    import { createAuditWorker } from './queue/worker.js';
      6    import { Redis } from 'iovalkey';
      7
      8    export async function createServer() {
      9      const config = parseEnv();
     10      const db = createDb(config.DATABASE_URL);
     11      const redis = new Redis(config.VALKEY_URL);
     12      const queue = createAuditQueue(config.VALKEY_URL);
     13      const worker = createAuditWorker(config.VALKEY_URL, db);
     14      const app = createApp({ db, redis, queue });
     15      return { app, config, db, redis, queue, worker };
     16    }

     2. Update packages/server/src/index.ts:

     1    import { createServer } from './server.js';
     2    import { serve } from '@hono/node-server';
     3    const { app, config, worker } = await createServer();
     4    serve({ fetch: app.fetch, port: config.PORT }, () => {...});

     3. Update tests to use createServer() instead of manual wiring

    Acceptance:
     - createServer() returns app and all dependencies
     - Server starts normally via pnpm dev
     - Tests simplified (less boilerplate)

    ---

    CARD-008: Route Constants

    Goal: Single source of truth for API paths.

    Work:
     1. Add to packages/shared/src/index.ts:

      1    export const API_ROUTES = {
      2      evaluate: '/evaluate',
      3      projects: (id: string) => `/api/projects/${id}`,
      4      environments: (projectId: string, envId: string) =>
      5        `/api/projects/${projectId}/environments/${envId}`,
      6      flags: (projectId: string, envId: string) =>
      7        `/api/projects/${projectId}/environments/${envId}/flags`,
      8      apiKeys: (projectId: string, envId: string) =>
      9        `/api/projects/${projectId}/environments/${envId}/api-keys`,
     10    };

     2. Update CLI commands to import and use:

     1    import { API_ROUTES } from '@falcon/shared';
     2    const url = API_ROUTES.flags(projectId, envId);

     3. Update server routes to use constants where applicable

    Acceptance:
     - CLI commands use API_ROUTES instead of string concatenation
     - Changing a route path only requires one edit
     - All tests pass

    ---

    CARD-009: Consistent CLI --json Support

    Goal: Every CLI command supports --json for scripting.

    Work:
     1. Create packages/cli/src/lib/output.ts:

     1    export function output<T>(config: { json?: boolean }, data: T, humanFormatter: (d: T) => string) {
     2      if (config.json) {
     3        console.log(JSON.stringify(data, null, 2));
     4      } else {
     5        console.log(humanFormatter(data));
     6      }
     7    }

     2. Audit all commands in packages/cli/src/commands/:
        - Add --json flag if missing
        - Use output() helper for consistent formatting

     3. Add test: each command with --json outputs valid JSON

    Acceptance:
     - Every command has --json flag
     - falcon projects:list --json outputs valid JSON array
     - Human-readable output unchanged
     - Tests verify JSON output is parseable

    ---

    Phase 4 — Production Readiness

    > Final polish for deployment and documentation.

    ---

    CARD-010: Dockerfile for Server

    Goal: Deployable Docker image for the server.

    Work:
     1. Create Dockerfile at repo root:

      1    FROM node:20-alpine AS builder
      2    WORKDIR /app
      3    RUN corepack enable && corepack prepare pnpm@9 --activate
      4    COPY . .
      5    RUN pnpm install --frozen-lockfile
      6    RUN pnpm build
      7
      8    FROM node:20-alpine
      9    WORKDIR /app
     10    COPY --from=builder /app/packages/server/dist ./dist
     11    COPY --from=builder /app/node_modules ./node_modules
     12    EXPOSE 3000
     13    CMD ["node", "dist/index.mjs"]

     2. Create .dockerignore:

     1    node_modules
     2    dist
     3    .env
     4    coverage

     3. Add to package.json:

     1    "docker:build": "docker build -t falcon-server ."

     4. Document in README: docker run -e DATABASE_URL=... -p 3000:3000 falcon-server

    Acceptance:
     - docker build -t falcon-server . succeeds
     - Container starts and /health returns 200
     - Image size under 200MB

    ---

    CARD-011: CI Workflow

    Goal: GitHub Actions runs tests, lint, typecheck on every PR.

    Work:
     1. Create .github/workflows/ci.yml:

      1    name: CI
      2    on: [push, pull_request]
      3    jobs:
      4      test:
      5        runs-on: ubuntu-latest
      6        services:
      7          postgres: { image: postgres:16, env: {...}, ports: ['5432:5432'] }
      8          redis: { image: redis:7, ports: ['6379:6379'] }
      9        steps:
     10          - uses: actions/checkout@v4
     11          - uses: pnpm/action-setup@v4
     12          - uses: actions/setup-node@v4
     13            with: { node-version: '20', cache: 'pnpm' }
     14          - run: pnpm install --frozen-lockfile
     15          - run: pnpm lint
     16          - run: pnpm typecheck
     17          - run: pnpm test
     18          - run: pnpm build

     2. Add badge to README: [![CI](...)](...)

    Acceptance:
     - Push to main triggers CI
     - All steps pass
     - PR shows check status

    ---

    CARD-012: Remove Empty web Package

    Goal: Reduce cognitive load by removing dead code.

    Work:
     1. Delete packages/web/ directory
     2. Remove from vitest.workspace.ts
     3. Update project-plan.md to note web UI is v2, not in repo yet
     4. Update README package architecture section

    Acceptance:
     - pnpm test still works
     - No references to web package remain
     - Documentation accurate

    ---

    CARD-013: OpenAPI Documentation

    Goal: Auto-generated API docs at /openapi.json.

    Work:
     1. pnpm add @hono/zod-openapi --filter @falcon/server

     2. Update packages/server/src/app.ts:

     1    import { OpenAPIHono } from '@hono/zod-openapi';
     2    const app = new OpenAPIHono<{ Variables: { auth: AuthContext } }>();

     3. Add OpenAPI route:

     1    app.doc('/openapi.json', {
     2      openapi: '3.0.0',
     3      info: { title: 'Falcon API', version: '1.0.0' },
     4    });

     4. Document in README: "API docs at http://localhost:3000/openapi.json"

    Acceptance:
     - curl /openapi.json returns valid OpenAPI 3.0 spec
     - All endpoints documented
     - Can import into Swagger UI or Insomnia

    ---

    Dependency Graph

     1 Phase 1:  [CARD-001 Errors] [CARD-002 Logger] [CARD-003 Redis Health]
     2                                     │
     3 Phase 2:  [CARD-004 Rate Limit] [CARD-005 Shutdown] [CARD-006 Validation]
     4                                     │
     5 Phase 3:  [CARD-007 Server Factory] [CARD-008 Routes] [CARD-009 CLI --json]
     6                                     │
     7 Phase 4:  [CARD-010 Dockerfile] [CARD-011 CI] [CARD-012 Remove web] [CARD-013 OpenAPI]

    ---

    Recommended Order


    ┌──────┬────────────────────────────────────────┐
    │ Week │ Cards                                  │
    ├──────┼────────────────────────────────────────┤
    │ 1    │ CARD-001, CARD-002, CARD-003           │
    │ 2    │ CARD-004, CARD-005, CARD-006           │
    │ 3    │ CARD-007, CARD-008, CARD-009           │
    │ 4    │ CARD-010, CARD-011, CARD-012, CARD-013 │
    └──────┴────────────────────────────────────────┘


    Each week builds on the previous. Don't skip Phase 1 — the error handling and logging patterns make everything else easier.
