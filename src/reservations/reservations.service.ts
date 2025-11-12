import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { NotFoundException, BadRequestException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import {
  CreateReservationDto,
  EditReservationDto,
  CreateBookingDto,
} from './dto';
import { EmailConfirmation, RoomValidation } from './interfaces';
import { eq, and } from 'drizzle-orm';
import { RoomsService } from 'src/rooms/rooms.service';
import { UsersService } from 'src/users/users.service';
import { RoomHoldsService } from 'src/room-holds/room-holds.service';
import { EmailService } from 'src/email/email.service';
import { PaymentStatus, PaymentMethod } from 'src/constants';
import { PaypalService } from 'src/payments/paypal/paypal.service';

@Injectable()
export class ReservationsService implements OnModuleInit {
  private readonly logger = new Logger(ReservationsService.name);
  private completedPaymentStatusId: number;
  private pendingPaymentStatusId: number;
  private paypalMethodId: number;

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private roomsService: RoomsService,
    private usersService: UsersService,
    private roomHoldsService: RoomHoldsService,
    private emailService: EmailService,
    private paypalService: PaypalService,
  ) {}

  async onModuleInit() {
    const [completedStatus] = await this.db
      .select()
      .from(schema.paymentStatus)
      .where(eq(schema.paymentStatus.name, PaymentStatus.COMPLETED));

    const [pendingStatus] = await this.db
      .select()
      .from(schema.paymentStatus)
      .where(eq(schema.paymentStatus.name, PaymentStatus.PENDING));

    const [paypalMethod] = await this.db
      .select()
      .from(schema.paymentMethods)
      .where(eq(schema.paymentMethods.name, PaymentMethod.PAYPAL));

    if (!completedStatus) {
      throw new Error(
        `Payment status '${PaymentStatus.COMPLETED}' not found in payment_status table`,
      );
    }

    if (!pendingStatus) {
      throw new Error(
        `Payment status '${PaymentStatus.PENDING}' not found in payment_status table`,
      );
    }

    if (!paypalMethod) {
      throw new Error(
        `Payment method '${PaymentMethod.PAYPAL}' not found in payment_methods table`,
      );
    }

    this.completedPaymentStatusId = completedStatus.id;
    this.pendingPaymentStatusId = pendingStatus.id;
    this.paypalMethodId = paypalMethod.id;
  }

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
      throw new NotFoundException('Reservation', String(id));
    }

    return reservation;
  }

  async getReservationsByUser(userId: number) {
    const reservations = await this.db
      .select({
        id: schema.reservations.id,
        userId: schema.reservations.userId,
        statusId: schema.reservations.statusId,
        statusName: schema.reservationStatus.name,
        totalPrice: schema.reservations.totalPrice,
        paymentStatusId: schema.reservations.paymentStatusId,
        paymentStatusName: schema.paymentStatus.name,
        depositAmount: schema.reservations.depositAmount,
        specialRequests: schema.reservations.specialRequests,
        createdAt: schema.reservations.createdAt,
        updatedAt: schema.reservations.updatedAt,
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
      .where(eq(schema.reservations.userId, userId))
      .orderBy(schema.reservations.createdAt);

    const reservationsWithRooms = await Promise.all(
      reservations.map(async (reservation) => {
        const rooms = await this.db
          .select({
            id: schema.reservationRooms.id,
            reservationId: schema.reservationRooms.reservationId,
            roomId: schema.reservationRooms.roomId,
            checkIn: schema.reservationRooms.checkIn,
            checkOut: schema.reservationRooms.checkOut,
            guestsCount: schema.reservationRooms.guestsCount,
            roomName: schema.rooms.name,
            roomDescription: schema.rooms.description,
          })
          .from(schema.reservationRooms)
          .leftJoin(
            schema.rooms,
            eq(schema.reservationRooms.roomId, schema.rooms.id),
          )
          .where(eq(schema.reservationRooms.reservationId, reservation.id));

        return {
          ...reservation,
          rooms,
        };
      }),
    );

    return reservationsWithRooms;
  }

  async editReservation(id: number, data: EditReservationDto) {
    const [reservation] = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, id));

    if (!reservation) {
      throw new NotFoundException('Reservation', String(id));
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
      throw new NotFoundException('Reservation', String(id));
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
      throw new NotFoundException('User', String(userId));
    }

    let totalPrice = 0;
    const roomValidations: RoomValidation[] = [];

    for (const roomBooking of rooms) {
      const { roomId, checkIn, checkOut } = roomBooking;

      const room = await this.roomsService.getRoomById(roomId);
      if (!room) {
        throw new NotFoundException('Room', String(roomId));
      }

      if (room.maxCapacity && roomBooking.guestsCount > room.maxCapacity) {
        throw new BadRequestException(
          'Guests count is bigger than room max capacity',
        );
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
        paymentStatusId: this.completedPaymentStatusId,
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

      const emailPayload: EmailConfirmation = {
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalPrice: reservation.totalPrice,
        depositAmount: reservation.depositAmount,
        rooms: [...roomValidations],
        specialRequests: reservation.specialRequests?.toString(),
      };

      await this.emailService.sendReservationConfirmationEmail(emailPayload);

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

  async createPaypalBooking(userId: number, data: CreateBookingDto) {
    const { rooms, specialRequests } = data;
    if (!rooms || rooms.length === 0) {
      throw new BadRequestException('At least one room must be specified');
    }

    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User', String(userId));
    }

    let totalPrice = 0;
    const roomValidations: RoomValidation[] = [];

    for (const roomBooking of rooms) {
      const { roomId, checkIn, checkOut } = roomBooking;

      const room = await this.roomsService.getRoomById(roomId);

      if (!room) {
        throw new NotFoundException('Room', String(roomId));
      }

      if (room.maxCapacity && roomBooking.guestsCount > room.maxCapacity) {
        throw new BadRequestException(
          'Guests count is bigger than room max capacity',
        );
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
          paymentStatusId: this.pendingPaymentStatusId,
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

      const paypalOrder = await this.paypalService.createOrder({
        invoiceId: invoice.id,
        amount: totalPrice.toString(),
      });

      // Create payment record inside transaction
      await tx.insert(schema.payments).values({
        invoiceId: invoice.id,
        amount: totalPrice.toString(),
        paymentMethodId: this.paypalMethodId,
        paymentStatusId: this.pendingPaymentStatusId,
        transactionId: paypalOrder.orderId,
      });

      const approveLink = paypalOrder.links?.find(
        (link) => link.rel === 'approve',
      );

      return {
        success: true,
        reservation,
        invoice,
        paypalOrder: {
          orderId: paypalOrder.orderId,
          approveUrl: approveLink?.href,
        },
        totalPrice: totalPrice.toString(),
        message: 'Reservation created. Please complete payment via PayPal.',
      };
    });
  }

  async completePaypalBooking(orderId: string) {
    const captureResult = await this.paypalService.captureOrder(orderId);

    const payment = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, captureResult.paymentId))
      .limit(1);

    if (!payment || payment.length === 0) {
      throw new NotFoundException('Payment', String(captureResult.paymentId));
    }

    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, payment[0].invoiceId))
      .limit(1);

    if (!invoice) {
      throw new NotFoundException('Invoice', String(payment[0].invoiceId));
    }

    await this.db
      .update(schema.invoices)
      .set({ statusId: 2 })
      .where(eq(schema.invoices.id, invoice.id));

    const [reservation] = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, invoice.reservationId))
      .limit(1);

    if (!reservation) {
      throw new NotFoundException('Reservation', String(invoice.reservationId));
    }

    await this.db
      .update(schema.reservations)
      .set({
        statusId: 2,
        paymentStatusId: this.completedPaymentStatusId,
      })
      .where(eq(schema.reservations.id, reservation.id));

    const roomValidations = await this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.reservationId, reservation.id));

    for (const room of roomValidations) {
      await this.db
        .delete(schema.roomHolds)
        .where(
          and(
            eq(schema.roomHolds.userId, reservation.userId),
            eq(schema.roomHolds.roomId, room.roomId),
            eq(schema.roomHolds.checkIn, room.checkIn),
            eq(schema.roomHolds.checkOut, room.checkOut),
          ),
        );
    }

    const user = await this.usersService.getUserById(reservation.userId);
    if (user) {
      const emailPayload: EmailConfirmation = {
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalPrice: reservation.totalPrice,
        depositAmount: reservation.depositAmount,
        rooms: roomValidations.map((r) => ({
          roomId: r.roomId,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          guestsCount: r.guestsCount,
          price: 0,
        })),
        specialRequests: reservation.specialRequests?.toString(),
      };

      await this.emailService.sendReservationConfirmationEmail(emailPayload);
    }

    return {
      success: true,
      reservation: {
        ...reservation,
        statusId: 2,
        paymentStatusId: this.completedPaymentStatusId,
      },
      message: 'Payment completed successfully',
    };
  }
}
