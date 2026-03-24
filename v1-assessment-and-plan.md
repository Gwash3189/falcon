# Falcon V1 Assessment & Implementation Plan

## Current State Assessment

### Executive Summary

The Falcon codebase is **~85% complete** relative to the V1 spec in CLAUDE.md. All 11 V1 feature scope items have working implementations. The remaining work is fixing bugs, filling gaps in build/deployment tooling, and hardening the codebase for production readiness.

---

### V1 Feature Scope Checklist

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Boolean flags | ✅ DONE | Full CRUD + evaluation |
| 2 | Percentage rollouts | ✅ DONE | Deterministic SHA-256 hash of `flagKey:identifier`, bucket % 100 |
| 3 | Identifier targeting | ✅ DONE | Array-based identifier matching |
| 4 | Projects, Environments, Flags CRUD | ✅ DONE | Full REST API for all entities |
| 5 | API keys (environment + user) | ✅ DONE | Create/revoke/list, SHA-256 hashed, timing-safe comparison |
| 6 | REST API | ✅ DONE | Resourceful endpoints, consistent `{ data }` / `{ error }` shapes |
| 7 | Flag evaluation endpoint | ✅ DONE | `POST /evaluate`, Redis-cached (30s TTL), rate-limited (1000/min) |
| 8 | Audit log | ⚠️ PARTIAL | Writes work (BullMQ worker → DB). **No read endpoint exists.** |
| 9 | CLI | ✅ DONE | 24 commands, all resources covered, `--json` on all data commands |
| 10 | SDK (Node.js) | ✅ DONE | `createFalconClient()`, TTL cache, safe `false` default on errors |
| 11 | Scripts | ✅ DONE | `pnpm setup/dev/dev:down/test/lint/format/build/typecheck` all exist |

### Infrastructure & Quality Checklist

| Item | Status | Notes |
|------|--------|-------|
| Database schema (6 tables) | ✅ DONE | projects, environments, flags, api_keys, user_api_keys, audit_log |
| Drizzle migrations | ⚠️ BUG | Migration 0002 missing snapshot file (`0002_snapshot.json`) |
| Authentication (3 layers) | ✅ DONE | Bootstrap admin, user keys, environment keys |
| Global error handler | ✅ DONE | `AppError` hierarchy, `app.onError()` in app.ts |
| Request logging middleware | ✅ DONE | Logs method, path, status, duration |
| Health check (DB + Redis) | ✅ DONE | `GET /health` returns 200 or 503 |
| Rate limiting on `/evaluate` | ✅ DONE | Per-key, 1000 req/60s window |
| Graceful shutdown | ✅ DONE | SIGTERM/SIGINT close db, redis, queue, worker |
| CI (GitHub Actions) | ✅ DONE | Lint, typecheck, test on PRs |
| Dockerfile | ✅ DONE | Multi-stage build |
| Unbuild configs | ⚠️ PARTIAL | `server` and `shared` have `build.config.ts`. **CLI and SDK-Node are missing theirs.** |
| vitest.workspace.ts | ⚠️ BUG | References `packages/web/vitest.config.ts` which doesn't exist |
| Path param validation | ⚠️ PARTIAL | Direct params validated (id, envId, keyId). **Parent params (projectId in nested routes) are NOT validated as UUIDs.** |
| Unit tests | ✅ DONE | 154 tests across 32 files, all passing |
| Integration tests | ✅ DONE | 8 test files covering all API endpoints (require containers) |

---

## Gaps Requiring Work

### GAP-1: Audit Log Read Endpoint (CRITICAL — V1 scope item #8)

**Problem:** The audit log is write-only. BullMQ workers write entries on flag mutations, but there is no API endpoint to query them. CLAUDE.md says "every flag mutation records who, what, when, and before/after state" — the recording works, but users cannot retrieve the data.

**What to build:**
- `GET /api/projects/:projectId/environments/:envId/audit-log` — returns audit log entries for an environment
- Support query params: `?flag_key=<key>` to filter by flag, `?limit=50&offset=0` for pagination
- Protected by `userKeyAuth` middleware (same as other CRUD endpoints)
- Response: `{ data: AuditLogEntry[] }` with `id`, `flag_id`, `environment_id`, `action`, `actor`, `before_state`, `after_state`, `created_at`

