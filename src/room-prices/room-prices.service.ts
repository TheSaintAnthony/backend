import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateRoomPriceDto, EditRoomPriceDto } from './dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class RoomPricesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createRoomPrice(data: CreateRoomPriceDto) {
    return await this.db
      .insert(schema.roomPrices)
      .values({ ...data })
      .returning();
  }

  async getRoomPrices() {
    return await this.db.select().from(schema.roomPrices);
  }

  async getRoomPriceById(id: number) {
    const [roomPrice] = await this.db
      .select()
      .from(schema.roomPrices)
      .where(eq(schema.roomPrices.id, id));

    if (!roomPrice) {
      throw new NotFoundException('Room price not found');
    }

    return roomPrice;
  }

  async getRoomPricesByRoom(roomId: number) {
    return await this.db
      .select()
      .from(schema.roomPrices)
      .where(eq(schema.roomPrices.roomId, roomId));
  }

  async editRoomPrice(id: number, data: EditRoomPriceDto) {
    const [roomPrice] = await this.db
      .select()
      .from(schema.roomPrices)
      .where(eq(schema.roomPrices.id, id));

    if (!roomPrice) {
      throw new NotFoundException('Room price not found');
    }

    return await this.db
      .update(schema.roomPrices)
      .set({ ...data })
      .where(eq(schema.roomPrices.id, id))
      .returning();
  }

  async deleteRoomPrice(id: number) {
    const [roomPrice] = await this.db
      .select()
      .from(schema.roomPrices)
      .where(eq(schema.roomPrices.id, id));

    if (!roomPrice) {
      throw new NotFoundException('Room price not found');
    }

    return await this.db
      .delete(schema.roomPrices)
      .where(eq(schema.roomPrices.id, id))
      .returning();
  }
}
