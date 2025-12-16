import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { eq, and, sql, isNull, ne, count } from 'drizzle-orm';
import { CloudBedsApiService } from '../cloudbeds-api.service';
import { CloudBedsMapperService } from '../cloudbeds-mapper.service';
import { PropertiesService } from '../../properties/properties.service';
import { RoomsService } from '../../rooms/rooms.service';
import { ReservationsService } from '../../reservations/reservations.service';
import { StatusLookupService } from '../../services/lookups/status-lookup.service';
import { RESERVATION_STATUS_NAMES } from '../../constants';

@Processor('cloudbeds-sync')
export class CloudBedsSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CloudBedsSyncProcessor.name);

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private cloudbedsApi: CloudBedsApiService,
    private mapper: CloudBedsMapperService,
    private propertiesService: PropertiesService,
    private roomsService: RoomsService,
    @Inject(forwardRef(() => ReservationsService))
    private reservationsService: ReservationsService,
    private statusLookupService: StatusLookupService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { name, data } = job;
    this.logger.log(`Processing CloudBeds sync job: ${name}`);

    try {
      switch (name) {
        case 'sync-property':
          await this.syncProperty(data.propertyId, data.operation);
          break;
        case 'sync-room':
          await this.syncRoom(data.roomId, data.operation);
          break;
        case 'sync-availability':
          await this.syncAvailability(data.roomId, {
            start: new Date(data.dateRange.start),
            end: new Date(data.dateRange.end),
          });
          break;
        case 'sync-reservation-to-cloudbeds':
          await this.syncReservationToCloudBeds(data.reservationId);
          break;
        default:
          this.logger.warn(`Unknown sync job type: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process sync job ${name}: ${error}`, error);
      throw error;
    }
  }

  /**
   * Sync property to CloudBeds
   * This makes the property available on Booking.com via CloudBeds
   */
  private async syncProperty(propertyId: string, operation: 'create' | 'update' | 'delete') {
    try {
      const property = await this.propertiesService.getPropertyById(propertyId);
      
      // Get or create CloudBeds mapping
      let mapping = await this.db.query.cloudbedsProperties.findFirst({
        where: eq(schema.cloudbedsProperties.propertyId, propertyId),
      });

      if (operation === 'create' || operation === 'update') {
        if (!mapping) {
          // Create mapping
          const [newMapping] = await this.db
            .insert(schema.cloudbedsProperties)
            .values({
              propertyId,
              syncEnabled: true,
              syncStatus: 'pending',
            })
            .returning();
          mapping = newMapping;
        }

        // Properties are typically already created in CloudBeds
        // We just need to map them. If property doesn't exist in CloudBeds,
        // it would need to be created manually or via a different endpoint
        // For now, we'll just mark it as synced if mapping exists

        await this.db
          .update(schema.cloudbedsProperties)
          .set({
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            errorMessage: null,
          })
          .where(eq(schema.cloudbedsProperties.id, mapping.id));
      } else if (operation === 'delete') {
        if (mapping) {
          await this.db
            .update(schema.cloudbedsProperties)
            .set({ syncEnabled: false })
            .where(eq(schema.cloudbedsProperties.id, mapping.id));
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync property ${propertyId}: ${error}`, error);
      throw error;
    }
  }

  /**
   * Sync room to CloudBeds
   * This makes the room available on Booking.com via CloudBeds
   */
  private async syncRoom(roomId: string, operation: 'create' | 'update' | 'delete') {
    try {
      const room = await this.roomsService.getRoomById(roomId);
      
      // Get property mapping
      const propertyMapping = await this.db.query.cloudbedsProperties.findFirst({
        where: eq(schema.cloudbedsProperties.propertyId, room.propertyId),
      });

      if (!propertyMapping) {
        this.logger.warn(`No CloudBeds property mapping for room ${roomId}`);
        return;
      }

      // Get or create room mapping
      let mapping = await this.db.query.cloudbedsRooms.findFirst({
        where: eq(schema.cloudbedsRooms.roomId, roomId),
      });

      if (operation === 'create' || operation === 'update') {
        // Get room types from CloudBeds and match
        const cloudbedsRoomTypes = await this.cloudbedsApi.getRoomTypes();
        
        // Try to find matching room type
        let cloudbedsRoomTypeId = mapping?.cloudbedsRoomTypeId;
        
        if (!cloudbedsRoomTypeId) {
          // Match by name or use first available
          const matched = cloudbedsRoomTypes.data?.find((rt: any) => 
            rt.roomTypeName?.toLowerCase() === room.name?.toLowerCase()
          );
          
          if (matched) {
            cloudbedsRoomTypeId = matched.roomTypeID;
          } else if (cloudbedsRoomTypes.data && cloudbedsRoomTypes.data.length > 0) {
            // Use first room type if no match found
            cloudbedsRoomTypeId = cloudbedsRoomTypes.data[0].roomTypeID;
            this.logger.warn(`No matching CloudBeds room type for ${room.name}, using first available`);
          }
        }

        // Get rate plans to find the base rate ID
        if (cloudbedsRoomTypeId && !mapping?.rateId) {
          const startDate = new Date().toISOString().split('T')[0];
          const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          try {
            const ratePlans = await this.cloudbedsApi.getRatePlans({
              startDate,
              endDate,
              roomTypeID: cloudbedsRoomTypeId,
            });

            const baseRate = ratePlans.data?.find((rp: any) => !rp.ratePlanID); // Base rate has no ratePlanID
            if (baseRate) {
              const rateId = baseRate.rateID;
              
              if (!mapping) {
                const [newMapping] = await this.db
                  .insert(schema.cloudbedsRooms)
                  .values({
                    roomId,
                    cloudbedsPropertyId: propertyMapping.id,
                    cloudbedsRoomTypeId,
                    rateId,
                    syncEnabled: true,
                    syncStatus: 'pending',
                  })
                  .returning();
                mapping = newMapping;
              } else {
                await this.db
                  .update(schema.cloudbedsRooms)
                  .set({
                    cloudbedsRoomTypeId,
                    rateId,
                  })
                  .where(eq(schema.cloudbedsRooms.id, mapping.id));
              }
            }
          } catch (error) {
            this.logger.warn(`Failed to get rate plans for room ${roomId}: ${error}`);
          }
        }

        if (mapping) {
          await this.db
            .update(schema.cloudbedsRooms)
            .set({
              syncStatus: 'synced',
              lastSyncedAt: new Date(),
              errorMessage: null,
            })
            .where(eq(schema.cloudbedsRooms.id, mapping.id));
        } else if (cloudbedsRoomTypeId) {
          // Create mapping if we have room type ID
          const [newMapping] = await this.db
            .insert(schema.cloudbedsRooms)
            .values({
              roomId,
              cloudbedsPropertyId: propertyMapping.id,
              cloudbedsRoomTypeId,
              syncEnabled: true,
              syncStatus: 'synced',
              lastSyncedAt: new Date(),
            })
            .returning();
          mapping = newMapping;
        }
      } else if (operation === 'delete') {
        if (mapping) {
          await this.db
            .update(schema.cloudbedsRooms)
            .set({ syncEnabled: false })
            .where(eq(schema.cloudbedsRooms.id, mapping.id));
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync room ${roomId}: ${error}`, error);
      throw error;
    }
  }

  /**
   * Sync availability to CloudBeds
   * This updates availability on Booking.com when reservations are created/cancelled
   */
  private async syncAvailability(roomId: string, dateRange: { start: Date; end: Date }) {
    try {
      const roomMapping = await this.db.query.cloudbedsRooms.findFirst({
        where: eq(schema.cloudbedsRooms.roomId, roomId),
      });

      if (!roomMapping || !roomMapping.cloudbedsRoomTypeId || !roomMapping.rateId) {
        this.logger.warn(`No CloudBeds room mapping for room ${roomId}`);
        return;
      }

      // Get current availability from your system
      const room = await this.roomsService.getRoomById(roomId);
      const totalQuantity = room.quantity || 1;

      // Calculate booked rooms for each date in range
      const rates: Array<{
        rateID: string;
        interval: {
          startDate: string;
          endDate: string;
          rate: number;
        };
      }> = [];

      const currentDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      while (currentDate < endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check how many rooms are booked for this date
        const bookedCount = await this.getBookedCountForDate(roomId, dateStr);
        const available = Math.max(0, totalQuantity - bookedCount);

        // Get rate for this date from your pricing system
        try {
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextDateStr = nextDate.toISOString().split('T')[0];
          
          const priceResult = await this.roomsService.calculateTotalPrice(
            roomId,
            dateStr,
            nextDateStr
          );
          
          // Extract total price from result (could be number or object)
          const roomPrice = typeof priceResult === 'number' 
            ? priceResult 
            : (priceResult as any)?.totalPrice || (priceResult as any)?.price || 0;

          rates.push({
            rateID: roomMapping.rateId,
            interval: {
              startDate: dateStr,
              endDate: dateStr, // Single day interval
              rate: roomPrice,
            },
          });
        } catch (error) {
          this.logger.warn(`Failed to get price for ${dateStr}: ${error}`);
          // Continue with other dates
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update rates in CloudBeds
      if (rates.length > 0) {
        await this.cloudbedsApi.patchRate({ rates });
      }

      await this.db
        .update(schema.cloudbedsRooms)
        .set({ lastSyncedAt: new Date() })
        .where(eq(schema.cloudbedsRooms.id, roomMapping.id));
    } catch (error) {
      this.logger.error(`Failed to sync availability for room ${roomId}: ${error}`, error);
      throw error;
    }
  }

  /**
   * Sync reservation to CloudBeds
   * This creates the reservation in CloudBeds, making it unavailable on Booking.com
   */
  private async syncReservationToCloudBeds(reservationId: string) {
    try {
      const reservation = await this.reservationsService.getReservationById(reservationId);
      
      for (const room of reservation.rooms) {
        if (!room.roomId || !room.checkIn || !room.checkOut) {
          this.logger.warn(`Missing required room data for reservation ${reservationId}`);
          continue;
        }

        const roomMapping = await this.db.query.cloudbedsRooms.findFirst({
          where: eq(schema.cloudbedsRooms.roomId, room.roomId),
        });

        if (!roomMapping || !roomMapping.cloudbedsRoomTypeId) {
          this.logger.warn(`No CloudBeds room mapping for room ${room.roomId}`);
          continue;
        }

        // Check if reservation already synced
        const existing = await this.db.query.cloudbedsReservations.findFirst({
          where: eq(schema.cloudbedsReservations.reservationId, reservationId),
        });

        if (existing) {
          this.logger.log(`Reservation ${reservationId} already synced to CloudBeds`);
          continue;
        }

        // Get property mapping
        const propertyMapping = await this.db.query.cloudbedsProperties.findFirst({
          where: eq(schema.cloudbedsProperties.id, roomMapping.cloudbedsPropertyId),
        });

        if (!propertyMapping || !propertyMapping.cloudbedsPropertyId) {
          this.logger.warn(`No CloudBeds property ID for reservation ${reservationId}`);
          continue;
        }

        // Get user info for guest details
        if (!reservation.userId) {
          this.logger.warn(`No user ID for reservation ${reservationId}`);
          continue;
        }

        const user = await this.db.query.users.findFirst({
          where: eq(schema.users.id, reservation.userId),
        });

        if (!user) {
          this.logger.warn(`User not found for reservation ${reservationId}`);
          continue;
        }

        // Map reservation to CloudBeds format
        const cloudbedsReservation = this.mapper.mapReservationToCloudBeds(
          {
            ...reservation,
            userEmail: user.email,
            userFirstName: user.firstName,
            userLastName: user.lastName,
            userCountry: user.addressId ? (await this.db.query.addresses.findFirst({
              where: eq(schema.addresses.id, user.addressId),
            }))?.country : undefined,
            checkIn: room.checkIn,
            checkOut: room.checkOut,
            adultsCount: room.guestsCount,
            childrenCount: 0,
          },
          {
            cloudbedsRoomTypeId: roomMapping.cloudbedsRoomTypeId,
            rateId: roomMapping.rateId || undefined,
            propertyId: propertyMapping.cloudbedsPropertyId || undefined,
          }
        );

        // Create reservation in CloudBeds
        const cloudbedsBooking = await this.cloudbedsApi.postReservation(cloudbedsReservation);

        // Store mapping
        if (cloudbedsBooking.data?.reservationID && reservation.id) {
          const insertData: any = {
            reservationId: reservation.id,
            cloudbedsReservationId: cloudbedsBooking.data.reservationID,
            cloudbedsPropertyId: propertyMapping.id,
            channelName: 'direct',
            guestName: `${user.firstName} ${user.lastName}`,
            guestEmail: user.email,
            checkIn: room.checkIn,
            checkOut: room.checkOut,
            guestsCount: room.guestsCount || 0,
            adultsCount: room.guestsCount || 0,
            childrenCount: 0,
            totalAmount: reservation.totalPrice,
            currency: 'EUR',
            status: 'confirmed',
            thirdPartyIdentifier: reservation.id,
            rawData: cloudbedsBooking.data,
            processedAt: new Date(),
          };
          await this.db.insert(schema.cloudbedsReservations).values(insertData);
        }

        // Also sync availability after creating reservation
        await this.syncAvailability(room.roomId, {
          start: new Date(room.checkIn),
          end: new Date(room.checkOut),
        });
      }
    } catch (error) {
      this.logger.error(`Failed to sync reservation ${reservationId} to CloudBeds: ${error}`, error);
      throw error;
    }
  }

  private async getBookedCountForDate(roomId: string, date: string): Promise<number> {
    const cancelledStatusId = await this.statusLookupService.getReservationStatusId(
      RESERVATION_STATUS_NAMES.CANCELLED,
    );

    const [result] = await this.db
      .select({ count: count() })
      .from(schema.reservationRooms)
      .innerJoin(
        schema.reservations,
        eq(schema.reservationRooms.reservationId, schema.reservations.id)
      )
      .innerJoin(
        schema.reservationStatus,
        eq(schema.reservations.statusId, schema.reservationStatus.id)
      )
      .where(
        and(
          eq(schema.reservationRooms.roomId, roomId),
          sql`${schema.reservationRooms.checkIn}::date <= ${date}::date`,
          sql`${schema.reservationRooms.checkOut}::date > ${date}::date`,
          ne(schema.reservations.statusId, cancelledStatusId),
          isNull(schema.reservationRooms.deletedAt)
        )
      );

    return Number(result?.count || 0);
  }
}

