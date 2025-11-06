import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { eq, and, gte, lte, or, lt } from 'drizzle-orm';

@Injectable()
export class RoomHoldsService {
  private readonly HOLD_DURATION_MINUTES = 10;

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createHold(
    userId: number,
    roomId: number,
    checkIn: string,
    checkOut: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.HOLD_DURATION_MINUTES);

    await this.releaseUserHoldsForRoom(userId, roomId);

    const [hold] = await this.db
      .insert(schema.roomHolds)
      .values({
        userId,
        roomId,
        checkIn,
        checkOut,
        expiresAt,
      })
      .returning();

    return hold;
  }

  async hasActiveHold(
    userId: number,
    roomId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<boolean> {
    const now = new Date();

    const [hold] = await this.db
      .select()
      .from(schema.roomHolds)
      .where(
        and(
          eq(schema.roomHolds.userId, userId),
          eq(schema.roomHolds.roomId, roomId),
          eq(schema.roomHolds.checkIn, checkIn),
          eq(schema.roomHolds.checkOut, checkOut),
          gte(schema.roomHolds.expiresAt, now),
        ),
      )
      .limit(1);

    return !!hold;
  }

  async hasConflictingHolds(
    roomId: number,
    checkIn: string,
    checkOut: string,
    excludeUserId?: number,
  ): Promise<boolean> {
    const now = new Date();

    const conditions = [
      eq(schema.roomHolds.roomId, roomId),
      gte(schema.roomHolds.expiresAt, now),
      or(
        and(
          lte(schema.roomHolds.checkIn, checkIn),
          gte(schema.roomHolds.checkOut, checkIn),
        ),
        and(
          lte(schema.roomHolds.checkIn, checkOut),
          gte(schema.roomHolds.checkOut, checkOut),
        ),
        and(
          gte(schema.roomHolds.checkIn, checkIn),
          lte(schema.roomHolds.checkOut, checkOut),
        ),
      ),
    ];

    if (excludeUserId) {
      conditions.push(eq(schema.roomHolds.userId, excludeUserId));
    }

    const holds = await this.db
      .select()
      .from(schema.roomHolds)
      .where(and(...conditions));

    return holds.length > 0;
  }

  async releaseHold(
    userId: number,
    roomId: number,
    checkIn: string,
    checkOut: string,
  ) {
    await this.db
      .delete(schema.roomHolds)
      .where(
        and(
          eq(schema.roomHolds.userId, userId),
          eq(schema.roomHolds.roomId, roomId),
          eq(schema.roomHolds.checkIn, checkIn),
          eq(schema.roomHolds.checkOut, checkOut),
        ),
      );
  }

  async releaseUserHoldsForRoom(userId: number, roomId: number) {
    await this.db
      .delete(schema.roomHolds)
      .where(
        and(
          eq(schema.roomHolds.userId, userId),
          eq(schema.roomHolds.roomId, roomId),
        ),
      );
  }

  async releaseAllUserHolds(userId: number) {
    await this.db
      .delete(schema.roomHolds)
      .where(eq(schema.roomHolds.userId, userId));
  }

  async cleanupExpiredHolds() {
    const now = new Date();

    const result = await this.db
      .delete(schema.roomHolds)
      .where(lt(schema.roomHolds.expiresAt, now))
      .returning();

    return result.length;
  }
}
