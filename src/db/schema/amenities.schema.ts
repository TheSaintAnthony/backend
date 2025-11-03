import { pgTable } from 'drizzle-orm/pg-core';
import { integer, varchar } from 'drizzle-orm/pg-core';

export const amenities = pgTable('amenities', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).unique().notNull(),
});
