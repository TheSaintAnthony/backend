import { Injectable, Inject, Logger } from '@nestjs/common';
import { NotFoundException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreatePaymentDto, EditPaymentDto } from './dto';
import { eq, lt, count, and, ne } from 'drizzle-orm';
import { Cron, CronExpression } from '@nestjs/schedule';
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
    return this.db
      .insert(schema.payments)
      .values({ ...data })
      .returning();
  }

  async getPayments(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
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
    const limit = Math.min(pagination?.limit || 10, 100);
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
    return this.db
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
    return this.db
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
    return this.db
      .update(schema.payments)
      .set({ ...data })
      .where(eq(schema.payments.id, id))
      .returning();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredRoomHolds() {
    const now = new Date();
    const roomHoldsResult = await this.db
      .delete(schema.roomHolds)
      .where(lt(schema.roomHolds.expiresAt, now));

    if (
      roomHoldsResult &&
      roomHoldsResult.rowCount &&
      roomHoldsResult.rowCount > 0
    ) {
      this.logger.log(
        `${roomHoldsResult.rowCount} expired room holds cleaned up successfully`,
      );
    }

    const bookingIntentsResult = await this.db
      .delete(schema.bookingIntents)
      .where(
        and(
          lt(schema.bookingIntents.expiresAt, now),
          ne(schema.bookingIntents.status, 'completed'),
        ),
      );

    if (
      bookingIntentsResult &&
      bookingIntentsResult.rowCount &&
      bookingIntentsResult.rowCount > 0
    ) {
      this.logger.log(
        `${bookingIntentsResult.rowCount} expired booking intents cleaned up successfully`,
      );
    }
  }
}
