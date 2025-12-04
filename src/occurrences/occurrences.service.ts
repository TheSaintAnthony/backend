import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateOccurrenceDto, EditOccurrenceDto } from './dto';
import { eq, count, isNull } from 'drizzle-orm';
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
      .select()
      .from(schema.occurrences)
      .where(isNull(schema.occurrences.deletedAt))
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
