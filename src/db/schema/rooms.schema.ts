import {
  pgTable,
  integer,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { properties } from './properties.schema';
import { roomTypes } from './lookup-tables.schema';
import { boolean } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  roomTypeId: integer('room_type_id').references(() => roomTypes.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  bedCount: integer('bed_count'),
  bathroomCount: integer('bathroom_count'),
  available: boolean('available').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
