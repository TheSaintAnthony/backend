import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { properties } from './properties.schema';
import { roomTypes } from './lookup-tables.schema';
import { boolean } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  roomTypeId: uuid('room_type_id').references(() => roomTypes.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  bedCount: integer('bed_count'),
  bathroomCount: integer('bathroom_count'),
  quantity: integer('quantity').default(1).notNull(),
  available: boolean('available').default(true).notNull(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
