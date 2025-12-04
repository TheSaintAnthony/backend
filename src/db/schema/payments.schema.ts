import {
  pgTable,
  uuid,
  numeric,
  varchar,
  timestamp,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { invoices } from './invoices.schema';
import { paymentStatus } from './lookup-tables.schema';
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    paymentStatusId: uuid('payment_status_id')
      .notNull()
      .references(() => paymentStatus.id),
    transactionId: varchar('transaction_id', { length: 255 }),
    externalReferenceId: varchar('external_reference_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  () => ({
    checkAmount: check('check_payment_amount_positive', sql`amount > 0`),
  }),
);
