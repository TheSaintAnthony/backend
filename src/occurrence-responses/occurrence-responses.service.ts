import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateOccurrenceResponseDto } from './dto/create-occurrence-response.dto';
import { eq, isNull, and } from 'drizzle-orm';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';

@Injectable()
export class OccurrenceResponsesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private statusLookupService: StatusLookupService,
  ) {}

  async createResponse(
    createData: CreateOccurrenceResponseDto,
  ): Promise<unknown> {
    const occurrenceId: string = createData.occurrenceId;
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, occurrenceId));
    if (!occurrence) {
      throw new NotFoundException('Occurrence', occurrenceId);
    }

    const insertValues = {
      occurrenceId: createData.occurrenceId,
      userId: createData.userId,
      message: createData.message,
      isAdmin: createData.isAdmin,
    };

    const result = await this.db
      .insert(schema.occurrenceResponses)
      .values(insertValues)
      .returning();

    // Auto-update occurrence status to "In Progress" when admin responds
    // (only if current status is "Pending")
    if (createData.isAdmin) {
      const pendingStatusId =
        await this.statusLookupService.getOccurrenceStatusId('Pending');
      const inProgressStatusId =
        await this.statusLookupService.getOccurrenceStatusId('In Progress');

      if (
        occurrence.statusId === pendingStatusId ||
        occurrence.statusId === null
      ) {
        await this.db
          .update(schema.occurrences)
          .set({ statusId: inProgressStatusId })
          .where(eq(schema.occurrences.id, occurrenceId));
      }
    }

    return result;
  }
  async getResponsesByOccurrence(occurrenceId: string) {
    const [occurrence] = await this.db
      .select()
      .from(schema.occurrences)
      .where(eq(schema.occurrences.id, occurrenceId));
    if (!occurrence) {
      throw new NotFoundException('Occurrence', occurrenceId);
    }
    return this.db
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
      .orderBy(schema.occurrenceResponses.createdAt);
  }
}
