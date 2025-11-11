import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreatePaymentDto, EditPaymentDto } from './dto';
import { and, eq, lt } from 'drizzle-orm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentStatus } from 'src/constants';

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

  async getPayments() {
    return await this.db.select().from(schema.payments);
  }

  async getPaymentById(id: number) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id));

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getPaymentsByInvoice(invoiceId: number) {
    return await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.invoiceId, invoiceId));
  }

  async editPayment(id: number, data: EditPaymentDto) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id));

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return await this.db
      .update(schema.payments)
      .set({ ...data })
      .where(eq(schema.payments.id, id))
      .returning();
  }

  async deletePayment(id: number) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id));

    if (!payment) {
      throw new NotFoundException('Payment not found');
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
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePayment(id: number, data: EditPaymentDto) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id));

    if (!payment) {
      throw new NotFoundException('Payment not found');
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
      throw new InternalServerErrorException('Error fetching reservations');
    }

    if (result && result.rowCount && result.rowCount > 0) {
      this.logger.log(
        `${result.rowCount} expired pending payments deleted successfully`,
      );
    }
  }
}
