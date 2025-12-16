import { Injectable } from '@nestjs/common';
import * as schema from '../db/schema';

@Injectable()
export class CloudBedsMapperService {
  /**
   * Map our Property to CloudBeds format
   */
  mapPropertyToCloudBeds(
    property: typeof schema.properties.$inferSelect,
    address: typeof schema.addresses.$inferSelect,
  ): any {
    return {
      propertyName: property.name,
      description: property.description,
      address: {
        address1: address.street,
        city: address.city,
        zip: address.zipCode,
        country: address.country,
      },
      contact: {
        email: property.email,
        phone: property.phoneNumber,
      },
      checkInTime: property.checkInTime,
      checkOutTime: property.checkOutTime,
    };
  }

  /**
   * Map our Room to CloudBeds RoomType format
   */
  mapRoomToCloudBeds(
    room: typeof schema.rooms.$inferSelect,
    roomType: typeof schema.roomTypes.$inferSelect | null,
  ): any {
    return {
      roomTypeName: room.name,
      description: room.description,
      maxOccupancy: roomType?.maxCapacity || 2,
      roomTypeUnits: room.quantity || 1,
      bedCount: room.bedCount,
      bathroomCount: room.bathroomCount,
    };
  }

  /**
   * Map CloudBeds reservation to our CreateBookingDto format
   */
  mapCloudBedsReservationToBooking(cloudbedsReservation: any): {
    rooms: Array<{
      roomId: string;
      checkIn: string;
      checkOut: string;
      guestsCount: string;
      quantity: number;
    }>;
    specialRequests?: string;
  } {
    return {
      rooms: [
        {
          roomId: cloudbedsReservation.roomTypeID, // Will need to map to our room ID
          checkIn: cloudbedsReservation.checkIn || cloudbedsReservation.startDate,
          checkOut: cloudbedsReservation.checkOut || cloudbedsReservation.endDate,
          guestsCount: String(
            (cloudbedsReservation.adults || 0) + (cloudbedsReservation.children || 0),
          ),
          quantity: 1,
        },
      ],
      specialRequests: cloudbedsReservation.specialRequests,
    };
  }

  /**
   * Map our reservation to CloudBeds postReservation format
   */
  mapReservationToCloudBeds(
    reservation: any,
    roomMapping: { cloudbedsRoomTypeId: string; rateId?: string; propertyId?: string },
  ): any {
    // Extract guest info from reservation
    const guestName =
      reservation.guestName ||
      `${reservation.userFirstName || ''} ${reservation.userLastName || ''}`.trim();
    const [firstName, ...lastNameParts] = guestName.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    return {
      propertyID: roomMapping.propertyId,
      thirdPartyIdentifier: reservation.id, // Your reservation ID
      startDate: new Date(reservation.checkIn).toISOString().split('T')[0],
      endDate: new Date(reservation.checkOut).toISOString().split('T')[0],
      guestFirstName: firstName,
      guestLastName: lastName || firstName,
      guestEmail: reservation.guestEmail || reservation.userEmail,
      guestPhone: reservation.guestPhone,
      guestCountry: reservation.userCountry || 'PT', // Default to Portugal
      rooms: [
        {
          roomTypeID: roomMapping.cloudbedsRoomTypeId,
          quantity: 1,
          ...(roomMapping.rateId && { roomRateID: roomMapping.rateId }),
        },
      ],
      adults: [
        {
          roomTypeID: roomMapping.cloudbedsRoomTypeId,
          quantity: reservation.adultsCount || reservation.guestsCount || 1,
        },
      ],
      ...(reservation.childrenCount > 0 && {
        children: [
          {
            roomTypeID: roomMapping.cloudbedsRoomTypeId,
            quantity: reservation.childrenCount,
          },
        ],
      }),
      paymentMethod: 'credit', // Or get from your payment data
      dateCreated: new Date(reservation.createdAt).toISOString().split('T')[0],
    };
  }
}

