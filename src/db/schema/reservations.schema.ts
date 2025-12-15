import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  check,
  text,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema';
import { paymentStatus, reservationStatus } from './lookup-tables.schema';
// Note: promoCodeId references promo_codes table but we don't import it here
// to avoid circular dependency. The FK is defined in the migration.
export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    statusId: uuid('status_id').references(() => reservationStatus.id),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
    paymentStatusId: uuid('payment_status_id')
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
    // FK to promo_codes defined in migration to avoid circular import
    promoCodeId: uuid('promo_code_id'),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }),
    specialRequests: text('special_requests'),
    checkinReminderSentAt: timestamp('checkin_reminder_sent_at', {
      withTimezone: true,
    }),
    checkoutReminderSentAt: timestamp('checkout_reminder_sent_at', {
      withTimezone: true,
    }),
    postStayEmailSentAt: timestamp('post_stay_email_sent_at', {
      withTimezone: true,
    }),
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
