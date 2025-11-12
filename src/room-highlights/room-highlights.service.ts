import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateRoomHighlightDto } from './dto';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class RoomHighlightsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createRoomHighlight(data: CreateRoomHighlightDto) {
    return await this.db
      .insert(schema.roomHighlights)
      .values({ ...data })
      .returning();
  }

  async getRoomHighlights() {
    return await this.db.select().from(schema.roomHighlights);
  }

  async getRoomHighlightById(id: number) {
    const [roomHighlight] = await this.db
      .select()
      .from(schema.roomHighlights)
      .where(eq(schema.roomHighlights.id, id));

    if (!roomHighlight) {
      throw new NotFoundException('Room highlight', String(id));
    }

    return roomHighlight;
  }

  async getRoomHighlightsByRoom(roomId: number) {
    return await this.db
      .select()
      .from(schema.roomHighlights)
      .where(eq(schema.roomHighlights.roomId, roomId));
  }

  async deleteRoomHighlight(id: number) {
    const [roomHighlight] = await this.db
      .select()
      .from(schema.roomHighlights)
      .where(eq(schema.roomHighlights.id, id));

    if (!roomHighlight) {
      throw new NotFoundException('Room highlight', String(id));
    }

    return await this.db
      .delete(schema.roomHighlights)
      .where(eq(schema.roomHighlights.id, id))
      .returning();
  }

  async deleteRoomHighlightByRoomAndHighlight(
    roomId: number,
    highlightId: number,
  ) {
    const [roomHighlight] = await this.db
      .select()
      .from(schema.roomHighlights)
      .where(
        and(
          eq(schema.roomHighlights.roomId, roomId),
          eq(schema.roomHighlights.highlightId, highlightId),
        ),
      );

    if (!roomHighlight) {
      throw new NotFoundException('Room highlight', `${roomId}-${highlightId}`);
    }

    return await this.db
      .delete(schema.roomHighlights)
      .where(eq(schema.roomHighlights.id, roomHighlight.id))
      .returning();
  }
}
