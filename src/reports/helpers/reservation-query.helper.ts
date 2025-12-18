import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export async function getReservationDetails(
  db: NodePgDatabase<typeof schema>,
  conditions: any[],
) {
  return db
    .select({
      reservationId: schema.reservations.id,
      checkIn: schema.reservationRooms.checkIn,
      checkOut: schema.reservationRooms.checkOut,
      guestsCount: schema.reservationRooms.guestsCount,
      accessCode: schema.reservationRooms.accessCode,
      roomId: schema.rooms.id,
      roomName: schema.rooms.name,
      propertyId: schema.properties.id,
      propertyName: schema.properties.name,
      userId: schema.users.id,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      userEmail: schema.users.email,
      userPhone: schema.users.phone,
      statusId: schema.reservations.statusId,
      statusName: schema.reservationStatus.name,
      totalPrice: schema.reservations.totalPrice,
      specialRequests: schema.reservations.specialRequests,
    })
    .from(schema.reservationRooms)
    .innerJoin(
      schema.reservations,
      eq(schema.reservationRooms.reservationId, schema.reservations.id),
    )
    .innerJoin(
      schema.rooms,
      eq(schema.reservationRooms.roomId, schema.rooms.id),
    )
    .innerJoin(
      schema.properties,
      eq(schema.rooms.propertyId, schema.properties.id),
    )
    .innerJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
    .innerJoin(
      schema.reservationStatus,
      eq(schema.reservations.statusId, schema.reservationStatus.id),
    )
    .where(and(...conditions, isNull(schema.reservations.deletedAt)));
}
