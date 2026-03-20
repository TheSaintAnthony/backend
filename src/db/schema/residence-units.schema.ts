import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  timestamp,
  numeric,
} from 'drizzle-orm/pg-core';
import { residences } from './residences.schema';
export const residenceUnits = pgTable('residence_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  residenceId: uuid('residence_id')
    .notNull()
    .references(() => residences.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  nameFr: varchar('name_fr', { length: 100 }),
  nameDe: varchar('name_de', { length: 100 }),
  typology: varchar('typology', { length: 10 }), // T1, T2, T3, etc.
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  area: numeric('area', { precision: 8, scale: 2 }), // in m²
  floor: integer('floor'),
  status: varchar('status', { length: 20 }).default('available').notNull(), // available, reserved, sold
  description: text('description'),
  descriptionEn: text('description_en'),
  descriptionFr: text('description_fr'),
  descriptionDe: text('description_de'),
  bedroomCount: integer('bedroom_count'),
  bathroomCount: integer('bathroom_count'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
