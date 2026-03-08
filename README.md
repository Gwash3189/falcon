# Falcon

Open-source feature flag service built for developers. Boolean flags, percentage rollouts, and identifier-based targeting — managed through a REST API, CLI, and SDK.

---

## How It Works

Falcon organizes everything around three concepts:

**Project → Environment → Flag**

A **Project** is your application. Each project has multiple **Environments** (production, staging, development). Flags exist per environment — a flag can be on in staging and off in production at the same time. Environments are isolated by design.

### Flag Types

**Boolean** — simple on/off. The flag is globally enabled or disabled in that environment.

**Percentage rollout** — enabled for a percentage of requests (0–100). Evaluation hashes `flagKey:identifier` to a bucket deterministically, so the same user always lands in the same bucket. Set `--percentage 20` and 20% of identifiers see the flag as enabled.

**Identifier targeting** — enabled for an explicit list of identifiers (user IDs, account IDs, emails). Everyone else sees it as disabled.

### Evaluation vs. CRUD

The flag evaluation endpoint (`POST /evaluate`) is entirely separate from the resource management API. It has its own middleware stack, Redis-backed caching (30s TTL on flag definitions), and is the hot path the SDK calls. Flag _definitions_ are cached, not evaluation results — because the result varies by caller identifier.

API keys are scoped per environment. The SDK authenticates with an environment API key and evaluates flags in that environment. CRUD operations (creating flags, managing projects) use the same API but without authentication by default — intended for internal deployment behind a trusted network.

### Audit Log

Every flag mutation (create, update, delete) emits a job to a BullMQ queue backed by Redis. A worker processes those jobs and writes audit entries asynchronously, capturing `actor`, `action`, and `before_state` / `after_state`. This keeps the mutation path fast and gives webhooks a natural integration point when added later.

---

## Architecture

Falcon is a pnpm monorepo with five packages:

**`@falcon/shared`** (private) — environment config schema, domain type definitions (`FLAG_TYPES`, `ERROR_CODES`), and cross-cutting Zod schemas. Bundled into public packages at build time via unbuild; never published as a standalone package.

**`@falcon/server`** (public) — the Hono-based REST API. Thin route handlers validate input with Zod and delegate to pure service functions. Service functions receive their dependencies (db client, queue) as arguments. No singletons, no module-level state.

**`@falcon/cli`** (public) — the primary developer interface. oclif-based, one command per file. Every command works non-interactively via flags and supports `--json` for scripting. Auth config lives in `~/.config/falcon/config.json`.

**`@falcon/sdk-node`** (public) — lightweight Node.js SDK for flag evaluation in user applications. Calls `/evaluate`, caches results in-process with a configurable TTL.

**`web`** (private) — placeholder for a future web UI. Not part of v1.

### Design Principles

**Factory functions, not singletons.** `createDb(url)`, `createApp(deps)`, `createFalconClient(opts)`. Dependencies are explicit and testable. Nothing is wired together at module load time.

**Thin routes, pure services.** Route handlers validate input, call a service function, and return a response. All business logic lives in service functions that receive what they need as arguments and return plain data.

**Mutations emit events.** Flag changes go through BullMQ. Audit logging (and eventually webhooks) happens asynchronously without touching the mutation path.

**Private packages stay private.** `shared` and `web` are bundled into consuming public packages at build time. They never appear as npm dependencies in published output.

---

## Quickstart

**Prerequisites:** Node.js 20+, pnpm 9+, Podman or Docker

```bash
# Install dependencies
pnpm install

# Start Postgres + Redis containers and the dev server
pnpm dev

# Verify the server is running
curl http://localhost:3000/health
```

**Create your first flag via CLI:**

```bash
# Connect the CLI to your local server
falcon init --url http://localhost:3000 --key <api-key>

# Create a project and environment
falcon projects:create "My App" --slug my-app
falcon environments:create production --project <project-id> --slug production

# Create a boolean flag
falcon flags:create dark-mode --project <project-id> --env <env-id> --type boolean

# Create a percentage rollout (20% of users)
falcon flags:create new-checkout --project <project-id> --env <env-id> --type percentage --percentage 20

# Create identifier-based targeting
falcon flags:create beta-access --project <project-id> --env <env-id> --type identifier --identifiers user-123,user-456

# Toggle a flag on
falcon flags:update dark-mode --project <project-id> --env <env-id> --enabled
```

**Evaluate flags in your application:**

```typescript
import { createFalconClient } from '@falcon/sdk-node';

const falcon = createFalconClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'flk_...',
});

const enabled = await falcon.evaluate('dark-mode', { identifier: 'user-123' });
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start containers + server in watch mode |
| `pnpm dev:down` | Stop containers |
| `pnpm test` | Run all tests across all packages |
| `pnpm lint` | Biome check |
| `pnpm format` | Biome format |
| `pnpm build` | Build all publishable packages (CI only) |
| `pnpm typecheck` | Type-check all packages |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
