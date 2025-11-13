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
import { eq, and, lte, gte, or, count, inArray } from 'drizzle-orm';
import { RoomPricesService } from 'src/room-prices/room-prices.service';
import { RoomHoldsService } from 'src/room-holds/room-holds.service';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private roomPricesService: RoomPricesService,
    private roomHoldsService: RoomHoldsService,
    private cacheService: CacheService,
  ) {}

  async createRoom(data: CreateRoomDto) {
    return await this.db
      .insert(schema.rooms)
      .values({ ...data })
      .returning();
  }

  async getRooms(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.rooms);
    const total = totalResult.count;

    const roomIds = await this.db
      .select({ id: schema.rooms.id })
      .from(schema.rooms)
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
        inArray(
          schema.rooms.id,
          roomIds.map((r) => r.id),
        ),
      );

    const roomsMap = new Map<number, RoomWithDetails>();

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

    return createPaginatedResponse(data, total, page, limit);
  }

  async getRoomById(id: number): Promise<RoomResponse> {
    const cacheKey = `room:${id}`;
    const cached = await this.cacheService.get<RoomResponse>(cacheKey);
    if (cached) return cached;
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
      throw new NotFoundException('Room', String(id));
    }

    const room: RoomWithDetails = {
      id: roomsData[0].id,
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

    const result = {
      ...room,
      amenities: room.amenities.length > 0 ? room.amenities : null,
      highlights: room.highlights.length > 0 ? room.highlights : null,
    };

    await this.cacheService.set(cacheKey, result, 3600);
    return result;
  }

  async getRoomsByProperty(propertyId: number, pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.rooms)
      .where(eq(schema.rooms.propertyId, propertyId));
    const total = totalResult.count;

    const roomIds = await this.db
      .select({ id: schema.rooms.id })
      .from(schema.rooms)
      .where(eq(schema.rooms.propertyId, propertyId))
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
        inArray(
          schema.rooms.id,
          roomIds.map((r) => r.id),
        ),
      );

    const roomsMap = new Map<number, RoomWithDetails>();

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

    return createPaginatedResponse(data, total, page, limit);
  }

  async editRoom(id: number, data: EditRoomDto) {
    const [room] = await this.db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, id));

    if (!room) {
      throw new NotFoundException('Room', String(id));
    }

    const result = await this.db
      .update(schema.rooms)
      .set({ ...data })
      .where(eq(schema.rooms.id, id))
      .returning();

    await this.cacheService.del(`room:${id}`);
    return result;
  }

  async deleteRoom(id: number) {
    const [room] = await this.db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, id));

    if (!room) {
      throw new NotFoundException('Room', String(id));
    }

    const result = await this.db
      .delete(schema.rooms)
      .where(eq(schema.rooms.id, id))
      .returning();

    await this.cacheService.del(`room:${id}`);
    return result;
  }

  async checkAvailability(data: CheckAvailabilityDto) {
    const { roomId, checkIn, checkOut } = data;

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

  async calculateTotalPrice(
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
