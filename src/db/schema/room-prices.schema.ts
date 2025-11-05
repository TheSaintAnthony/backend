import {
  pgTable,
  integer,
  numeric,
  date,
  timestamp,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { rooms } from './rooms.schema';

export const roomPrices = pgTable(
  'room_prices',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    roomId: integer('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    checkDates: check(
      'check_price_dates',
      sql`${table.endDate} > ${table.startDate}`,
    ),
    checkPrice: check('check_price_positive', sql`${table.price} > 0`),
  }),
);
