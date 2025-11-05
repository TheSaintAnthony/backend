import {
  pgTable,
  integer,
  numeric,
  varchar,
  timestamp,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { invoices } from './invoices.schema';
import { paymentMethods } from './lookup-tables.schema';

export const payments = pgTable(
  'payments',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    invoiceId: integer('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethodId: integer('payment_method_id')
      .notNull()
      .references(() => paymentMethods.id),
    transactionId: varchar('transaction_id', { length: 255 }),
    paidAt: timestamp('paid_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  () => ({
    checkAmount: check('check_payment_amount_positive', sql`amount > 0`),
  }),
);
