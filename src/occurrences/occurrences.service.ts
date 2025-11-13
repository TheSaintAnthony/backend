import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateOccurrenceDto, EditOccurrenceDto } from './dto';
import { eq, count } from 'drizzle-orm';
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
    return await this.db
      .insert(schema.occurrences)
      .values({ ...data })
      .returning();
  }

  async getOccurrences(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.occurrences);
    const total = totalResult.count;

    const data = await this.db
      .select()
      .from(schema.occurrences)
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getOccurrenceById(id: number) {
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, id));

    if (!occurrence) {
      throw new NotFoundException('Occurrence', String(id));
    }

    return occurrence;
  }

  async getOccurrencesByReservation(
    reservationId: number,
    pagination?: PaginationDto,
  ) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
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

  async editOccurrence(id: number, data: EditOccurrenceDto) {
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, id));

    if (!occurrence) {
      throw new NotFoundException('Occurrence', String(id));
    }

    return await this.db
      .update(schema.occurrences)
      .set({ ...data })
      .where(eq(schema.occurrences.id, id))
      .returning();
  }

  async deleteOccurrence(id: number) {
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, id));

    if (!occurrence) {
      throw new NotFoundException('Occurrence', String(id));
    }

    return await this.db
      .delete(schema.occurrences)
      .where(eq(schema.occurrences.id, id))
      .returning();
  }
}
