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

  /**
   * Create or retrieve a Stripe customer for a user
   */
  async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string,
    phone?: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    try {
      // Try to find existing customer by metadata
      if (metadata?.userId) {
        const existingCustomers = await this.stripe.customers.list({
          email,
          limit: 1,
        });

        if (existingCustomers.data.length > 0) {
          return existingCustomers.data[0];
        }
      }

      // Create new customer
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

  /**
   * Create a Stripe product for a room
   */
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
        type: 'service', // Rooms are services, not physical products
      });

      return product;
    } catch (error) {
      this.logger.error(`Failed to create Stripe product: ${error}`);
      throw error;
    }
  }

  /**
   * Create a Stripe price for a product
   */
  async createPrice(
    productId: string,
    amount: number, // in cents
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

  /**
   * Update a Stripe product
   */
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

  /**
   * Archive a Stripe product (don't delete to preserve invoice history)
   */
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

  /**
   * Create a PaymentIntent for a booking
   */
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
        statement_descriptor_suffix: params.statementDescriptor?.substring(0, 22), // Max 22 chars
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
        actionUrl: undefined, // Stripe handles this via client secret
        expiresAt: undefined, // PaymentIntents don't expire the same way
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

  /**
   * Confirm a PaymentIntent (usually done client-side, but can be done server-side)
   */
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
      // Ensure we only return allowed statuses for PaymentCaptureResult
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

  /**
   * Get PaymentIntent status
   */
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

  /**
   * Create a Stripe invoice for a booking
   */
  async createInvoice(params: {
    customerId: string;
    description?: string;
    metadata?: Record<string, string>;
    lineItems: Array<{
      priceId?: string;
      priceData?: {
        currency: string;
        product: string;
        unitAmount: number; // in cents
      };
      quantity: number;
      description: string;
    }>;
    autoAdvance?: boolean;
  }): Promise<Stripe.Invoice> {
    try {
      // Create invoice
      const invoice = await this.stripe.invoices.create({
        customer: params.customerId,
        description: params.description,
        metadata: params.metadata,
        auto_advance: params.autoAdvance ?? false, // Don't auto-finalize
      });

      // Add line items
      for (const item of params.lineItems) {
        if (item.priceId) {
          await this.stripe.invoiceItems.create({
            customer: params.customerId,
            invoice: invoice.id,
            price: item.priceId as string,
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
        }
      }

      // Finalize invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(
        invoice.id,
      );

      return finalizedInvoice;
    } catch (error) {
      this.logger.error(`Failed to create Stripe invoice: ${error}`);
      throw error;
    }
  }

  /**
   * Get invoice status
   */
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

  /**
   * Pay a Stripe invoice (mark as paid)
   * Uses paid_out_of_band since payment was already processed via PaymentIntent
   */
  async payInvoice(
    invoiceId: string,
  ): Promise<Stripe.Invoice> {
    try {
      // Mark invoice as paid out of band since payment was already processed
      // This prevents double charging
      const invoice = await this.stripe.invoices.pay(invoiceId, {
        paid_out_of_band: true,
      });
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to pay Stripe invoice: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieve invoice and get its URL
   */
  async getInvoiceUrl(invoiceId: string): Promise<string | null> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice.hosted_invoice_url || null;
    } catch (error) {
      this.logger.error(`Failed to retrieve invoice: ${error}`);
      return null;
    }
  }

  /**
   * Create a refund for a PaymentIntent
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number, // in cents, if not provided, full refund
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
  ): Promise<Stripe.Refund> {
    try {
      // First, retrieve the PaymentIntent to get the charge ID
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
      );

      if (!paymentIntent.latest_charge) {
        throw new Error(
          `PaymentIntent ${paymentIntentId} has no charge to refund`,
        );
      }

      // Create refund using the charge ID
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

  /**
   * Create a credit note for an invoice (for accounting purposes)
   */
  async createCreditNote(
    invoiceId: string,
    amount?: number, // in cents, if not provided, full amount
    reason?: 'duplicate' | 'fraudulent' | 'order_change' | 'product_unsatisfactory',
    memo?: string,
  ): Promise<Stripe.CreditNote> {
    try {
      // Retrieve the invoice first
      const invoice = await this.stripe.invoices.retrieve(invoiceId);

      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      // Create credit note
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

  /**
   * Map Stripe PaymentIntent status to our payment status
   */
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

  /**
   * Verify webhook signature
   */
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
