import { pgTable } from 'drizzle-orm/pg-core';
import { integer, varchar } from 'drizzle-orm/pg-core';

export const amenities = pgTable('amenities', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).unique().notNull(),
});

export const roomTypes = pgTable('room_types', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  maxCapacity: integer('max_capacity').notNull(),
});

export const highlights = pgTable('highlights', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).unique().notNull(),
});

export const reservationStatus = pgTable('reservation_status', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).unique().notNull(),
});

export const invoiceStatus = pgTable('invoice_status', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).unique().notNull(),
});

export const occurrenceStatus = pgTable('occurence_status', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).unique().notNull(),
});

export const roles = pgTable('roles', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).unique().notNull(),
});

export const paymentStatus = pgTable('payment_status', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).unique().notNull(),
});

export const paymentMethods = pgTable('payment_methods', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).unique().notNull(),
});
