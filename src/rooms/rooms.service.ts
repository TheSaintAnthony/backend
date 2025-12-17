import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { NotFoundException, BadRequestException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import {
  CreateRoomDto,
  EditRoomDto,
  CheckAvailabilityDto,
  GetPriceQuoteDto,
} from './dto';
import { RoomWithDetails, RoomResponse, RoomQuote } from './interfaces';
import { eq, and, lte, gte, or, count, inArray, isNull, ne, sql } from 'drizzle-orm';
import { RoomPricesService } from 'src/room-prices/room-prices.service';
import { RoomHoldsService } from 'src/room-holds/room-holds.service';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { ImagesService } from 'src/images/images.service';
import { StripeService } from 'src/payments/stripe/stripe.service';
import { PropertiesService } from 'src/properties/properties.service';
import { PricingEngineService } from 'src/pricing/pricing-engine.service';
import {
  createStripeProductForRoom,
  updateStripeProductImages,
} from './helpers/stripe-integration.helper';
import {
  buildRoomsByPropertyQuery,
  mapRoomsQueryResults,
} from './helpers/room-query.helper';
import { calculateNights } from '../common/utils/date.utils';
import {
  calculateNightlyPrices,
  groupPricesIntoBreakdown,
  calculateTotalFromNightlyPrices,
} from './helpers/price-calculation.helper';
@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private roomPricesService: RoomPricesService,
    private roomHoldsService: RoomHoldsService,
    private imagesService: ImagesService,
    private stripeService: StripeService,
    @Inject(forwardRef(() => PropertiesService))
    private propertiesService: PropertiesService,
    private pricingEngine: PricingEngineService,
  ) {}
  async createRoom(data: CreateRoomDto) {
    const { images, ...roomData } = data;
    const [createdRoom] = await this.db
      .insert(schema.rooms)
      .values({ ...roomData, quantity: roomData.quantity ?? 1 })
      .returning();
    if (images && images.length > 0) {
      await this.imagesService.createImages(
        images.map((img) => ({
          entityTypeCode: 'room',
          entityId: createdRoom.id,
          ...img,
        })),
      );
    }
    try {
      await createStripeProductForRoom(
        createdRoom,
        this.stripeService,
        this.imagesService,
        this.roomPricesService,
        this.db,
      );
    } catch (error) {
      this.logger.error('Failed to create Stripe product for room:', error);
    }
    return this.getRoomById(createdRoom.id);
  }
  async getRooms(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.rooms)
      .where(isNull(schema.rooms.deletedAt));
    const total = totalResult.count;
    const roomIdRows = await this.db
      .select({ id: schema.rooms.id })
      .from(schema.rooms)
      .where(isNull(schema.rooms.deletedAt))
      .limit(limit)
      .offset(offset);
    if (roomIdRows.length === 0) {
      return createPaginatedResponse([], total, page, limit);
    }
    const roomIds = roomIdRows.map((r) => r.id);
    const roomsData = await this.db
      .select({
        id: schema.rooms.id,
        propertyId: schema.rooms.propertyId,
        roomTypeId: schema.rooms.roomTypeId,
        name: schema.rooms.name,
        description: schema.rooms.description,
        bedCount: schema.rooms.bedCount,
        bathroomCount: schema.rooms.bathroomCount,
        quantity: schema.rooms.quantity,
        available: schema.rooms.available,
        roomType: schema.roomTypes.name,
        maxCapacity: schema.roomTypes.maxCapacity,
        amenityId: schema.amenities.id,
        amenityName: schema.amenities.name,
        highlightId: schema.highlights.id,
        highlightName: schema.highlights.name,
      })
      .from(schema.rooms)
      .leftJoin(
        schema.roomTypes,
        eq(schema.rooms.roomTypeId, schema.roomTypes.id),
      )
      .leftJoin(
        schema.roomAmenities,
        eq(schema.roomAmenities.roomId, schema.rooms.id),
      )
      .leftJoin(
        schema.roomHighlights,
        eq(schema.roomHighlights.roomId, schema.rooms.id),
      )
      .leftJoin(
        schema.amenities,
        eq(schema.amenities.id, schema.roomAmenities.amenityId),
      )
      .leftJoin(
        schema.highlights,
        eq(schema.highlights.id, schema.roomHighlights.highlightId),
      )
      .where(
        and(inArray(schema.rooms.id, roomIds), isNull(schema.rooms.deletedAt)),
      );
    const roomsMap = new Map<string, RoomWithDetails>();
    for (const row of roomsData) {
      if (!roomsMap.has(row.id)) {
        roomsMap.set(row.id, {
          id: row.id,
          propertyId: row.propertyId,
          roomTypeId: row.roomTypeId,
          name: row.name,
          description: row.description,
          bedCount: row.bedCount,
          bathroomCount: row.bathroomCount,
          quantity: row.quantity,
          available: row.available,
          roomType: row.roomType,
          maxCapacity: row.maxCapacity,
          amenities: [],
          highlights: [],
        });
      }
      const room = roomsMap.get(row.id)!;
      if (
        row.amenityId &&
        !room.amenities.some((a) => a.id === row.amenityId)
      ) {
        room.amenities.push({ id: row.amenityId, name: row.amenityName });
      }
      if (
        row.highlightId &&
        !room.highlights.some((h) => h.id === row.highlightId)
      ) {
        room.highlights.push({ id: row.highlightId, name: row.highlightName });
      }
    }
    const data = Array.from(roomsMap.values()).map((room) => ({
      ...room,
      amenities: room.amenities.length > 0 ? room.amenities : null,
      highlights: room.highlights.length > 0 ? room.highlights : null,
    }));
    const roomIdStrings = data.map((room) => room.id);
    const allImages =
      roomIdStrings.length > 0
        ? await this.imagesService.getImagesByMultipleEntities(
            'room',
            roomIdStrings,
          )
        : [];
    const imagesByRoomId = new Map<string, typeof allImages>();
    for (const image of allImages) {
      const existing = imagesByRoomId.get(image.entityId) || [];
      existing.push(image);
      imagesByRoomId.set(image.entityId, existing);
    }
    const roomsWithImages = data.map((room) => {
      const images = imagesByRoomId.get(room.id) || [];
      const simplifiedImages = images.map((img) => ({
        url: img.url,
        isPrimary: img.isPrimary,
      }));
      return { ...room, images: simplifiedImages };
    });
    return createPaginatedResponse(roomsWithImages, total, page, limit);
  }
  async getRoomById(id: string): Promise<RoomResponse> {
    const roomsData = await this.db
      .select({
        id: schema.rooms.id,
        propertyId: schema.rooms.propertyId,
        roomTypeId: schema.rooms.roomTypeId,
        name: schema.rooms.name,
        description: schema.rooms.description,
        bedCount: schema.rooms.bedCount,
        bathroomCount: schema.rooms.bathroomCount,
        quantity: schema.rooms.quantity,
        available: schema.rooms.available,
        stripeProductId: schema.rooms.stripeProductId,
        stripePriceId: schema.rooms.stripePriceId,
        roomType: schema.roomTypes.name,
        maxCapacity: schema.roomTypes.maxCapacity,
        amenityId: schema.amenities.id,
        amenityName: schema.amenities.name,
        highlightId: schema.highlights.id,
        highlightName: schema.highlights.name,
      })
      .from(schema.rooms)
      .leftJoin(
        schema.roomTypes,
        eq(schema.rooms.roomTypeId, schema.roomTypes.id),
      )
      .leftJoin(
        schema.roomAmenities,
        eq(schema.roomAmenities.roomId, schema.rooms.id),
      )
      .leftJoin(
        schema.roomHighlights,
        eq(schema.roomHighlights.roomId, schema.rooms.id),
      )
      .leftJoin(
        schema.amenities,
        eq(schema.amenities.id, schema.roomAmenities.amenityId),
      )
      .leftJoin(
        schema.highlights,
        eq(schema.highlights.id, schema.roomHighlights.highlightId),
      )
      .where(eq(schema.rooms.id, id));
    if (!roomsData || roomsData.length === 0) {
      throw new NotFoundException('Room', id);
    }
    const room: RoomWithDetails = {
      id: roomsData[0].id,
      propertyId: roomsData[0].propertyId,
      roomTypeId: roomsData[0].roomTypeId,
      name: roomsData[0].name,
      description: roomsData[0].description,
      bedCount: roomsData[0].bedCount,
      bathroomCount: roomsData[0].bathroomCount,
      quantity: roomsData[0].quantity,
      available: roomsData[0].available,
      roomType: roomsData[0].roomType,
      maxCapacity: roomsData[0].maxCapacity,
      amenities: [],
      highlights: [],
    };
    for (const row of roomsData) {
      if (
        row.amenityId &&
        !room.amenities.some((a) => a.id === row.amenityId)
      ) {
        room.amenities.push({ id: row.amenityId, name: row.amenityName });
      }
      if (
        row.highlightId &&
        !room.highlights.some((h) => h.id === row.highlightId)
      ) {
        room.highlights.push({ id: row.highlightId, name: row.highlightName });
      }
    }
    const images = await this.imagesService.getImagesByEntity('room', id);
    const firstRow = roomsData[0];
    const result: RoomResponse = {
      id: room.id,
      propertyId: room.propertyId,
      name: room.name,
      description: room.description,
      bedCount: room.bedCount,
      bathroomCount: room.bathroomCount,
      quantity: room.quantity,
      available: room.available,
      roomType: room.roomType,
      maxCapacity: room.maxCapacity,
      stripeProductId: firstRow.stripeProductId || null,
      stripePriceId: firstRow.stripePriceId || null,
      amenities: room.amenities.length > 0 ? room.amenities : null,
      highlights: room.highlights.length > 0 ? room.highlights : null,
      images,
    };
    return result;
  }
  async getRoomWithProperty(id: string) {
    const room = await this.getRoomById(id);
    if (!room.propertyId) {
      return { ...room, property: null };
    }
    const property = await this.db.query.properties.findFirst({
      where: eq(schema.properties.id, room.propertyId),
      with: {
        address: true,
      },
    });
    if (property) {
      const images = await this.imagesService.getImagesByEntity(
        'property',
        property.id,
      );
      return { ...room, property: { ...property, images } };
    }
    return { ...room, property: null };
  }
  async getRoomsByProperty(propertyId: string, pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.rooms)
      .where(
        and(
          eq(schema.rooms.propertyId, propertyId),
          isNull(schema.rooms.deletedAt),
        ),
      );
    const total = totalResult.count;
    const roomIds = await this.db
      .select({ id: schema.rooms.id })
      .from(schema.rooms)
      .where(
        and(
          eq(schema.rooms.propertyId, propertyId),
          isNull(schema.rooms.deletedAt),
        ),
      )
      .limit(limit)
      .offset(offset);
    if (roomIds.length === 0) {
      return createPaginatedResponse([], total, page, limit);
    }
    const roomsData = await buildRoomsByPropertyQuery(
      this.db,
      propertyId,
      roomIds,
    );
    const data = mapRoomsQueryResults(roomsData, propertyId);
    const roomsWithImages = await Promise.all(
      data.map(async (room) => {
        const images = await this.imagesService.getImagesByEntity(
          'room',
          room.id,
        );
        const simplifiedImages = images.map((img) => ({
          url: img.url,
          isPrimary: img.isPrimary,
        }));
        return {
          ...room,
          amenities: room.amenities.length > 0 ? room.amenities : null,
          highlights: room.highlights.length > 0 ? room.highlights : null,
          images: simplifiedImages,
        };
      }),
    );
    return createPaginatedResponse(roomsWithImages, total, page, limit);
  }
  async editRoom(id: string, data: EditRoomDto) {
    const [room] = await this.db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, id));
    if (!room) {
      throw new NotFoundException('Room', id);
    }
    const { images, ...roomData } = data;
    await this.db
      .update(schema.rooms)
      .set({ ...roomData })
      .where(eq(schema.rooms.id, id));
    if (images !== undefined) {
      const existingImages = await this.imagesService.getImagesByEntity(
        'room',
        id,
      );
      await Promise.all(
        existingImages.map((img) => this.imagesService.deleteImage(img.id)),
      );
      if (images.length > 0) {
        await this.imagesService.createImages(
          images.map((img) => ({
            entityTypeCode: 'room',
            entityId: id,
            ...img,
          })),
        );
      }
    }
    if (room.stripeProductId) {
      try {
        const updatedRoom = { ...room, ...roomData };
        const roomImages = await this.imagesService.getImagesByEntity(
          'room',
          id,
        );
        const imageUrls = roomImages
          .map((img) => img.url)
          .filter((url) => url && url.startsWith('http'));
        await this.stripeService.updateProduct(room.stripeProductId, {
          name: updatedRoom.name,
          description: updatedRoom.description || undefined,
          metadata: {
            roomId: id,
            propertyId: updatedRoom.propertyId,
            roomTypeId: updatedRoom.roomTypeId || '',
          },
          images: imageUrls.length > 0 ? imageUrls : undefined,
        });
      } catch (error) {
        this.logger.error('Failed to update Stripe product:', error);
      }
    }
    return this.getRoomById(id);
  }
  async deleteRoom(id: string) {
    const [room] = await this.db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, id));
    if (!room) {
      throw new NotFoundException('Room', id);
    }
    const result = await this.db
      .update(schema.rooms)
      .set({
        deletedAt: new Date(),
        available: false,
      })
      .where(eq(schema.rooms.id, id))
      .returning();
    if (room.stripeProductId) {
      try {
        await this.stripeService.archiveProduct(room.stripeProductId);
      } catch (error) {
        this.logger.error('Failed to archive Stripe product:', error);
      }
    }
    return result;
  }
  async checkAvailability(data: CheckAvailabilityDto) {
    const { roomId, roomIds, checkIn, checkOut } = data;
    if (roomIds && roomIds.length > 0) {
      const availabilityPromises = roomIds.map(async (id) => {
        try {
          const isAvailable = await this.checkRoomAvailability(
            id,
            checkIn,
            checkOut,
          );
          return {
            roomId: id,
            available: isAvailable,
          };
        } catch {
          return {
            roomId: id,
            available: false,
          };
        }
      });
      const results = await Promise.all(availabilityPromises);
      return {
        checkIn,
        checkOut,
        results,
      };
    }
    if (!roomId) {
      throw new BadRequestException(
        'Either roomId or roomIds must be provided',
      );
    }
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new NotFoundException('Room', String(roomId));
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
  async getPriceQuote(data: GetPriceQuoteDto) {
    const { rooms, promoCodeId } = data;
    if (!rooms || rooms.length === 0) {
      throw new BadRequestException('At least one room must be specified');
    }

    const roomQuotes: RoomQuote[] = [];
    let allAvailable = true;

    for (const roomRequest of rooms) {
      const {
        roomId,
        checkIn,
        checkOut,
        guestsCount = 1,
        quantity = 1,
      } = roomRequest;
      const room = await this.getRoomById(roomId);
      if (!room) {
        throw new NotFoundException('Room', String(roomId));
      }
      const isAvailable = await this.checkRoomAvailability(
        roomId,
        checkIn,
        checkOut,
        undefined,
        quantity,
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
      let nightlyBreakdown: { price: string; nights: number }[] = [];
      if (isAvailable) {
        try {
          const { totalPrice, breakdown } =
            await this.calculateTotalPriceWithBreakdown(
              roomId,
              checkIn,
              checkOut,
            );
          const singleRoomPrice = totalPrice;
          roomPrice = singleRoomPrice * quantity;
          avgPricePerNight = singleRoomPrice / nights;
          nightlyBreakdown = breakdown;
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          roomQuotes.push({
            roomId,
            checkIn,
            checkOut,
            nights: String(nights),
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
        nights: String(nights),
        avgPricePerNight: avgPricePerNight.toFixed(2),
        roomTotal: roomPrice.toFixed(2),
        nightlyBreakdown:
          nightlyBreakdown.length > 0 ? nightlyBreakdown : undefined,
        available: isAvailable,
      });
    }

    const pricingInput = rooms.map((room) => ({
      roomId: room.roomId,
      checkIn: room.checkIn,
      checkOut: room.checkOut,
      guestsCount: room.guestsCount || 1,
      quantity: room.quantity || 1,
    }));

    const pricingBreakdown = await this.pricingEngine.calculatePricing(
      pricingInput,
      promoCodeId,
    );

    const roomBreakdownMap = new Map(
      pricingBreakdown.breakdown.rooms.map((room) => [room.roomId, room]),
    );

    const roomsWithPricing = roomQuotes.map((roomQuote) => {
      const breakdown = roomBreakdownMap.get(roomQuote.roomId);
      if (breakdown) {
        const roomDiscountProportion =
          pricingBreakdown.basePrice > 0
            ? breakdown.basePrice / pricingBreakdown.basePrice
            : 0;
        const roomDiscountAmount =
          pricingBreakdown.discountAmount * roomDiscountProportion;
        const roomDiscountedBase = breakdown.basePrice - roomDiscountAmount;
        const roomVatAmount = roomDiscountedBase * 0.23;
        const roomTotalWithDiscount =
          roomDiscountedBase + breakdown.tourismFee + roomVatAmount;

        return {
          ...roomQuote,
          roomTotal: roomTotalWithDiscount.toFixed(2),
        };
      }
      return roomQuote;
    });

    return {
      rooms: roomsWithPricing,
      totalPrice: pricingBreakdown.totalPrice.toFixed(2),
      pricing: {
        basePrice: pricingBreakdown.basePrice.toFixed(2),
        discountAmount: pricingBreakdown.discountAmount.toFixed(2),
        discountedBasePrice: pricingBreakdown.discountedBasePrice.toFixed(2),
        tourismFee: pricingBreakdown.tourismFee.toFixed(2),
        vatPercentage: '23',
        vatValue: pricingBreakdown.vatAmount.toFixed(2),
        totalPrice: pricingBreakdown.totalPrice.toFixed(2),
      },
      allAvailable,
      message: allAvailable
        ? 'All rooms are available'
        : 'Some rooms are not available',
    };
  }
  async checkRoomAvailability(
    roomId: string,
    checkIn: string,
    checkOut: string,
    excludeUserId?: string,
    requestedQuantity: number = 1,
  ): Promise<boolean> {
    const [room] = await this.db
      .select({ quantity: schema.rooms.quantity })
      .from(schema.rooms)
      .where(eq(schema.rooms.id, roomId));
    if (!room) {
      return false;
    }
    const totalQuantity = room.quantity || 1;
    const overlappingReservations = await this.db
      .select({ count: count() })
      .from(schema.reservationRooms)
      .innerJoin(
        schema.reservations,
        eq(schema.reservationRooms.reservationId, schema.reservations.id),
      )
      .innerJoin(
        schema.reservationStatus,
        eq(schema.reservations.statusId, schema.reservationStatus.id),
      )
      .where(
        and(
          eq(schema.reservationRooms.roomId, roomId),
          isNull(schema.reservationRooms.deletedAt),
          ne(schema.reservationStatus.name, 'Cancelled'),
          sql`daterange(${schema.reservationRooms.checkIn}::date, ${schema.reservationRooms.checkOut}::date, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')`,
        ),
      );
    const bookedCount = Number(overlappingReservations[0]?.count || 0);
    const availableCount = totalQuantity - bookedCount;
    if (availableCount < requestedQuantity) {
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
  async calculateTotalPriceWithBreakdown(
    roomId: string,
    checkInStr: string,
    checkOutStr: string,
  ): Promise<{
    totalPrice: number;
    breakdown: { price: string; nights: number }[];
  }> {
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) {
      throw new BadRequestException('Check-out must be after check-in');
    }
    const roomPrices = await this.roomPricesService.getRoomPricesByRoom(roomId);
    if (roomPrices.length === 0) {
      throw new BadRequestException('No pricing available for this room');
    }
    try {
      const nightlyPrices = calculateNightlyPrices(checkIn, checkOut, roomPrices);
      const totalPrice = calculateTotalFromNightlyPrices(nightlyPrices);
      const breakdown = groupPricesIntoBreakdown(nightlyPrices);
      return { totalPrice, breakdown };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to calculate price breakdown',
      );
    }
  }
  async calculateTotalPrice(
    roomId: string,
    checkInStr: string,
    checkOutStr: string,
  ): Promise<number> {
    const { totalPrice } = await this.calculateTotalPriceWithBreakdown(
      roomId,
      checkInStr,
      checkOutStr,
    );
    return totalPrice;
  }
}
