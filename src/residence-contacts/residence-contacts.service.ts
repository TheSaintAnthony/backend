import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateResidenceContactDto } from './dto/create-residence-contact.dto';
import { EditResidenceContactDto } from './dto/edit-residence-contact.dto';
import { eq, count, and } from 'drizzle-orm';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
@Injectable()
export class ResidenceContactsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}
  async createResidenceContact(data: CreateResidenceContactDto) {
    const [createdContact] = await this.db
      .insert(schema.residenceContacts)
      .values({
        ...data,
        status: 'pending',
      })
      .returning();
    return this.getResidenceContactById(createdContact.id);
  }
  async getResidenceContacts(
    pagination?: PaginationDto,
    residenceId?: string,
    residenceUnitId?: string,
    status?: string,
  ) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const whereConditions = [];
    if (residenceId) {
      whereConditions.push(
        eq(schema.residenceContacts.residenceId, residenceId),
      );
    }
    if (residenceUnitId) {
      whereConditions.push(
        eq(schema.residenceContacts.residenceUnitId, residenceUnitId),
      );
    }
    if (status) {
      whereConditions.push(eq(schema.residenceContacts.status, status));
    }
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.residenceContacts)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    const total = totalResult.count;
    const data = await this.db.query.residenceContacts.findMany({
      limit,
      offset,
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        residence: {
          with: {
            address: true,
          },
        },
        residenceUnit: true,
      },
      orderBy: (contacts, { desc }) => [desc(contacts.createdAt)],
    });
    return createPaginatedResponse(data, total, page, limit);
  }
  async getResidenceContactById(id: string) {
    const contact = await this.db.query.residenceContacts.findFirst({
      where: eq(schema.residenceContacts.id, id),
      with: {
        residence: {
          with: {
            address: true,
          },
        },
        residenceUnit: true,
      },
    });
    if (!contact) {
      throw new NotFoundException('Residence Contact', id);
    }
    return contact;
  }
  async editResidenceContact(id: string, data: EditResidenceContactDto) {
    const [contact] = await this.db
      .select()
      .from(schema.residenceContacts)
      .where(eq(schema.residenceContacts.id, id))
      .limit(1);
    if (!contact) {
      throw new NotFoundException('Residence Contact', id);
    }
    await this.db
      .update(schema.residenceContacts)
      .set({ ...data })
      .where(eq(schema.residenceContacts.id, id));
    return this.getResidenceContactById(id);
  }
  async deleteResidenceContact(id: string) {
    const [contact] = await this.db
      .select()
      .from(schema.residenceContacts)
      .where(eq(schema.residenceContacts.id, id))
      .limit(1);
    if (!contact) {
      throw new NotFoundException('Residence Contact', id);
    }
    await this.db
      .delete(schema.residenceContacts)
      .where(eq(schema.residenceContacts.id, id));
  }
}
