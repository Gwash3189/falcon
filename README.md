# Falcon

An open-source feature flag service built for developers. Boolean flags, percentage rollouts, and identifier-based targeting through a REST API, CLI, and web UI.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Podman (recommended) or Docker

## Quickstart

```bash
pnpm install
pnpm dev
curl http://localhost:3000/health
```

## Project Structure

```
packages/
  shared/     # PRIVATE — env config, Zod schemas, domain types (never published to npm)
  web/        # PRIVATE — web UI served by the server (never published to npm)
  server/     # PUBLIC  — @falcon/server — the deployable flag service
  cli/        # PUBLIC  — @falcon/cli — developer CLI
  sdk-node/   # PUBLIC  — @falcon/sdk-node — SDK for evaluating flags in user apps
```

Private packages are bundled into public packages at build time via unbuild. They are never published as standalone npm packages.

## Scripts

- `pnpm dev` — start containers + server in watch mode
- `pnpm dev:down` — stop everything
- `pnpm test` — run all tests
- `pnpm lint` — check with Biome
- `pnpm format` — format with Biome
- `pnpm build` — build all publishable packages
- `pnpm typecheck` — typecheck all packages

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
