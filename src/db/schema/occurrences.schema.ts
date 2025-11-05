import { pgTable, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { reservations } from './reservations.schema';
import { occurrenceStatus } from './lookup-tables.schema';

export const occurrences = pgTable('occurrences', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  reservationId: integer('reservation_id')
    .notNull()
    .references(() => reservations.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  statusId: integer('status_id').references(() => occurrenceStatus.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