**Files to create/modify:**
1. Create `packages/server/src/audit-log/router.ts` — Hono router with GET endpoint
2. Create `packages/server/src/audit-log/controller.ts` — handler that validates params, calls service
3. Create `packages/server/src/audit-log/service.ts` — query audit_log table filtered by environmentId
4. Create `packages/server/src/audit-log/commands/list_audit_log.ts` — command function using the `command()` pattern from `@falcon/shared`
5. Modify `packages/server/src/app.ts` — mount the audit-log router at `/api/projects/:projectId/environments/:envId/audit-log` inside the `api` Hono group (after the flags route, before `app.route('/api', api)`)
6. Create `packages/server/src/audit-log/commands/__tests__/list_audit_log.unit.test.ts` — unit test
7. Create `packages/server/src/__tests__/audit-log-read.integration.test.ts` — integration test (create a flag, update it, query audit log, verify entries)

**Implementation pattern to follow:** Copy the structure from `packages/server/src/flags/` — it has the same router/controller/service/commands pattern. The audit log is read-only (no create/update/delete handlers needed).

**CLI command:**
8. Create `packages/cli/src/commands/audit-log/list.ts` — `falcon audit-log:list --project <id> --env <id> [--flag-key <key>] [--json]`
9. Add unit test at `packages/cli/src/commands/__tests__/audit-log.unit.test.ts`

---

### GAP-2: Missing `build.config.ts` for CLI and SDK-Node (CRITICAL — blocks publishing)

**Problem:** `packages/cli/` and `packages/sdk-node/` are PUBLIC packages meant to be published to npm. They both have `"build": "unbuild"` in their package.json scripts, but neither has a `build.config.ts` file. Running `pnpm build` will fail for these packages.

**What to build:**

1. Create `packages/cli/build.config.ts`:
```typescript
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: false,
    inlineDependencies: true,
  },
  externals: ['@oclif/core'],
});
```
Note: `@falcon/shared` must be inlined (it's a private package), but `@oclif/core` must be external (it's a runtime dependency the user installs). Check that the CLI bin entry works after build — oclif expects specific file structure. The built output must work with `node dist/index.mjs`. Test by running `pnpm --filter @falcon/cli build` and verifying `packages/cli/dist/index.mjs` exists.

2. Create `packages/sdk-node/build.config.ts`:
```typescript
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: false,
  },
});
```
The SDK has zero external dependencies — everything is inlined. Test by running `pnpm --filter @falcon/sdk-node build` and verifying `packages/sdk-node/dist/index.mjs` exists and exports `createFalconClient`.

3. Verify `pnpm build` at root completes without errors for all 4 packages.

---

### GAP-3: `vitest.workspace.ts` References Non-Existent `packages/web` (BUG)

**Problem:** Line 8 of `/home/user/falcon/vitest.workspace.ts` references `packages/web/vitest.config.ts`. The `packages/web/` directory does not exist. This causes a warning/error when running `pnpm test`.

**Fix:**

1. Edit `vitest.workspace.ts` — remove the `packages/web/vitest.config.ts` line. The file should be:
```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared/vitest.config.ts',
  'packages/server/vitest.config.ts',
  'packages/cli/vitest.config.ts',
  'packages/sdk-node/vitest.config.ts',
]);
```

---

### GAP-4: Missing Migration Snapshot `0002_snapshot.json` (BUG)

**Problem:** The Drizzle migration `0002_drop_audit_log_fk.sql` is registered in `_journal.json` but has no corresponding `0002_snapshot.json` in `packages/server/src/db/migrations/meta/`. This may cause `drizzle-kit` to fail when generating future migrations because it can't diff against the current schema state.

**Fix:**

1. Run `pnpm --filter @falcon/server drizzle-kit generate` to regenerate the snapshot. This requires a running PostgreSQL with the current schema applied.
2. If that doesn't work (containers unavailable), manually create the snapshot by:
   - Copying `0001_snapshot.json` to `0002_snapshot.json`
   - Modifying it to reflect the schema after the FK drop (remove the `audit_log_flag_id_flags_id_fk` foreign key from the audit_log table definition)
3. Commit the snapshot file.

**Verification:** After fix, running `pnpm --filter @falcon/server drizzle-kit generate` should not produce any new migration files (indicating the snapshot matches reality).

---

### GAP-5: Parent Path Parameter UUID Validation (HARDENING)

**Problem:** Nested routes like `/api/projects/:projectId/environments/:envId/flags/:flagKey` validate the direct param (flagKey) but do NOT validate that `projectId` is a valid UUID. An invalid projectId like `not-a-uuid` passes through to the database query, which will either error or return empty results with a confusing error.

**What to build:**

1. Create `packages/server/src/middleware/validate-params.ts`:
```typescript
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

export const projectIdParam = zValidator(
  'param',
  z.object({ projectId: z.string().uuid() })
);

export const envIdParam = zValidator(
  'param',
  z.object({ projectId: z.string().uuid(), envId: z.string().uuid() })
);
```

