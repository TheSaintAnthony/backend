import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateOccurrenceDto, EditOccurrenceDto } from './dto';
import { eq } from 'drizzle-orm';

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

  async getOccurrences() {
    return await this.db.select().from(schema.occurrences);
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

  async getOccurrencesByReservation(reservationId: number) {
    return await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.reservationId, reservationId));
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
