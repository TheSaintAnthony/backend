import {
  pgTable,
  uuid,
  integer,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 255 }).notNull().unique(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    requestBody: jsonb('request_body'),
    responseBody: jsonb('response_body'),
    statusCode: integer('status_code'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    keyIdx: index('idx_idempotency_key').on(table.key),
    expiresAtIdx: index('idx_idempotency_expires_at').on(table.expiresAt),
  }),
);
