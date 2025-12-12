import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../../db/schema';
import { eq, or } from 'drizzle-orm';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';
import { INVOICE_STATUS_NAMES } from 'src/constants';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private statusLookupService: StatusLookupService,
    private stripeService: StripeService,
  ) {}

  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(
      `PaymentIntent succeeded: ${paymentIntent.id}, bookingIntentId: ${paymentIntent.metadata?.bookingIntentId}`,
    );

    const [existingPayment] = await this.db
      .select()
      .from(schema.payments)
      .where(
        or(
          eq(schema.payments.transactionId, paymentIntent.id),
          eq(schema.payments.externalReferenceId, paymentIntent.id),
        ),
      )
      .limit(1);

    if (existingPayment) {
      this.logger.log(
        `Payment already processed for PaymentIntent ${paymentIntent.id}`,
      );
      return;
    }

    const userId = paymentIntent.metadata?.userId;
    if (userId) {
      await this.db
        .delete(schema.roomHolds)
        .where(eq(schema.roomHolds.userId, userId));
      this.logger.log(`Room holds cleared for user ${userId}`);
    }

    this.logger.log(
      `PaymentIntent ${paymentIntent.id} succeeded but reservation not yet created. Will be created via completeBooking API call.`,
    );
  }

  async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(
      `PaymentIntent failed: ${paymentIntent.id}, bookingIntentId: ${paymentIntent.metadata?.bookingIntentId}`,
    );

    const userId = paymentIntent.metadata?.userId;
    if (userId) {
      await this.db
        .delete(schema.roomHolds)
        .where(eq(schema.roomHolds.userId, userId));
      this.logger.log(
        `Room holds cleared for user ${userId} after payment failure`,
      );
    }

    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(
        or(
          eq(schema.payments.transactionId, paymentIntent.id),
          eq(schema.payments.externalReferenceId, paymentIntent.id),
        ),
      )
      .limit(1);

    if (payment) {
      const failedPaymentStatusId =
        await this.statusLookupService.getPaymentStatusId('failed');
      await this.db
        .update(schema.payments)
        .set({
          paymentStatusId: failedPaymentStatusId,
        })
        .where(eq(schema.payments.id, payment.id));

      const [invoice] = await this.db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, payment.invoiceId))
        .limit(1);

      if (invoice) {
        await this.db
          .update(schema.invoices)
          .set({
            statusId: this.statusLookupService.getInvoiceStatusId(
              INVOICE_STATUS_NAMES.CANCELLED,
            ),
          })
          .where(eq(schema.invoices.id, invoice.id));
      }
    }
  }

  async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(
      `PaymentIntent canceled: ${paymentIntent.id}, bookingIntentId: ${paymentIntent.metadata?.bookingIntentId}`,
    );

    const userId = paymentIntent.metadata?.userId;
    if (userId) {
      await this.db
        .delete(schema.roomHolds)
        .where(eq(schema.roomHolds.userId, userId));
      this.logger.log(
        `Room holds cleared for user ${userId} after payment cancellation`,
      );
    }

    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(
        or(
          eq(schema.payments.transactionId, paymentIntent.id),
          eq(schema.payments.externalReferenceId, paymentIntent.id),
        ),
      )
      .limit(1);

    if (payment) {
      const failedPaymentStatusId =
        await this.statusLookupService.getPaymentStatusId('failed');
      await this.db
        .update(schema.payments)
        .set({
          paymentStatusId: failedPaymentStatusId,
        })
        .where(eq(schema.payments.id, payment.id));

      const [invoice] = await this.db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, payment.invoiceId))
        .limit(1);

      if (invoice) {
        await this.db
          .update(schema.invoices)
          .set({
            statusId: this.statusLookupService.getInvoiceStatusId(
              INVOICE_STATUS_NAMES.CANCELLED,
            ),
          })
          .where(eq(schema.invoices.id, invoice.id));
      }
    }
  }
}
