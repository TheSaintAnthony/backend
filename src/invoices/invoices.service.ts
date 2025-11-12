import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateInvoiceDto, EditInvoiceDto } from './dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createInvoice(data: CreateInvoiceDto) {
    return await this.db
      .insert(schema.invoices)
      .values({ ...data })
      .returning();
  }

  async getInvoices() {
    return await this.db.select().from(schema.invoices);
  }

  async getInvoiceById(id: number) {
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, id));

    if (!invoice) {
      throw new NotFoundException('Invoice', String(id));
    }

    return invoice;
  }

  async getInvoicesByReservation(reservationId: number) {
    return await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.reservationId, reservationId));
  }

  async editInvoice(id: number, data: EditInvoiceDto) {
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, id));

    if (!invoice) {
      throw new NotFoundException('Invoice', String(id));
    }

    return await this.db
      .update(schema.invoices)
      .set({ ...data })
      .where(eq(schema.invoices.id, id))
      .returning();
  }

  async deleteInvoice(id: number) {
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, id));

    if (!invoice) {
      throw new NotFoundException('Invoice', String(id));
    }

    return await this.db
      .delete(schema.invoices)
      .where(eq(schema.invoices.id, id))
      .returning();
  }
}
