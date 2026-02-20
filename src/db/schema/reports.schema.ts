import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Anonymous reporting
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  reporterName: varchar('reporter_name', { length: 255 }),
  reporterEmail: varchar('reporter_email', { length: 255 }),

  // Report details
  subject: varchar('subject', { length: 100 }).notNull(), // predefined category
  relationship: varchar('relationship', { length: 50 }).notNull(), // employee|client|candidate|partner|supplier
  occurrenceDate: timestamp('occurrence_date', {
    withTimezone: true,
  }).notNull(),
  description: text('description').notNull(),

  // Consent checkboxes
  goodFaithDeclaration: boolean('good_faith_declaration').notNull(),
  dataConsentGiven: boolean('data_consent_given').notNull(),

  // Status for admin tracking
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending|reviewed|resolved

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
