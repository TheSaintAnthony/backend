import { Injectable, Inject, forwardRef } from '@nestjs/common';
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
import { eq, and, lte, gte, or, count, inArray, isNull, ne } from 'drizzle-orm';
import { RoomPricesService } from 'src/room-prices/room-prices.service';
import { RoomHoldsService } from 'src/room-holds/room-holds.service';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { CacheService } from 'src/cache/cache.service';
import { ImagesService } from 'src/images/images.service';
import { StripeService } from 'src/payments/stripe/stripe.service';
import { PropertiesService } from 'src/properties/properties.service';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private roomPricesService: RoomPricesService,
    private roomHoldsService: RoomHoldsService,
    private cacheService: CacheService,
    private imagesService: ImagesService,
    private stripeService: StripeService,
    @Inject(forwardRef(() => PropertiesService))
    private propertiesService: PropertiesService,
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
      const roomImages = await this.imagesService.getImagesByEntity(
        'room',
        createdRoom.id,
      );
      const imageUrls = roomImages
        .map((img) => img.url)
        .filter((url) => url && url.startsWith('http'));

      const stripeProduct = await this.stripeService.createProduct(
        createdRoom.name,
        createdRoom.description || undefined,
        {
          roomId: createdRoom.id,
          propertyId: createdRoom.propertyId,
          roomTypeId: createdRoom.roomTypeId || '',
        },
        imageUrls.length > 0 ? imageUrls : undefined,
      );

      let stripePriceId: string | undefined;
      const roomPrices = await this.roomPricesService.getRoomPricesByRoom(
        createdRoom.id,
      );

      if (roomPrices.length > 0) {
        const defaultPrice = roomPrices[0];
        const priceInCents = Math.round(parseFloat(defaultPrice.price) * 100);

        const stripePrice = await this.stripeService.createPrice(
          stripeProduct.id,
          priceInCents,
          'eur',
          {
            roomId: createdRoom.id,
            priceId: defaultPrice.id,
          },
        );

        stripePriceId = stripePrice.id;
      }

      await this.db
        .update(schema.rooms)
        .set({
          stripeProductId: stripeProduct.id,
          stripePriceId: stripePriceId,
        })
        .where(eq(schema.rooms.id, createdRoom.id));
    } catch (error) {
      console.error('Failed to create Stripe product for room:', error);
    }

    return this.getRoomById(createdRoom.id);
  }

  async getRooms(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100); // Safety clamp
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
        and(
          inArray(schema.rooms.id, roomIds),
          isNull(schema.rooms.deletedAt),
        ),
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

    // Batch fetch all images for all rooms in a single query
    const roomIdStrings = data.map((room) => room.id);
    const allImages = roomIdStrings.length > 0
      ? await this.imagesService.getImagesByMultipleEntities('room', roomIdStrings)
      : [];

    // Group images by room ID
    const imagesByRoomId = new Map<string, typeof allImages>();
    for (const image of allImages) {
      const existing = imagesByRoomId.get(image.entityId) || [];
      existing.push(image);
      imagesByRoomId.set(image.entityId, existing);
    }

    // Map rooms with their images
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
    const cacheKey = `room:${id}`;
    const cached = await this.cacheService.get<RoomResponse>(cacheKey);
    if (cached) return cached;
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

    await this.cacheService.set(cacheKey, result, 3600);
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
    const limit = Math.min(pagination?.limit || 10, 100); // Safety clamp
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

    const roomsData = await this.db
      .select({
        id: schema.rooms.id,
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
        roomTypeId: schema.rooms.roomTypeId,
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
        and(
          inArray(
            schema.rooms.id,
            roomIds.map((r) => r.id),
          ),
          isNull(schema.rooms.deletedAt),
        ),
      );

    const roomsMap = new Map<string, RoomWithDetails>();

    for (const row of roomsData) {
      if (!roomsMap.has(row.id)) {
        roomsMap.set(row.id, {
          id: row.id,
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
          propertyId: propertyId,
          roomTypeId: row.roomTypeId,
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
        return { ...room, images: simplifiedImages };
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
        console.error('Failed to update Stripe product:', error);
      }
    }

    await this.cacheService.del(`room:${id}`);
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
        console.error('Failed to archive Stripe product:', error);
      }
    }

    await this.cacheService.del(`room:${id}`);
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
    const { rooms } = data;

    if (!rooms || rooms.length === 0) {
      throw new BadRequestException('At least one room must be specified');
    }

    let totalBasePrice = 0;
    let totalTourismFee = 0;
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
      let tourismFee = 0;
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
          totalBasePrice += roomPrice;
          nightlyBreakdown = breakdown;

          if (room.propertyId) {
            const property = await this.propertiesService.getPropertyById(
              room.propertyId,
            );
            const propertyWithFee = property as { tourismFee?: string | null };
            const tourismFeePerPersonPerNight = parseFloat(
              (propertyWithFee.tourismFee as string) || '0',
            );
            tourismFee =
              tourismFeePerPersonPerNight * guestsCount * nights * quantity;
            totalTourismFee += tourismFee;
          }
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

    const vatPercentage = 23;
    const vatValue = totalBasePrice * (vatPercentage / 100);
    const totalPrice = totalBasePrice + totalTourismFee + vatValue;

    return {
      rooms: roomQuotes,
      totalPrice: totalPrice.toFixed(2),
      pricing: {
        basePrice: totalBasePrice.toFixed(2),
        tourismFee: totalTourismFee.toFixed(2),
        vatPercentage: vatPercentage.toString(),
        vatValue: vatValue.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
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
    // Get room quantity
    const [room] = await this.db
      .select({ quantity: schema.rooms.quantity })
      .from(schema.rooms)
      .where(eq(schema.rooms.id, roomId));

    if (!room) {
      return false;
    }

    const totalQuantity = room.quantity || 1;

    // Count overlapping reservations (excluding cancelled and soft-deleted ones)
    // We join with reservations to exclude cancelled status
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
    const nightlyPrices: { date: Date; price: number }[] = [];

    for (let i = 0; i < nights; i++) {
      // Find all prices that match the current date
      // Note: endDate is exclusive - a price ending on March 3 should NOT apply to the night starting March 3
      const applicablePrices = roomPrices.filter((price) => {
        const priceStart = new Date(price.startDate);
        const priceEnd = new Date(price.endDate);
        // Get date strings in YYYY-MM-DD format for comparison (timezone-independent)
        const currentDateStr = currentDate.toISOString().split('T')[0];
        const priceStartStr = priceStart.toISOString().split('T')[0];
        const priceEndStr = priceEnd.toISOString().split('T')[0];
        // Compare as strings: startDate is inclusive, endDate is exclusive
        return currentDateStr >= priceStartStr && currentDateStr < priceEndStr;
      });

      if (applicablePrices.length === 0) {
        const dateStr = currentDate.toISOString().split('T')[0];
        throw new BadRequestException(
          `No pricing available for date: ${dateStr}`,
        );
      }

      // Sort by specificity (shorter date ranges first) and then by creation date (newer first)
      applicablePrices.sort((a, b) => {
        const aStart = new Date(a.startDate);
        const aEnd = new Date(a.endDate);
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);

        const aRangeLength = aEnd.getTime() - aStart.getTime();
        const bRangeLength = bEnd.getTime() - bStart.getTime();

        if (aRangeLength !== bRangeLength) {
          return aRangeLength - bRangeLength;
        }

        const aCreated = new Date(a.createdAt);
        const bCreated = new Date(b.createdAt);
        return bCreated.getTime() - aCreated.getTime();
      });

      const applicablePrice = applicablePrices[0];
      // Normalize price to 2 decimal places to ensure consistency
      const price = Math.round(parseFloat(applicablePrice.price) * 100) / 100;
      totalPrice += price;
      nightlyPrices.push({ date: new Date(currentDate), price });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Group all nights with the same price together (not just consecutive)
    const breakdown: { price: string; nights: number }[] = [];
    if (nightlyPrices.length > 0) {
      // Normalize all prices to 2 decimal places first
      const normalizedPrices = nightlyPrices.map(
        (item) => Math.round(item.price * 100) / 100,
      );

      // Convert prices to cents (integers) for exact comparison
      const priceToCents = (price: number) => Math.round(price * 100);

      // Count occurrences of each price using cents as key
      const priceCountMap = new Map<number, { price: number; count: number }>();

      for (const price of normalizedPrices) {
        const priceCents = priceToCents(price);
        const existing = priceCountMap.get(priceCents);
        if (existing) {
          existing.count++;
        } else {
          priceCountMap.set(priceCents, { price, count: 1 });
        }
      }

      // Convert map to array and sort by price (ascending) for consistent ordering
      breakdown.push(
        ...Array.from(priceCountMap.values())
          .sort((a, b) => a.price - b.price)
          .map((item) => ({
            price: item.price.toFixed(2),
            nights: item.count,
          })),
      );
    }

    return { totalPrice, breakdown };
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
