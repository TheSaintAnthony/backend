import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateRoomAmenityDto } from './dto';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class RoomAmenitiesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createRoomAmenity(data: CreateRoomAmenityDto) {
    return this.db
      .insert(schema.roomAmenities)
      .values({ ...data })
      .returning();
  }

  async getRoomAmenities() {
    return this.db.select().from(schema.roomAmenities);
  }

  async getRoomAmenityById(id: string) {
    const [roomAmenity] = await this.db
      .select()
      .from(schema.roomAmenities)
      .where(eq(schema.roomAmenities.id, id));

    if (!roomAmenity) {
      throw new NotFoundException('Room amenity', id);
    }

    return roomAmenity;
  }

  async getRoomAmenitiesByRoom(roomId: string) {
    return this.db
      .select()
      .from(schema.roomAmenities)
      .where(eq(schema.roomAmenities.roomId, roomId));
  }

  async deleteRoomAmenity(id: string) {
    const [roomAmenity] = await this.db
      .select()
      .from(schema.roomAmenities)
      .where(eq(schema.roomAmenities.id, id));

    if (!roomAmenity) {
      throw new NotFoundException('Room amenity', id);
    }

    return this.db
      .delete(schema.roomAmenities)
      .where(eq(schema.roomAmenities.id, id))
      .returning();
  }

  async deleteRoomAmenityByRoomAndAmenity(roomId: string, amenityId: string) {
    const [roomAmenity] = await this.db
      .select()
      .from(schema.roomAmenities)
      .where(
        and(
          eq(schema.roomAmenities.roomId, roomId),
          eq(schema.roomAmenities.amenityId, amenityId),
        ),
      );

    if (!roomAmenity) {
      throw new NotFoundException('Room amenity', `${roomId}-${amenityId}`);
    }

    return this.db
      .delete(schema.roomAmenities)
      .where(eq(schema.roomAmenities.id, roomAmenity.id))
      .returning();
  }
}
