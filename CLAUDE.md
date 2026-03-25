# CLAUDE.md

## Project Overview

Flagline is an open-source feature flag service built for developers. It provides boolean flags, percentage rollouts, and identifier-based targeting through a REST API, CLI, and web UI. The primary interface is the CLI — the web UI is secondary.

The deployment model is npm-based: users install and run `npx @flagline/server` or `npm install -g @flagline/cli`. This is not a clone-and-run project — it ships as publishable packages.

## Tech Stack

- **Runtime:** Node.js 20+ with TypeScript (strict mode, ESM everywhere)
- **API Framework:** Hono (with @hono/node-server for Node deployment)
- **Database:** SQLite via Drizzle ORM with the `better-sqlite3` driver (file at `./data/flagline.db`)
- **Cache:** Valkey 7 via ioredis
- **CLI:** oclif (TypeScript-native, command-per-file pattern)
- **Validation:** Zod (used everywhere — env parsing, API request validation, CLI input)
- **Background Jobs:** BullMQ (Redis-backed, for audit log writes and future webhook delivery)
- **Build:** unbuild (bundles private packages into publishable ones)
- **Test:** Vitest + Hono test client for integration tests
- **Lint/Format:** Biome (replaces ESLint + Prettier)
- **Package Manager:** pnpm with workspaces
- **Containers:** Podman (recommended) or Docker — compose file is runtime-agnostic (only Valkey; no database container needed)

## Package Architecture

```
packages/
  shared/        ← PRIVATE  — never published to npm
  web/           ← PRIVATE  — never published to npm
  server/        ← PUBLIC   — @flagline/server
  cli/           ← PUBLIC   — @flagline/cli
  sdk-node/      ← PUBLIC   — @flagline/sdk-node
```

## Tests, Linting and Pull Requests

The following commands must pass before any pull requests are made

1. pnpm test:unit && pnpm test:integration
2. pnpm lint
3. pnpm format
4. pnpm typecheck

Only when all these commands pass can a pull request be made. 

## Summarising and Reporting on Work

Each pull request must contain a description that summarises the work done well enough that both other
AI Agents and humans can understand and fully review the pull request. 

The description must be good enough that it can be fed into another Sonnet style AI model to either continue work or iterate one. 

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
- **Environment API Keys** (`api_keys` table) are scoped to an environment for SDK/evaluation requests.
- **User API Keys** (`user_api_keys` table) are scoped to a user (by email) for CRUD API requests. These are separate from environment keys.
- **Flags** have a key (string, unique within an environment), a type, and type-specific configuration.

## Authentication Model

There are two separate authentication layers:

### User API Keys (CRUD authentication)
- All CRUD API requests (`/api/*`) require a `Authorization: Bearer <user-key>` header.
- User keys are stored in `user_api_keys` and are scoped to an email address.
- Admin creates user keys via `POST /admin/keys` (protected by `BOOTSTRAP_ADMIN_KEY`).
- Bootstrap: set `BOOTSTRAP_ADMIN_KEY` in `.env`. The first key is created via this bootstrap token.
- Actor (email) from the user key is recorded in the audit log for every flag mutation.

### Environment API Keys (SDK/evaluation authentication)
- The `/evaluate` endpoint uses environment-scoped keys from `api_keys`.
- These keys are created per-environment and used by the SDK in user applications.

### Admin Endpoints (`/admin/*`)
- Protected by the `BOOTSTRAP_ADMIN_KEY` env var.
- `POST /admin/keys` — create a user key for an email
- `GET /admin/keys` — list all user keys
- `DELETE /admin/keys/:email` — revoke all keys for an email

### CLI Auth Flow
1. Admin creates a user key: `falcon admin:keys:create user@example.com`
2. User runs: `falcon init --key <key> --email user@example.com`
3. Config stored at `~/.config/falcon/config.json` with `{serverUrl, apiKey, email}`

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

- **Factory functions, not singletons.** `createDb(path)`, `createApp(deps)`, never module-level instances. This makes testing trivial and dependencies traceable.
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
- CRUD API (`/api/*`) uses `userKeyAuth` middleware — validates against `user_api_keys` table, attaches `{ email }` to context as `userAuth`.
- Evaluation (`/evaluate`) uses `apiKeyAuth` middleware — validates against `api_keys` (environment-scoped), attaches `{ environmentId, keyPrefix }` to context as `auth`.
- Admin (`/admin/*`) uses inline bootstrap key middleware.

### CLI (oclif)

- One command per file in `packages/cli/src/commands/`.
- Commands are organized by resource: `commands/projects/list.ts`, `commands/flags/create.ts`.
- Admin commands under `commands/admin/keys/` — create, list, revoke user keys.
- Every command must work non-interactively (flags/arguments) and interactively (prompts) where it makes sense.
- Output should be human-readable by default and support `--json` for scripting.
- Auth: CLI stores `{ serverUrl, apiKey, email }` in `~/.config/falcon/config.json`.

### Testing

- Test files live next to source: `src/db/__tests__/connection.test.ts`.
- Integration tests that need the database use a real SQLite file. No mocking the database layer, no container required.
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
