import { pgTable, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { rooms } from './rooms.schema';
import { highlights } from './lookup-tables.schema';
export const roomHighlights = pgTable(
  'room_highlights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    highlightId: uuid('highlight_id')
      .notNull()
      .references(() => highlights.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    uniqueRoomHighlight: uniqueIndex('unique_room_highlight').on(
      table.roomId,
      table.highlightId,
    ),
  }),
);
