# CLAUDE.md

## Project Overview

Flagline is an open-source feature flag service built for developers. It provides boolean flags, percentage rollouts, and identifier-based targeting through a REST API, CLI, and web UI. The primary interface is the CLI — the web UI is secondary.

The deployment model is npm-based: users install and run `npx @flagline/server` or `npm install -g @flagline/cli`. This is not a clone-and-run project — it ships as publishable packages.

## Tech Stack

- **Runtime:** Node.js 20+ with TypeScript (strict mode, ESM everywhere)
- **API Framework:** Hono (with @hono/node-server for Node deployment)
- **Database:** PostgreSQL 16 via Drizzle ORM with the `postgres` driver
- **Cache:** Redis 7 via ioredis
- **CLI:** oclif (TypeScript-native, command-per-file pattern)
- **Validation:** Zod (used everywhere — env parsing, API request validation, CLI input)
- **Background Jobs:** BullMQ (Redis-backed, for audit log writes and future webhook delivery)
- **Build:** unbuild (bundles private packages into publishable ones)
- **Test:** Vitest + Hono test client for integration tests
- **Lint/Format:** Biome (replaces ESLint + Prettier)
- **Package Manager:** pnpm with workspaces
- **Containers:** Podman (recommended) or Docker — compose file is runtime-agnostic

## Package Architecture

```
packages/
  shared/        ← PRIVATE  — never published to npm
  web/           ← PRIVATE  — never published to npm
  server/        ← PUBLIC   — @flagline/server
  cli/           ← PUBLIC   — @flagline/cli
  sdk-node/      ← PUBLIC   — @flagline/sdk-node
```

**Private packages** (`shared`, `web`) are inlined into public packages at build time via unbuild. They must never appear as external dependencies in published output.

**`shared` only contains code used by more than one package.** If something is only imported in one place, it belongs in that package, not in shared. Shared code includes: environment config schema, domain types (flag shapes, evaluation rule schemas, error codes), and cross-cutting Zod schemas.

**Route-level validation, CLI input validation, and package-specific logic stays local** to the package that uses it.

## Domain Model

```
Project
  └── Environment (e.g. production, staging, development)
        └── Flag
              ├── Boolean (on/off)
              ├── Percentage rollout (0-100, evaluated by hashing identifier)
              └── Identifier targeting (enabled for specific identifiers)
```

- A **Project** is the top-level organizational unit.
- Each project has multiple **Environments**. Flags exist per-environment — a flag can be on in staging and off in production.
- **API Keys** are scoped to an environment. One key per environment for server-side evaluation, issued via CLI or API.
- **Flags** have a key (string, unique within an environment), a type, and type-specific configuration.

## V1 Feature Scope

Build these. No more, no less.

1. **Boolean flags** — on/off per environment
2. **Percentage rollouts** — 0-100, deterministic by hashing flag key + identifier
3. **Identifier targeting** — flag enabled for a specific list of identifiers
4. **Projects, Environments, Flags** — full CRUD via REST API
5. **API keys** — create/revoke, scoped to an environment, used to authenticate SDK and API requests
6. **REST API** — resourceful endpoints for all entities (projects, environments, flags, API keys)
7. **Flag evaluation endpoint** — separate from CRUD API, optimized for hot-path reads (`POST /evaluate`). This is what the SDK calls. It must be fast and cacheable. Do not combine with CRUD routes.
8. **Audit log** — every flag mutation records who, what, when, and before/after state. Wired into every mutation from day one. Mutations emit events via BullMQ; a worker writes audit entries. This design supports future webhooks without refactoring.
9. **CLI** — primary developer interface for managing projects, environments, flags, and API keys
10. **SDK (Node.js)** — lightweight client for evaluating flags in user applications
11. **Scripts** — pnpm commands following the scripts-to-rule-them-all pattern: `pnpm setup`, `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm lint`

**Not in v1:** user segments, complex targeting rules, dashboard analytics, multi-team permissions, SSO, webhooks (but the architecture supports adding them).

## Development Workflow

- `pnpm dev` starts containers and the server. No build step required during development.
- `tsx watch` is used for dev — it resolves workspace links to source directly.
- `unbuild` only runs in CI or before publishing. Developers never think about it.
- `.env` is auto-seeded from `.env.example` if it doesn't exist.

## Coding Conventions

### General

