import { Injectable, Inject, Logger } from '@nestjs/common';
import { NotFoundException, DatabaseException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreatePaymentDto, EditPaymentDto } from './dto';
import { and, eq, lt, count } from 'drizzle-orm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentStatus } from 'src/constants';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createPayment(data: CreatePaymentDto) {
    return await this.db
      .insert(schema.payments)
      .values({ ...data })
      .returning();
  }

  async getPayments(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.payments);
    const total = totalResult.count;

    const data = await this.db
      .select()
      .from(schema.payments)
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getPaymentById(id: string) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id));

    if (!payment) {
      throw new NotFoundException('Payment', id);
    }

    return payment;
  }

  async getPaymentsByInvoice(invoiceId: string, pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.payments)
      .where(eq(schema.payments.invoiceId, invoiceId));
    const total = totalResult.count;

    const data = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.invoiceId, invoiceId))
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
  }

  async editPayment(id: string, data: EditPaymentDto) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id));

    if (!payment) {
      throw new NotFoundException('Payment', id);
    }

    return await this.db
      .update(schema.payments)
      .set({ ...data })
      .where(eq(schema.payments.id, id))
      .returning();
  }

  async deletePayment(id: string) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id));

    if (!payment) {
      throw new NotFoundException('Payment', id);
    }

    return await this.db
      .delete(schema.payments)
      .where(eq(schema.payments.id, id))
      .returning();
  }

  async findByTransactionId(transactionId: string) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.transactionId, transactionId));

    if (!payment) {
      throw new NotFoundException('Payment', transactionId);
    }

    return payment;
  }

  async updatePayment(id: string, data: EditPaymentDto) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id));

    if (!payment) {
      throw new NotFoundException('Payment', id);
    }

    return await this.db
      .update(schema.payments)
      .set({ ...data })
      .where(eq(schema.payments.id, id))
      .returning();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async deleteExpiredPendingPayments() {
    const [paymentPending] = await this.db
      .select({ id: schema.paymentStatus.id })
      .from(schema.paymentStatus)
      .where(eq(schema.paymentStatus.name, PaymentStatus.PENDING));

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const result = await this.db
      .delete(schema.reservations)
      .where(
        and(
          eq(schema.reservations.paymentStatusId, paymentPending.id),
          lt(schema.reservations.createdAt, tenMinutesAgo),
        ),
      );

    if (!result) {
      throw new DatabaseException('Error fetching reservations', {
        operation: 'fetch',
      });
    }

    if (result && result.rowCount && result.rowCount > 0) {
      this.logger.log(
        `${result.rowCount} expired pending payments deleted successfully`,
      );
    }
  }
}
