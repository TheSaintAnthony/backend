import { pgTable, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { rooms } from './rooms.schema';
import { highlights } from './lookup-tables.schema';

export const roomHighlights = pgTable(
  'room_highlights',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    roomId: integer('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    highlightId: integer('highlight_id')
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
