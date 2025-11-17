import {
  pgTable,
  uuid,
  integer,
  uniqueIndex,
  date,
  timestamp,
  check,
} from 'drizzle-orm/pg-core';
import { rooms } from './rooms.schema';
import { reservations } from './reservations.schema';
import { sql } from 'drizzle-orm';

export const reservationRooms = pgTable(
  'reservation_rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    guestsCount: integer('guests_count').notNull().default(1),
    accessCode: integer('access_code').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    uniqueReservationRoom: uniqueIndex('unique_reservation_room').on(
      table.roomId,
      table.reservationId,
    ),
    uniqueAccessCodeWithinDates: uniqueIndex(
      'unique_access_code_within_date',
    ).on(table.accessCode, table.checkIn, table.checkOut),
    checkDates: check('check_reservation_dates', sql`check_out > check_in`),
    checkGuestsCount: check('check_guests_count', sql`guests_count > 0`),
  }),
);
