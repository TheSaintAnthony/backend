import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateOccurrenceResponseDto } from './dto/create-occurrence-response.dto';
import { eq, isNull, desc, and } from 'drizzle-orm';

@Injectable()
export class OccurrenceResponsesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createResponse(data: CreateOccurrenceResponseDto) {
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, data.occurrenceId));

    if (!occurrence) {
      throw new NotFoundException('Occurrence', data.occurrenceId);
    }

    return await this.db
      .insert(schema.occurrenceResponses)
      .values({ ...data })
      .returning();
  }

  async getResponsesByOccurrence(occurrenceId: string) {
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, occurrenceId));

    if (!occurrence) {
      throw new NotFoundException('Occurrence', occurrenceId);
    }

    return await this.db
      .select({
        id: schema.occurrenceResponses.id,
        occurrenceId: schema.occurrenceResponses.occurrenceId,
        userId: schema.occurrenceResponses.userId,
        message: schema.occurrenceResponses.message,
        isAdmin: schema.occurrenceResponses.isAdmin,
        createdAt: schema.occurrenceResponses.createdAt,
        updatedAt: schema.occurrenceResponses.updatedAt,
        user: {
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
        },
      })
      .from(schema.occurrenceResponses)
      .leftJoin(
        schema.users,
        eq(schema.occurrenceResponses.userId, schema.users.id),
      )
      .where(
        and(
          eq(schema.occurrenceResponses.occurrenceId, occurrenceId),
          isNull(schema.occurrenceResponses.deletedAt),
        ),
      )
      .orderBy(desc(schema.occurrenceResponses.createdAt));
  }
}
