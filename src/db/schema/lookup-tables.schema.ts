import {
  pgTable,
  uuid,
  integer,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const amenities = pgTable('amenities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  nameFr: varchar('name_fr', { length: 100 }),
  nameDe: varchar('name_de', { length: 100 }),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const roomTypes = pgTable('room_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  nameFr: varchar('name_fr', { length: 100 }),
  nameDe: varchar('name_de', { length: 100 }),
  maxCapacity: integer('max_capacity').notNull(),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const highlights = pgTable('highlights', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  nameFr: varchar('name_fr', { length: 100 }),
  nameDe: varchar('name_de', { length: 100 }),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const activityCategories = pgTable('activity_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  nameEn: varchar('name_en', { length: 255 }),
  nameFr: varchar('name_fr', { length: 255 }),
  nameDe: varchar('name_de', { length: 255 }),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  nameFr: varchar('name_fr', { length: 255 }),
  nameDe: varchar('name_de', { length: 255 }),
  displayOrder: integer('display_order').default(0).notNull(),
  isSystemManaged: boolean('is_system_managed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

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
