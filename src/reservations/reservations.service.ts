import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { NotFoundException, BadRequestException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateBookingDto, UpdateReservationDto } from './dto';
import {
  RoomValidation,
  RoomBookingInput,
  ReservationWithRooms,
} from './interfaces';
import {
  eq,
  inArray,
  count,
  and,
  ne,
  gt,
  sql,
  or,
  desc,
  isNull,
  SQL,
} from 'drizzle-orm';
import { RoomsService } from 'src/rooms/rooms.service';
import { UsersService } from 'src/users/users.service';
import { PropertiesService } from 'src/properties/properties.service';
import {
  PaymentStatus,
  RESERVATION_STATUS_NAMES,
  INVOICE_STATUS_NAMES,
} from 'src/constants';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InvoicesService } from 'src/invoices/invoices.service';
import { StripeService } from 'src/payments/stripe/stripe.service';
import { PaymentsService } from 'src/payments/payments.service';
import { PromoCodesService } from 'src/promo-codes/promo-codes.service';
import { RoomHoldsService } from 'src/room-holds/room-holds.service';
import { PricingEngineService } from 'src/pricing/pricing-engine.service';
import {
  buildReservationDetailQuery,
  mapReservationQueryResults,
} from './helpers/reservation-query.helper';
import { prepareStripeInvoiceLineItems } from './helpers/stripe-line-items.helper';
import { calculateNights } from '../common/utils/date.utils';
import {
  generateAccessCode,
  generateUniqueAccessCode,
} from './helpers/access-code.helper';

