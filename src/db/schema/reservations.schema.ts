import {
  pgTable,
  integer,
  numeric,
  timestamp,
  check,
  text,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema';
import { paymentStatus, reservationStatus } from './lookup-tables.schema';

export const reservations = pgTable(
  'reservations',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    statusId: integer('status_id').references(() => reservationStatus.id),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
    paymentStatusId: integer('payment_status_id')
      .notNull()
      .references(() => paymentStatus.id, { onDelete: 'cascade' }),
    depositAmount: numeric('deposit_amount', {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default('0.0'),
    balanceDue: numeric('balance_due', {
      precision: 10,
      scale: 2,
    }).generatedAlwaysAs(`total_price - deposit_amout`),
    specialRequests: text('special_requests'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  () => ({
    checkDepositAmount: check(
      'check_deposit_amount',
      sql`deposit_amount <=total_price`,
    ),
    checkTotalPrice: check('check_total_price', sql`total_price >= 0`),
  }),
);
