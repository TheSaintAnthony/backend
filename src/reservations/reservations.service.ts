import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { NotFoundException, BadRequestException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateBookingDto } from './dto';
import {
  RoomValidation,
  RoomBookingInput,
  ReservationWithRooms,
} from './interfaces';
import { eq, inArray, count, and, or, ne, gt, sql } from 'drizzle-orm';
import { RoomsService } from 'src/rooms/rooms.service';
import { UsersService } from 'src/users/users.service';
import { EmailService } from 'src/email/email.service';
import { PaymentStatus, PaymentMethod } from 'src/constants';
import { PaypalService } from 'src/payments/paypal/paypal.service';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ReservationsService implements OnModuleInit {
  private completedPaymentStatusId: number;
  private pendingPaymentStatusId: number;
  private paypalMethodId: number;
  private readonly HOLD_DURATION_MINUTES = 10;

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private roomsService: RoomsService,
    private usersService: UsersService,
    private emailService: EmailService,
    private paypalService: PaypalService,
    @InjectQueue('email') private readonly emailQueue: Queue,
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

  private async validateRoomsAndCalculatePrice(
    tx: NodePgDatabase<typeof schema>,
    userId: number,
    rooms: RoomBookingInput[],
  ): Promise<{ totalPrice: number; validatedRooms: RoomValidation[] }> {
    if (!rooms || rooms.length === 0) {
      throw new BadRequestException('At least one room must be specified');
    }

    const roomIds = rooms.map((r) => r.roomId);
    const roomRecords = await tx
      .select({
        id: schema.rooms.id,
        maxCapacity: schema.roomTypes.maxCapacity,
      })
      .from(schema.rooms)
      .leftJoin(
        schema.roomTypes,
        eq(schema.rooms.roomTypeId, schema.roomTypes.id),
      )
      .where(
        roomIds.length === 1
          ? eq(schema.rooms.id, roomIds[0])
          : inArray(schema.rooms.id, roomIds),
      );

    const roomsMap = new Map(roomRecords.map((room) => [room.id, room]));

    let totalPrice = 0;
    const validatedRooms: RoomValidation[] = [];
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.HOLD_DURATION_MINUTES);

    for (const roomBooking of rooms) {
      const { roomId, checkIn, checkOut, guestsCount } = roomBooking;

      const room = roomsMap.get(roomId);
      if (!room) {
        throw new NotFoundException('Room', String(roomId));
      }

      if (room.maxCapacity && guestsCount > room.maxCapacity) {
        throw new BadRequestException(
          `Room ${roomId}: Guest count exceeds capacity`,
        );
      }

      const overlappingReservations = await tx
        .select()
        .from(schema.reservationRooms)
        .where(
          and(
            eq(schema.reservationRooms.roomId, roomId),
            or(
              and(
                eq(schema.reservationRooms.checkIn, checkIn),
                eq(schema.reservationRooms.checkOut, checkOut),
              ),
              and(
                eq(schema.reservationRooms.checkIn, checkIn),
                eq(schema.reservationRooms.checkOut, checkOut),
              ),
              sql`daterange(${schema.reservationRooms.checkIn}::date, ${schema.reservationRooms.checkOut}::date, '[]') && daterange(${checkIn}::date, ${checkOut}::date, '[]')`,
            ),
          ),
        );

      if (overlappingReservations.length > 0) {
        throw new BadRequestException(
          `Room ${roomId} is not available for selected dates`,
        );
      }

      const now = new Date();
      const activeHolds = await tx
        .select()
        .from(schema.roomHolds)
        .where(
          and(
            eq(schema.roomHolds.roomId, roomId),
            gt(schema.roomHolds.expiresAt, now),
            userId ? ne(schema.roomHolds.userId, userId) : undefined,
            sql`daterange(${schema.roomHolds.checkIn}::date, ${schema.roomHolds.checkOut}::date, '[]') && daterange(${checkIn}::date, ${checkOut}::date, '[]')`,
          ),
        );

      if (activeHolds.length > 0) {
        throw new BadRequestException(
          `Room ${roomId} is currently being booked by another user`,
        );
      }

      const roomPrice = await this.roomsService.calculateTotalPrice(
        roomId,
        checkIn,
        checkOut,
      );
      totalPrice += roomPrice;

      await tx.insert(schema.roomHolds).values({
        userId,
        roomId,
        checkIn,
        checkOut,
        expiresAt,
      });

      validatedRooms.push({
        roomId,
        checkIn,
        checkOut,
        guestsCount,
        price: roomPrice,
      });
    }

    return { totalPrice, validatedRooms };
  }

  private async sendConfirmationEmail(
    userId: number,
    totalPrice: string,
    depositAmount: string,
    validatedRooms: RoomValidation[],
    specialRequests?: string,
  ) {
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User', String(userId));
    }
    const payload = {
      data: {
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalPrice,
        depositAmount,
        rooms: validatedRooms,
        specialRequests,
      },
    };
    await this.emailQueue.add('sendReservationConfirmationEmail', payload);
  }

  private async createReservationWithRooms(
    tx: NodePgDatabase<typeof schema>,
    userId: number,
    statusId: number,
    paymentStatusId: number,
    totalPrice: string,
    validatedRooms: RoomValidation[],
    specialRequests?: string,
  ) {
    const [reservation] = await tx
      .insert(schema.reservations)
      .values({
        userId,
        statusId,
        totalPrice,
        paymentStatusId,
        depositAmount: '0.0',
        specialRequests,
      })
      .returning();

    await tx.insert(schema.reservationRooms).values(
      validatedRooms.map((room) => ({
        reservationId: reservation.id,
        roomId: room.roomId,
        checkIn: room.checkIn,
        checkOut: room.checkOut,
        guestsCount: room.guestsCount,
      })),
    );

    return reservation;
  }

  private async createInvoiceAndPayment(
    tx: NodePgDatabase<typeof schema>,
    reservationId: number,
    amount: string,
    invoiceStatusId: number,
    paymentMethodId: number,
    paymentStatusId: number,
    transactionId?: string,
  ) {
    const [invoice] = await tx
      .insert(schema.invoices)
      .values({
        reservationId,
        amount,
        statusId: invoiceStatusId,
      })
      .returning();

    await tx.insert(schema.payments).values({
      invoiceId: invoice.id,
      amount,
      paymentMethodId,
      paymentStatusId,
      transactionId,
    });

    return invoice;
  }

  private async fetchReservationData(
    tx: NodePgDatabase<typeof schema>,
    orderId: string,
  ) {
    const [existingPayment] = await tx
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.transactionId, orderId))
      .limit(1);

    if (
      existingPayment &&
      existingPayment.paymentStatusId === this.completedPaymentStatusId
    ) {
      const [invoice] = await tx
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, existingPayment.invoiceId))
        .limit(1);

      if (invoice) {
        const [reservation] = await tx
          .select()
          .from(schema.reservations)
          .where(eq(schema.reservations.id, invoice.reservationId))
          .limit(1);

        if (reservation) {
          return { alreadyCompleted: true, reservation };
        }
      }
    }

    return { alreadyCompleted: false };
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

  async getReservationsByUser(userId: number, pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.reservations)
      .where(eq(schema.reservations.userId, userId));

    const total = totalResult.count;

    const reservationIds = await this.db
      .select({ id: schema.reservations.id })
      .from(schema.reservations)
      .where(eq(schema.reservations.userId, userId))
      .orderBy(schema.reservations.createdAt)
      .limit(limit)
      .offset(offset);

    if (reservationIds.length === 0) {
      return createPaginatedResponse([], total, page, limit);
    }

    const results = await this.db
      .select({
        reservationId: schema.reservations.id,
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
        roomId: schema.reservationRooms.id,
        roomReservationId: schema.reservationRooms.reservationId,
        roomRoomId: schema.reservationRooms.roomId,
        checkIn: schema.reservationRooms.checkIn,
        checkOut: schema.reservationRooms.checkOut,
        guestsCount: schema.reservationRooms.guestsCount,
        roomName: schema.rooms.name,
        roomDescription: schema.rooms.description,
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
        eq(schema.reservations.id, schema.reservationRooms.reservationId),
      )
      .leftJoin(
        schema.rooms,
        eq(schema.reservationRooms.roomId, schema.rooms.id),
      )
      .where(
        inArray(
          schema.reservations.id,
          reservationIds.map((r) => r.id),
        ),
      )
      .orderBy(schema.reservations.createdAt);

    const reservationsMap = new Map<number, ReservationWithRooms>();

    for (const row of results) {
      const reservationId = row.reservationId;

      if (!reservationsMap.has(reservationId)) {
        reservationsMap.set(reservationId, {
          id: row.reservationId,
          userId: row.userId,
          statusId: row.statusId,
          statusName: row.statusName,
          totalPrice: row.totalPrice,
          paymentStatusId: row.paymentStatusId,
          paymentStatusName: row.paymentStatusName,
          depositAmount: row.depositAmount,
          specialRequests: row.specialRequests,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          rooms: [],
        });
      }

      if (row.roomId !== null) {
        const reservation = reservationsMap.get(reservationId);
        if (reservation) {
          reservation.rooms.push({
            id: row.roomId,
            reservationId: row.roomReservationId,
            roomId: row.roomRoomId,
            checkIn: row.checkIn,
            checkOut: row.checkOut,
            guestsCount: row.guestsCount,
            roomName: row.roomName,
            roomDescription: row.roomDescription,
          });
        }
      }
    }

    const data = Array.from(reservationsMap.values());
    return createPaginatedResponse(data, total, page, limit);
  }

  async createBooking(userId: number, data: CreateBookingDto) {
    const { rooms, specialRequests, paymentMethodId, transactionId } = data;

    return this.db.transaction(async (tx) => {
      const { totalPrice, validatedRooms } =
        await this.validateRoomsAndCalculatePrice(tx, userId, rooms);

      const totalPriceStr = totalPrice.toString();

      const reservation = await this.createReservationWithRooms(
        tx,
        userId,
        2,
        this.completedPaymentStatusId,
        totalPriceStr,
        validatedRooms,
        specialRequests,
      );

      const invoice = await this.createInvoiceAndPayment(
        tx,
        reservation.id,
        totalPriceStr,
        2,
        paymentMethodId,
        this.completedPaymentStatusId,
        transactionId,
      );

      await tx
        .delete(schema.roomHolds)
        .where(eq(schema.roomHolds.userId, userId));

      await this.sendConfirmationEmail(
        userId,
        reservation.totalPrice,
        reservation.depositAmount,
        validatedRooms,
        reservation.specialRequests || undefined,
      );

      return {
        success: true,
        reservation,
        invoice,
        totalPrice: totalPriceStr,
        message: 'Booking completed successfully',
      };
    });
  }

  async createPaypalBooking(userId: number, data: CreateBookingDto) {
    const { rooms, specialRequests } = data;

    return this.db.transaction(async (tx) => {
      const { totalPrice, validatedRooms } =
        await this.validateRoomsAndCalculatePrice(tx, userId, rooms);

      const totalPriceStr = totalPrice.toString();

      const reservation = await this.createReservationWithRooms(
        tx,
        userId,
        1,
        this.pendingPaymentStatusId,
        totalPriceStr,
        validatedRooms,
        specialRequests,
      );

      const paypalOrder = await this.paypalService.createOrder({
        invoiceId: reservation.id,
        amount: totalPriceStr,
      });

      const invoice = await this.createInvoiceAndPayment(
        tx,
        reservation.id,
        totalPriceStr,
        1,
        this.paypalMethodId,
        this.pendingPaymentStatusId,
        paypalOrder.orderId,
      );

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
        totalPrice: totalPriceStr,
        message: 'Complete payment to confirm booking',
      };
    });
  }

  async completePaypalBooking(orderId: string) {
    return this.db.transaction(async (tx) => {
      const existingData = await this.fetchReservationData(tx, orderId);
      if (existingData.alreadyCompleted && existingData.reservation) {
        return {
          success: true,
          reservation: existingData.reservation,
          message: 'Payment already completed',
        };
      }

      const captureResult = await this.paypalService.captureOrder(orderId);

      const [payment] = await tx
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.id, captureResult.paymentId))
        .limit(1);

      if (!payment) {
        throw new NotFoundException('Payment', String(captureResult.paymentId));
      }

      const [invoice] = await tx
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, payment.invoiceId))
        .limit(1);

      if (!invoice) {
        throw new NotFoundException('Invoice', String(payment.invoiceId));
      }

      const [reservation] = await tx
        .select()
        .from(schema.reservations)
        .where(eq(schema.reservations.id, invoice.reservationId))
        .limit(1);

      if (!reservation) {
        throw new NotFoundException(
          'Reservation',
          String(invoice.reservationId),
        );
      }

      await tx
        .update(schema.invoices)
        .set({ statusId: 2 })
        .where(eq(schema.invoices.id, invoice.id));

      await tx
        .update(schema.reservations)
        .set({
          statusId: 2,
          paymentStatusId: this.completedPaymentStatusId,
        })
        .where(eq(schema.reservations.id, reservation.id));

      await tx
        .delete(schema.roomHolds)
        .where(eq(schema.roomHolds.userId, reservation.userId));

      const reservationRooms = await tx
        .select()
        .from(schema.reservationRooms)
        .where(eq(schema.reservationRooms.reservationId, reservation.id));

      await this.sendConfirmationEmail(
        reservation.userId,
        reservation.totalPrice,
        reservation.depositAmount,
        reservationRooms.map((r) => ({
          roomId: r.roomId,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          guestsCount: r.guestsCount,
          price: 0,
        })),
        reservation.specialRequests || undefined,
      );

      return {
        success: true,
        reservation: {
          ...reservation,
          statusId: 2,
          paymentStatusId: this.completedPaymentStatusId,
        },
        message: 'Payment completed successfully',
      };
    });
  }
}
