import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { addresses } from './addresses.schema';
export const residences = pgTable('residences', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  nameFr: varchar('name_fr', { length: 255 }),
  nameDe: varchar('name_de', { length: 255 }),
  description: text('description'),
  descriptionEn: text('description_en'),
  descriptionFr: text('description_fr'),
  descriptionDe: text('description_de'),
  about: text('about'),
  aboutEn: text('about_en'),
  aboutFr: text('about_fr'),
  aboutDe: text('about_de'),
  addressId: uuid('address_id').references(() => addresses.id),
  email: varchar('email', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
