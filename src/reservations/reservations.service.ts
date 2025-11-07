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
} from './dto';
import { RoomValidation } from './interfaces';
import { eq, and } from 'drizzle-orm';
import { RoomsService } from 'src/rooms/rooms.service';
import { UsersService } from 'src/users/users.service';
import { RoomHoldsService } from 'src/room-holds/room-holds.service';

@Injectable()
export class ReservationsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private roomsService: RoomsService,
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

      const isAvailable = await this.roomsService.checkRoomAvailability(
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

      const roomPrice = await this.roomsService.calculateTotalPrice(
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
}
