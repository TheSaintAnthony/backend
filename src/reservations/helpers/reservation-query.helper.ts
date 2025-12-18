import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, and, isNull, SQL } from 'drizzle-orm';
import type { ReservationWithRooms } from '../interfaces';

/**
 * Builds the base query for fetching reservation details with all related data
 */
export function buildReservationDetailQuery(db: NodePgDatabase<typeof schema>) {
  return db
    .select({
      reservationId: schema.reservations.id,
      userId: schema.reservations.userId,
      statusId: schema.reservations.statusId,
      statusName: schema.reservationStatus.name,
      totalPrice: schema.reservations.totalPrice,
      paymentStatusId: schema.reservations.paymentStatusId,
      paymentStatusName: schema.paymentStatus.name,
      specialRequests: schema.reservations.specialRequests,
      createdAt: schema.reservations.createdAt,
      updatedAt: schema.reservations.updatedAt,
      roomId: schema.reservationRooms.id,
      roomReservationId: schema.reservationRooms.reservationId,
      roomRoomId: schema.reservationRooms.roomId,
      checkIn: schema.reservationRooms.checkIn,
      checkOut: schema.reservationRooms.checkOut,
      guestsCount: schema.reservationRooms.guestsCount,
      accessCode: schema.reservationRooms.accessCode,
      roomName: schema.rooms.name,
      roomDescription: schema.rooms.description,
      bedCount: schema.rooms.bedCount,
      bathroomCount: schema.rooms.bathroomCount,
      roomTypeName: schema.roomTypes.name,
      maxCapacity: schema.roomTypes.maxCapacity,
      propertyId: schema.properties.id,
      propertyName: schema.properties.name,
      invoiceUrl: schema.invoices.externalInvoiceUrl,
      invoiceTotalAmount: schema.invoices.totalAmount,
    })
    .from(schema.reservations)
    .leftJoin(
      schema.reservationStatus,
      eq(schema.reservations.statusId, schema.reservationStatus.id),
    )
    .leftJoin(
      schema.paymentStatus,
      eq(schema.reservations.paymentStatusId, schema.paymentStatus.id),
    )
    .leftJoin(
      schema.reservationRooms,
      and(
        eq(schema.reservations.id, schema.reservationRooms.reservationId),
        isNull(schema.reservationRooms.deletedAt),
      ),
    )
    .leftJoin(schema.rooms, eq(schema.reservationRooms.roomId, schema.rooms.id))
    .leftJoin(
      schema.roomTypes,
      eq(schema.rooms.roomTypeId, schema.roomTypes.id),
    )
    .leftJoin(
      schema.properties,
      eq(schema.rooms.propertyId, schema.properties.id),
    )
    .leftJoin(
      schema.invoices,
      eq(schema.reservations.id, schema.invoices.reservationId),
    );
}

/**
 * Maps query results to a ReservationWithRooms object
 */
export function mapReservationQueryResults(
  results: any[],
): ReservationWithRooms {
  if (results.length === 0) {
    throw new Error('No results to map');
  }

  const firstRow = results[0];
  const reservation: ReservationWithRooms = {
    id: firstRow.reservationId,
    userId: firstRow.userId,
    statusId: firstRow.statusId,
    statusName: firstRow.statusName || '',
    totalPrice: firstRow.totalPrice,
    paymentStatusId: firstRow.paymentStatusId,
    paymentStatusName: firstRow.paymentStatusName || '',
    specialRequests: firstRow.specialRequests,
    createdAt: firstRow.createdAt,
    updatedAt: firstRow.updatedAt,
    invoiceUrl: firstRow.invoiceUrl || null,
    invoiceTotalAmount: firstRow.invoiceTotalAmount || null,
    rooms: [],
  };

  for (const row of results) {
    if (row.roomId !== null) {
      reservation.rooms.push({
        id: row.roomId,
        reservationId: row.roomReservationId!,
        roomId: row.roomRoomId!,
        checkIn: row.checkIn!,
        checkOut: row.checkOut!,
        guestsCount: row.guestsCount!,
        accessCode: row.accessCode,
        roomName: row.roomName!,
        roomDescription: row.roomDescription,
        bedCount: row.bedCount,
        bathroomCount: row.bathroomCount,
        roomTypeName: row.roomTypeName,
        maxCapacity: row.maxCapacity,
        propertyId: row.propertyId,
        propertyName: row.propertyName,
      });
    }
  }

  return reservation;
}