- ESM everywhere. `"type": "module"` in every `package.json`.
- Use `node:` prefix for all Node built-ins (`node:path`, `node:fs`, `node:crypto`).
- Prefer explicit over clever. No magic, no decorators, no DI containers.
- Every file has a single clear responsibility. If a file does two things, split it.
- No barrel re-exports more than one level deep.
- Keep dependencies minimal. Check if Node or an existing dep covers it before adding a package.

### TypeScript

- Strict mode, no `any`. Use `unknown` and narrow.
- Prefer interfaces for object shapes, types for unions and intersections.
- No enums. Use `as const` objects with inferred types.
- Export types explicitly: `export type { MyType }`.
- Function signatures: name parameters clearly, use object params when there are more than 3 arguments.

### Architecture Patterns

- **Factory functions, not singletons.** `createDb(url)`, `createApp(deps)`, never module-level instances. This makes testing trivial and dependencies traceable.
- **Dependency injection via function arguments.** The app factory receives its dependencies (db, cache, config). No service locators, no DI frameworks.
- **Thin route handlers.** A route handler validates input, calls a service function, and returns a response. Business logic lives in service functions, not in handlers.
- **Service functions are pure-ish.** They receive what they need as arguments (db client, validated input) and return results. They don't reach into global state.
- **Mutations emit events.** Flag changes go through a service layer that emits to BullMQ. Workers process events for audit logging (and eventually webhooks). Handlers never write audit logs directly.

### Database (Drizzle)

- Schema files live in `packages/server/src/db/schema/`.
- One file per table. Name the file after the table (`projects.ts`, `flags.ts`, `audit-log.ts`).
- Use `snake_case` for database column names, Drizzle maps to `camelCase` in TypeScript.
- Migrations are generated by `drizzle-kit` and committed to the repo.
- Always use the `createDb()` factory — never import a db instance directly.
- For health checks: `SELECT 1`. For reads that need speed: query through Redis cache first.

### API (Hono)

- Group routes by resource: `routes/projects.ts`, `routes/flags.ts`, `routes/evaluate.ts`.
- Use `@hono/zod-validator` for request validation. Define the Zod schema inline in the route file or in a sibling `*.schema.ts` file if it's large.
- Return consistent response shapes: `{ data: T }` for success, `{ error: { code: string, message: string } }` for errors.
- The evaluation endpoint (`/evaluate`) is separate from CRUD routes and should be optimizable independently (different middleware stack, caching strategy, rate limits).
- API key authentication via `Authorization: Bearer <key>` header. Middleware validates the key and attaches the resolved environment to the request context.

### CLI (oclif)

- One command per file in `packages/cli/src/commands/`.
- Commands are organized by resource: `commands/projects/list.ts`, `commands/flags/create.ts`.
- Every command must work non-interactively (flags/arguments) and interactively (prompts) where it makes sense.
- Output should be human-readable by default and support `--json` for scripting.
- Auth: CLI stores an API key in a local config file (`~/.config/flagline/config.json`).

### Testing

- Test files live next to source: `src/db/__tests__/connection.test.ts`.
- Integration tests that need Postgres use a real database (via container). No mocking the database layer.
- Use the Hono test client for API integration tests — no real HTTP server needed.
- Name tests descriptively: `it('returns 503 when database is unreachable')`.
- Each test should be independent. No shared mutable state between tests.

### Error Handling

- Define error types in the package that owns them.
- Service functions throw typed errors. Route handlers catch and map to HTTP responses.
- Never expose internal error details to API consumers. Log the full error server-side, return a safe message to the client.
- Use Zod parse errors directly for validation failures — they produce good messages out of the box.

## File Naming

- `kebab-case` for all file names: `flag-evaluation.ts`, `api-keys.ts`.
- `PascalCase` for types and interfaces only.
- `camelCase` for variables, functions, and object keys in TypeScript.
- `snake_case` for database columns and JSON API response keys.

## Commit Conventions

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- Scope by package when relevant: `feat(server): add flag evaluation endpoint`.
- Keep commits small and focused. One logical change per commit.

## Scripts (scripts-to-rule-them-all)

All scripts are pnpm commands at the root:

- `pnpm setup` — install deps, start containers, seed .env, run migrations
- `pnpm dev` — start containers + server in watch mode
- `pnpm dev:down` — stop everything
- `pnpm test` — run all tests across all packages
- `pnpm lint` — biome check
- `pnpm format` — biome format
- `pnpm build` — unbuild all publishable packages
- `pnpm typecheck` — tsc --noEmit across all packages
