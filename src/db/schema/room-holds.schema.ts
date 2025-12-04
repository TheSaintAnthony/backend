import { pgTable, uuid, date, timestamp } from 'drizzle-orm/pg-core';
import { rooms } from './rooms.schema';
import { users } from './users.schema';
export const roomHolds = pgTable('room_holds', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
