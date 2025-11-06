import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateRoomDto, EditRoomDto } from './dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createRoom(data: CreateRoomDto) {
    return await this.db
      .insert(schema.rooms)
      .values({ ...data })
      .returning();
  }

  async getRooms() {
    return await this.db.select().from(schema.rooms);
  }

  async getRoomById(id: number) {
    const [room] = await this.db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, id));

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async getRoomsByProperty(propertyId: number) {
    return await this.db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.propertyId, propertyId));
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
}
