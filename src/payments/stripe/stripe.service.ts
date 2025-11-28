import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  PaymentCreationResult,
  PaymentCaptureResult,
  PaymentStatusResult,
} from '../interfaces';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor() {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string,
    phone?: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    try {
      if (metadata?.userId) {
        const existingCustomers = await this.stripe.customers.list({
          email,
          limit: 1,
        });

        if (existingCustomers.data.length > 0) {
          return existingCustomers.data[0];
        }
      }

      const customer = await this.stripe.customers.create({
        email,
        name,
        phone,
        metadata: {
          userId,
          ...metadata,
        },
      });

      return customer;
    } catch (error) {
      this.logger.error(`Failed to create/get Stripe customer: ${error}`);
      throw error;
    }
  }

  async createProduct(
    name: string,
    description?: string,
    metadata?: Record<string, string>,
    images?: string[],
  ): Promise<Stripe.Product> {
    try {
      const product = await this.stripe.products.create({
        name,
        description,
        metadata,
        images,
        type: 'service',
      });

      return product;
    } catch (error) {
      this.logger.error(`Failed to create Stripe product: ${error}`);
      throw error;
    }
  }

  async createPrice(
    productId: string,
    amount: number,
    currency: string = 'eur',
    metadata?: Record<string, string>,
  ): Promise<Stripe.Price> {
    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: amount,
        currency,
        metadata,
      });

      return price;
    } catch (error) {
      this.logger.error(`Failed to create Stripe price: ${error}`);
      throw error;
    }
  }

  async updateProduct(
    productId: string,
    updates: {
      name?: string;
      description?: string;
      metadata?: Record<string, string>;
      images?: string[];
    },
  ): Promise<Stripe.Product> {
    try {
      const product = await this.stripe.products.update(productId, updates);
      return product;
    } catch (error) {
      this.logger.error(`Failed to update Stripe product: ${error}`);
      throw error;
    }
  }

  async archiveProduct(productId: string): Promise<Stripe.Product> {
    try {
      const product = await this.stripe.products.update(productId, {
        active: false,
      });
      return product;
    } catch (error) {
      this.logger.error(`Failed to archive Stripe product: ${error}`);
      throw error;
    }
  }

  async createPaymentIntent(params: {
    amount: string;
    currency: string;
    customerId?: string;
    orderId: string;
    metadata?: Record<string, string>;
    description?: string;
    statementDescriptor?: string;
  }): Promise<PaymentCreationResult> {
    try {
      const amountInCents = Math.round(parseFloat(params.amount) * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: params.currency.toLowerCase(),
        customer: params.customerId,
        description: params.description,
        statement_descriptor_suffix: params.statementDescriptor?.substring(0, 22),
        metadata: {
          orderId: params.orderId,
          ...params.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        transactionId: paymentIntent.id,
        requiresUserAction: paymentIntent.status === 'requires_action',
        actionUrl: undefined,
        expiresAt: undefined,
        metadata: {
          clientSecret: paymentIntent.client_secret || '',
          ...params.metadata,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create PaymentIntent: ${error}`);
      throw error;
    }
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<PaymentCaptureResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        paymentMethodId ? { payment_method: paymentMethodId } : {},
      );

      const mappedStatus = this.mapStripeStatusToPaymentStatus(
        paymentIntent.status,
      );
      const captureStatus: 'completed' | 'failed' | 'pending' =
        mappedStatus === 'completed'
          ? 'completed'
          : mappedStatus === 'failed'
            ? 'failed'
            : 'pending';

      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: paymentIntent.id,
        status: captureStatus,
        amountCaptured: paymentIntent.amount_received
          ? (paymentIntent.amount_received / 100).toString()
          : undefined,
        errorMessage:
          paymentIntent.last_payment_error?.message || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to confirm PaymentIntent: ${error}`);
      return {
        success: false,
        transactionId: paymentIntentId,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getPaymentIntentStatus(
    paymentIntentId: string,
  ): Promise<PaymentStatusResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
      );

      return {
        transactionId: paymentIntent.id,
        status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
        amount: paymentIntent.amount
          ? (paymentIntent.amount / 100).toString()
          : undefined,
        completedAt:
          paymentIntent.status === 'succeeded' && paymentIntent.created
            ? new Date(paymentIntent.created * 1000)
            : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get PaymentIntent status: ${error}`);
      throw error;
    }
  }

  async createInvoice(params: {
    customerId: string;
    description?: string;
    metadata?: Record<string, string>;
    lineItems: Array<{
      priceId?: string;
      priceData?: {
        currency: string;
        product: string;
        unitAmount: number;
      };
      quantity: number;
      description: string;
    }>;
    autoAdvance?: boolean;
  }): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.create({
        customer: params.customerId,
        description: params.description,
        metadata: params.metadata,
        auto_advance: params.autoAdvance ?? false,
      });

      for (const item of params.lineItems) {
        if (item.priceId && typeof item.priceId === 'string' && item.priceId.trim() !== '' && item.priceId.startsWith('price_')) {
          await this.stripe.invoiceItems.create({
            customer: params.customerId,
            invoice: invoice.id,
            price: item.priceId,
            quantity: item.quantity,
            description: item.description,
          } as Stripe.InvoiceItemCreateParams);
        } else if (item.priceData) {
          await this.stripe.invoiceItems.create({
            customer: params.customerId,
            invoice: invoice.id,
            price_data: {
              currency: item.priceData.currency,
              product: item.priceData.product,
              unit_amount: item.priceData.unitAmount,
            },
            quantity: item.quantity,
            description: item.description,
          } as Stripe.InvoiceItemCreateParams);
        } else {
          this.logger.warn(`Skipping invoice item with invalid price configuration: ${item.description}`);
        }
      }

      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(
        invoice.id,
      );

      return finalizedInvoice;
    } catch (error) {
      this.logger.error(`Failed to create Stripe invoice: ${error}`);
      throw error;
    }
  }

  async getInvoiceStatus(
    invoiceId: string,
  ): Promise<{ status: string; paid: boolean; url?: string }> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return {
        status: invoice.status || 'draft',
        paid: invoice.status === 'paid',
        url: invoice.hosted_invoice_url || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get invoice status: ${error}`);
      throw error;
    }
  }

  async payInvoice(
    invoiceId: string,
  ): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.pay(invoiceId, {
        paid_out_of_band: true,
      });
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to pay Stripe invoice: ${error}`);
      throw error;
    }
  }

  async getInvoiceUrl(invoiceId: string): Promise<string | null> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice.hosted_invoice_url || null;
    } catch (error) {
      this.logger.error(`Failed to retrieve invoice: ${error}`);
      return null;
    }
  }

  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
  ): Promise<Stripe.Refund> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
      );

      if (!paymentIntent.latest_charge) {
        throw new Error(
          `PaymentIntent ${paymentIntentId} has no charge to refund`,
        );
      }

      const refundParams: Stripe.RefundCreateParams = {
        charge: paymentIntent.latest_charge as string,
        reason: reason || 'requested_by_customer',
      };

      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await this.stripe.refunds.create(refundParams);
      this.logger.log(`Refund created: ${refund.id} for PaymentIntent ${paymentIntentId}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to create refund: ${error}`);
      throw error;
    }
  }

  async createCreditNote(
    invoiceId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'order_change' | 'product_unsatisfactory',
    memo?: string,
  ): Promise<Stripe.CreditNote> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);

      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      const creditNoteParams: Stripe.CreditNoteCreateParams = {
        invoice: invoiceId,
        reason: reason || 'order_change',
      };

      if (amount) {
        creditNoteParams.amount = amount;
      }

      if (memo) {
        creditNoteParams.memo = memo;
      }

      const creditNote = await this.stripe.creditNotes.create(creditNoteParams);
      this.logger.log(`Credit note created: ${creditNote.id} for invoice ${invoiceId}`);
      return creditNote;
    } catch (error) {
      this.logger.error(`Failed to create credit note: ${error}`);
      throw error;
    }
  }

  private mapStripeStatusToPaymentStatus(
    stripeStatus: string,
  ): PaymentStatusResult['status'] {
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      succeeded: 'completed',
      processing: 'pending',
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      requires_capture: 'pending',
      canceled: 'failed',
      payment_failed: 'failed',
    };

    return statusMap[stripeStatus] || 'pending';
  }

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        secret,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error}`);
      throw error;
    }
  }
}
