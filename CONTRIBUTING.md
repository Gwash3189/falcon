# Contributing to Falcon

Thanks for wanting to contribute! This guide gets you from `git clone` to passing tests as fast as possible.

## Prerequisites

You need these installed before anything else:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| pnpm | 10+ | `npm install -g pnpm` |
| Docker **or** Podman | Any recent | [docker.com](https://docs.docker.com/get-docker/) or [podman.io](https://podman.io/getting-started/installation) |

Falcon uses PostgreSQL and Valkey (Redis-compatible) for development. You don't install these yourself — containers handle it.

## Setup

```bash
git clone <your-fork-url> falcon
cd falcon
pnpm setup
```

That single `pnpm setup` command:
1. Copies `.env.example` to `.env` (if `.env` doesn't exist)
2. Installs all dependencies
3. Starts PostgreSQL and Valkey containers
4. Runs database migrations

Verify it worked:

```bash
curl http://localhost:3000/health
# Should return: {"status":"healthy", ...}
```

If `pnpm setup` fails on the container step, make sure Docker/Podman is running (`docker info` or `podman info`).

## Running the Dev Server

```bash
pnpm dev
```

This starts containers (if not already running) and the API server in watch mode on `http://localhost:3000`. Code changes reload automatically.

To stop everything:

```bash
pnpm dev:down
```

## Running Tests

```bash
pnpm test:unit          # fast — no containers needed
pnpm test:integration   # starts containers, runs integration tests, stops containers
pnpm test               # runs everything
```

To test a single package:

```bash
pnpm --filter @falcon/server test
pnpm --filter @falcon/cli test
pnpm --filter @falcon/sdk-node test
```

Integration tests use a real PostgreSQL database — there are no database mocks. The test config lives in `packages/server/src/__tests__/config.ts`.

## Checks That Must Pass Before a PR

Run all four of these. CI will run them too, but catching failures locally is faster.

```bash
pnpm test:unit && pnpm test:integration
pnpm lint
pnpm format
pnpm typecheck
```

## Project Structure

```
packages/
  shared/      # Private — types, schemas, utilities shared across packages
  server/      # @falcon/server — Hono API, database, queue workers
  cli/         # @falcon/cli — oclif CLI tool
  sdk-node/    # @falcon/sdk-node — lightweight Node.js SDK
```

`shared` and `web` are private packages that get inlined at build time. They are never published to npm.

## Making Changes

### Where code lives

- **API routes**: `packages/server/src/<resource>/router.ts`
- **Business logic**: `packages/server/src/<resource>/commands/`
- **Database schema**: `packages/server/src/db/schema.ts`
- **CLI commands**: `packages/cli/src/commands/<resource>/<action>.ts`
- **SDK client**: `packages/sdk-node/src/client.ts`

### Key patterns

- **Factory functions** over singletons — `createDb(url)`, `createApp(deps)`.
- **One file, one job.** If a file does two things, split it.
- **Tests live next to source** — `src/foo/__tests__/foo.unit.test.ts`.
- **Zod validates everything** — env vars, API requests, CLI input.
- **No `any`** — use `unknown` and narrow. Strict TypeScript throughout.

Read `CLAUDE.md` for the full coding conventions. It's the source of truth.

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(server): add flag evaluation endpoint
fix(cli): handle missing config file
test(server): add audit-log integration tests
chore: update dependencies
```

Keep commits small and focused — one logical change per commit.

## Submitting a Pull Request

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run all four checks (tests, lint, format, typecheck)
4. Push your branch and open a PR
5. Write a clear description of what changed and why

PRs with failing checks won't be merged. If you're unsure about an approach, open a draft PR early and ask for feedback.
