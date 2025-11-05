import {
  pgTable,
  integer,
  numeric,
  timestamp,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { reservations } from './reservations.schema';
import { invoiceStatus } from './lookup-tables.schema';

export const invoices = pgTable(
  'invoices',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    reservationId: integer('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    statusId: integer('status_id').references(() => invoiceStatus.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  () => ({
    checkAmount: check('check_amount_positive', sql`amount >= 0`),
  }),
);
