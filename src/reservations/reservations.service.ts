/* eslint-disable */
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import {
  CreateReservationDto,
  EditReservationDto,
  CreateBookingDto,
  GetPriceQuoteDto,
  CheckAvailabilityDto,
} from './dto';
import { RoomValidation, RoomQuote } from './interfaces';
import { eq, and, lte, gte, or } from 'drizzle-orm';
import { InvoicesService } from 'src/invoices/invoices.service';
import { PaymentsService } from 'src/payments/payments.service';
import { ReservationRoomsService } from 'src/reservation-rooms/reservation-rooms.service';
import { RoomsService } from 'src/rooms/rooms.service';
import { RoomPricesService } from 'src/room-prices/room-prices.service';
import { UsersService } from 'src/users/users.service';
import { RoomHoldsService } from 'src/room-holds/room-holds.service';

@Injectable()
export class ReservationsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private invoicesService: InvoicesService,
    private paymentsService: PaymentsService,
    private reservationRoomsService: ReservationRoomsService,
    private roomsService: RoomsService,
    private roomPricesService: RoomPricesService,
    private usersService: UsersService,
    private roomHoldsService: RoomHoldsService,
  ) {}

  async createReservation(userId: number, data: CreateReservationDto) {
    return await this.db
      .insert(schema.reservations)
      .values({ userId, ...data })
      .returning();
  }

  async getReservations() {
    return await this.db.select().from(schema.reservations);
  }

  async getReservationById(id: number) {
    const [reservation] = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, id));

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }

  async getReservationsByUser(userId: number) {
    return await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.userId, userId));
  }

  async editReservation(id: number, data: EditReservationDto) {
    const [reservation] = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, id));

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return await this.db
      .update(schema.reservations)
      .set({ ...data })
      .where(eq(schema.reservations.id, id))
      .returning();
  }

  async deleteReservation(id: number) {
    const [reservation] = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, id));

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return await this.db
      .delete(schema.reservations)
      .where(eq(schema.reservations.id, id))
      .returning();
  }

  async checkAvailability(data: CheckAvailabilityDto) {
    const { roomId, checkIn, checkOut } = data;

    const room = await this.roomsService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const isAvailable = await this.checkRoomAvailability(
      roomId,
      checkIn,
      checkOut,
    );

    return {
      roomId,
      checkIn,
      checkOut,
      available: isAvailable,
      message: isAvailable
        ? 'Room is available for the selected dates'
        : 'Room is not available for the selected dates',
    };
  }

  async getPriceQuote(data: GetPriceQuoteDto, userId?: number) {
    const { rooms } = data;

    if (!rooms || rooms.length === 0) {
      throw new BadRequestException('At least one room must be specified');
    }

    let totalPrice = 0;
    const roomQuotes: RoomQuote[] = [];
    let allAvailable = true;

    for (const roomRequest of rooms) {
      const { roomId, checkIn, checkOut } = roomRequest;

      const room = await this.roomsService.getRoomById(roomId);
      if (!room) {
        throw new NotFoundException(`Room ${roomId} not found`);
      }

      const isAvailable = await this.checkRoomAvailability(
        roomId,
        checkIn,
        checkOut,
        userId,
      );

      if (!isAvailable) {
        allAvailable = false;
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      let roomPrice = 0;
      let avgPricePerNight = 0;

      if (isAvailable) {
        try {
          roomPrice = await this.calculateTotalPrice(roomId, checkIn, checkOut);
          avgPricePerNight = roomPrice / nights;
          totalPrice += roomPrice;
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          roomQuotes.push({
            roomId,
            checkIn,
            checkOut,
            nights,
            available: false,
            error: errorMessage,
          });
          continue;
        }
      }

      roomQuotes.push({
        roomId,
        checkIn,
        checkOut,
        nights,
        avgPricePerNight: avgPricePerNight.toFixed(2),
        roomTotal: roomPrice.toFixed(2),
        available: isAvailable,
      });

      if (isAvailable && userId) {
        await this.roomHoldsService.createHold(userId, roomId, checkIn, checkOut);
      }
    }

    return {
      rooms: roomQuotes,
      totalPrice: totalPrice.toFixed(2),
      allAvailable,
      message: allAvailable
        ? 'All rooms are available for the selected dates'
        : 'Some rooms are not available',
    };
  }

  async createBooking(userId: number, data: CreateBookingDto) {
    const { rooms, specialRequests, paymentMethodId, transactionId } = data;

    if (!rooms || rooms.length === 0) {
      throw new BadRequestException('At least one room must be specified');
    }

    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let totalPrice = 0;
    const roomValidations: RoomValidation[] = [];

    for (const roomBooking of rooms) {
      const { roomId, checkIn, checkOut } = roomBooking;

      const room = await this.roomsService.getRoomById(roomId);
      if (!room) {
        throw new NotFoundException(`Room ${roomId} not found`);
      }

      const hasHold = await this.roomHoldsService.hasActiveHold(
        userId,
        roomId,
        checkIn,
        checkOut,
      );

      if (!hasHold) {
        throw new BadRequestException(
          `No active hold for room ${roomId}. Please request a price quote first.`,
        );
      }

      const isAvailable = await this.checkRoomAvailability(
        roomId,
        checkIn,
        checkOut,
        userId,
      );
      if (!isAvailable) {
        throw new BadRequestException(
          `Room ${roomId} is not available for the selected dates`,
        );
      }

      const roomPrice = await this.calculateTotalPrice(
        roomId,
        checkIn,
        checkOut,
      );
      totalPrice += roomPrice;

      roomValidations.push({
        roomId,
        checkIn,
        checkOut,
        guestsCount: roomBooking.guestsCount || 1,
        price: roomPrice,
      });
    }

    return await this.db.transaction(async (tx) => {
      const [reservation] = await tx
        .insert(schema.reservations)
        .values({
          userId,
          statusId: 1,
          totalPrice: totalPrice.toString(),
          paymentStatusId: 1,
          depositAmount: '0.0',
          specialRequests,
        })
        .returning();

      for (const roomBooking of roomValidations) {
        await tx.insert(schema.reservationRooms).values({
          reservationId: reservation.id,
          roomId: roomBooking.roomId,
          checkIn: roomBooking.checkIn,
          checkOut: roomBooking.checkOut,
          guestsCount: roomBooking.guestsCount,
        });
      }

      const [invoice] = await tx
        .insert(schema.invoices)
        .values({
          reservationId: reservation.id,
          amount: totalPrice.toString(),
          statusId: 1,
        })
        .returning();

      await tx.insert(schema.payments).values({
        invoiceId: invoice.id,
        amount: totalPrice.toString(),
        paymentMethodId,
        transactionId,
      });

      await tx
        .update(schema.invoices)
        .set({ statusId: 2 })
        .where(eq(schema.invoices.id, invoice.id));

      await tx
        .update(schema.reservations)
        .set({
          statusId: 2,
          paymentStatusId: 2,
        })
        .where(eq(schema.reservations.id, reservation.id));

      for (const roomBooking of roomValidations) {
        await tx
          .delete(schema.roomHolds)
          .where(
            and(
              eq(schema.roomHolds.userId, userId),
              eq(schema.roomHolds.roomId, roomBooking.roomId),
              eq(schema.roomHolds.checkIn, roomBooking.checkIn),
              eq(schema.roomHolds.checkOut, roomBooking.checkOut),
            ),
          );
      }

      return {
        success: true,
        reservation: {
          ...reservation,
          statusId: 2,
          paymentStatusId: 2,
        },
        invoice,
        totalPrice: totalPrice.toString(),
        message: 'Booking completed successfully',
      };
    });
  }

  private async checkRoomAvailability(
    roomId: number,
    checkIn: string,
    checkOut: string,
    excludeUserId?: number,
  ): Promise<boolean> {
    const overlappingReservations = await this.db
      .select()
      .from(schema.reservationRooms)
      .where(
        and(
          eq(schema.reservationRooms.roomId, roomId),
          or(
            and(
              lte(schema.reservationRooms.checkIn, checkIn),
              gte(schema.reservationRooms.checkOut, checkIn),
            ),
            and(
              lte(schema.reservationRooms.checkIn, checkOut),
              gte(schema.reservationRooms.checkOut, checkOut),
            ),
            and(
              gte(schema.reservationRooms.checkIn, checkIn),
              lte(schema.reservationRooms.checkOut, checkOut),
            ),
          ),
        ),
      );

    if (overlappingReservations.length > 0) {
      return false;
    }

    const hasConflictingHolds = await this.roomHoldsService.hasConflictingHolds(
      roomId,
      checkIn,
      checkOut,
      excludeUserId,
    );

    return !hasConflictingHolds;
  }

  private async calculateTotalPrice(
    roomId: number,
    checkInStr: string,
    checkOutStr: string,
  ): Promise<number> {
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nights <= 0) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const roomPrices = await this.roomPricesService.getRoomPricesByRoom(roomId);

    if (roomPrices.length === 0) {
      throw new BadRequestException('No pricing available for this room');
    }

    let totalPrice = 0;
    const currentDate = new Date(checkIn);

    for (let i = 0; i < nights; i++) {
      const applicablePrice = roomPrices.find((price) => {
        const priceStart = new Date(price.startDate);
        const priceEnd = new Date(price.endDate);
        return currentDate >= priceStart && currentDate <= priceEnd;
      });

      if (!applicablePrice) {
        const dateStr = currentDate.toISOString().split('T')[0];
        throw new BadRequestException(
          `No pricing available for date: ${dateStr}`,
        );
      }

      totalPrice += parseFloat(applicablePrice.price);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return totalPrice;
  }
}
