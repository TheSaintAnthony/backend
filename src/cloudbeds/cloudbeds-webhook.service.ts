import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from '../db/drizzle.module';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { ReservationsService } from '../reservations/reservations.service';
import { CloudBedsMapperService } from './cloudbeds-mapper.service';
import { CloudBedsApiService } from './cloudbeds-api.service';
import { StatusLookupService } from '../services/lookups/status-lookup.service';
import { RESERVATION_STATUS_NAMES } from '../constants';
import { PaymentStatus } from '../constants/payment-status.enum';

@Injectable()
export class CloudBedsWebhookService {
  private readonly logger = new Logger(CloudBedsWebhookService.name);

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    @Inject(forwardRef(() => ReservationsService))
    private reservationsService: ReservationsService,
    private mapper: CloudBedsMapperService,
    private cloudbedsApi: CloudBedsApiService,
    private statusLookupService: StatusLookupService,
  ) {}

  async verifySignature(payload: any, signature: string): Promise<boolean> {
    // Implement signature verification based on CloudBeds documentation
    // This is a placeholder - check CloudBeds docs for actual implementation
    const secret = process.env.CLOUDBEDS_WEBHOOK_SECRET;
    if (!secret) return true; // Skip if not configured
    
    // TODO: Implement actual signature verification
    // For now, return true to allow processing
    return true;
  }

  async processWebhook(payload: any) {
    this.logger.log(`Processing CloudBeds webhook: ${payload.eventType || payload.type || 'unknown'}`);

    try {
      const eventType = payload.eventType || payload.type || payload.event;
      
      switch (eventType) {
        case 'booking.created':
        case 'reservation.created':
        case 'reservation':
          await this.handleBookingCreated(payload.data || payload);
          break;
        case 'booking.modified':
        case 'reservation.modified':
          await this.handleBookingModified(payload.data || payload);
          break;
        case 'booking.cancelled':
        case 'reservation.cancelled':
        case 'booking.canceled':
        case 'reservation.canceled':
          await this.handleBookingCancelled(payload.data || payload);
          break;
        default:
          this.logger.warn(`Unhandled webhook event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(`Error processing CloudBeds webhook: ${error}`, error);
      throw error;
    }
  }

  /**
   * Handle booking created from external channel (Booking.com, etc.)
   * This creates a reservation in your system and blocks those dates
   */
  private async handleBookingCreated(bookingData: any) {
    const reservationID = bookingData.reservationID || bookingData.bookingID || bookingData.id;
    this.logger.log(`Handling booking created: ${reservationID}`);

    // Check if we already processed this booking
    const existing = await this.db.query.cloudbedsReservations.findFirst({
      where: eq(
        schema.cloudbedsReservations.cloudbedsReservationId,
        String(reservationID)
      ),
    });

    if (existing && existing.reservationId) {
      this.logger.log(`Booking ${reservationID} already processed`);
      return;
    }

    // Get reservation details from CloudBeds
    let cloudbedsReservation;
    try {
      cloudbedsReservation = await this.cloudbedsApi.getReservation(String(reservationID));
      if (cloudbedsReservation.data) {
        bookingData = { ...bookingData, ...cloudbedsReservation.data };
      }
    } catch (error) {
      this.logger.warn(`Failed to get reservation details from CloudBeds: ${error}`);
      // Continue with available data
    }

    // Find the CloudBeds property mapping
    const propertyID = bookingData.propertyID || bookingData.propertyId;
    if (!propertyID) {
      this.logger.error(`No property ID in booking data for ${reservationID}`);
      return;
    }

    const propertyMapping = await this.db.query.cloudbedsProperties.findFirst({
      where: eq(
        schema.cloudbedsProperties.cloudbedsPropertyId,
        String(propertyID)
      ),
    });

    if (!propertyMapping) {
      this.logger.error(`No property mapping found for CloudBeds property ${propertyID}`);
      return;
    }

    // Get room details from booking data
    const rooms = bookingData.rooms || [];
    if (rooms.length === 0) {
      this.logger.error(`No rooms in booking data for ${reservationID}`);
      return;
    }

    const firstRoom = rooms[0];
    const roomTypeID = firstRoom.roomTypeID || firstRoom.roomTypeId;

    // Find the room mapping
    const roomMapping = await this.db.query.cloudbedsRooms.findFirst({
      where: eq(
        schema.cloudbedsRooms.cloudbedsRoomTypeId,
        String(roomTypeID)
      ),
    });

    if (!roomMapping) {
      this.logger.error(`No room mapping found for CloudBeds room type ${roomTypeID}`);
      return;
    }

    // Get or create system user for CloudBeds bookings
    const systemUserId = await this.getSystemUserId();

    // Extract guest info
    const guestFirstName = bookingData.guestFirstName || bookingData.guest?.firstName || 'Guest';
    const guestLastName = bookingData.guestLastName || bookingData.guest?.lastName || 'CloudBeds';
    const guestEmail = bookingData.guestEmail || bookingData.guest?.email || `cloudbeds-${reservationID}@system.local`;
    const guestPhone = bookingData.guestPhone || bookingData.guest?.phone;

    // Extract dates
    const checkIn = bookingData.checkIn || bookingData.startDate || bookingData.checkinDate;
    const checkOut = bookingData.checkOut || bookingData.endDate || bookingData.checkoutDate;
    const adults = bookingData.adults || firstRoom.adults || 1;
    const children = bookingData.children || firstRoom.children || 0;

    if (!checkIn || !checkOut) {
      this.logger.error(`Missing check-in or check-out dates for booking ${reservationID}`);
      return;
    }

    // Create reservation in your system
    const confirmedStatusId = await this.statusLookupService.getReservationStatusId(
      RESERVATION_STATUS_NAMES.CONFIRMED,
    );
    const completedPaymentStatusId = await this.statusLookupService.getPaymentStatusId(
      PaymentStatus.COMPLETED as string,
    );

    const totalPrice = bookingData.totalAmount || bookingData.amount || '0.00';

    const [reservation] = await this.db
      .insert(schema.reservations)
      .values({
        userId: systemUserId,
        statusId: confirmedStatusId,
        totalPrice: String(totalPrice),
        paymentStatusId: completedPaymentStatusId,
        specialRequests: bookingData.specialRequests || bookingData.notes,
      })
      .returning();

    // Create reservation rooms
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    await this.db.insert(schema.reservationRooms).values({
      reservationId: reservation.id,
      roomId: roomMapping.roomId,
      checkIn: checkInDate.toISOString().split('T')[0],
      checkOut: checkOutDate.toISOString().split('T')[0],
      guestsCount: adults + children,
      accessCode: await this.generateAccessCode(),
    });

    // Store CloudBeds reservation mapping
    await this.db.insert(schema.cloudbedsReservations).values({
      reservationId: reservation.id,
      cloudbedsReservationId: String(reservationID),
      cloudbedsPropertyId: propertyMapping.id,
      channelName: bookingData.channel || bookingData.source || 'cloudbeds',
      guestName: `${guestFirstName} ${guestLastName}`,
      guestEmail: guestEmail,
      guestPhone: guestPhone,
      checkIn: checkInDate.toISOString().split('T')[0],
      checkOut: checkOutDate.toISOString().split('T')[0],
      guestsCount: adults + children,
      adultsCount: adults,
      childrenCount: children,
      totalAmount: String(totalPrice),
      currency: bookingData.currency || 'EUR',
      status: 'confirmed',
      thirdPartyIdentifier: reservation.id,
      rawData: bookingData,
      processedAt: new Date(),
    });

    this.logger.log(`Created reservation ${reservation.id} from CloudBeds booking ${reservationID}`);
  }

  private async handleBookingModified(bookingData: any) {
    const reservationID = bookingData.reservationID || bookingData.bookingID || bookingData.id;
    this.logger.log(`Handling booking modified: ${reservationID}`);
    
    // Find existing CloudBeds reservation
    const cloudbedsReservation = await this.db.query.cloudbedsReservations.findFirst({
      where: eq(
        schema.cloudbedsReservations.cloudbedsReservationId,
        String(reservationID)
      ),
    });

    if (!cloudbedsReservation || !cloudbedsReservation.reservationId) {
      this.logger.warn(`No existing reservation found for CloudBeds booking ${reservationID}`);
      // Treat as new booking
      await this.handleBookingCreated(bookingData);
      return;
    }

    // Update reservation if needed
    // For now, we'll just log it - you can implement update logic if needed
    this.logger.log(`Reservation ${cloudbedsReservation.reservationId} modified from CloudBeds`);
  }

  private async handleBookingCancelled(bookingData: any) {
    const reservationID = bookingData.reservationID || bookingData.bookingID || bookingData.id;
    this.logger.log(`Handling booking cancelled: ${reservationID}`);
    
    const cloudbedsReservation = await this.db.query.cloudbedsReservations.findFirst({
      where: eq(
        schema.cloudbedsReservations.cloudbedsReservationId,
        String(reservationID)
      ),
    });

    if (cloudbedsReservation && cloudbedsReservation.reservationId) {
      // Cancel the reservation in your system
      const cancelledStatusId = await this.statusLookupService.getReservationStatusId(
        RESERVATION_STATUS_NAMES.CANCELLED,
      );
      
      await this.db
        .update(schema.reservations)
        .set({ statusId: cancelledStatusId })
        .where(eq(schema.reservations.id, cloudbedsReservation.reservationId));

      // Update CloudBeds reservation status
      await this.db
        .update(schema.cloudbedsReservations)
        .set({ status: 'cancelled' })
        .where(eq(schema.cloudbedsReservations.id, cloudbedsReservation.id));

      this.logger.log(`Cancelled reservation ${cloudbedsReservation.reservationId} from CloudBeds booking ${reservationID}`);
    }
  }

  // Helper methods
  private async getSystemUserId(): Promise<string> {
    // Create or get a system user for CloudBeds bookings
    const [systemUser] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'system@cloudbeds.local'))
      .limit(1);

    if (systemUser) {
      return systemUser.id;
    }

    // Create system user if it doesn't exist
    const [newUser] = await this.db
      .insert(schema.users)
      .values({
        email: 'system@cloudbeds.local',
        firstName: 'CloudBeds',
        lastName: 'System',
        passwordHash: 'system-account-no-login', // Won't be used for login
      })
      .returning();

    return newUser.id;
  }

  private async generateAccessCode(): Promise<number> {
    // Use your existing access code generation logic
    return Math.floor(100000 + Math.random() * 900000);
  }
}

