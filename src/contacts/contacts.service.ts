import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, SQL } from 'drizzle-orm';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from 'src/db/schema';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { CreateContactDto, UpdateContactDto, GetContactsDto } from './dto';

type Contact = typeof schema.contacts.$inferSelect;

@Injectable()
export class ContactsService extends BaseCrudService<
  Contact,
  CreateContactDto,
  UpdateContactDto,
  GetContactsDto
> {
  constructor(
    @Inject(DB_PROVIDER)
    db: NodePgDatabase<typeof schema>,
    @InjectQueue('email') private emailQueue: Queue,
  ) {
    super(db, {
      table: schema.contacts,
      entityName: 'Contact',
      defaultOrderBy: schema.contacts.createdAt,
    });
  }

  protected transformCreateData(data: CreateContactDto) {
    return { ...data, status: 'pending' };
  }

  protected async afterCreate(contact: Contact): Promise<void> {
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
  }

  protected getWhereConditions(query?: GetContactsDto): SQL[] {
    const conditions: SQL[] = [];
    if (query?.status) {
      conditions.push(eq(schema.contacts.status, query.status));
    }
    return conditions;
  }

  // Keep original method names for backward compatibility
  async createContact(data: CreateContactDto) {
    return this.create(data);
  }

  async getContacts(query: GetContactsDto) {
    return this.getAll(query);
  }

  async getContactById(id: string) {
    return this.getById(id);
  }

  async updateContact(id: string, data: UpdateContactDto) {
    return this.update(id, data);
  }

  async deleteContact(id: string) {
    return this.delete(id);
  }
}
