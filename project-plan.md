# Feature Flag Service — Foundation Plan

## Project Name: `falcon` (placeholder — rename anytime)

---

## How to Read This Plan

Cards are grouped into **phases**. Cards within the same phase can be worked **in parallel**. A phase must be complete before the next phase begins. Each card has acceptance criteria so you know when it's done.

---

## Package Architecture

The monorepo has five packages. Three are **publishable** (users install them), two are **private** (internal only, never published to npm). During development, everything is linked via pnpm workspaces — you just import and it works. For production, `unbuild` bundles shared code into the packages that need it so there's no runtime dependency on private packages.

```
packages/
  shared/        ← PRIVATE  — Zod schemas, types, config validation
  web/           ← PRIVATE  — secondary web UI (Hono JSX, served by server)
  server/        ← PUBLIC   — the deployable flag service (npx @falcon/server)
  cli/           ← PUBLIC   — developer CLI (npx @falcon/cli)
  sdk-node/      ← PUBLIC   — SDK for evaluating flags in user apps
```

**The development experience:** You edit any file in any package, and `tsx watch` picks it up. No build step during dev. Imports across packages resolve instantly via workspace linking. You never think about unbuild until you're publishing.

---

## Phase 0 — Local Infrastructure

> No code yet. Just make sure a developer can clone the repo and have a working Postgres + Redis running in seconds.

### CARD-001: Container Services for Local Dev

**Goal:** One command gives you Postgres 16 and Redis 7. Runtime-agnostic — works with Podman (recommended, Apache 2.0) or Docker.

**Work:**
- Create `docker-compose.yml` at the repo root (the compose spec is runtime-agnostic)
- Postgres on port `5432`, database `falcon_dev`, user `falcon`, password `falcon`
- Redis on port `6379`
- Add a `volumes` entry so Postgres data survives restarts
- Add a `.env.example` with `DATABASE_URL` and `REDIS_URL` populated for local dev

**Acceptance:**
- `podman compose up -d` (or `docker compose up -d`) starts both services
- `psql $DATABASE_URL -c "SELECT 1"` succeeds
- `redis-cli ping` returns PONG

---

## Phase 1 — Monorepo Scaffold

> All cards in this phase are independent of each other. Work them in any order or simultaneously.

### CARD-002: Monorepo & Workspace Init

**Goal:** Clean pnpm workspace monorepo where every package is importable by every other package with zero friction.

**Work:**
- `pnpm init` at root
- Create `pnpm-workspace.yaml` pointing to `packages/*`
- Create package dirs: `packages/server`, `packages/cli`, `packages/shared`, `packages/web`, `packages/sdk-node`
- Each package gets its own `package.json`:
  - Name: `@falcon/server`, `@falcon/cli`, `@falcon/shared`, `@falcon/web`, `@falcon/sdk-node`
  - `@falcon/shared` and `@falcon/web` get `"private": true`
  - All packages get `"type": "module"`
- Packages that depend on `@falcon/shared` list it in their `package.json` dependencies as `"@falcon/shared": "workspace:*"` — pnpm resolves this to the local copy automatically
- Root `package.json` gets shared dev scripts: `dev`, `build`, `test`, `lint`, `typecheck`

**Acceptance:**
- `pnpm install` completes with no errors
- `pnpm -r exec pwd` lists all five packages
- In `packages/server/src/index.ts`, the import `import { } from '@falcon/shared'` resolves without error

---

### CARD-003: TypeScript Configuration

**Goal:** Single base tsconfig, extended per package. Strict mode everywhere. Cross-package imports just work.

