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
  CreateRoomDto,
  EditRoomDto,
  CheckAvailabilityDto,
  GetPriceQuoteDto,
} from './dto';
import { RoomWithDetails, RoomResponse, RoomQuote } from './interfaces';
import { eq, and, lte, gte, or } from 'drizzle-orm';
import { RoomPricesService } from 'src/room-prices/room-prices.service';
import { RoomHoldsService } from 'src/room-holds/room-holds.service';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private roomPricesService: RoomPricesService,
    private roomHoldsService: RoomHoldsService,
  ) {}

  async createRoom(data: CreateRoomDto) {
    return await this.db
      .insert(schema.rooms)
      .values({ ...data })
      .returning();
  }

  async getRooms(): Promise<RoomResponse[]> {
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

    return Array.from(roomsMap.values()).map((room) => ({
      ...room,
      amenities: room.amenities.length > 0 ? room.amenities : null,
      highlights: room.highlights.length > 0 ? room.highlights : null,
    }));
  }

  async getRoomById(id: number): Promise<RoomResponse> {
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
      throw new NotFoundException('Room not found');
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

    return {
      ...room,
      amenities: room.amenities.length > 0 ? room.amenities : null,
      highlights: room.highlights.length > 0 ? room.highlights : null,
    };
  }

  async getRoomsByProperty(propertyId: number): Promise<RoomResponse[]> {
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
      .where(eq(schema.rooms.propertyId, propertyId));

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

    return Array.from(roomsMap.values()).map((room) => ({
      ...room,
      amenities: room.amenities.length > 0 ? room.amenities : null,
      highlights: room.highlights.length > 0 ? room.highlights : null,
    }));
  }

  async editRoom(id: number, data: EditRoomDto) {
    const [room] = await this.db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, id));

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return await this.db
      .update(schema.rooms)
      .set({ ...data })
      .where(eq(schema.rooms.id, id))
      .returning();
  }

  async deleteRoom(id: number) {
    const [room] = await this.db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, id));

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return await this.db
      .delete(schema.rooms)
      .where(eq(schema.rooms.id, id))
      .returning();
  }

  async checkAvailability(data: CheckAvailabilityDto) {
    const { roomId, checkIn, checkOut } = data;

    const room = await this.getRoomById(roomId);
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

  async getPriceQuote(data: GetPriceQuoteDto, userId: number) {
    const { rooms, createHolds = true } = data;

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

      if (isAvailable && createHolds && userId > 0) {
        await this.roomHoldsService.createHold(
          userId,
          roomId,
          checkIn,
          checkOut,
        );
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
