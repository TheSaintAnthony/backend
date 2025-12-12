import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  boolean,
  numeric,
  pgEnum,
  text,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema';
import { reservations } from './reservations.schema';

// Discount type enum
export const discountTypeEnum = pgEnum('discount_type', [
  'percentage',
  'fixed_amount',
]);

// Coupons table (synced with Stripe Coupons)
export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stripeCouponId: varchar('stripe_coupon_id', { length: 255 })
      .notNull()
      .unique(),
    name: varchar('name', { length: 255 }).notNull(),
    discountType: discountTypeEnum('discount_type').notNull(),
    discountValue: numeric('discount_value', {
      precision: 10,
      scale: 2,
    }).notNull(),
    currency: varchar('currency', { length: 3 }).default('EUR').notNull(),
    maxRedemptions: integer('max_redemptions'),
    timesRedeemed: integer('times_redeemed').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: text('metadata'), // JSON string for additional data
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    checkDiscountValue: check(
      'check_discount_value_positive',
      sql`${table.discountValue} >= 0`,
    ),
  }),
);

// Promo Codes table (synced with Stripe Promotion Codes)
export const promoCodes = pgTable(
  'promo_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stripePromoCodeId: varchar('stripe_promo_code_id', { length: 255 })
      .notNull()
      .unique(),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull().unique(),
    maxRedemptions: integer('max_redemptions'),
    maxRedemptionsPerUser: integer('max_redemptions_per_user'),
    timesRedeemed: integer('times_redeemed').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    isVisibleToUsers: boolean('is_visible_to_users').default(false).notNull(),
    restrictedToProducts: text('restricted_to_products'), // JSON array of product IDs
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    checkTimesRedeemed: check(
      'check_times_redeemed_positive',
      sql`${table.timesRedeemed} >= 0`,
    ),
  }),
);

// User Promo Code Redemptions tracking
export const promoCodeRedemptions = pgTable('promo_code_redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  promoCodeId: uuid('promo_code_id')
    .notNull()
    .references(() => promoCodes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  reservationId: uuid('reservation_id').references(() => reservations.id, {
    onDelete: 'set null',
  }),
  discountAmount: numeric('discount_amount', {
    precision: 10,
    scale: 2,
  }).notNull(),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
