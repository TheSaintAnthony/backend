import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { residences } from './residences.schema';
import { residenceUnits } from './residence-units.schema';
export const residenceContacts = pgTable('residence_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  residenceId: uuid('residence_id').references(() => residences.id, {
    onDelete: 'set null',
  }),
  residenceUnitId: uuid('residence_unit_id').references(
    () => residenceUnits.id,
    {
      onDelete: 'set null',
    },
  ),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  message: text('message'),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, contacted, closed
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
