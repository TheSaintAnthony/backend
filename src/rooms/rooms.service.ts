import { Injectable, Inject } from '@nestjs/common';
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
import { Inject, forwardRef } from '@nestjs/common';

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
  ) {}

  async createRoom(data: CreateRoomDto) {
    const { images, ...roomData } = data;

    const [createdRoom] = await this.db
      .insert(schema.rooms)
      .values({ ...roomData })
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
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.rooms)
      .where(isNull(schema.rooms.deletedAt));
    const total = totalResult.count;

    const roomIds = await this.db
      .select({ id: schema.rooms.id })
      .from(schema.rooms)
      .where(isNull(schema.rooms.deletedAt))
      .limit(limit)
      .offset(offset);

    if (roomIds.length === 0) {
      return createPaginatedResponse([], total, page, limit);
    }

    const roomsData = await this.db
      .select({
        id: schema.rooms.id,
        propertyId: schema.rooms.propertyId,
        roomTypeId: schema.rooms.roomTypeId,
        name: schema.rooms.name,
        description: schema.rooms.description,
        bedCount: schema.rooms.bedCount,
        bathroomCount: schema.rooms.bathroomCount,
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
          propertyId: row.propertyId,
          roomTypeId: row.roomTypeId,
          name: row.name,
          description: row.description,
          bedCount: row.bedCount,
          bathroomCount: row.bathroomCount,
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
      ...room,
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
      const images = await this.imagesService.getImagesByEntity('property', property.id);
      return { ...room, property: { ...property, images } };
    }

    return { ...room, property: null };
  }

  async getRoomsByProperty(propertyId: string, pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
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

    let totalPrice = 0;
    const roomQuotes: RoomQuote[] = [];
    let allAvailable = true;

    for (const roomRequest of rooms) {
      const { roomId, checkIn, checkOut } = roomRequest;

      const room = await this.getRoomById(roomId);
      if (!room) {
        throw new NotFoundException('Room', String(roomId));
      }

      const isAvailable = await this.checkRoomAvailability(
        roomId,
        checkIn,
        checkOut,
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
        available: isAvailable,
      });
    }

    return {
      rooms: roomQuotes,
      totalPrice: totalPrice.toFixed(2),
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

  async calculateTotalPrice(
    roomId: string,
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