2. Apply `projectIdParam` middleware to:
   - `packages/server/src/environments/router.ts` — all routes
   - `packages/server/src/flags/router.ts` — all routes
   - `packages/server/src/api-keys/router.ts` — all routes

3. Apply `envIdParam` middleware to:
   - `packages/server/src/flags/router.ts` — all routes
   - `packages/server/src/api-keys/router.ts` — all routes

**Important:** Hono mounts these routers under `/api/projects/:projectId/environments/:envId/...` in `app.ts`. Check whether Hono passes parent route params to child router middleware. If not, the validation must happen in the controller by reading `c.req.param('projectId')` and parsing with `z.string().uuid().parse()`. Wrap in try/catch and throw `BadRequestError('Invalid project ID')`.

4. Add tests:
   - `GET /api/projects/not-a-uuid/environments` returns 400
   - `GET /api/projects/<valid-uuid>/environments/not-a-uuid/flags` returns 400
   - Valid UUIDs still work

---

### GAP-6: `pnpm setup` Assumes Podman (MINOR)

**Problem:** The `setup` script in root `package.json` calls `pnpm pods:up` which runs `podman compose up -d 2>/dev/null`. If the user has Docker but not Podman, setup silently fails to start containers (stderr is suppressed).

**Fix:**

1. Edit root `package.json`. Change the `pods:up` script to try podman first, fall back to docker:
```json
"pods:up": "podman compose up -d 2>/dev/null || docker compose up -d"
```

2. Similarly update `pods:down`:
```json
"pods:down": "podman compose down 2>/dev/null || docker compose down"
```

---

## Implementation Order

Work these in sequence. Each phase must be complete before the next.

### Phase 1: Fix Bugs (do these first, they're small and unblock other work)

| Task | Gap | Effort |
|------|-----|--------|
| Remove `packages/web` from vitest.workspace.ts | GAP-3 | 1 line change |
| Fix pods:up/pods:down scripts for Docker fallback | GAP-6 | 2 line changes in package.json |
| Generate or create missing `0002_snapshot.json` | GAP-4 | Copy + edit snapshot JSON |

### Phase 2: Build Tooling (blocks publishing)

| Task | Gap | Effort |
|------|-----|--------|
| Create `packages/cli/build.config.ts` | GAP-2 | New file, test build output |
| Create `packages/sdk-node/build.config.ts` | GAP-2 | New file, test build output |
| Verify `pnpm build` succeeds for all packages | GAP-2 | Run and fix any issues |

### Phase 3: Missing Feature (V1 scope gap)

| Task | Gap | Effort |
|------|-----|--------|
| Audit log read endpoint (server) | GAP-1 | Router + controller + service + command + tests |
| Audit log list CLI command | GAP-1 | CLI command + test |

### Phase 4: Hardening

| Task | Gap | Effort |
|------|-----|--------|
| Add UUID validation to parent path params | GAP-5 | Middleware or controller-level validation + tests |

---

## Files Reference

For quick navigation, here are the key files in the codebase:

**Server entry & wiring:**
- `packages/server/src/index.ts` — HTTP server entry point
- `packages/server/src/server.ts` — `createServer()` factory
- `packages/server/src/app.ts` — `createApp()` with all route mounting
- `packages/server/src/config.ts` — env var parsing with Zod

**Database:**
- `packages/server/src/db/schema.ts` — all Drizzle table definitions
- `packages/server/src/db/connection.ts` — `createDb()` factory
- `packages/server/src/db/migrations/` — SQL migration files

**Domain modules (each has router/controller/service/commands):**
- `packages/server/src/projects/`
- `packages/server/src/environments/`
- `packages/server/src/flags/`
- `packages/server/src/api-keys/`
- `packages/server/src/evaluate/`
- `packages/server/src/user-keys/`

**Queue:**
- `packages/server/src/queue/client.ts` — BullMQ queue factory
- `packages/server/src/queue/worker.ts` — audit log writer
- `packages/server/src/queue/jobs.ts` — job type definitions

**Shared:**
- `packages/shared/src/index.ts` — exports (FLAG_TYPES, ERROR_CODES, logger, command)
- `packages/shared/src/command.ts` — DI command pattern helper

**CLI:**
- `packages/cli/src/config.ts` — reads `~/.config/falcon/config.json`
- `packages/cli/src/http.ts` — `apiFetch()` wrapper
- `packages/cli/src/commands/` — 24 command files

**SDK:**
- `packages/sdk-node/src/client.ts` — `createFalconClient()` factory
- `packages/sdk-node/src/cache.ts` — TTL cache implementation
