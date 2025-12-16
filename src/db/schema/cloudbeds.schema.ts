import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  integer,
  numeric,
  jsonb,
  date,
} from 'drizzle-orm/pg-core';
import { properties } from './properties.schema';
import { rooms } from './rooms.schema';
import { reservations } from './reservations.schema';

export const cloudbedsProperties = pgTable('cloudbeds_properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  cloudbedsPropertyId: varchar('cloudbeds_property_id', { length: 255 }),
  syncEnabled: boolean('sync_enabled').default(true).notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  syncStatus: varchar('sync_status', { length: 50 }).default('pending').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cloudbedsRooms = pgTable('cloudbeds_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  cloudbedsPropertyId: uuid('cloudbeds_property_id')
    .notNull()
    .references(() => cloudbedsProperties.id, { onDelete: 'cascade' }),
  cloudbedsRoomTypeId: varchar('cloudbeds_room_type_id', { length: 255 }),
  rateId: varchar('rate_id', { length: 255 }),
  syncEnabled: boolean('sync_enabled').default(true).notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  syncStatus: varchar('sync_status', { length: 50 }).default('pending').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cloudbedsReservations = pgTable('cloudbeds_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  reservationId: uuid('reservation_id').references(() => reservations.id, {
    onDelete: 'set null',
  }),
  cloudbedsReservationId: varchar('cloudbeds_reservation_id', { length: 255 })
    .notNull()
    .unique(),
  cloudbedsPropertyId: uuid('cloudbeds_property_id')
    .notNull()
    .references(() => cloudbedsProperties.id),
  channelName: varchar('channel_name', { length: 100 }),
  guestName: varchar('guest_name', { length: 255 }),
  guestEmail: varchar('guest_email', { length: 255 }),
  guestPhone: varchar('guest_phone', { length: 50 }),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  guestsCount: integer('guests_count').notNull(),
  adultsCount: integer('adults_count').notNull(),
  childrenCount: integer('children_count').default(0).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('EUR').notNull(),
  status: varchar('status', { length: 50 }).default('confirmed').notNull(),
  thirdPartyIdentifier: varchar('third_party_identifier', { length: 255 }),
  rawData: jsonb('raw_data'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cloudbedsSyncJobs = pgTable('cloudbeds_sync_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  operation: varchar('operation', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  errorMessage: text('error_message'),
  payload: jsonb('payload'),
  response: jsonb('response'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