**Work:**
- Create `tsconfig.base.json` at root: strict, ESM, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"declaration": true`
- Each package gets `tsconfig.json` extending the base with its own `include` and `outDir`
- No TypeScript project references needed — workspace linking handles resolution during dev, and unbuild handles it at build time

**Acceptance:**
- `pnpm --filter @falcon/server exec tsc --noEmit` passes on an empty `src/index.ts`
- Types from `@falcon/shared` are visible in `server` and `cli` via the workspace link

---

### CARD-004: Biome Setup

**Goal:** Consistent formatting and linting across the entire repo with zero config debates.

**Work:**
- `pnpm add -Dw @biomejs/biome`
- Create `biome.json` at root (use recommended rules, 2-space indent, single quotes, trailing commas)
- Add root scripts: `lint` → `biome check .`, `format` → `biome format . --write`
- Add a `.editorconfig` that matches Biome's settings

**Acceptance:**
- `pnpm lint` runs across all packages
- `pnpm format` auto-fixes formatting

---

### CARD-005: Vitest Setup

**Goal:** Test runner configured and working per-package.

**Work:**
- `pnpm add -Dw vitest`
- Create `vitest.workspace.ts` at root pointing to each package
- Each package with tests gets a `vitest.config.ts`
- Add a dummy test in `packages/shared` (`src/__tests__/smoke.test.ts`) that asserts `true === true`

**Acceptance:**
- `pnpm test` from root discovers and runs tests across all packages
- `pnpm --filter @falcon/shared test` runs only that package's tests

---

## Phase 2 — Shared Package & Database Layer

> These two cards can be worked in parallel. The shared package provides config validation. The database card uses it.

### CARD-006: Shared Config, Env Validation & unbuild

**Goal:** A single place where all environment variables are validated and typed. Bundled via unbuild so published packages don't depend on `@falcon/shared` at runtime.

**Work:**
- `pnpm add zod --filter @falcon/shared`
- `pnpm add -D unbuild --filter @falcon/shared`
- Create `packages/shared/src/config.ts`
  - Define a Zod schema for the environment: `DATABASE_URL` (string, url), `REDIS_URL` (string, url), `PORT` (number, default 3000), `NODE_ENV` (enum: development, production, test)
  - Export a `parseEnv()` function that parses `process.env` and throws clear errors on failure
  - Export the inferred TypeScript type `AppConfig`
- Create `packages/shared/src/index.ts` as the barrel export
- Create `packages/shared/build.config.ts` for unbuild:
  - Entry: `src/index.ts`
  - Output: `dist/`
  - Generate declaration files
- Add `"main"` and `"types"` fields in shared's `package.json` pointing to `dist/`
- Add `build` script: `unbuild`

**Why unbuild here:** During dev, pnpm workspaces resolve `@falcon/shared` to the live source — no build needed. When you publish `@falcon/server` or `@falcon/cli`, their build step bundles shared's compiled output so the published package has zero workspace dependencies. unbuild is zero-config by default and handles ESM, CJS, and declaration generation.

**Acceptance:**
- Unit test: calling `parseEnv()` with missing `DATABASE_URL` throws a readable Zod error
- Unit test: calling `parseEnv()` with valid env returns a typed `AppConfig` object
- `pnpm --filter @falcon/shared build` produces `dist/index.mjs` and `dist/index.d.ts`
- Types are importable from `@falcon/shared` in other packages during dev without building

---

### CARD-007: Drizzle ORM & Database Connection

**Goal:** Drizzle connected to Postgres with a health-check query helper.

**Work:**
- `pnpm add drizzle-orm postgres --filter @falcon/server`
- `pnpm add -D drizzle-kit --filter @falcon/server`
- Create `packages/server/src/db/connection.ts`
  - Accepts a `DATABASE_URL` string, returns a Drizzle client using the `postgres` driver
  - Export a `createDb(url: string)` factory function (no singletons — makes testing easy)
- Create `packages/server/src/db/health.ts`
  - Export `checkDatabase(db): Promise<boolean>` that runs `SELECT 1` and returns true/false
- Create `packages/server/drizzle.config.ts` for migration tooling (point at a schema dir even though it's empty for now)

**Acceptance:**
- Integration test (with real DB via container): `createDb()` connects and `checkDatabase()` returns `true`
- Unit test: `checkDatabase()` returns `false` when given a bad connection string (doesn't throw)

---

## Phase 3 — Hono Server & Health Endpoint

> This phase depends on Phase 2 being complete. One card.

### CARD-008: Hono Server with /health Endpoint

**Goal:** A running HTTP server with a single endpoint that proves the database is reachable.

**Work:**
- `pnpm add hono @hono/node-server --filter @falcon/server`
- Create `packages/server/src/app.ts`
  - Creates and exports the Hono app (no listening — just the app instance)
  - Accepts dependencies (db client) as arguments — no global imports
  - Registers a `GET /health` route:
    - Calls `checkDatabase(db)`
    - If true: returns `200 { status: "ok", timestamp: <ISO string> }`
    - If false: returns `503 { status: "unavailable", timestamp: <ISO string> }`
- Create `packages/server/src/index.ts`
  - Imports `parseEnv()` from `@falcon/shared` (resolved via workspace link, no build required)
  - Validates the environment
  - Creates the DB connection
  - Passes it into the app factory
  - Calls `serve()` from `@hono/node-server` on the configured port
  - Logs: `falcon server listening on :3000`
- Add a `dev` script in server's `package.json`: `tsx watch src/index.ts`

**Acceptance:**
- `podman compose up -d && pnpm --filter @falcon/server dev` starts the server
- `curl http://localhost:3000/health` returns `200` with `{ "status": "ok" }`
- Stopping Postgres → `curl /health` returns `503` with `{ "status": "unavailable" }`
- Integration test: uses the Hono test client (no real HTTP needed) with a test DB to assert both 200 and 503 paths

