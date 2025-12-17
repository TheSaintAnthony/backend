import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import type { RoomWithDetails } from '../interfaces';

/**
 * Builds the query for fetching rooms by property with amenities and highlights
 */
export function buildRoomsByPropertyQuery(
  db: NodePgDatabase<typeof schema>,
  propertyId: string,
  roomIds: Array<{ id: string }>,
) {
  return db
    .select({
      id: schema.rooms.id,
      name: schema.rooms.name,
      description: schema.rooms.description,
      bedCount: schema.rooms.bedCount,
      bathroomCount: schema.rooms.bathroomCount,
      quantity: schema.rooms.quantity,
      available: schema.rooms.available,
      roomType: schema.roomTypes.name,
      maxCapacity: schema.roomTypes.maxCapacity,
      amenityId: schema.amenities.id,
      amenityName: schema.amenities.name,
      highlightId: schema.highlights.id,
      highlightName: schema.highlights.name,
      roomTypeId: schema.rooms.roomTypeId,
    })
    .from(schema.rooms)
    .leftJoin(
      schema.roomTypes,
      eq(schema.rooms.roomTypeId, schema.roomTypes.id),
    )
    .leftJoin(
      schema.roomAmenities,
      eq(schema.roomAmenities.roomId, schema.rooms.id),
    )
    .leftJoin(
      schema.roomHighlights,
      eq(schema.roomHighlights.roomId, schema.rooms.id),
    )
    .leftJoin(
      schema.amenities,
      eq(schema.amenities.id, schema.roomAmenities.amenityId),
    )
    .leftJoin(
      schema.highlights,
      eq(schema.highlights.id, schema.roomHighlights.highlightId),
    )
    .where(
      and(
        inArray(
          schema.rooms.id,
          roomIds.map((r) => r.id),
        ),
        isNull(schema.rooms.deletedAt),
      ),
    );
}

/**
 * Maps room query results to RoomWithDetails objects
 */
export function mapRoomsQueryResults(
  roomsData: Array<{
    id: string;
    name: string;
    description: string | null;
    bedCount: number | null;
    bathroomCount: number | null;
    quantity: number | null;
    available: boolean;
    roomType: string | null;
    maxCapacity: number | null;
    amenityId: string | null;
    amenityName: string | null;
    highlightId: string | null;
    highlightName: string | null;
    roomTypeId: string | null;
  }>,
  propertyId: string,
): RoomWithDetails[] {
  const roomsMap = new Map<string, RoomWithDetails>();

  for (const row of roomsData) {
    if (!roomsMap.has(row.id)) {
      roomsMap.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        bedCount: row.bedCount,
        bathroomCount: row.bathroomCount,
        quantity: row.quantity,
        available: row.available,
        roomType: row.roomType,
        maxCapacity: row.maxCapacity,
        amenities: [],
        highlights: [],
        propertyId: propertyId,
        roomTypeId: row.roomTypeId,
      });
    }
    const room = roomsMap.get(row.id)!;
    if (row.amenityId && !room.amenities.some((a) => a.id === row.amenityId)) {
      room.amenities.push({ id: row.amenityId, name: row.amenityName! });
    }
    if (
      row.highlightId &&
      !room.highlights.some((h) => h.id === row.highlightId)
    ) {
      room.highlights.push({ id: row.highlightId, name: row.highlightName! });
    }
  }

  return Array.from(roomsMap.values());
}
