import { pgTable, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { rooms } from './rooms.schema';
import { amenities } from './lookup-tables.schema';

export const roomAmenities = pgTable(
  'room_amenities',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    roomId: integer('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    amenityId: integer('amenity_id')
      .notNull()
      .references(() => amenities.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    uniqueRoomAmenity: uniqueIndex('unique_room_amenity').on(
      table.roomId,
      table.amenityId,
    ),
  }),
);