interface BookingIntentData {
  userId: string;
  rooms: RoomValidation[];
  specialRequests?: string;
  invoiceData?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerCity?: string;
    customerZipCode?: string;
    customerCountry?: string;
    customerTaxId?: string;
    customerCompanyName?: string;
  };
  promoCode?: {
    promoCodeId: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: string;
    stripePromoCodeId?: string;
    stripeCouponId?: string;
    code?: string;
  };
  pricing: {
    basePrice: number;
    discountAmount: number;
    discountedBasePrice: number;
    tourismFee: number;
    vatAmount: number;
    totalPrice: number;
    breakdown: {
      rooms: Array<{
        roomId: string;
        basePrice: number;
        tourismFee: number;
        guestsCount: number;
        nights: number;
        quantity: number;
      }>;
    };
  };
  stripeCustomerId: string;
}
@Injectable()
export class ReservationsService implements OnModuleInit {
  private readonly logger = new Logger(ReservationsService.name);
  private completedPaymentStatusId: string;
  private pendingPaymentStatusId: string;
  private readonly HOLD_DURATION_MINUTES = 5;
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private roomsService: RoomsService,
    private usersService: UsersService,
    private propertiesService: PropertiesService,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private statusLookupService: StatusLookupService,
    private invoicesService: InvoicesService,
    private stripeService: StripeService,
    private _paymentsService: PaymentsService,
    private promoCodesService: PromoCodesService,
    private roomHoldsService: RoomHoldsService,
    private pricingEngine: PricingEngineService,
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
        quantity: schema.rooms.quantity,
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
      const {
        roomId,
        checkIn,
        checkOut,
        guestsCount,
        quantity = 1,
      } = roomBooking;
      const room = roomsMap.get(roomId);
      if (!room) {
        throw new NotFoundException('Room', String(roomId));
      }
      if (room.maxCapacity && Number(guestsCount) > room.maxCapacity) {
        throw new BadRequestException(
          `Room ${roomId}: Guest count exceeds capacity`,
        );
      }
      const isAvailable = await this.roomsService.checkRoomAvailability(
        roomId,
        checkIn,
        checkOut,
        userId,
        quantity,
      );
      if (!isAvailable) {
        throw new BadRequestException(
          `Room ${roomId}: Not enough rooms available. Requested: ${quantity}`,
        );
      }
      const cancelledStatusId =
        await this.statusLookupService.getReservationStatusId(
          RESERVATION_STATUS_NAMES.CANCELLED,
        );
      const pendingStatusId =
        await this.statusLookupService.getReservationStatusId(
          RESERVATION_STATUS_NAMES.PENDING,
        );
      const existingPendingReservations = await tx
        .select({
          reservationId: schema.reservations.id,
        })
        .from(schema.reservationRooms)
        .innerJoin(
          schema.reservations,
          eq(schema.reservationRooms.reservationId, schema.reservations.id),
        )
        .where(
          and(
            eq(schema.reservationRooms.roomId, roomId),
            eq(schema.reservations.statusId, pendingStatusId),
            eq(schema.reservations.userId, userId),
            isNull(schema.reservationRooms.deletedAt),
            sql`daterange(${schema.reservationRooms.checkIn}::date, ${schema.reservationRooms.checkOut}::date, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')`,
          ),
        );
      if (existingPendingReservations.length > 0) {
        const pendingReservationIds = existingPendingReservations.map(
          (r) => r.reservationId,
        );
        await tx
          .update(schema.reservations)
          .set({ statusId: cancelledStatusId })
          .where(inArray(schema.reservations.id, pendingReservationIds));
      }
      const [overlappingCount] = await tx
        .select({ count: count() })
        .from(schema.reservationRooms)
        .innerJoin(
          schema.reservations,
          eq(schema.reservationRooms.reservationId, schema.reservations.id),
        )
        .where(
          and(
            eq(schema.reservationRooms.roomId, roomId),
            ne(schema.reservations.statusId, cancelledStatusId),
            or(
              ne(schema.reservations.userId, userId),
              ne(schema.reservations.statusId, pendingStatusId),
            ),
            isNull(schema.reservationRooms.deletedAt),
            sql`daterange(${schema.reservationRooms.checkIn}::date, ${schema.reservationRooms.checkOut}::date, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')`,
          ),
        );
      const roomQuantity = room.quantity || 1;
      const bookedCount = Number(overlappingCount?.count || 0);
      const availableCount = roomQuantity - bookedCount;
      if (availableCount < quantity) {
        throw new BadRequestException(
          `Room ${roomId} is not available for selected dates. Available: ${availableCount}, Requested: ${quantity}`,
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
            sql`daterange(${schema.roomHolds.checkIn}::date, ${schema.roomHolds.checkOut}::date, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')`,
          ),
        );
      if (activeHolds.length > 0) {
        throw new BadRequestException(
          `Room ${roomId} is currently being booked by another user`,
        );
      }
      const singleRoomPrice = await this.roomsService.calculateTotalPrice(
        roomId,
        checkIn,
        checkOut,
      );
      const roomPrice = singleRoomPrice * quantity;
      totalPrice += roomPrice;
      if (quantity > 0) {
        const holdValues = Array.from({ length: quantity }, () => ({
          userId,
          roomId,
          checkIn,
          checkOut,
          expiresAt,
        }));
        await tx.insert(schema.roomHolds).values(holdValues);
      }
      validatedRooms.push({
        roomId,
        checkIn,
        checkOut,
        guestsCount,
        quantity,
        price: String(roomPrice),
      });
    }
    return { totalPrice, validatedRooms };
  }
  private async sendConfirmationEmail(
    userId: string,
    totalPrice: string,
    validatedRooms: RoomValidation[],
    specialRequests?: string,
  ) {
    const user = await this.usersService.getUserById(userId);
    const payload = {
      data: {
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalPrice,
        rooms: validatedRooms,
        specialRequests,
      },
    };
    await this.emailQueue.add('sendReservationConfirmationEmail', payload);
  }
  private async sendCancellationEmail(
    userId: string,
    reservationId: string,
    refunded: boolean = false,
  ) {
    const [user, reservation, reservationRooms] = await Promise.all([
      this.usersService.getUserById(userId),
      this.getReservationById(reservationId),
      this.db
        .select({
          roomName: schema.rooms.name,
          checkIn: schema.reservationRooms.checkIn,
          checkOut: schema.reservationRooms.checkOut,
          guestsCount: schema.reservationRooms.guestsCount,
          propertyName: schema.properties.name,
        })
        .from(schema.reservationRooms)
        .leftJoin(
          schema.rooms,
          eq(schema.reservationRooms.roomId, schema.rooms.id),
        )
        .leftJoin(
          schema.properties,
          eq(schema.rooms.propertyId, schema.properties.id),
        )
        .where(eq(schema.reservationRooms.reservationId, reservationId)),
    ]);

    const baseRooms =
      reservationRooms.length > 0 ? reservationRooms : reservation.rooms || [];

    const sortedRooms = [...baseRooms].sort((a, b) =>
      (a.checkIn || '').localeCompare(b.checkIn || ''),
    );
    const firstRoom = sortedRooms[0];
    const lastRoom = sortedRooms[sortedRooms.length - 1];

    await this.emailQueue.add('sendReservationCancellationEmail', {
      data: {
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        propertyName: firstRoom?.propertyName || undefined,
        checkIn: firstRoom?.checkIn || undefined,
        checkOut: lastRoom?.checkOut || undefined,
        totalPrice: reservation.totalPrice,
        refunded,
        rooms: sortedRooms.map((room) => ({
          roomName: room.roomName || undefined,
          checkIn: room.checkIn || undefined,
          checkOut: room.checkOut || undefined,
          guestsCount: room.guestsCount || undefined,
        })),
      },
    });
  }
  private async createReservationWithRooms(
    tx: NodePgDatabase<typeof schema>,
    userId: string,
    statusId: string,
    paymentStatusId: string,
    totalPrice: string,
    validatedRooms: RoomValidation[],
    specialRequests?: string,
    promoCodeId?: string,
    discountAmount?: string,
  ) {
    const [reservation] = await tx
      .insert(schema.reservations)
      .values({
        userId,
        statusId,
        totalPrice,
        paymentStatusId,
        specialRequests,
        promoCodeId: promoCodeId || null,
        discountAmount: discountAmount || null,
      })
      .returning();
    const roomsWithAccessCodes = [];
    const usedAccessCodesInBatch = new Map<string, Set<number>>();

    for (const room of validatedRooms) {
      const quantity = room.quantity || 1;
      const dateKey = `${room.checkIn}_${room.checkOut}`;

      if (!usedAccessCodesInBatch.has(dateKey)) {
        usedAccessCodesInBatch.set(dateKey, new Set());
      }
      const usedCodesForDates = usedAccessCodesInBatch.get(dateKey)!;

      for (let i = 0; i < quantity; i++) {
        const accessCode = await this.generateUniqueAccessCode(
          room.checkIn,
          room.checkOut,
          tx,
          usedCodesForDates,
        );
        usedCodesForDates.add(accessCode);

        roomsWithAccessCodes.push({
          reservationId: reservation.id,
          roomId: room.roomId,
          checkIn: room.checkIn,
          checkOut: room.checkOut,
          guestsCount: parseInt(room.guestsCount),
          accessCode,
        });
      }
    }
    if (roomsWithAccessCodes.length > 0) {
      try {
        await tx.insert(schema.reservationRooms).values(roomsWithAccessCodes);
      } catch (error: any) {
        const pgError = error.cause || error;
        const errorCode = pgError.code || error.code;
        const constraint = pgError.constraint || error.constraint;
        const detail = pgError.detail || error.detail;
        const message = pgError.message || error.message;

        this.logger.error(`Failed to insert reservation rooms: ${message}`, {
          error: message,
          stack: error.stack,
          code: errorCode,
          constraint,
          detail,
          pgError: pgError,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          roomsCount: roomsWithAccessCodes.length,
          rooms: roomsWithAccessCodes.map((r) => ({
            roomId: r.roomId,
            reservationId: r.reservationId,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            accessCode: r.accessCode,
          })),
        });

        if (
          errorCode === '23505' ||
          message?.includes('unique') ||
          message?.includes('duplicate')
        ) {
          if (
            constraint === 'unique_reservation_room' ||
            message?.includes('unique_reservation_room')
          ) {
            throw new BadRequestException(
              'This room is already added to this reservation. The database migration may not have been run. Please contact support.',
            );
          }
          if (
            constraint === 'unique_access_code_within_date' ||
            message?.includes('unique_access_code_within_date')
          ) {
            throw new BadRequestException(
              'Access code conflict. Please try again.',
            );
          }
          if (
            constraint === 'unique_reservation_room_access_code' ||
            message?.includes('unique_reservation_room_access_code')
          ) {
            throw new BadRequestException(
              'Room and access code combination already exists. Please try again.',
            );
          }
          throw new BadRequestException(
            `Database constraint violation: ${constraint || 'unknown constraint'}. ${detail || message || 'Please ensure the database migration has been run.'}`,
          );
        }

        if (message?.includes('check_reservation_dates')) {
          throw new BadRequestException(
            'Invalid dates: check-out date must be after check-in date.',
          );
        }

        if (message?.includes('check_guests_count')) {
          throw new BadRequestException(
            'Invalid guest count: must be greater than 0.',
          );
        }

        throw new BadRequestException(
          `Failed to create reservation: ${message || 'Unknown database error'}. Please try again or contact support.`,
        );
      }
    }
    return reservation;
  }
  private generateAccessCode(): number {
    return generateAccessCode();
  }
  private async generateUniqueAccessCode(
    checkIn: string,
    checkOut: string,
    tx?: NodePgDatabase<typeof schema>,
    usedCodesInBatch?: Set<number>,
  ): Promise<number> {
    const db = tx || this.db;
    try {
      return await generateUniqueAccessCode(
        checkIn,
        checkOut,
        db,
        usedCodesInBatch,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to generate unique access code for dates ${checkIn} to ${checkOut}: ${error.message}`,
      );
      throw new BadRequestException(
        error.message ||
          'Failed to generate unique access code. Please try again.',
      );
    }
  }
  private async createInvoiceAndPayment(
    tx: NodePgDatabase<typeof schema>,
    reservationId: string,
    userId: string,
    amount: string,
    invoiceStatusId: string,
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
    stripeCustomerId?: string,
    discountInfo?: {
      discountAmount: number;
      promoCode?: string;
      discountType?: 'percentage' | 'fixed_amount';
      discountValue?: string;
      stripePromoCodeId?: string;
      stripeCouponId?: string;
    },
    storedPricing?: {
      basePrice: number;
      discountAmount: number;
      discountedBasePrice: number;
      tourismFee: number;
      vatAmount: number;
      totalPrice: number;
      breakdown: {
        rooms: Array<{
          roomId: string;
          basePrice: number;
          tourismFee: number;
          guestsCount: number;
          nights: number;
          quantity: number;
        }>;
      };
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
      const hasCustomName =
        customInvoiceData.customerName &&
        customInvoiceData.customerName.trim() !== '';
      const hasCustomEmail =
        customInvoiceData.customerEmail &&
        customInvoiceData.customerEmail.trim() !== '';
      const hasCustomPhone =
        customInvoiceData.customerPhone &&
        customInvoiceData.customerPhone.trim() !== '';
      const hasCustomTaxId =
        customInvoiceData.customerTaxId &&
        customInvoiceData.customerTaxId.trim() !== '';
      const hasCustomCompany =
        customInvoiceData.customerCompanyName &&
        customInvoiceData.customerCompanyName.trim() !== '';
      const hasCustomAddress =
        customInvoiceData.customerAddress &&
        customInvoiceData.customerAddress.trim() !== '';
      const hasCustomCity =
        customInvoiceData.customerCity &&
        customInvoiceData.customerCity.trim() !== '';
      const hasCustomCountry =
        customInvoiceData.customerCountry &&
        customInvoiceData.customerCountry.trim() !== '';
      customerName = hasCustomName
        ? customInvoiceData.customerName!
        : `${user.firstName} ${user.lastName}`;
      customerEmail = hasCustomEmail
        ? customInvoiceData.customerEmail!
        : user.email;
      customerPhone = hasCustomPhone
        ? customInvoiceData.customerPhone!
        : user.phone || undefined;
      customerTaxId = hasCustomTaxId
        ? customInvoiceData.customerTaxId!
        : user.nif || undefined;
      customerCompanyName = hasCustomCompany
        ? customInvoiceData.customerCompanyName!
        : user.companyName || undefined;
      if (hasCustomAddress || hasCustomCity) {
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
      customerCountry = hasCustomCountry
        ? customInvoiceData.customerCountry!.substring(0, 2).toUpperCase()
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
    const invoiceTypeId = this.statusLookupService.getInvoiceTypeId('Invoice');

    if (!storedPricing) {
      this.logger.error(
        'CRITICAL: createInvoiceAndPayment called without stored pricing breakdown. This should never happen.',
      );
      throw new BadRequestException(
        'Invoice generation failed: pricing data missing',
      );
    }

    const storedPricingBreakdown = storedPricing.breakdown.rooms;
    const roomBreakdownMap = new Map(
      storedPricingBreakdown.map((room) => [room.roomId, room]),
    );

    const lineItems = await Promise.all(
      validatedRooms.map(async (roomValidation) => {
        const room = await this.roomsService.getRoomById(roomValidation.roomId);
        const checkIn = new Date(roomValidation.checkIn);
        const checkOut = new Date(roomValidation.checkOut);
        const nights = calculateNights(checkIn, checkOut);
        const roomBreakdown = roomBreakdownMap.get(roomValidation.roomId);
        const roomBasePrice = roomBreakdown
          ? roomBreakdown.basePrice
          : Number(roomValidation.price);
        const totalAmount = roomBasePrice.toFixed(2);
        return {
          description: `${room.name} - ${nights} night(s)`,
          productCode: `ROOM_${room.id}`,
          quantity: nights.toString(),
          unitPrice: (roomBasePrice / nights).toFixed(2),
          totalAmount: totalAmount,
          itemType: 'accommodation',
          startDate: checkIn.toISOString(),
          endDate: checkOut.toISOString(),
        };
      }),
    );

    const tourismFeeLineItems = validatedRooms
      .map((roomValidation) => {
        const roomBreakdown = roomBreakdownMap.get(roomValidation.roomId);
        if (!roomBreakdown || roomBreakdown.tourismFee <= 0) {
          return null;
        }
        const checkIn = new Date(roomValidation.checkIn);
        const checkOut = new Date(roomValidation.checkOut);
        const nights = roomBreakdown.nights;
        const guestsCount = roomBreakdown.guestsCount;
        const tourismFeeTotal = roomBreakdown.tourismFee;
        const tourismFeePerPersonPerNight =
          nights > 0 && guestsCount > 0
            ? tourismFeeTotal / (guestsCount * nights)
            : 0;
        return {
          description: `Imposto turístico - ${guestsCount} ${guestsCount === 1 ? 'pessoa' : 'pessoas'}, ${nights} ${nights === 1 ? 'noite' : 'noites'}`,
          productCode: 'TOURIST_TAX',
          quantity: (guestsCount * nights).toString(),
          unitPrice: tourismFeePerPersonPerNight.toFixed(2),
          totalAmount: tourismFeeTotal.toFixed(2),
          itemType: 'tax',
          startDate: checkIn.toISOString(),
          endDate: checkOut.toISOString(),
        };
      })
      .filter((item) => item !== null);

    lineItems.push(...tourismFeeLineItems);

    const totalAccommodationPrice = storedPricing.discountedBasePrice;
    const vatAmount = storedPricing.vatAmount;

    if (vatAmount > 0) {
      lineItems.push({
        description: 'IVA (23%)',
        productCode: 'VAT',
        quantity: '1',
        unitPrice: vatAmount.toFixed(2),
        totalAmount: vatAmount.toFixed(2),
        itemType: 'tax',
        startDate: null as unknown as string,
        endDate: null as unknown as string,
      });
    }

    const storedTotalPrice = parseFloat(amount);
    const calculatedTotalFromLineItems = lineItems.reduce(
      (sum, item) => sum + parseFloat(item.totalAmount),
      0,
    );
    const totalDifference = Math.abs(
      storedTotalPrice - calculatedTotalFromLineItems,
    );

    this.logger.log(
      `[INVOICE] Generating invoice for reservation ${reservationId}: storedTotal=${storedTotalPrice.toFixed(2)}, calculatedFromLineItems=${calculatedTotalFromLineItems.toFixed(2)}, difference=${totalDifference.toFixed(2)}`,
    );
    this.logger.log(
      `[INVOICE] Using stored pricing: basePrice=${storedPricing.basePrice.toFixed(2)}, discount=${storedPricing.discountAmount.toFixed(2)}, discountedBase=${storedPricing.discountedBasePrice.toFixed(2)}, tourismFee=${storedPricing.tourismFee.toFixed(2)}, vat=${storedPricing.vatAmount.toFixed(2)}, total=${storedPricing.totalPrice.toFixed(2)}`,
    );

    if (totalDifference > 0.01) {
      this.logger.error(
        `[INVOICE] CRITICAL: Invoice total mismatch! Stored: ${storedTotalPrice.toFixed(2)}, Calculated from line items: ${calculatedTotalFromLineItems.toFixed(2)}, Difference: ${totalDifference.toFixed(2)}`,
      );
      this.logger.error(
        `[INVOICE] This should never happen - invoice line items should sum to stored total. Check room breakdown calculations.`,
      );
    }

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
      const accommodationItems = lineItems.filter(
        (item) => item.itemType === 'accommodation',
      );
      const totalAccommodationPrice = accommodationItems.reduce(
        (sum, item) => sum + parseFloat(item.totalAmount),
        0,
      );

      const storedBasePrice = storedPricing.basePrice;
      const storedDiscountAmount = storedPricing.discountAmount;

      await tx.insert(schema.invoiceLineItems).values(
        lineItems.map((item) => {
          let itemDiscount = '0.00';
          if (
            item.itemType === 'accommodation' &&
            storedDiscountAmount > 0 &&
            storedBasePrice > 0
          ) {
            const itemProportion =
              parseFloat(item.totalAmount) / storedBasePrice;
            itemDiscount = (storedDiscountAmount * itemProportion).toFixed(2);
          }

          const totalAfterDiscount = (
            parseFloat(item.totalAmount) - parseFloat(itemDiscount)
          ).toFixed(2);

          return {
            invoiceId: invoice.id,
            description:
              discountInfo &&
              discountInfo.discountAmount > 0 &&
              item.itemType === 'accommodation'
                ? `${item.description} (Código: ${discountInfo.promoCode || 'Desconto'})`
                : item.description,
            productCode: item.productCode,
            itemType: item.itemType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: itemDiscount,
            totalAmount: totalAfterDiscount,
            startDate: item.startDate ? new Date(item.startDate) : undefined,
            endDate: item.endDate ? new Date(item.endDate) : undefined,
          };
        }),
      );
    }

    if (transactionId) {
      const [existingPayment] = await tx
        .select()
        .from(schema.payments)
        .where(
          or(
            eq(schema.payments.transactionId, transactionId),
            eq(schema.payments.externalReferenceId, transactionId),
          ),
        )
        .limit(1);

      if (existingPayment) {
        if (
          existingPayment.invoiceId &&
          existingPayment.invoiceId !== invoice.id
        ) {
          this.logger.error(
            `[INVOICE] CRITICAL: Payment ${existingPayment.id} with transactionId ${transactionId} is already associated with invoice ${existingPayment.invoiceId}. Cannot associate with new invoice ${invoice.id}.`,
          );
          throw new BadRequestException(
            `Payment with transaction ${transactionId} is already associated with another invoice.`,
          );
        }

        this.logger.log(
          `[INVOICE] Payment with transactionId ${transactionId} already exists (ID: ${existingPayment.id}). Updating to associate with invoice ${invoice.id}`,
        );

        const paidAtValue =
          existingPayment.paidAt ||
          (paymentStatusId === this.completedPaymentStatusId
            ? new Date()
            : undefined);

        await tx
          .update(schema.payments)
          .set({
            invoiceId: invoice.id,
            amount,
            paymentStatusId,
            paidAt: paidAtValue,
            transactionId: transactionId,
            externalReferenceId: transactionId,
          })
          .where(eq(schema.payments.id, existingPayment.id));
      } else {
        const [existingPaymentForInvoice] = await tx
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.invoiceId, invoice.id))
          .limit(1);

        if (existingPaymentForInvoice) {
          this.logger.error(
            `[INVOICE] CRITICAL: Invoice ${invoice.id} already has a payment record (ID: ${existingPaymentForInvoice.id}, transactionId: ${existingPaymentForInvoice.transactionId}) but we're trying to create/update with transactionId ${transactionId}. This should not happen.`,
          );
          throw new BadRequestException(
            `Invoice ${invoice.id} already has a payment record. Cannot create duplicate.`,
          );
        }

        this.logger.log(
          `[INVOICE] Creating payment record for invoice ${invoice.id} with transactionId ${transactionId} (PaymentIntent ID)`,
        );
        await tx.insert(schema.payments).values({
          invoiceId: invoice.id,
          amount,
          paymentStatusId,
          transactionId,
          externalReferenceId: transactionId,
        });
      }
    } else {
      this.logger.warn(
        `[INVOICE] No transactionId provided for invoice ${invoice.id}. Creating payment without transactionId.`,
      );
      await tx.insert(schema.payments).values({
        invoiceId: invoice.id,
        amount,
        paymentStatusId,
        transactionId: null,
        externalReferenceId: null,
      });
    }
    return invoice;
  }
  private async prepareStripeInvoiceLineItems(
    validatedRooms: RoomValidation[],
    storedPricing: {
      basePrice: number;
      discountAmount: number;
      discountedBasePrice: number;
      tourismFee: number;
      vatAmount: number;
      totalPrice: number;
      breakdown: {
        rooms: Array<{
          roomId: string;
          basePrice: number;
          tourismFee: number;
          guestsCount: number;
          nights: number;
          quantity: number;
        }>;
      };
    },
    discountInfo?: {
      discountAmount: number;
      promoCode?: string;
      discountType?: 'percentage' | 'fixed_amount';
      discountValue?: string;
      stripePromoCodeId?: string;
      stripeCouponId?: string;
    },
  ) {
    try {
      return await prepareStripeInvoiceLineItems(
        validatedRooms,
        storedPricing,
        this.roomsService,
        discountInfo,
      );
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to prepare Stripe line items',
      );
    }
  }
  async getReservationById(id: string): Promise<ReservationWithRooms> {
    const results = await buildReservationDetailQuery(this.db).where(
      eq(schema.reservations.id, id),
    );

    if (results.length === 0) {
      throw new NotFoundException('Reservation', id);
    }

    return mapReservationQueryResults(results);
  }
  async getReservationsByUser(userId: string, pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100); // Safety clamp
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
        propertyId: schema.properties.id,
        propertyName: schema.properties.name,
        invoiceId: schema.invoices.id,
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
        eq(schema.reservations.id, schema.reservationRooms.reservationId),
      )
      .leftJoin(
        schema.rooms,
        eq(schema.reservationRooms.roomId, schema.rooms.id),
      )
      .leftJoin(
        schema.properties,
        eq(schema.rooms.propertyId, schema.properties.id),
      )
      .leftJoin(
        schema.invoices,
        eq(schema.reservations.id, schema.invoices.reservationId),
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
          specialRequests: row.specialRequests,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          invoiceId: row.invoiceId || null,
          invoiceUrl: row.invoiceUrl || null,
          invoiceTotalAmount: row.invoiceTotalAmount || null,
          rooms: [],
        });
      }
      if (row.roomId !== null) {
        const reservation = reservationsMap.get(reservationId);
        if (reservation) {
          const roomExists = reservation.rooms.some((r) => r.id === row.roomId);
          if (!roomExists) {
            reservation.rooms.push({
              id: row.roomId,
              reservationId: row.roomReservationId,
              roomId: row.roomRoomId,
              checkIn: row.checkIn,
              checkOut: row.checkOut,
              guestsCount: row.guestsCount,
              roomName: row.roomName,
              roomDescription: row.roomDescription,
              propertyId: row.propertyId || null,
              propertyName: row.propertyName || null,
            });
          }
        }
      }
    }
    const data = Array.from(reservationsMap.values());
    return createPaginatedResponse(data, total, page, limit);
  }
  async createBooking(userId: string, data: CreateBookingDto) {
    const { rooms, specialRequests, metadata, invoiceData, promoCodeId } = data;
    return this.db.transaction(async (tx) => {
      const { validatedRooms } = await this.validateRoomsAndCalculatePrice(
        tx,
        userId,
        rooms,
      );

      const pricingInput = validatedRooms.map((room) => ({
        roomId: room.roomId,
        checkIn: room.checkIn,
        checkOut: room.checkOut,
        guestsCount: parseInt(room.guestsCount),
        quantity: room.quantity || 1,
      }));

      const pricingBreakdown = await this.pricingEngine.calculatePricing(
        pricingInput,
        promoCodeId,
      );

      let promoCodeValidation: {
        promoCodeId: string;
        discountType: 'percentage' | 'fixed_amount';
        discountValue: string;
        stripePromoCodeId?: string;
        stripeCouponId?: string;
        code?: string;
      } | null = null;

      if (promoCodeId && pricingBreakdown.discountAmount > 0) {
        try {
          const promoCode =
            await this.promoCodesService.getPromoCodeById(promoCodeId);
          if (promoCode && promoCode.isActive && promoCode.coupon) {
            promoCodeValidation = {
              promoCodeId: promoCode.id,
              discountType: promoCode.coupon.discountType,
              discountValue: promoCode.coupon.discountValue || '0',
              stripePromoCodeId: promoCode.stripePromoCodeId,
              stripeCouponId: promoCode.coupon.stripeCouponId,
              code: promoCode.code,
            };
          }
        } catch (error) {
          this.logger.warn(`Promo code validation failed: ${error}`);
        }
      }

      const totalPriceForPayment = pricingBreakdown.totalPrice.toFixed(2);
      const user = await this.usersService.getUserById(userId);
      const invoiceCustomerEmail =
        invoiceData?.customerEmail && invoiceData.customerEmail.trim() !== ''
          ? invoiceData.customerEmail
          : user.email;
      const invoiceCustomerName =
        invoiceData?.customerName && invoiceData.customerName.trim() !== ''
          ? invoiceData.customerName
          : `${user.firstName} ${user.lastName}`;
      const invoiceCustomerPhone =
        invoiceData?.customerPhone && invoiceData.customerPhone.trim() !== ''
          ? invoiceData.customerPhone
          : user.phone || undefined;
      const stripeCustomer = await this.stripeService.getOrCreateCustomer(
        userId,
        invoiceCustomerEmail,
        invoiceCustomerName,
        invoiceCustomerPhone,
        {
          userId,
          invoiceCustomer: 'true',
        },
      );
      const userStripeCustomer = await this.stripeService.getOrCreateCustomer(
        userId,
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.phone || undefined,
        {
          userId,
        },
      );
      if (!user.stripeCustomerId) {
        await tx
          .update(schema.users)
          .set({ stripeCustomerId: userStripeCustomer.id })
          .where(eq(schema.users.id, userId));
      }

      const bookingIntentData: BookingIntentData = {
        userId,
        rooms: validatedRooms,
        specialRequests,
        invoiceData,
        promoCode: promoCodeValidation || undefined,
        pricing: {
          basePrice: pricingBreakdown.basePrice,
          discountAmount: pricingBreakdown.discountAmount,
          discountedBasePrice: pricingBreakdown.discountedBasePrice,
          tourismFee: pricingBreakdown.tourismFee,
          vatAmount: pricingBreakdown.vatAmount,
          totalPrice: pricingBreakdown.totalPrice,
          breakdown: pricingBreakdown.breakdown,
        },
        stripeCustomerId: stripeCustomer.id,
      };

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.HOLD_DURATION_MINUTES);

      const [bookingIntent] = await tx
        .insert(schema.bookingIntents)
        .values({
          userId,
          bookingData: bookingIntentData,
          expiresAt,
        })
        .returning();

      const paymentAmountInCents = Math.round(
        pricingBreakdown.totalPrice * 100,
      );
      const expectedAmountInCents = Math.round(
        parseFloat(totalPriceForPayment) * 100,
      );

      if (paymentAmountInCents !== expectedAmountInCents) {
        this.logger.error(
          `CRITICAL: Payment amount calculation error! Expected: ${expectedAmountInCents} cents (${totalPriceForPayment}), Calculated: ${paymentAmountInCents} cents (${pricingBreakdown.totalPrice})`,
        );
        throw new BadRequestException(
          'Payment amount calculation error. Please try again.',
        );
      }

      const paymentResult = await this.stripeService.createPaymentIntent({
        amount: totalPriceForPayment,
        currency: 'EUR',
        customerId: stripeCustomer.id,
        orderId: bookingIntent.id,
        description: 'ST ANTHONY Booking',
        statementDescriptor: 'ST ANTHONY',
        metadata: {
          bookingIntentId: bookingIntent.id,
          userId,
          storedTotalPrice: pricingBreakdown.totalPrice.toFixed(2),
          ...(promoCodeValidation && {
            promoCodeId: promoCodeValidation.promoCodeId,
            discountAmount: pricingBreakdown.discountAmount.toFixed(2),
          }),
          ...metadata,
        },
      });

      this.logger.log(
        `[BOOKING] Payment intent created: ${paymentResult.transactionId}, Amount: ${totalPriceForPayment} EUR (${paymentAmountInCents} cents), Stored total: ${pricingBreakdown.totalPrice.toFixed(2)}`,
      );
      this.logger.log(
        `[BOOKING] Stored pricing breakdown in booking_intents: basePrice=${pricingBreakdown.basePrice.toFixed(2)}, discount=${pricingBreakdown.discountAmount.toFixed(2)}, tourismFee=${pricingBreakdown.tourismFee.toFixed(2)}, vat=${pricingBreakdown.vatAmount.toFixed(2)}, total=${pricingBreakdown.totalPrice.toFixed(2)}`,
      );

      await tx
        .update(schema.bookingIntents)
        .set({ paymentIntentId: paymentResult.transactionId })
        .where(eq(schema.bookingIntents.id, bookingIntent.id));

      return {
        success: true,
        bookingIntentId: bookingIntent.id,
        payment: {
          transactionId: paymentResult.transactionId,
          requiresUserAction: paymentResult.requiresUserAction,
          actionUrl: paymentResult.actionUrl,
          clientSecret: paymentResult.metadata?.clientSecret,
          metadata: paymentResult.metadata,
        },
        pricing: {
          basePrice: pricingBreakdown.basePrice.toFixed(2),
          tourismFee: pricingBreakdown.tourismFee.toFixed(2),
          vatPercentage: '23',
          vatValue: pricingBreakdown.vatAmount.toFixed(2),
          totalPrice: pricingBreakdown.totalPrice.toFixed(2),
          discountAmount: pricingBreakdown.discountAmount.toFixed(2),
          originalBasePrice: pricingBreakdown.basePrice.toFixed(2),
        },
        promoCode: promoCodeValidation
          ? {
              promoCodeId: promoCodeValidation.promoCodeId,
              discountType: promoCodeValidation.discountType,
              discountValue: promoCodeValidation.discountValue,
              discountAmount: pricingBreakdown.discountAmount.toFixed(2),
            }
          : null,
        totalPrice: pricingBreakdown.discountedBasePrice.toFixed(2),
        message: 'Complete payment to confirm booking',
      };
    });
  }
  async completeBooking(transactionId: string) {
    const paymentStatus =
      await this.stripeService.getPaymentIntentStatus(transactionId);

    if (paymentStatus.status !== 'completed') {
      throw new BadRequestException(
        `Payment is not completed. Current status: ${paymentStatus.status}`,
      );
    }

    return this.db.transaction(async (tx) => {
      const existingReservation = await this.findReservationByPaymentIntent(
        tx,
        transactionId,
      );

      if (existingReservation) {
        return {
          success: true,
          reservation: existingReservation,
          message: 'Payment already completed',
        };
      }

      const [bookingIntent] = await tx
        .select()
        .from(schema.bookingIntents)
        .where(eq(schema.bookingIntents.paymentIntentId, transactionId))
        .limit(1);

      if (!bookingIntent) {
        throw new BadRequestException(
          'Invalid payment: booking intent not found',
        );
      }

      const bookingIntentData = bookingIntent.bookingData as BookingIntentData;

      const paymentAmount = paymentStatus.amount
        ? parseFloat(paymentStatus.amount)
        : 0;
      const storedTotalPrice = bookingIntentData.pricing.totalPrice;
      const amountDifference = Math.abs(paymentAmount - storedTotalPrice);

      this.logger.log(
        `[COMPLETE BOOKING] Payment confirmed: ${transactionId}, Payment amount: ${paymentAmount.toFixed(2)}, Stored total: ${storedTotalPrice.toFixed(2)}, Difference: ${amountDifference.toFixed(2)}`,
      );

      if (amountDifference > 0.01) {
        this.logger.error(
          `[COMPLETE BOOKING] CRITICAL: Payment amount mismatch! Payment: ${paymentAmount.toFixed(2)}, Stored: ${storedTotalPrice.toFixed(2)}, Difference: ${amountDifference.toFixed(2)}`,
        );
        throw new BadRequestException(
          'Payment amount does not match booking total. Please contact support.',
        );
      }

      const confirmedStatusId =
        await this.statusLookupService.getReservationStatusId(
          RESERVATION_STATUS_NAMES.CONFIRMED,
        );

      const reservation = await this.createReservationWithRooms(
        tx,
        bookingIntentData.userId,
        confirmedStatusId,
        this.completedPaymentStatusId,
        bookingIntentData.pricing.totalPrice.toString(), // Use totalPrice (includes VAT and taxes) instead of discountedBasePrice
        bookingIntentData.rooms,
        bookingIntentData.specialRequests,
        bookingIntentData.promoCode?.promoCodeId,
        bookingIntentData.pricing.discountAmount > 0
          ? bookingIntentData.pricing.discountAmount.toFixed(2)
          : undefined,
      );

      const invoice = await this.createInvoiceAndPayment(
        tx,
        reservation.id,
        bookingIntentData.userId,
        bookingIntentData.pricing.totalPrice.toFixed(2),
        this.statusLookupService.getInvoiceStatusId(INVOICE_STATUS_NAMES.PAID),
        this.completedPaymentStatusId,
        transactionId,
        bookingIntentData.rooms,
        bookingIntentData.invoiceData,
        bookingIntentData.stripeCustomerId,
        bookingIntentData.promoCode &&
          bookingIntentData.pricing.discountAmount > 0
          ? {
              discountAmount: bookingIntentData.pricing.discountAmount,
              promoCode: bookingIntentData.promoCode.code,
              discountType: bookingIntentData.promoCode.discountType,
              discountValue: bookingIntentData.promoCode.discountValue,
              stripePromoCodeId: bookingIntentData.promoCode.stripePromoCodeId,
              stripeCouponId: bookingIntentData.promoCode.stripeCouponId,
            }
          : undefined,
        bookingIntentData.pricing,
      );

      await tx
        .update(schema.bookingIntents)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(schema.bookingIntents.id, bookingIntent.id));

      await tx
        .update(schema.payments)
        .set({
          paidAt: paymentStatus.completedAt || new Date(),
        })
        .where(eq(schema.payments.invoiceId, invoice.id));

      const user = await this.usersService.getUserById(
        bookingIntentData.userId,
      );
      const stripeCustomerIdToUse =
        bookingIntentData.stripeCustomerId || user.stripeCustomerId;
      if (stripeCustomerIdToUse && transactionId) {
        try {
          this.logger.log(
            `[INVOICE] Creating Stripe invoice for reservation ${reservation.id} with PaymentIntent ${transactionId} attached`,
          );

          const stripeLineItems = await this.prepareStripeInvoiceLineItems(
            bookingIntentData.rooms,
            bookingIntentData.pricing,
            bookingIntentData.promoCode &&
              bookingIntentData.pricing.discountAmount > 0
              ? {
                  discountAmount: bookingIntentData.pricing.discountAmount,
                  promoCode: bookingIntentData.promoCode.code,
                  discountType: bookingIntentData.promoCode.discountType,
                  discountValue: bookingIntentData.promoCode.discountValue,
                  stripePromoCodeId:
                    bookingIntentData.promoCode.stripePromoCodeId,
                  stripeCouponId: bookingIntentData.promoCode.stripeCouponId,
                }
              : undefined,
          );

          const stripeInvoiceParams: Parameters<
            typeof this.stripeService.createInvoice
          >[0] = {
            customerId: stripeCustomerIdToUse,
            description: `Invoice ${invoice.invoiceNumber || invoice.id} for reservation ${reservation.id}`,
            metadata: {
              reservationId: reservation.id,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber || invoice.id,
            },
            lineItems: stripeLineItems,
            autoAdvance: false,
            paymentIntentId: transactionId,
          };

          const stripeInvoice =
            await this.stripeService.createInvoice(stripeInvoiceParams);

          this.logger.log(
            `[INVOICE] Stripe invoice created: ${stripeInvoice.id}, Status: ${stripeInvoice.status}, PaymentIntent ${transactionId} attached`,
          );

          const invoiceUrl =
            stripeInvoice.hosted_invoice_url || invoice.externalInvoiceUrl;
          let finalUrl = invoiceUrl;
          if (!finalUrl) {
            finalUrl = await this.stripeService.getInvoiceUrl(stripeInvoice.id);
          }

          await tx
            .update(schema.invoices)
            .set({
              issuedAt: new Date(),
              externalInvoiceId: stripeInvoice.id,
              externalInvoiceNumber: stripeInvoice.number || undefined,
              externalInvoiceUrl: finalUrl || invoice.externalInvoiceUrl,
              externalInvoicePdfPath: stripeInvoice.invoice_pdf || undefined,
            })
            .where(eq(schema.invoices.id, invoice.id));

          this.logger.log(
            `[INVOICE] Stripe invoice ${stripeInvoice.id} linked to database invoice ${invoice.id}. Invoice status: ${stripeInvoice.status}`,
          );
        } catch (error: any) {
          this.logger.error(
            `[INVOICE] Failed to create Stripe invoice for reservation ${reservation.id}: ${error.message}`,
            error,
          );
          this.logger.warn(
            `[INVOICE] Continuing without Stripe invoice. Database invoice ${invoice.id} created successfully.`,
          );
        }
      }

      if (
        bookingIntentData.promoCode?.promoCodeId &&
        bookingIntentData.pricing.discountAmount > 0
      ) {
        try {
          await this.promoCodesService.applyPromoCode(
            bookingIntentData.promoCode.promoCodeId,
            bookingIntentData.userId,
            reservation.id,
            bookingIntentData.pricing.discountAmount.toFixed(2),
          );
          this.logger.log(
            `Promo code redemption recorded for reservation ${reservation.id}`,
          );
        } catch (error) {
          this.logger.warn(`Failed to record promo code redemption: ${error}`);
        }
      }

      await tx
        .delete(schema.roomHolds)
        .where(eq(schema.roomHolds.userId, bookingIntentData.userId));

      const reservationRooms = await tx
        .select()
        .from(schema.reservationRooms)
        .where(eq(schema.reservationRooms.reservationId, reservation.id));

      await this.sendConfirmationEmail(
        reservation.userId,
        reservation.totalPrice,
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
        reservation,
        message: 'Payment completed successfully',
      };
    });
  }

  private async findReservationByPaymentIntent(
    tx: NodePgDatabase<typeof schema>,
    transactionId: string,
  ) {
    const [payment] = await tx
      .select()
      .from(schema.payments)
      .where(
        or(
          eq(schema.payments.transactionId, transactionId),
          eq(schema.payments.externalReferenceId, transactionId),
        ),
      )
      .limit(1);

    if (!payment) {
      return null;
    }

    const [invoice] = await tx
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, payment.invoiceId))
      .limit(1);

    if (!invoice) {
      return null;
    }

    const [reservation] = await tx
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, invoice.reservationId))
      .limit(1);

    return reservation || null;
  }
  async cancelReservation(reservationId: string, userId: string) {
    const result = await this.db.transaction(async (tx) => {
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
      const pendingStatusId =
        await this.statusLookupService.getReservationStatusId(
          RESERVATION_STATUS_NAMES.PENDING,
        );
      if (reservation.statusId !== pendingStatusId) {
        throw new BadRequestException(
          'Only pending reservations can be canceled',
        );
      }
      const cancelledStatusId =
        await this.statusLookupService.getReservationStatusId(
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
    await this.sendCancellationEmail(userId, reservationId, false);
    return result;
  }
  async retryPayment(reservationId: string, userId: string) {
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
      const pendingStatusId =
        await this.statusLookupService.getReservationStatusId(
          RESERVATION_STATUS_NAMES.PENDING,
        );
      if (reservation.statusId !== pendingStatusId) {
        throw new BadRequestException(
          'Only pending reservations can retry payment',
        );
      }
      const user = await this.usersService.getUserById(reservation.userId);
      const stripeCustomer = await this.stripeService.getOrCreateCustomer(
        reservation.userId,
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.phone || undefined,
        {
          userId: reservation.userId,
        },
      );
      const paymentResult = await this.stripeService.createPaymentIntent({
        amount: reservation.totalPrice,
        currency: 'EUR',
        customerId: stripeCustomer.id,
        orderId: reservation.id.toString(),
        description: `Retry payment for booking ${reservation.id}`,
        statementDescriptor: 'ST ANTHONY',
        metadata: {
          reservationId: reservation.id,
          userId: reservation.userId,
          retry: 'true',
        },
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
            externalReferenceId: paymentResult.transactionId,
            paymentStatusId: this.pendingPaymentStatusId,
            paidAt: null,
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
          clientSecret: paymentResult.metadata?.clientSecret,
          metadata: paymentResult.metadata,
        },
        message: 'Ready to retry payment',
      };
    });
  }
  async getPendingReservations(userId: string) {
    const pendingStatusId =
      await this.statusLookupService.getReservationStatusId(
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
  async getAllReservations(pagination?: PaginationDto, statusFilter?: string) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100); // Safety clamp
    const offset = (page - 1) * limit;
    const whereConditions: SQL[] = [];
    if (statusFilter) {
      try {
        const statusId =
          await this.statusLookupService.getReservationStatusId(statusFilter);
        if (statusId) {
          whereConditions.push(eq(schema.reservations.statusId, statusId));
        }
      } catch {
        this.logger.warn(`Invalid status filter: ${statusFilter}`);
        return createPaginatedResponse([], 0, page, limit);
      }
    }
    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.reservations)
      .where(whereClause);
    const total = totalResult.count;
    const reservationIds = await this.db
      .select({ id: schema.reservations.id })
      .from(schema.reservations)
      .where(whereClause)
      .orderBy(desc(schema.reservations.createdAt))
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
        invoiceId: schema.invoices.id,
        invoiceUrl: schema.invoices.externalInvoiceUrl,
        invoiceTotalAmount: schema.invoices.totalAmount,
        userEmail: schema.users.email,
        userFirstName: schema.users.firstName,
        userLastName: schema.users.lastName,
        userPhone: schema.users.phone,
        userNif: schema.users.nif,
        addressStreet: schema.addresses.street,
        addressCity: schema.addresses.city,
        addressZipCode: schema.addresses.zipCode,
        addressCountry: schema.addresses.country,
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
      )
      .leftJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
      .leftJoin(
        schema.addresses,
        eq(schema.users.addressId, schema.addresses.id),
      )
      .where(
        inArray(
          schema.reservations.id,
          reservationIds.map((r) => r.id),
        ),
      )
      .orderBy(desc(schema.reservations.createdAt));
    const reservationsMap = new Map<
      string,
      ReservationWithRooms & {
        userEmail?: string;
        userFirstName?: string;
        userLastName?: string;
        userPhone?: string;
        userNif?: string;
        userAddress?: string;
        userCity?: string;
        userPostalCode?: string;
        userCountry?: string;
      }
    >();
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
          specialRequests: row.specialRequests,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          invoiceId: row.invoiceId || null,
          invoiceUrl: row.invoiceUrl || null,
          invoiceTotalAmount: row.invoiceTotalAmount || null,
          userEmail: row.userEmail || undefined,
          userFirstName: row.userFirstName || undefined,
          userLastName: row.userLastName || undefined,
          userPhone: row.userPhone || undefined,
          userNif: row.userNif || undefined,
          userAddress: row.addressStreet || undefined,
          userCity: row.addressCity || undefined,
          userPostalCode: row.addressZipCode || undefined,
          userCountry: row.addressCountry || undefined,
          rooms: [],
        });
      }
      if (row.roomId !== null) {
        const reservation = reservationsMap.get(reservationId);
        if (reservation) {
          const roomExists = reservation.rooms.some((r) => r.id === row.roomId);
          if (!roomExists) {
            reservation.rooms.push({
              id: row.roomId,
              reservationId: row.roomReservationId,
              roomId: row.roomRoomId,
              checkIn: row.checkIn,
              checkOut: row.checkOut,
              guestsCount: row.guestsCount,
              accessCode: row.accessCode || null,
              roomName: row.roomName,
              roomDescription: row.roomDescription,
              bedCount: row.bedCount || null,
              bathroomCount: row.bathroomCount || null,
              roomTypeName: row.roomTypeName || null,
              maxCapacity: row.maxCapacity || null,
              propertyId: row.propertyId || null,
              propertyName: row.propertyName || null,
            });
          }
        }
      }
    }
    const data = Array.from(reservationsMap.values());
    return createPaginatedResponse(data, total, page, limit);
  }
  async updateReservationStatus(reservationId: string, statusName: string) {
    const reservation = await this.getReservationById(reservationId);
    if (!reservation) {
      throw new NotFoundException('Reservation', reservationId);
    }
    const statusId =
      await this.statusLookupService.getReservationStatusId(statusName);
    if (!statusId) {
      throw new BadRequestException(`Invalid status: ${statusName}`);
    }
    await this.db
      .update(schema.reservations)
      .set({
        statusId,
        updatedAt: new Date(),
      })
      .where(eq(schema.reservations.id, reservationId));
    return this.getReservationById(reservationId);
  }
  async cancelReservationAdmin(
    reservationId: string,
    issueRefund: boolean = false,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const [reservation] = await tx
        .select()
        .from(schema.reservations)
        .where(eq(schema.reservations.id, reservationId))
        .limit(1);
      if (!reservation) {
        throw new NotFoundException('Reservation', reservationId);
      }
      const cancelledStatusId =
        await this.statusLookupService.getReservationStatusId(
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
        if (issueRefund) {
          const [payment] = await tx
            .select()
            .from(schema.payments)
            .where(eq(schema.payments.invoiceId, invoice.id))
            .limit(1);
          if (!payment) {
            throw new BadRequestException(
              'No payment found for this reservation. Cannot issue refund.',
            );
          }
          const paymentIntentId =
            payment.transactionId || payment.externalReferenceId;
          if (!paymentIntentId) {
            throw new BadRequestException(
              'No PaymentIntent ID found. Cannot issue refund.',
            );
          }
          try {
            const refund = await this.stripeService.createRefund(
              paymentIntentId,
              undefined,
              'requested_by_customer',
            );
            this.logger.log(
              `Refund created successfully: ${refund.id} for PaymentIntent ${paymentIntentId}`,
            );
            if (invoice.externalInvoiceId) {
              try {
                const creditNote = await this.stripeService.createCreditNote(
                  invoice.externalInvoiceId,
                  undefined,
                  'order_change',
                  `Credit note for cancelled reservation ${reservationId}`,
                );
                this.logger.log(
                  `Credit note created successfully: ${creditNote.id} for invoice ${invoice.externalInvoiceId}`,
                );
              } catch (creditNoteError) {
                this.logger.warn(
                  `Failed to create credit note for invoice ${invoice.externalInvoiceId}: ${creditNoteError}`,
                );
              }
            }
          } catch (error) {
            this.logger.error(
              `Failed to process refund for PaymentIntent ${paymentIntentId}: ${error}`,
            );
            throw new BadRequestException(
              `Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      }
      const reservationRooms = await tx
        .select()
        .from(schema.reservationRooms)
        .where(eq(schema.reservationRooms.reservationId, reservationId));
      for (const room of reservationRooms) {
        await tx
          .update(schema.reservationRooms)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.reservationRooms.id, room.id));
      }
      await tx
        .delete(schema.roomHolds)
        .where(eq(schema.roomHolds.userId, reservation.userId));
      return {
        success: true,
        message: 'Reservation cancelled successfully',
      };
    });
    const reservation = await this.getReservationById(reservationId);
    if (reservation.userId) {
      await this.sendCancellationEmail(
        reservation.userId,
        reservationId,
        issueRefund,
      );
    }
    return result;
  }
  async updateReservation(reservationId: string, data: UpdateReservationDto) {
    return this.db.transaction(async (tx) => {
      const reservation = await this.getReservationById(reservationId);
      if (!reservation) {
        throw new NotFoundException('Reservation', reservationId);
      }
      if (data.specialRequests !== undefined) {
        await tx
          .update(schema.reservations)
          .set({
            specialRequests: data.specialRequests,
            updatedAt: new Date(),
          })
          .where(eq(schema.reservations.id, reservationId));
      }
      if (data.rooms && data.rooms.length > 0) {
        const existingRooms = await tx
          .select()
          .from(schema.reservationRooms)
          .where(eq(schema.reservationRooms.reservationId, reservationId));
        for (
          let i = 0;
          i < data.rooms.length && i < existingRooms.length;
          i++
        ) {
          const roomUpdate = data.rooms[i];
          const existingRoom = existingRooms[i];
          const updateData: {
            checkIn?: Date;
            checkOut?: Date;
            guestsCount?: number;
            updatedAt?: Date;
          } = {};
          if (roomUpdate.checkIn)
            updateData.checkIn = new Date(roomUpdate.checkIn);
          if (roomUpdate.checkOut)
            updateData.checkOut = new Date(roomUpdate.checkOut);
          if (roomUpdate.guestsCount !== undefined)
            updateData.guestsCount = roomUpdate.guestsCount;
          if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            await tx
              .update(schema.reservationRooms)
              .set(
                updateData as Partial<
                  typeof schema.reservationRooms.$inferInsert
                >,
              )
              .where(eq(schema.reservationRooms.id, existingRoom.id));
          }
        }
      }
      return this.getReservationById(reservationId);
    });
  }
  async checkInReservation(reservationId: string) {
    const [reservation] = await this.db
      .select({
        id: schema.reservations.id,
        statusId: schema.reservations.statusId,
        statusName: schema.reservationStatus.name,
      })
      .from(schema.reservations)
      .leftJoin(
        schema.reservationStatus,
        eq(schema.reservations.statusId, schema.reservationStatus.id),
      )
      .where(eq(schema.reservations.id, reservationId))
      .limit(1);
    if (!reservation) {
      throw new NotFoundException('Reservation', reservationId);
    }
    const currentStatus = reservation.statusName || '';
    if (currentStatus.toLowerCase() !== 'confirmed') {
      throw new BadRequestException(
        `Reservation must be in 'Confirmed' status to check in. Current status: ${currentStatus}`,
      );
    }
    const checkedInStatusId =
      await this.statusLookupService.getReservationStatusId(
        RESERVATION_STATUS_NAMES.CHECKED_IN,
      );
    await this.db
      .update(schema.reservations)
      .set({
        statusId: checkedInStatusId,
        updatedAt: new Date(),
      })
      .where(eq(schema.reservations.id, reservationId));
    return this.getReservationById(reservationId);
  }
  async findReservationByCustomerAndDates(
    customerName?: string,
    checkIn?: string,
    checkOut?: string,
  ) {
    const conditions: SQL[] = [];
    if (customerName) {
      const searchPattern = `%${customerName.toLowerCase()}%`;
      const nameCondition = or(
        sql`LOWER(${schema.users.firstName}) LIKE ${searchPattern}`,
        sql`LOWER(${schema.users.lastName}) LIKE ${searchPattern}`,
        sql`LOWER(${schema.users.email}) LIKE ${searchPattern}`,
      );
      if (nameCondition) {
        conditions.push(nameCondition);
      }
    }
    if (checkIn) {
      conditions.push(eq(schema.reservationRooms.checkIn, checkIn));
    }
    if (checkOut) {
      conditions.push(eq(schema.reservationRooms.checkOut, checkOut));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = await this.db
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
        propertyId: schema.properties.id,
        propertyName: schema.properties.name,
        invoiceId: schema.invoices.id,
        invoiceUrl: schema.invoices.externalInvoiceUrl,
        userEmail: schema.users.email,
        userFirstName: schema.users.firstName,
        userLastName: schema.users.lastName,
        userPhone: schema.users.phone,
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
      .leftJoin(
        schema.properties,
        eq(schema.rooms.propertyId, schema.properties.id),
      )
      .leftJoin(
        schema.invoices,
        eq(schema.reservations.id, schema.invoices.reservationId),
      )
      .leftJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.reservations.createdAt))
      .limit(50);
    const reservationsMap = new Map<
      string,
      ReservationWithRooms & {
        userEmail?: string;
        userFirstName?: string;
        userLastName?: string;
        userPhone?: string;
      }
    >();
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
          specialRequests: row.specialRequests,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          invoiceId: row.invoiceId || null,
          invoiceUrl: row.invoiceUrl || null,
          userEmail: row.userEmail || undefined,
          userFirstName: row.userFirstName || undefined,
          userLastName: row.userLastName || undefined,
          userPhone: row.userPhone || undefined,
          rooms: [],
        });
      }
      if (row.roomId !== null) {
        const reservation = reservationsMap.get(reservationId);
        if (reservation) {
          const roomExists = reservation.rooms.some((r) => r.id === row.roomId);
          if (!roomExists) {
            reservation.rooms.push({
              id: row.roomId,
              reservationId: row.roomReservationId,
              roomId: row.roomRoomId,
              checkIn: row.checkIn,
              checkOut: row.checkOut,
              guestsCount: row.guestsCount,
              accessCode: row.accessCode || null,
              roomName: row.roomName,
              roomDescription: row.roomDescription,
              propertyId: row.propertyId || null,
              propertyName: row.propertyName || null,
            });
          }
        }
      }
    }
    return Array.from(reservationsMap.values());
  }

  async clearUserHolds(userId: string) {
    await this.roomHoldsService.releaseAllUserHolds(userId);
    return { success: true, message: 'Room holds cleared successfully' };
  }
}
