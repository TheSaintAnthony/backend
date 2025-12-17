import {
  pgTable,
  uuid,
  integer,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

// Dynamic lookup tables (admin-manageable)
export const amenities = pgTable('amenities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const roomTypes = pgTable('room_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  maxCapacity: integer('max_capacity').notNull(),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const highlights = pgTable('highlights', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const activityCategories = pgTable('activity_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Static lookup tables (system-managed, seeded)
export const reservationStatus = pgTable('reservation_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  isSystemManaged: boolean('is_system_managed').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const invoiceStatus = pgTable('invoice_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  isSystemManaged: boolean('is_system_managed').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const invoiceTypes = pgTable('invoice_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: varchar('description', { length: 255 }),
  isSystemManaged: boolean('is_system_managed').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const occurrenceStatus = pgTable('occurence_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  isSystemManaged: boolean('is_system_managed').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  isSystemManaged: boolean('is_system_managed').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const paymentStatus = pgTable('payment_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  isSystemManaged: boolean('is_system_managed').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
