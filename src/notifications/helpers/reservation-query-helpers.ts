import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { and, eq, isNull, gte, lte, sql } from 'drizzle-orm';

export async function getCheckInReminderReservations(
  db: NodePgDatabase<typeof schema>,
  confirmedStatusId: string,
  hoursFrom12: Date,
  hoursFrom48: Date,
) {
  return db
    .select({
      reservationId: schema.reservations.id,
      userId: schema.reservations.userId,
      specialRequests: schema.reservations.specialRequests,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      userEmail: schema.users.email,
      roomId: schema.reservationRooms.id,
      checkIn: schema.reservationRooms.checkIn,
      checkOut: schema.reservationRooms.checkOut,
      accessCode: schema.reservationRooms.accessCode,
      guestsCount: schema.reservationRooms.guestsCount,
      roomName: schema.rooms.name,
      propertyId: schema.properties.id,
      propertyName: schema.properties.name,
      propertyEmail: schema.properties.email,
      propertyPhone: schema.properties.phoneNumber,
      checkInTime: schema.properties.checkInTime,
      arrivalInstructions: schema.properties.arrivalInstructions,
      addressStreet: schema.addresses.street,
      addressCity: schema.addresses.city,
      addressZipCode: schema.addresses.zipCode,
      addressCountry: schema.addresses.country,
    })
    .from(schema.reservations)
    .innerJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
    .innerJoin(
      schema.reservationRooms,
      eq(schema.reservations.id, schema.reservationRooms.reservationId),
    )
    .innerJoin(
      schema.rooms,
      eq(schema.reservationRooms.roomId, schema.rooms.id),
    )
    .innerJoin(
      schema.properties,
      eq(schema.rooms.propertyId, schema.properties.id),
    )
    .leftJoin(
      schema.addresses,
      eq(schema.properties.addressId, schema.addresses.id),
    )
    .where(
      and(
        eq(schema.reservations.statusId, confirmedStatusId),
        isNull(schema.reservations.checkinReminderSentAt),
        isNull(schema.reservations.deletedAt),
        isNull(schema.reservationRooms.deletedAt),
        gte(
          schema.reservationRooms.checkIn,
          hoursFrom12.toISOString().split('T')[0],
        ),
        lte(
          schema.reservationRooms.checkIn,
          hoursFrom48.toISOString().split('T')[0],
        ),
      ),
    );
}

export async function getCheckOutReminderReservations(
  db: NodePgDatabase<typeof schema>,
  validStatusIds: string[],
  startOfDay: Date,
  endOfDay: Date,
) {
  return db
    .select({
      reservationId: schema.reservations.id,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      userEmail: schema.users.email,
      checkOut: schema.reservationRooms.checkOut,
      roomName: schema.rooms.name,
      propertyName: schema.properties.name,
      checkOutTime: schema.properties.checkOutTime,
    })
    .from(schema.reservations)
    .innerJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
    .innerJoin(
      schema.reservationRooms,
      eq(schema.reservations.id, schema.reservationRooms.reservationId),
    )
    .innerJoin(
      schema.rooms,
      eq(schema.reservationRooms.roomId, schema.rooms.id),
    )
    .innerJoin(
      schema.properties,
      eq(schema.rooms.propertyId, schema.properties.id),
    )
    .where(
      and(
        sql`${schema.reservations.statusId} IN (${sql.join(
          validStatusIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
        isNull(schema.reservations.checkoutReminderSentAt),
        isNull(schema.reservations.deletedAt),
        isNull(schema.reservationRooms.deletedAt),
        gte(
          sql`${schema.reservationRooms.checkOut}::date`,
          startOfDay.toISOString().split('T')[0],
        ),
        lte(
          sql`${schema.reservationRooms.checkOut}::date`,
          endOfDay.toISOString().split('T')[0],
        ),
      ),
    );
}

export async function getPostStayReservations(
  db: NodePgDatabase<typeof schema>,
  validStatusIds: string[],
  yesterdayStr: string,
) {
  return db
    .select({
      reservationId: schema.reservations.id,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      userEmail: schema.users.email,
      checkIn: schema.reservationRooms.checkIn,
      checkOut: schema.reservationRooms.checkOut,
      propertyName: schema.properties.name,
    })
    .from(schema.reservations)
    .innerJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
    .innerJoin(
      schema.reservationRooms,
      eq(schema.reservations.id, schema.reservationRooms.reservationId),
    )
    .innerJoin(
      schema.rooms,
      eq(schema.reservationRooms.roomId, schema.rooms.id),
    )
    .innerJoin(
      schema.properties,
      eq(schema.rooms.propertyId, schema.properties.id),
    )
    .where(
      and(
        sql`${schema.reservations.statusId} IN (${sql.join(
          validStatusIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
        isNull(schema.reservations.postStayEmailSentAt),
        isNull(schema.reservations.deletedAt),
        isNull(schema.reservationRooms.deletedAt),
        eq(sql`${schema.reservationRooms.checkOut}::date`, yesterdayStr),
      ),
    );
}
