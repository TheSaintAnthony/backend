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
import { eq, inArray, count, and, ne, gt, sql } from 'drizzle-orm';
import { RoomsService } from 'src/rooms/rooms.service';
import { UsersService } from 'src/users/users.service';
import {
  PaymentStatus,
  RESERVATION_STATUS_NAMES,
  INVOICE_STATUS_NAMES,
  DEFAULT_DEPOSIT_AMOUNT,
} from 'src/constants';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';
import { PaymentStrategyFactory } from 'src/payments/payment-strategy.factory';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CacheService } from 'src/cache/cache.service';
import { InvoicesService } from 'src/invoices/invoices.service';

@Injectable()
export class ReservationsService implements OnModuleInit {
  private completedPaymentStatusId: string;
  private pendingPaymentStatusId: string;
  private readonly HOLD_DURATION_MINUTES = 10;

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private roomsService: RoomsService,
    private usersService: UsersService,
    private paymentStrategyFactory: PaymentStrategyFactory,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private cacheService: CacheService,
    private statusLookupService: StatusLookupService,
    private invoicesService: InvoicesService,
  ) {}

  async onModuleInit() {
    const completedStatusCached = await this.cacheService.get<{ id: string }>(
      'payment_status:completed',
    );
    const pendingStatusCached = await this.cacheService.get<{ id: string }>(
      'payment_status:pending',
    );

    if (completedStatusCached && pendingStatusCached) {
      this.completedPaymentStatusId = completedStatusCached.id;
      this.pendingPaymentStatusId = pendingStatusCached.id;
      return;
    }
    const [completedStatus] = await this.db
      .select()
      .from(schema.paymentStatus)
      .where(eq(schema.paymentStatus.name, PaymentStatus.COMPLETED));

    const [pendingStatus] = await this.db
      .select()
      .from(schema.paymentStatus)
      .where(eq(schema.paymentStatus.name, PaymentStatus.PENDING));

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

    this.completedPaymentStatusId = completedStatus.id;
    this.pendingPaymentStatusId = pendingStatus.id;

    await this.cacheService.setMany([
      { key: 'payment_status:completed', value: completedStatus, ttl: 86400 },
      { key: 'payment_status:pending', value: pendingStatus, ttl: 86400 },
    ]);
  }

  private async validateRoomsAndCalculatePrice(
    tx: NodePgDatabase<typeof schema>,
    userId: string,
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

      if (room.maxCapacity && Number(guestsCount) > room.maxCapacity) {
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
            sql`daterange(${schema.reservationRooms.checkIn}::date, ${schema.reservationRooms.checkOut}::date, '[]') && daterange(${checkIn}::date, ${checkOut}::date, '[]')`,
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
        price: String(roomPrice),
      });
    }

    return { totalPrice, validatedRooms };
  }

  private async sendConfirmationEmail(
    userId: string,
    totalPrice: string,
    depositAmount: string,
    validatedRooms: RoomValidation[],
    specialRequests?: string,
  ) {
    const user = await this.usersService.getUserById(userId);
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
    userId: string,
    statusId: string,
    paymentStatusId: string,
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
        depositAmount: DEFAULT_DEPOSIT_AMOUNT,
        specialRequests,
      })
      .returning();

    const roomsWithAccessCodes = await Promise.all(
      validatedRooms.map(async (room) => ({
        reservationId: reservation.id,
        roomId: room.roomId,
        checkIn: room.checkIn,
        checkOut: room.checkOut,
        guestsCount: parseInt(room.guestsCount),
        accessCode: await this.generateUniqueAccessCode(
          room.checkIn,
          room.checkOut,
        ),
      })),
    );

    await tx.insert(schema.reservationRooms).values(roomsWithAccessCodes);

    return reservation;
  }

  private generateAccessCode(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  private async generateUniqueAccessCode(
    checkIn: string,
    checkOut: string,
  ): Promise<number> {
    let code = this.generateAccessCode();
    let exists = true;
    while (exists) {
      const [result] = await this.db
        .select({ count: count() })
        .from(schema.reservationRooms)
        .where(
          and(
            eq(schema.reservationRooms.accessCode, code),
            eq(schema.reservationRooms.checkIn, checkIn),
            eq(schema.reservationRooms.checkOut, checkOut),
          ),
        );
      exists = result.count > 0;
      if (exists) {
        code = this.generateAccessCode();
      }
    }

    return code;
  }

  private async createInvoiceAndPayment(
    tx: NodePgDatabase<typeof schema>,
    reservationId: string,
    userId: string,
    amount: string,
    invoiceStatusId: string,
    paymentMethodId: string,
    paymentStatusId: string,
    transactionId: string | undefined,
    validatedRooms: RoomValidation[],
    customInvoiceData?: {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      customerAddress?: string;
      customerCity?: string;
      customerZipCode?: string;
      customerCountry?: string;
      customerTaxId?: string;
      customerCompanyName?: string;
    },
  ) {
    const user = await this.usersService.getUserById(userId);
    const [address] = user.addressId
      ? await tx
          .select()
          .from(schema.addresses)
          .where(eq(schema.addresses.id, user.addressId))
      : [null];

    let customerName: string;
    let customerEmail: string;
    let customerPhone: string | undefined;
    let customerAddress: string | undefined;
    let customerCountry: string | undefined;
    let customerTaxId: string | undefined;
    let customerCompanyName: string | undefined;

    if (customInvoiceData) {
      customerName =
        customInvoiceData.customerName || `${user.firstName} ${user.lastName}`;
      customerEmail = customInvoiceData.customerEmail || user.email;
      customerPhone =
        customInvoiceData.customerPhone || user.phone || undefined;
      customerTaxId = customInvoiceData.customerTaxId || user.nif || undefined;
      customerCompanyName =
        customInvoiceData.customerCompanyName || user.companyName || undefined;

      if (customInvoiceData.customerAddress || customInvoiceData.customerCity) {
        const addressParts = [
          customInvoiceData.customerAddress,
          customInvoiceData.customerCity,
          customInvoiceData.customerZipCode,
          customInvoiceData.customerCountry,
        ].filter(Boolean);
        customerAddress =
          addressParts.length > 0 ? addressParts.join(', ') : undefined;
      } else if (address) {
        customerAddress = `${address.street}, ${address.city}, ${address.zipCode}, ${address.country}`;
      }

      customerCountry = customInvoiceData.customerCountry
        ? customInvoiceData.customerCountry.substring(0, 2).toUpperCase()
        : address
          ? address.country.substring(0, 2).toUpperCase()
          : undefined;
    } else {
      customerName = `${user.firstName} ${user.lastName}`;
      customerEmail = user.email;
      customerPhone = user.phone || undefined;
      customerTaxId = user.nif || undefined;
      customerCompanyName = user.companyName || undefined;
      customerAddress = address
        ? `${address.street}, ${address.city}, ${address.zipCode}, ${address.country}`
        : undefined;
      customerCountry = address
        ? address.country.substring(0, 2).toUpperCase()
        : undefined;
    }

    const invoiceTypeId = this.statusLookupService.getInvoiceTypeId('invoice');

    const lineItems = await Promise.all(
      validatedRooms.map(async (roomValidation) => {
        const room = await this.roomsService.getRoomById(roomValidation.roomId);
        const checkIn = new Date(roomValidation.checkIn);
        const checkOut = new Date(roomValidation.checkOut);
        const nights = this.calculateNights(checkIn, checkOut);
        const totalAmount = Number(roomValidation.price).toFixed(2);

        return {
          description: `${room.name} - ${nights} night(s)`,
          productCode: `ROOM_${room.id}`,
          quantity: nights.toString(),
          unitPrice: (Number(roomValidation.price) / nights).toFixed(2),
          totalAmount: totalAmount,
          itemType: 'accommodation',
          startDate: checkIn.toISOString(),
          endDate: checkOut.toISOString(),
        };
      }),
    );

    const invoiceNumber = await this.invoicesService.generateInvoiceNumber();

    const [invoice] = await tx
      .insert(schema.invoices)
      .values({
        reservationId,
        userId,
        totalAmount: amount,
        currency: 'EUR',
        customerName,
        customerCompanyName: customerCompanyName || undefined,
        customerTaxId: customerTaxId || undefined,
        customerEmail,
        customerPhone: customerPhone || undefined,
        customerAddress,
        customerCountry,
        invoiceNumber,
        invoiceTypeId,
        statusId: invoiceStatusId,
      })
      .returning();

    if (lineItems.length > 0) {
      await tx.insert(schema.invoiceLineItems).values(
        lineItems.map((item) => ({
          invoiceId: invoice.id,
          description: item.description,
          productCode: item.productCode,
          itemType: item.itemType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
          startDate: item.startDate ? new Date(item.startDate) : undefined,
          endDate: item.endDate ? new Date(item.endDate) : undefined,
        })),
      );
    }

    await tx.insert(schema.payments).values({
      invoiceId: invoice.id,
      amount,
      paymentMethodId,
      paymentStatusId,
      transactionId,
    });

    return invoice;
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async getReservationById(id: string) {
    const [reservation] = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, id));

    if (!reservation) {
      throw new NotFoundException('Reservation', id);
    }

    return reservation;
  }

  async getReservationsByUser(userId: string, pagination?: PaginationDto) {
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

    const reservationsMap = new Map<string, ReservationWithRooms>();

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

  async createBooking(userId: string, data: CreateBookingDto) {
    const { rooms, specialRequests, paymentMethodId, metadata, invoiceData } =
      data;

    return this.db.transaction(async (tx) => {
      const { totalPrice, validatedRooms } =
        await this.validateRoomsAndCalculatePrice(tx, userId, rooms);

      const totalPriceStr = totalPrice.toString();

      const paymentStrategy =
        await this.paymentStrategyFactory.getStrategy(paymentMethodId);

      const reservation = await this.createReservationWithRooms(
        tx,
        userId,
        this.statusLookupService.getReservationStatusId(
          RESERVATION_STATUS_NAMES.PENDING,
        ),
        this.pendingPaymentStatusId,
        totalPriceStr,
        validatedRooms,
        specialRequests,
      );

      const paymentResult = await paymentStrategy.createPayment({
        amount: totalPriceStr,
        currency: 'EUR',
        orderId: reservation.id.toString(),
        metadata,
      });

      const invoice = await this.createInvoiceAndPayment(
        tx,
        reservation.id,
        userId,
        totalPriceStr,
        this.statusLookupService.getInvoiceStatusId(
          INVOICE_STATUS_NAMES.PENDING,
        ),
        paymentMethodId,
        this.pendingPaymentStatusId,
        paymentResult.transactionId,
        validatedRooms,
        invoiceData,
      );

      return {
        success: true,
        reservation,
        invoice,
        payment: {
          transactionId: paymentResult.transactionId,
          requiresUserAction: paymentResult.requiresUserAction,
          actionUrl: paymentResult.actionUrl,
          referenceCode: paymentResult.referenceCode,
          entityCode: paymentResult.entityCode,
          expiresAt: paymentResult.expiresAt,
          metadata: paymentResult.metadata,
        },
        totalPrice: totalPriceStr,
        message: paymentResult.requiresUserAction
          ? 'Complete payment to confirm booking'
          : 'Booking completed successfully',
      };
    });
  }

  async completeBooking(transactionId: string, paymentMethodId: string) {
    return this.db.transaction(async (tx) => {
      const [existingPayment] = await tx
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.transactionId, transactionId))
        .limit(1);

      if (!existingPayment) {
        throw new NotFoundException('Payment', transactionId);
      }

      if (existingPayment.paymentStatusId === this.completedPaymentStatusId) {
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
            return {
              success: true,
              reservation,
              message: 'Payment already completed',
            };
          }
        }
      }

      const paymentStrategy =
        await this.paymentStrategyFactory.getStrategy(paymentMethodId);

      const captureResult = await paymentStrategy.capturePayment(transactionId);

      if (!captureResult.success) {
        throw new BadRequestException(
          captureResult.errorMessage || 'Payment capture failed',
        );
      }

      await tx
        .update(schema.payments)
        .set({
          paymentStatusId: this.completedPaymentStatusId,
          paidAt: new Date(),
        })
        .where(eq(schema.payments.id, existingPayment.id));

      const [invoice] = await tx
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, existingPayment.invoiceId))
        .limit(1);

      if (!invoice) {
        throw new NotFoundException(
          'Invoice',
          String(existingPayment.invoiceId),
        );
      }

      await tx
        .update(schema.invoices)
        .set({
          statusId: this.statusLookupService.getInvoiceStatusId(
            INVOICE_STATUS_NAMES.PAID,
          ),
        })
        .where(eq(schema.invoices.id, invoice.id));

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
        .update(schema.reservations)
        .set({
          statusId: this.statusLookupService.getReservationStatusId(
            RESERVATION_STATUS_NAMES.CONFIRMED,
          ),
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
          guestsCount: r.guestsCount.toString(),
          price: (
            parseFloat(reservation.totalPrice) / reservationRooms.length
          ).toString(),
        })),
        reservation.specialRequests || undefined,
      );

      return {
        success: true,
        reservation: {
          ...reservation,
          statusId: this.statusLookupService.getReservationStatusId(
            RESERVATION_STATUS_NAMES.CONFIRMED,
          ),
          paymentStatusId: this.completedPaymentStatusId,
        },
        message: 'Payment completed successfully',
      };
    });
  }

  async cancelReservation(reservationId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [reservation] = await tx
        .select()
        .from(schema.reservations)
        .where(
          and(
            eq(schema.reservations.id, reservationId),
            eq(schema.reservations.userId, userId),
          ),
        )
        .limit(1);

      if (!reservation) {
        throw new NotFoundException('Reservation', String(reservationId));
      }

      const pendingStatusId = this.statusLookupService.getReservationStatusId(
        RESERVATION_STATUS_NAMES.PENDING,
      );

      if (reservation.statusId !== pendingStatusId) {
        throw new BadRequestException(
          'Only pending reservations can be canceled',
        );
      }

      const cancelledStatusId = this.statusLookupService.getReservationStatusId(
        RESERVATION_STATUS_NAMES.CANCELLED,
      );

      await tx
        .update(schema.reservations)
        .set({
          statusId: cancelledStatusId,
        })
        .where(eq(schema.reservations.id, reservationId));

      const [invoice] = await tx
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.reservationId, reservationId))
        .limit(1);

      if (invoice) {
        const cancelledInvoiceStatusId =
          this.statusLookupService.getInvoiceStatusId(
            INVOICE_STATUS_NAMES.CANCELLED,
          );

        await tx
          .update(schema.invoices)
          .set({
            statusId: cancelledInvoiceStatusId,
          })
          .where(eq(schema.invoices.id, invoice.id));
      }

      await tx
        .delete(schema.roomHolds)
        .where(eq(schema.roomHolds.userId, userId));

      return {
        success: true,
        message: 'Reservation canceled successfully',
      };
    });
  }

  async retryPayment(
    reservationId: string,
    userId: string,
    paymentMethodId: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [reservation] = await tx
        .select()
        .from(schema.reservations)
        .where(
          and(
            eq(schema.reservations.id, reservationId),
            eq(schema.reservations.userId, userId),
          ),
        )
        .limit(1);

      if (!reservation) {
        throw new NotFoundException('Reservation', String(reservationId));
      }

      const pendingStatusId = this.statusLookupService.getReservationStatusId(
        RESERVATION_STATUS_NAMES.PENDING,
      );

      if (reservation.statusId !== pendingStatusId) {
        throw new BadRequestException(
          'Only pending reservations can retry payment',
        );
      }

      const paymentStrategy =
        await this.paymentStrategyFactory.getStrategy(paymentMethodId);

      const paymentResult = await paymentStrategy.createPayment({
        amount: reservation.totalPrice,
        currency: 'EUR',
        orderId: reservation.id.toString(),
      });

      const [payment] = await tx
        .select()
        .from(schema.payments)
        .innerJoin(
          schema.invoices,
          eq(schema.payments.invoiceId, schema.invoices.id),
        )
        .where(eq(schema.invoices.reservationId, reservation.id))
        .limit(1);

      if (payment) {
        await tx
          .update(schema.payments)
          .set({
            transactionId: paymentResult.transactionId,
            paymentMethodId: paymentMethodId,
            paymentStatusId: this.pendingPaymentStatusId,
          })
          .where(eq(schema.payments.id, payment.payments.id));

        await tx
          .update(schema.invoices)
          .set({
            statusId: this.statusLookupService.getInvoiceStatusId(
              INVOICE_STATUS_NAMES.PENDING,
            ),
          })
          .where(eq(schema.invoices.id, payment.invoices.id));
      }

      return {
        success: true,
        reservation,
        payment: {
          transactionId: paymentResult.transactionId,
          requiresUserAction: paymentResult.requiresUserAction,
          actionUrl: paymentResult.actionUrl,
          referenceCode: paymentResult.referenceCode,
          entityCode: paymentResult.entityCode,
          expiresAt: paymentResult.expiresAt,
          metadata: paymentResult.metadata,
        },
        message: 'Ready to retry payment',
      };
    });
  }

  async getPendingReservations(userId: string) {
    const pendingStatusId = this.statusLookupService.getReservationStatusId(
      RESERVATION_STATUS_NAMES.PENDING,
    );

    const reservations = await this.db
      .select()
      .from(schema.reservations)
      .where(
        and(
          eq(schema.reservations.userId, userId),
          eq(schema.reservations.statusId, pendingStatusId),
        ),
      )
      .orderBy(schema.reservations.createdAt);

    return reservations;
  }
}
