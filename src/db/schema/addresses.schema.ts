import { uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  street: varchar('street', { length: 100 }).notNull(),
  city: varchar('city', { length: 50 }).notNull(),
  zipCode: varchar('zip_code', { length: 10 }).notNull(),
  country: varchar('country', { length: 50 }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
