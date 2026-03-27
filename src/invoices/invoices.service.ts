import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import {
  CreateInvoiceDto,
  EditInvoiceDto,
  EditInvoiceLineItemDto,
} from './dto';
import { CreateInvoiceLineItemDto as StandaloneCreateInvoiceLineItemDto } from './dto/invoice-line-item.dto';
import { eq, count, and, sql } from 'drizzle-orm';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { InvoiceStrategyFactory } from './invoice-strategy.factory';
import { StripeService } from 'src/payments/stripe/stripe.service';
import { UserRole } from 'src/constants';
@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private _invoiceStrategyFactory: InvoiceStrategyFactory,
    private stripeService: StripeService,
  ) {}
  async generateInvoiceNumber(prefix: string = 'INV'): Promise<string> {
    return this.db.transaction(async (tx) => {
      const currentYear = new Date().getFullYear();
      const [sequenceRecord] = await tx
        .select()
        .from(schema.invoiceSequences)
        .where(
          and(
            eq(schema.invoiceSequences.year, currentYear),
            eq(schema.invoiceSequences.prefix, prefix),
          ),
        )
        .for('update');
      let nextSequence: number;
      if (!sequenceRecord) {
        const [newRecord] = await tx
          .insert(schema.invoiceSequences)
          .values({
            year: currentYear,
            prefix: prefix,
            sequence: 1,
          })
          .returning();
        nextSequence = newRecord.sequence;
      } else {
        const [updated] = await tx
          .update(schema.invoiceSequences)
          .set({
            sequence: sql`${schema.invoiceSequences.sequence} + 1`,
          })
          .where(eq(schema.invoiceSequences.id, sequenceRecord.id))
          .returning();
        nextSequence = updated.sequence;
      }
      const paddedSequence = nextSequence.toString().padStart(5, '0');
      return `${prefix}-${currentYear}-${paddedSequence}`;
    });
  }
  async createInvoice(data: CreateInvoiceDto) {
    return this.db.transaction(async (tx) => {
      const invoiceNumber =
        data.invoiceNumber || (await this.generateInvoiceNumber());
      const [invoice] = await tx
        .insert(schema.invoices)
        .values({
          reservationId: data.reservationId,
          userId: data.userId,
          totalAmount: data.totalAmount,
          currency: data.currency || 'EUR',
          customerName: data.customerName,
          customerCompanyName: data.customerCompanyName,
          customerTaxId: data.customerTaxId,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          customerAddress: data.customerAddress,
          customerCountry: data.customerCountry,
          invoiceNumber: invoiceNumber,
          invoiceTypeId: data.invoiceTypeId,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          notes: data.notes,
          statusId: data.statusId,
        })
        .returning();
      if (data.lineItems && data.lineItems.length > 0) {
        await tx.insert(schema.invoiceLineItems).values(
          data.lineItems.map((item) => ({
            invoiceId: invoice.id,
            description: item.description,
            productCode: item.productCode,
            itemType: item.itemType,
            itemReferenceId: item.itemReferenceId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || '0.00',
            totalAmount: item.totalAmount,
            startDate: item.startDate ? new Date(item.startDate) : undefined,
            endDate: item.endDate ? new Date(item.endDate) : undefined,
          })),
        );
      }
      return invoice;
    });
  }
  syncInvoiceToProvider(invoiceId: string) {
    void this.getInvoiceById(invoiceId);
    void this.db
      .select()
      .from(schema.invoiceLineItems)
      .where(eq(schema.invoiceLineItems.invoiceId, invoiceId));
    throw new Error('Stripe invoice sync not yet implemented');
  }
  async getExternalInvoiceStatus(invoiceId: string) {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice.externalInvoiceId) {
      throw new Error('Invoice is not synced to any external provider');
    }
    throw new Error('Stripe invoice status check not yet implemented');
  }
  async cancelExternalInvoice(invoiceId: string) {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice.externalInvoiceId) {
      throw new Error('Invoice is not synced to any external provider');
    }
    throw new Error('Stripe invoice cancellation not yet implemented');
  }
  async getInvoices(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100); // Safety clamp
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
  async getInvoicesByUser(userId: string, pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.invoices)
      .where(eq(schema.invoices.userId, userId));
    const total = totalResult.count;
    const data = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.userId, userId))
      .limit(limit)
      .offset(offset);
    return createPaginatedResponse(data, total, page, limit);
  }
  async getInvoiceById(id: string) {
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, id));
    if (!invoice) {
      throw new NotFoundException('Invoice', id);
    }
    return invoice;
  }
  async getInvoicesByReservation(
    reservationId: string,
    pagination?: PaginationDto,
  ) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100); // Safety clamp
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
  async getInvoicesByReservationForUser(
    reservationId: string,
    userId: string,
    roles: UserRole[],
    pagination?: PaginationDto,
  ) {
    if (roles.includes(UserRole.ADMIN)) {
      return this.getInvoicesByReservation(reservationId, pagination);
    }
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const whereClause = and(
      eq(schema.invoices.reservationId, reservationId),
      eq(schema.invoices.userId, userId),
    );
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.invoices)
      .where(whereClause);
    const total = totalResult.count;
    const data = await this.db
      .select()
      .from(schema.invoices)
      .where(whereClause)
      .limit(limit)
      .offset(offset);
    return createPaginatedResponse(data, total, page, limit);
  }
  async editInvoice(id: string, data: EditInvoiceDto) {
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, id));
    if (!invoice) {
      throw new NotFoundException('Invoice', id);
    }
    const updateData: Record<string, unknown> = {};
    if (data.totalAmount !== undefined)
      updateData.totalAmount = data.totalAmount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.customerName !== undefined)
      updateData.customerName = data.customerName;
    if (data.customerCompanyName !== undefined)
      updateData.customerCompanyName = data.customerCompanyName;
    if (data.customerTaxId !== undefined)
      updateData.customerTaxId = data.customerTaxId;
    if (data.customerEmail !== undefined)
      updateData.customerEmail = data.customerEmail;
    if (data.customerPhone !== undefined)
      updateData.customerPhone = data.customerPhone;
    if (data.customerAddress !== undefined)
      updateData.customerAddress = data.customerAddress;
    if (data.customerCountry !== undefined)
      updateData.customerCountry = data.customerCountry;
    if (data.invoiceNumber !== undefined)
      updateData.invoiceNumber = data.invoiceNumber;
    if (data.invoiceTypeId !== undefined)
      updateData.invoiceTypeId = data.invoiceTypeId;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.externalInvoiceId !== undefined)
      updateData.externalInvoiceId = data.externalInvoiceId;
    if (data.externalInvoiceNumber !== undefined)
      updateData.externalInvoiceNumber = data.externalInvoiceNumber;
    if (data.externalInvoiceUrl !== undefined)
      updateData.externalInvoiceUrl = data.externalInvoiceUrl;
    if (data.externalInvoicePdfPath !== undefined)
      updateData.externalInvoicePdfPath = data.externalInvoicePdfPath;
    if (data.syncedAt !== undefined)
      updateData.syncedAt = new Date(data.syncedAt);
    if (data.syncError !== undefined) updateData.syncError = data.syncError;
    if (data.statusId !== undefined) updateData.statusId = data.statusId;
    updateData.updatedAt = new Date();
    return this.db
      .update(schema.invoices)
      .set(updateData)
      .where(eq(schema.invoices.id, id))
      .returning();
  }
  async deleteInvoice(id: string) {
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, id));
    if (!invoice) {
      throw new NotFoundException('Invoice', id);
    }
    return this.db
      .delete(schema.invoices)
      .where(eq(schema.invoices.id, id))
      .returning();
  }
  async getAccessibleInvoiceById(
    id: string,
    userId: string,
    roles: UserRole[],
  ) {
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, id));
    if (!invoice) {
      throw new NotFoundException('Invoice', id);
    }
    if (!roles.includes(UserRole.ADMIN) && invoice.userId !== userId) {
      throw new ForbiddenException('You do not have access to this invoice');
    }
    return invoice;
  }

  async downloadInvoicePdf(
    id: string,
    userId: string,
    roles: UserRole[],
  ): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.getAccessibleInvoiceById(id, userId, roles);
    let buffer: Buffer | null = null;

    if (invoice.externalInvoicePdfPath) {
      try {
        buffer = await this.stripeService.downloadPdfFromUrl(
          invoice.externalInvoicePdfPath,
        );
      } catch {
        buffer = null;
      }
    }

    if (!buffer && invoice.externalInvoiceId) {
      buffer = await this.stripeService.downloadInvoicePdf(
        invoice.externalInvoiceId,
      );
    }

    if (!buffer) {
      throw new NotFoundException('Invoice PDF not available');
    }

    return {
      buffer,
      filename: `fatura-${invoice.invoiceNumber || invoice.id}.pdf`,
    };
  }
  async createLineItem(data: StandaloneCreateInvoiceLineItemDto) {
    return this.db
      .insert(schema.invoiceLineItems)
      .values({
        invoiceId: data.invoiceId,
        description: data.description,
        productCode: data.productCode,
        itemType: data.itemType,
        itemReferenceId: data.itemReferenceId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discount: data.discount || '0.00',
        totalAmount: data.totalAmount,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      })
      .returning();
  }
  async getLineItemsByInvoice(invoiceId: string) {
    return this.db
      .select()
      .from(schema.invoiceLineItems)
      .where(eq(schema.invoiceLineItems.invoiceId, invoiceId));
  }
  async editLineItem(id: string, data: EditInvoiceLineItemDto) {
    const [lineItem] = await this.db
      .select()
      .from(schema.invoiceLineItems)
      .where(eq(schema.invoiceLineItems.id, id));
    if (!lineItem) {
      throw new NotFoundException('Invoice line item', id);
    }
    const updateData: Record<string, unknown> = {};
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.productCode !== undefined)
      updateData.productCode = data.productCode;
    if (data.itemType !== undefined) updateData.itemType = data.itemType;
    if (data.itemReferenceId !== undefined)
      updateData.itemReferenceId = data.itemReferenceId;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.discount !== undefined) updateData.discount = data.discount;
    if (data.totalAmount !== undefined)
      updateData.totalAmount = data.totalAmount;
    if (data.startDate !== undefined)
      updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    return this.db
      .update(schema.invoiceLineItems)
      .set(updateData)
      .where(eq(schema.invoiceLineItems.id, id))
      .returning();
  }
  async deleteLineItem(id: string) {
    const [lineItem] = await this.db
      .select()
      .from(schema.invoiceLineItems)
      .where(eq(schema.invoiceLineItems.id, id));
    if (!lineItem) {
      throw new NotFoundException('Invoice line item', id);
    }
    return this.db
      .delete(schema.invoiceLineItems)
      .where(eq(schema.invoiceLineItems.id, id))
      .returning();
  }
}
