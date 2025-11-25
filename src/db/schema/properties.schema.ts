import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  time,
  numeric,
} from 'drizzle-orm/pg-core';
import { addresses } from './addresses.schema';

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  about: text('about'),
  addressId: uuid('address_id').references(() => addresses.id),
  email: varchar('email', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  checkInTime: time('check_in_time').default('15:00').notNull(),
  checkOutTime: time('check_out_time').default('11:00').notNull(),
  tourismFee: numeric('tourism_fee', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
