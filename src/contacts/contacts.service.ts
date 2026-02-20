import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, count, and } from 'drizzle-orm';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from 'src/db/schema';
import { NotFoundException } from 'src/filters';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { CreateContactDto, UpdateContactDto, GetContactsDto } from './dto';

@Injectable()
export class ContactsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async createContact(data: CreateContactDto) {
    const [contact] = await this.db
      .insert(schema.contacts)
      .values({ ...data, status: 'pending' })
      .returning();

    // Queue email notification to admin
    const adminEmail = process.env.ADMIN_CONTACT_EMAIL;
    if (adminEmail) {
      const adminPanelUrl =
        process.env.FRONTEND_URL && contact.id
          ? `${process.env.FRONTEND_URL}/admin/contacts`
          : undefined;

      await this.emailQueue.add('sendContactNotification', {
        data: {
          contactId: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          subject: contact.subject,
          message: contact.message,
          submittedAt: contact.createdAt.toISOString(),
          adminPanelUrl,
        },
      });
    }

    return contact;
  }

  async getContacts(query: GetContactsDto) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 10, 100);
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (query?.status) {
      whereConditions.push(eq(schema.contacts.status, query.status));
    }

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.contacts)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    const total = totalResult.count;

    const data = await this.db
      .select()
      .from(schema.contacts)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(schema.contacts.createdAt);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getContactById(id: string) {
    const [contact] = await this.db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.id, id))
      .limit(1);

    if (!contact) {
      throw new NotFoundException('Contact', id);
    }
    return contact;
  }

  async updateContact(id: string, data: UpdateContactDto) {
    await this.getContactById(id);
    const [updated] = await this.db
      .update(schema.contacts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.contacts.id, id))
      .returning();
    return updated;
  }

  async deleteContact(id: string) {
    await this.getContactById(id);
    await this.db.delete(schema.contacts).where(eq(schema.contacts.id, id));
  }
}
