import { integer, varchar } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

export const addresses = pgTable('addresses', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  street: varchar('street', { length: 100 }).notNull(),
  city: varchar('city', { length: 50 }).notNull(),
  zip_code: varchar('zip_code', { length: 10 }).notNull(),
  country: varchar('country', { length: 50 }).notNull(),
});