---

## Phase 4 — Developer Experience Polish

> All cards here are independent. Work in any order.

### CARD-009: Root Dev Script (Run Everything)

**Goal:** `pnpm dev` at the root starts container services and the server in one command.

**Work:**
- Add a root `dev` script that runs `podman compose up -d` (or `docker compose up -d` — detect what's available) then `pnpm --filter @falcon/server dev`
- Add a root `dev:down` script that tears everything down
- Document this in the root `README.md`

**Acceptance:**
- Fresh clone → `pnpm install && pnpm dev` → server is running and `/health` returns 200
- `pnpm dev:down` stops everything cleanly

---

### CARD-010: Seed .env Handling

**Goal:** Don't make devs think about env vars on first run.

**Work:**
- Create `.env.example` at root (already started in CARD-001, finalize it here)
- Add a `predev` script or a small shell script that copies `.env.example` to `.env` if `.env` doesn't exist
- Add `.env` to `.gitignore`
- `packages/server/src/index.ts` loads `.env` via Node's `--env-file` flag in the dev script (e.g. `tsx watch --env-file=../../.env src/index.ts`)

**Acceptance:**
- Delete `.env`, run `pnpm dev`, server still starts because defaults are applied
- Custom `.env` values override defaults

---

### CARD-011: README & Contributing Guide

**Goal:** A new contributor can go from zero to running server in under 3 minutes.

**Work:**
- Root `README.md`: project description, prerequisites (Node 20+, pnpm 9+, Podman or Docker), quickstart (3 commands), project structure overview (explain public vs private packages), link to contributing guide
- `CONTRIBUTING.md`: how to add a new package, how to run tests, commit conventions, PR expectations
- Keep both files short — no walls of text

**Acceptance:**
- Someone unfamiliar with the project can follow the README and hit `/health` successfully
- Project structure section accurately reflects the actual directory layout

---

### CARD-012: Server Build & Publish Config

**Goal:** `@falcon/server` can be built into a standalone publishable package that has no workspace dependencies.

**Work:**
- `pnpm add -D unbuild --filter @falcon/server`
- Create `packages/server/build.config.ts`:
  - Entry: `src/index.ts`
  - Externalize runtime deps (`hono`, `@hono/node-server`, `drizzle-orm`, `postgres`, `zod`)
  - Inline `@falcon/shared` (it gets bundled into the server's dist, not left as an external dep)
- Add `build` script: `unbuild`
- Add `"main"`, `"types"`, `"bin"` fields in server's `package.json`
- Verify that the built output does NOT contain a `@falcon/shared` import

**Acceptance:**
- `pnpm --filter @falcon/server build` produces `dist/` with working JS and type declarations
- `node packages/server/dist/index.mjs` starts the server (with env vars set)
- `grep -r "@falcon/shared" packages/server/dist/` returns nothing — shared code is inlined
- `npm pack --dry-run` in the server package shows a clean package with no workspace references

---

## Dependency Graph (Visual Summary)

```
Phase 0:  [CARD-001 Containers]
               │
Phase 1:  [CARD-002 Monorepo] [CARD-003 TS] [CARD-004 Biome] [CARD-005 Vitest]
               │                     │
Phase 2:  [CARD-006 Shared+unbuild] [CARD-007 Drizzle + DB]
               │                     │
               └──────┬──────────────┘
                      │
Phase 3:         [CARD-008 Hono + /health]
                      │
Phase 4:  [CARD-009 Dev Script] [CARD-010 .env] [CARD-011 README] [CARD-012 Build]
```

---

## Notes for Claude Code

- When working a card, read its acceptance criteria first — they are your definition of done.
- Prefer explicit over clever. No barrel re-exports more than one level deep.
- Every file should have a single clear responsibility. If a file does two things, split it.
- Keep dependencies minimal. If you're tempted to add a package, check if Node or an existing dep already covers it.
- All paths assume ESM (`"type": "module"` in every `package.json`).
- Use `node:` prefix for all Node built-ins (`node:path`, `node:fs`, etc).
- During development, never require a build step. `tsx` resolves workspace links to source directly.
- The only time `unbuild` runs is in CI or before publishing. Don't make developers think about it.
- Private packages (`shared`, `web`) must never appear as a dependency in a published package's `dist/` output. unbuild inlines them.
