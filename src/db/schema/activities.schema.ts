import { uuid } from 'drizzle-orm/pg-core';
import { varchar, text, numeric, integer } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { activityCategories } from './lookup-tables.schema';
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  nameEn: varchar('name_en', { length: 255 }),
  nameFr: varchar('name_fr', { length: 255 }),
  nameDe: varchar('name_de', { length: 255 }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => activityCategories.id, { onDelete: 'no action' }),
  description: text('description'),
  descriptionEn: text('description_en'),
  descriptionFr: text('description_fr'),
  descriptionDe: text('description_de'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  duration: varchar('duration', { length: 50 }).notNull(),
  maxGuests: integer('max_guests'),
});
