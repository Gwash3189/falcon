The plan is written. Key highlights:

  - 19 files to modify, no new packages beyond better-sqlite3
  - All query patterns (.returning(), CRUD, health check) work identically on SQLite
  - The identifiers array and jsonb columns become text({ mode: 'json' }) — Drizzle handles serialization automatically
  - Timestamps use integer({ mode: 'timestamp' }) to preserve Date types, avoiding downstream changes
  - No PG container needed for the database anymore — just a file at ./data/flagline.db
  - Existing migrations get deleted and regenerated fresh (no production deployments to worry about)

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plan: Migrate from PostgreSQL to SQLite

 Context

 Flagline's deployment model is npx @flagline/server — users install and run it directly. Requiring a PostgreSQL server is a heavy dependency for
 this use case. SQLite removes the need for a database container entirely — the server just writes to a local file. This dramatically simplifies
 setup and aligns with the zero-infrastructure goal.

 The codebase uses Drizzle ORM with clean abstractions (factory functions, no raw SQL beyond SELECT 1), making the migration straightforward. No
 transactions, no JSONB queries, no array operations in SQL — all PG-specific features are used only for storage, not query-time operations.

 Driver Choice

 better-sqlite3 with drizzle-orm/better-sqlite3. Most mature SQLite driver for Node, synchronous (fine for this workload), ships prebuilds for all
 major platforms. .returning() supported in SQLite 3.35+.

 ---
 Implementation Steps

 1. Update dependencies

 File: packages/server/package.json
 - Remove: postgres
 - Add: better-sqlite3, @types/better-sqlite3 (dev)
 - Keep: drizzle-orm, drizzle-kit (same versions, different import paths)

 2. Rewrite schema

 File: packages/server/src/db/schema.ts
 - pgTable → sqliteTable (from drizzle-orm/sqlite-core)
 - Column type mappings:

 ┌─────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────┐
 │             PostgreSQL              │                                  SQLite (Drizzle)                                   │
 ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
 │ uuid().primaryKey().defaultRandom() │ text('id').primaryKey().$defaultFn(() => crypto.randomUUID())                       │
 ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
 │ timestamp().notNull().defaultNow()  │ integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()) │
 ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
 │ timestamp() (nullable)              │ integer('revoked_at', { mode: 'timestamp' })                                        │
 ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
 │ boolean().notNull().default(false)  │ integer('enabled', { mode: 'boolean' }).notNull().default(false)                    │
 ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
 │ integer()                           │ integer() (unchanged)                                                               │
 ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
 │ jsonb()                             │ text('before_state', { mode: 'json' })                                              │
 ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
 │ text().array() (identifiers)        │ text('identifiers', { mode: 'json' }).$type<string[] | null>()                      │
 ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
 │ text()                              │ text() (unchanged)                                                                  │
 └─────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────┘

 - Using integer({ mode: 'timestamp' }) preserves Date types in inferred schema — no downstream type changes
 - { mode: 'json' } on text columns gives automatic JSON.stringify/parse — identifiers and audit state "just work"
 - Composite unique constraints and foreign key references use identical Drizzle API

 3. Rewrite connection factory

 File: packages/server/src/db/connection.ts
 - Replace postgres driver with better-sqlite3
 - Replace drizzle-orm/postgres-js with drizzle-orm/better-sqlite3
 - Remove connection pooling (max: 3) — SQLite is embedded
 - Add sqlite.pragma('journal_mode = WAL') for concurrent read performance
 - Add sqlite.pragma('foreign_keys = ON') — SQLite defaults to OFF
 - Ensure parent directory exists (mkdirSync with recursive: true) before creating DB file
 - Change parameter from url to path, default from config().DATABASE_URL to config().DATABASE_PATH

 4. Update config schema

 File: packages/server/src/config.ts
 - Replace DATABASE_URL: z.string().url() with DATABASE_PATH: z.string().min(1).default('./data/flagline.db')

 5. Update server factory

 File: packages/server/src/server.ts
 - DATABASE_URL → DATABASE_PATH in destructuring and createDb() call

 6. Update error detection

 File: packages/server/src/db/errors.ts
 - Replace PG error code '23505' with 'SQLITE_CONSTRAINT_UNIQUE'
 - better-sqlite3 errors have a code string property, same shape check works

 7. Update migration runner

 File: packages/server/src/db/migrate.ts
 - Change import from drizzle-orm/postgres-js/migrator to drizzle-orm/better-sqlite3/migrator

 8. Update drizzle config

 File: packages/server/drizzle.config.ts
 - dialect: 'postgresql' → dialect: 'sqlite'
 - dbCredentials.url → file path from DATABASE_PATH env var

 9. Delete old migrations, generate new

 Dir: packages/server/src/db/migrations/
 - Delete all 3 existing PG migration SQL files + meta directory
 - Run pnpm drizzle-kit generate to create fresh SQLite migration
 - No production deployments exist, so clean slate is safe

 10. Update graceful shutdown

 File: packages/server/src/index.ts
 - await db.$client.end() → db.$client.close() (better-sqlite3 is synchronous)

 11. Fix revokeByEmail return value

 File: packages/server/src/user-keys/service.ts
 - Line 58-62: bare .update().set().where() returns { changes: number } in better-sqlite3, not an array
 - Add .returning({ id: userApiKeys.id }) and return result.length — or use result.changes directly
 - Also update line 9: config().DATABASE_URL → config().DATABASE_PATH

 12. Update infrastructure files

 - docker-compose.yml: Remove postgres service and postgres_data volume, keep only valkey
 - .env.example: Replace DATABASE_URL=postgresql://... with DATABASE_PATH=./data/flagline.db
 - package.json (root): Update setup script — add mkdir -p data before migrate
 - .gitignore: Add data/ to prevent committing SQLite files

 13. Update test infrastructure

 - packages/server/src/__tests__/config.ts: DATABASE_URL → DATABASE_PATH
 - packages/server/src/__tests__/helpers/app.ts: Update to use DATABASE_PATH, update comments
 - packages/server/src/db/__tests__/connection.unit.test.ts: Invalid PG URL → invalid file path (nonexistent parent dir)
 - packages/server/src/db/__tests__/connection.integration.test.ts: DATABASE_URL → DATABASE_PATH
 - Integration tests no longer need a PG container — just a SQLite file. Much simpler.

 14. Update health check (verify only)

 File: packages/server/src/db/health.ts
 - db.execute(sql\SELECT 1`)` works identically in SQLite — no change needed
 - Just verify Db type import still resolves after connection.ts changes

 15. Update documentation

 File: CLAUDE.md
 - Tech stack: PostgreSQL → SQLite via better-sqlite3
 - Remove references to postgres driver, connection pooling, PG container
 - DATABASE_URL → DATABASE_PATH throughout
 - Update container section (only Valkey now)

 ---
 Files Changed (summary)

 ┌──────────────────────────────────────────────┬───────────────────────────────────────────────┐
 │                     File                     │                    Change                     │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/package.json                 │ Swap postgres → better-sqlite3                │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/db/schema.ts             │ pgTable → sqliteTable, all column types       │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/db/connection.ts         │ Rewrite for better-sqlite3 + WAL + FK pragmas │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/db/errors.ts             │ PG error code → SQLite error code             │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/db/migrate.ts            │ Import path change                            │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/config.ts                │ DATABASE_URL → DATABASE_PATH                  │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/server.ts                │ DATABASE_URL → DATABASE_PATH                  │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/index.ts                 │ .end() → .close()                             │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/user-keys/service.ts     │ Fix revokeByEmail + DATABASE_PATH             │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/drizzle.config.ts            │ dialect: sqlite                               │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/db/migrations/*          │ Delete all, regenerate                        │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ docker-compose.yml                           │ Remove postgres service                       │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ .env.example                                 │ DATABASE_PATH                                 │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ package.json (root)                          │ Setup script                                  │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ .gitignore                                   │ Add data/                                     │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/__tests__/config.ts      │ DATABASE_PATH                                 │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/__tests__/helpers/app.ts │ DATABASE_PATH                                 │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ packages/server/src/db/__tests__/*.test.ts   │ Update connection strings                     │
 ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ CLAUDE.md                                    │ Update tech stack docs                        │
 └──────────────────────────────────────────────┴───────────────────────────────────────────────┘

 Verification

 1. pnpm install — better-sqlite3 installs with prebuilds
 2. pnpm drizzle-kit generate — produces valid SQLite migration
 3. pnpm dev — server starts, creates data/flagline.db, runs migrations
 4. pnpm test:unit — all unit tests pass
 5. pnpm test:integration — all integration tests pass (no PG container needed for DB)
 6. pnpm lint && pnpm format && pnpm typecheck — clean
 7. Manual smoke test: create project → create environment → create flag → evaluate flag via CLI or curl

 Risks

 - better-sqlite3 is a native addon — ships prebuilds but could fail on exotic platforms. Acceptable for this project.
 - SQLite write serialization — only one write at a time. Fine for feature flag workload (low write volume, BullMQ audit writes serialize naturally).
 - Timestamp precision — integer({ mode: 'timestamp' }) stores seconds, not milliseconds. If sub-second precision matters, use integer({ mode:
 'timestamp_ms' }) instead.
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
