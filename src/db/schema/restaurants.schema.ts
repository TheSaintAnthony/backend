import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { addresses } from './addresses.schema';
export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  addressId: uuid('address_id').references(() => addresses.id),
  email: varchar('email', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  website: text('website'),
  openingHours: text('opening_hours'), // JSON or text field
  cuisineType: varchar('cuisine_type', { length: 100 }),
  priceRange: varchar('price_range', { length: 20 }), // €, €€, €€€
  capacity: integer('capacity'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
