import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateInvoiceDto, EditInvoiceDto } from './dto';
import { eq, count } from 'drizzle-orm';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';

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

  async getInvoices(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.invoices);
    const total = totalResult.count;

    const data = await this.db
      .select()
      .from(schema.invoices)
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
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

  async getInvoicesByReservation(
    reservationId: number,
    pagination?: PaginationDto,
  ) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.invoices)
      .where(eq(schema.invoices.reservationId, reservationId));
    const total = totalResult.count;

    const data = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.reservationId, reservationId))
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
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
