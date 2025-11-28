import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';
import { RESERVATION_STATUS_NAMES, INVOICE_STATUS_NAMES } from 'src/constants';
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
      `PaymentIntent succeeded: ${paymentIntent.id} for reservation ${paymentIntent.metadata?.reservationId}`,
    );

    const reservationId = paymentIntent.metadata?.reservationId;
    if (!reservationId) {
      this.logger.warn('PaymentIntent missing reservationId metadata');
      return;
    }

    return this.db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.transactionId, paymentIntent.id))
        .limit(1);

      if (!payment) {
        this.logger.warn(`Payment not found for PaymentIntent ${paymentIntent.id}`);
        return;
      }

      const completedPaymentStatusId =
        await this.statusLookupService.getPaymentStatusId('completed');

      await tx
        .update(schema.payments)
        .set({
          paymentStatusId: completedPaymentStatusId,
          paidAt: new Date(),
        })
        .where(eq(schema.payments.id, payment.id));

      const [invoice] = await tx
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, payment.invoiceId))
        .limit(1);

      if (invoice) {
        if (invoice.externalInvoiceId) {
          try {
            const paidInvoice = await this.stripeService.payInvoice(
              invoice.externalInvoiceId,
            );
            
            let invoiceUrl = paidInvoice.hosted_invoice_url || invoice.externalInvoiceUrl;
            
            if (!invoiceUrl) {
              invoiceUrl = await this.stripeService.getInvoiceUrl(invoice.externalInvoiceId);
            }
            
            await tx
              .update(schema.invoices)
              .set({
                statusId: this.statusLookupService.getInvoiceStatusId(
                  INVOICE_STATUS_NAMES.PAID,
                ),
                issuedAt: new Date(),
                externalInvoiceUrl: invoiceUrl || invoice.externalInvoiceUrl,
              })
              .where(eq(schema.invoices.id, invoice.id));
          } catch (error) {
            this.logger.error(`Failed to pay Stripe invoice: ${error}`);
            let invoiceUrl = invoice.externalInvoiceUrl;
            if (!invoiceUrl && invoice.externalInvoiceId) {
              try {
                invoiceUrl = await this.stripeService.getInvoiceUrl(invoice.externalInvoiceId);
              } catch (urlError) {
                this.logger.error(`Failed to retrieve invoice URL: ${urlError}`);
              }
            }
            await tx
              .update(schema.invoices)
              .set({
                statusId: this.statusLookupService.getInvoiceStatusId(
                  INVOICE_STATUS_NAMES.PAID,
                ),
                issuedAt: new Date(),
                externalInvoiceUrl: invoiceUrl || invoice.externalInvoiceUrl,
              })
              .where(eq(schema.invoices.id, invoice.id));
          }
        } else {
          await tx
            .update(schema.invoices)
            .set({
              statusId: this.statusLookupService.getInvoiceStatusId(
                INVOICE_STATUS_NAMES.PAID,
              ),
              issuedAt: new Date(),
            })
            .where(eq(schema.invoices.id, invoice.id));
        }

        const [reservation] = await tx
          .select()
          .from(schema.reservations)
          .where(eq(schema.reservations.id, invoice.reservationId))
          .limit(1);

        if (reservation) {
          await tx
            .update(schema.reservations)
            .set({
              statusId: this.statusLookupService.getReservationStatusId(
                RESERVATION_STATUS_NAMES.CONFIRMED,
              ),
              paymentStatusId: completedPaymentStatusId,
            })
            .where(eq(schema.reservations.id, reservation.id));

          await tx
            .delete(schema.roomHolds)
            .where(eq(schema.roomHolds.userId, reservation.userId));
        }
      }
    });
  }

  async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(
      `PaymentIntent failed: ${paymentIntent.id} for reservation ${paymentIntent.metadata?.reservationId}`,
    );

    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.transactionId, paymentIntent.id))
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
    }
  }

  async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(
      `PaymentIntent canceled: ${paymentIntent.id} for reservation ${paymentIntent.metadata?.reservationId}`,
    );

    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.transactionId, paymentIntent.id))
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
    }
  }
}

