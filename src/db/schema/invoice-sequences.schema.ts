import {
  pgTable,
  uuid,
  integer,
  varchar,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
export const invoiceSequences = pgTable(
  'invoice_sequences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    year: integer('year').notNull(),
    sequence: integer('sequence').notNull().default(0),
    prefix: varchar('prefix', { length: 20 }).notNull().default('INV'),
  },
  (table) => ({
    uniqueYearPrefix: uniqueIndex('unique_year_prefix_idx').on(
      table.year,
      table.prefix,
    ),
  }),
);
