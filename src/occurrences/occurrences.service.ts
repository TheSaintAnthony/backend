import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateOccurrenceDto, EditOccurrenceDto } from './dto';
import { eq, count, isNull, and, desc, sql } from 'drizzle-orm';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
@Injectable()
export class OccurrencesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}
  async createOccurrence(data: CreateOccurrenceDto) {
    return this.db
      .insert(schema.occurrences)
      .values({ ...data })
      .returning();
  }
  async getOccurrences(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100); // Safety clamp
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.occurrences)
      .where(isNull(schema.occurrences.deletedAt));
    const total = totalResult.count;
    const data = await this.db
      .select({
        id: schema.occurrences.id,
        reservationId: schema.occurrences.reservationId,
        description: schema.occurrences.description,
        statusId: schema.occurrences.statusId,
        createdAt: schema.occurrences.createdAt,
        updatedAt: schema.occurrences.updatedAt,
        deletedAt: schema.occurrences.deletedAt,
        status: {
          id: schema.occurrenceStatus.id,
          name: schema.occurrenceStatus.name,
        },
        reservation: {
          id: schema.reservations.id,
          totalPrice: schema.reservations.totalPrice,
        },
      })
      .from(schema.occurrences)
      .leftJoin(
        schema.occurrenceStatus,
        eq(schema.occurrences.statusId, schema.occurrenceStatus.id),
      )
      .leftJoin(
        schema.reservations,
        eq(schema.occurrences.reservationId, schema.reservations.id),
      )
      .where(isNull(schema.occurrences.deletedAt))
      .orderBy(desc(schema.occurrences.createdAt))
      .limit(limit)
      .offset(offset);
    return createPaginatedResponse(data, total, page, limit);
  }
  async getOccurrenceById(id: string) {
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, id));
    if (!occurrence) {
      throw new NotFoundException('Occurrence', id);
    }
    return occurrence;
  }
  async getOccurrencesByReservation(
    reservationId: string,
    pagination?: PaginationDto,
  ) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100); // Safety clamp
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.occurrences)
      .where(eq(schema.occurrences.reservationId, reservationId));
    const total = totalResult.count;
    const data = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.reservationId, reservationId))
      .limit(limit)
      .offset(offset);
    return createPaginatedResponse(data, total, page, limit);
  }

  async getOccurrencesByUser(userId: string, pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.occurrences)
      .innerJoin(
        schema.reservations,
        eq(schema.occurrences.reservationId, schema.reservations.id),
      )
      .where(
        and(
          eq(schema.reservations.userId, userId),
          isNull(schema.occurrences.deletedAt),
        ),
      );
    const total = totalResult.count;

    const data = await this.db
      .select({
        id: schema.occurrences.id,
        reservationId: schema.occurrences.reservationId,
        description: schema.occurrences.description,
        statusId: schema.occurrences.statusId,
        createdAt: schema.occurrences.createdAt,
        updatedAt: schema.occurrences.updatedAt,
        deletedAt: schema.occurrences.deletedAt,
        status: {
          id: schema.occurrenceStatus.id,
          name: schema.occurrenceStatus.name,
        },
        reservation: {
          id: schema.reservations.id,
          totalPrice: schema.reservations.totalPrice,
        },
      })
      .from(schema.occurrences)
      .innerJoin(
        schema.reservations,
        eq(schema.occurrences.reservationId, schema.reservations.id),
      )
      .leftJoin(
        schema.occurrenceStatus,
        eq(schema.occurrences.statusId, schema.occurrenceStatus.id),
      )
      .where(
        and(
          eq(schema.reservations.userId, userId),
          isNull(schema.occurrences.deletedAt),
        ),
      )
      .orderBy(desc(schema.occurrences.createdAt))
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getUnreadCountByUser(userId: string): Promise<number> {
    // Get occurrences where there's an admin response newer than updatedAt
    const result = await this.db.execute(sql`
      SELECT COUNT(DISTINCT o.id) as count
      FROM occurrences o
      INNER JOIN reservations r ON o.reservation_id = r.id
      WHERE r.user_id = ${userId}
        AND o.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM occurrence_responses orr
          WHERE orr.occurrence_id = o.id
            AND orr.deleted_at IS NULL
            AND orr.is_admin = true
            AND orr.created_at > o.updated_at
        )
    `);
    return Number(result.rows[0]?.count || 0);
  }

  async markAsRead(occurrenceId: string, userId: string): Promise<void> {
    // Verify the occurrence belongs to the user
    const [occurrence] = await this.db
      .select({
        id: schema.occurrences.id,
        reservationUserId: schema.reservations.userId,
      })
      .from(schema.occurrences)
      .innerJoin(
        schema.reservations,
        eq(schema.occurrences.reservationId, schema.reservations.id),
      )
      .where(eq(schema.occurrences.id, occurrenceId));

    if (!occurrence) {
      throw new NotFoundException('Occurrence', occurrenceId);
    }

    if (occurrence.reservationUserId !== userId) {
      throw new NotFoundException('Occurrence', occurrenceId);
    }

    await this.db
      .update(schema.occurrences)
      .set({ updatedAt: new Date() })
      .where(eq(schema.occurrences.id, occurrenceId));
  }

  async editOccurrence(id: string, data: EditOccurrenceDto) {
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, id));
    if (!occurrence) {
      throw new NotFoundException('Occurrence', id);
    }
    return this.db
      .update(schema.occurrences)
      .set({ ...data })
      .where(eq(schema.occurrences.id, id))
      .returning();
  }
  async deleteOccurrence(id: string) {
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, id));
    if (!occurrence) {
      throw new NotFoundException('Occurrence', id);
    }
    return this.db
      .delete(schema.occurrences)
      .where(eq(schema.occurrences.id, id))
      .returning();
  }
}
