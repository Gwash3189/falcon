# Contributing to Falcon

## Getting Started

1. Install deps: `pnpm install`
2. Start services: `pnpm dev`
3. Confirm health: `curl http://localhost:3000/health`

## Running Tests

```bash
pnpm test                          # all packages
pnpm --filter @falcon/server test  # single package
```

Tests that need Postgres use a real database via container. No mocking the database layer.

## Adding a New Package

1. Create `packages/<name>/` with its own `package.json` (`"type": "module"`)
2. Add a `tsconfig.json` extending `../../tsconfig.base.json`
3. Add a `vitest.config.ts`
4. Add an entry to `vitest.workspace.ts` at the root
5. If it depends on `@falcon/shared`, add `"@falcon/shared": "workspace:*"` to its deps

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(server): add flag evaluation endpoint`
- `fix(cli): handle missing config file`
- `chore: update dependencies`

Keep commits small and focused — one logical change per commit.

## Pull Request Expectations

- All tests pass (`pnpm test`)
- No lint errors (`pnpm lint`)
- No type errors (`pnpm typecheck`)
- Code follows the patterns in `CLAUDE.md`
