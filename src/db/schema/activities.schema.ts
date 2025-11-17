import { uuid } from 'drizzle-orm/pg-core';
import { varchar, text } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
});
