import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { addresses } from './addresses.schema';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  addressId: uuid('address_id').references(() => addresses.id, {
    onDelete: 'cascade',
  }),
  nif: varchar('nif', { length: 20 }),
  companyName: varchar('company_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
