/**
 * Combined schema file for drizzle-kit migration tooling.
 * All tables defined here to avoid cross-file ESM import issues with drizzle-kit's CJS loader.
 * Individual files in schema/ import from this file and re-export for application use.
 */
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const environments = sqliteTable(
  'environments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [unique().on(t.projectId, t.slug)],
);

export const flags = sqliteTable(
  'flags',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    environmentId: text('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    type: text('type').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
    percentage: integer('percentage'),
    identifiers: text('identifiers', { mode: 'json' }).$type<string[] | null>(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [unique().on(t.environmentId, t.key)],
);

export const apiKeys = sqliteTable('api_keys', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  environmentId: text('environment_id')
    .notNull()
    .references(() => environments.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
});

export const userApiKeys = sqliteTable('user_api_keys', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  flagId: text('flag_id').notNull(),
  environmentId: text('environment_id').notNull(),
  action: text('action').notNull(),
  actor: text('actor'),
  beforeState: text('before_state', { mode: 'json' }),
  afterState: text('after_state', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Environment = typeof environments.$inferSelect;
export type NewEnvironment = typeof environments.$inferInsert;

export type Flag = typeof flags.$inferSelect;
export type NewFlag = typeof flags.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;

export type UserApiKey = typeof userApiKeys.$inferSelect;
export type NewUserApiKey = typeof userApiKeys.$inferInsert;
