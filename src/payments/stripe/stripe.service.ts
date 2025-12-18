import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  PaymentCreationResult,
  PaymentCaptureResult,
  PaymentStatusResult,
} from '../interfaces';
import {
  createInvoiceItems,
  payInvoiceWithRetry,
} from './helpers/invoice-helpers';
import { mapStripeStatusToPaymentStatus } from './helpers/payment-status.helper';
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
      apiVersion: '2025-12-15.clover',
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
        statement_descriptor_suffix: params.statementDescriptor?.substring(
          0,
          22,
        ),
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
        errorMessage: paymentIntent.last_payment_error?.message || undefined,
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
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
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

  async getPaymentIntentWithMetadata(
    paymentIntentId: string,
  ): Promise<{ id: string; metadata: Record<string, string> }> {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        id: paymentIntent.id,
        metadata: (paymentIntent.metadata as Record<string, string>) || {},
      };
    } catch (error) {
      this.logger.error(`Failed to get PaymentIntent with metadata: ${error}`);
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
    discounts?: Array<{ coupon?: string; promotion_code?: string }>;
    paymentIntentId?: string;
  }): Promise<Stripe.Invoice> {
    try {
      const invoiceCreateParams: Stripe.InvoiceCreateParams = {
        customer: params.customerId,
        description: params.description,
        metadata: params.metadata,
        auto_advance: params.autoAdvance ?? false,
      };

      if (params.discounts && params.discounts.length > 0) {
        invoiceCreateParams.discounts = params.discounts;
      }

      const invoice = await this.stripe.invoices.create(invoiceCreateParams);
      await createInvoiceItems(
        this.stripe,
        invoice.id,
        params.customerId,
        params.lineItems,
        this.logger,
      );
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(
        invoice.id,
      );

      if (params.paymentIntentId) {
        try {
          this.logger.log(
            `[STRIPE INVOICE] Attaching PaymentIntent ${params.paymentIntentId} to Invoice ${finalizedInvoice.id}`,
          );
          const invoiceWithPayment = await this.stripe.invoices.attachPayment(
            finalizedInvoice.id,
            {
              payment_intent: params.paymentIntentId,
            },
          );
          this.logger.log(
            `[STRIPE INVOICE] PaymentIntent ${params.paymentIntentId} attached to Invoice ${finalizedInvoice.id}. Invoice status: ${invoiceWithPayment.status}`,
          );
          return invoiceWithPayment;
        } catch (error: any) {
          this.logger.error(
            `[STRIPE INVOICE] Failed to attach PaymentIntent ${params.paymentIntentId} to Invoice ${finalizedInvoice.id}: ${error.message}`,
            error,
          );
          throw error;
        }
      }

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
  async payInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      let invoice = await this.stripe.invoices.retrieve(invoiceId);
      this.logger.log(
        `[STRIPE INVOICE] Paying invoice ${invoiceId}. Current status: ${invoice.status}`,
      );

      if (invoice.status === 'paid') {
        this.logger.log(
          `[STRIPE INVOICE] Invoice ${invoiceId} is already paid`,
        );
        return invoice;
      }

      if (invoice.status === 'draft') {
        this.logger.log(
          `[STRIPE INVOICE] Invoice ${invoiceId} is in draft status. Finalizing first...`,
        );
        invoice = await this.stripe.invoices.finalizeInvoice(invoiceId);
        this.logger.log(
          `[STRIPE INVOICE] Invoice ${invoiceId} finalized. New status: ${invoice.status}`,
        );
      }

      if (invoice.status !== 'open' && invoice.status !== 'uncollectible') {
        this.logger.warn(
          `[STRIPE INVOICE] Invoice ${invoiceId} is in status '${invoice.status}', expected 'open'. Attempting to pay anyway.`,
        );
      }

      this.logger.log(
        `[STRIPE INVOICE] Calling pay() with paid_out_of_band=true for invoice ${invoiceId}`,
      );

      return await payInvoiceWithRetry(this.stripe, invoiceId, this.logger);
    } catch (error: any) {
      this.logger.error(
        `[STRIPE INVOICE] Failed to pay Stripe invoice ${invoiceId}: ${error.message}`,
        error,
      );

      if (error.type === 'StripeInvalidRequestError') {
        const invoice = await this.stripe.invoices
          .retrieve(invoiceId)
          .catch(() => null);
        if (invoice) {
          this.logger.error(
            `[STRIPE INVOICE] Invoice ${invoiceId} current state: ${JSON.stringify(
              {
                status: invoice.status,
                amount_paid: invoice.amount_paid,
                amount_due: invoice.amount_due,
                total: invoice.total,
              },
            )}`,
          );
        }
      }

      throw error;
    }
  }
  async attachPaymentIntentToInvoice(
    invoiceId: string,
    paymentIntentId: string,
  ): Promise<Stripe.Invoice> {
    try {
      this.logger.log(
        `[STRIPE] Attaching PaymentIntent ${paymentIntentId} to Invoice ${invoiceId}`,
      );
      const invoice = await this.stripe.invoices.attachPayment(invoiceId, {
        payment_intent: paymentIntentId,
      });
      this.logger.log(
        `[STRIPE] PaymentIntent ${paymentIntentId} attached to Invoice ${invoiceId}. Invoice status: ${invoice.status}`,
      );
      return invoice;
    } catch (error: any) {
      this.logger.error(
        `[STRIPE] Failed to attach PaymentIntent ${paymentIntentId} to Invoice ${invoiceId}: ${error.message}`,
        error,
      );
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
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(`Failed to retrieve payment intent: ${error}`);
      throw error;
    }
    if (!paymentIntent.latest_charge) {
      const error = new Error(
        `PaymentIntent ${paymentIntentId} has no charge to refund`,
      );
      this.logger.error(error.message);
      throw error;
    }
    try {
      const refundParams: Stripe.RefundCreateParams = {
        charge: paymentIntent.latest_charge as string,
        reason: reason || 'requested_by_customer',
      };
      if (amount) {
        refundParams.amount = amount;
      }
      const refund = await this.stripe.refunds.create(refundParams);
      this.logger.log(
        `Refund created: ${refund.id} for PaymentIntent ${paymentIntentId}`,
      );
      return refund;
    } catch (error) {
      this.logger.error(`Failed to create refund: ${error}`);
      throw error;
    }
  }
  async createCreditNote(
    invoiceId: string,
    amount?: number,
    reason?:
      | 'duplicate'
      | 'fraudulent'
      | 'order_change'
      | 'product_unsatisfactory',
    memo?: string,
  ): Promise<Stripe.CreditNote> {
    try {
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
      this.logger.log(
        `Credit note created: ${creditNote.id} for invoice ${invoiceId}`,
      );
      return creditNote;
    } catch (error) {
      this.logger.error(`Failed to create credit note: ${error}`);
      throw error;
    }
  }
  async createCoupon(params: {
    name: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    currency?: string;
    maxRedemptions?: number;
    expiresAt?: Date;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Coupon> {
    try {
      const couponParams: Stripe.CouponCreateParams = {
        name: params.name,
        metadata: params.metadata,
      };

      if (params.discountType === 'percentage') {
        couponParams.percent_off = params.discountValue;
      } else {
        couponParams.amount_off = Math.round(params.discountValue * 100);
        couponParams.currency = params.currency || 'eur';
      }

      if (params.maxRedemptions) {
        couponParams.max_redemptions = params.maxRedemptions;
      }

      if (params.expiresAt) {
        couponParams.redeem_by = Math.floor(params.expiresAt.getTime() / 1000);
      }

      const coupon = await this.stripe.coupons.create(couponParams);
      this.logger.log(`Stripe coupon created: ${coupon.id}`);
      return coupon;
    } catch (error) {
      this.logger.error(`Failed to create Stripe coupon: ${error}`);
      throw error;
    }
  }

  async createPromotionCode(params: {
    couponId: string;
    code: string;
    maxRedemptions?: number;
    expiresAt?: Date;
  }): Promise<Stripe.PromotionCode> {
    try {
      const promoParams: Stripe.PromotionCodeCreateParams = {
        promotion: {
          type: 'coupon',
          coupon: params.couponId,
        },
        code: params.code.toUpperCase(),
      };

      if (params.maxRedemptions) {
        promoParams.max_redemptions = params.maxRedemptions;
      }

      if (params.expiresAt) {
        promoParams.expires_at = Math.floor(params.expiresAt.getTime() / 1000);
      }

      const promotionCode =
        await this.stripe.promotionCodes.create(promoParams);
      this.logger.log(`Stripe promotion code created: ${promotionCode.id}`);
      return promotionCode;
    } catch (error) {
      this.logger.error(`Failed to create Stripe promotion code: ${error}`);
      throw error;
    }
  }

  async validatePromotionCode(
    code: string,
  ): Promise<Stripe.PromotionCode | null> {
    try {
      const promoCodes = await this.stripe.promotionCodes.list({
        code: code.toUpperCase(),
        active: true,
        limit: 1,
      });

      if (promoCodes.data.length === 0) {
        return null;
      }

      const promoCode = promoCodes.data[0];

      if (promoCode.expires_at && promoCode.expires_at * 1000 < Date.now()) {
        return null;
      }

      if (
        promoCode.max_redemptions &&
        promoCode.times_redeemed >= promoCode.max_redemptions
      ) {
        return null;
      }

      return promoCode;
    } catch (error) {
      this.logger.error(`Failed to validate promotion code: ${error}`);
      return null;
    }
  }

  async getPromotionCodeWithCoupon(
    stripePromoCodeId: string,
  ): Promise<Stripe.PromotionCode> {
    try {
      return await this.stripe.promotionCodes.retrieve(stripePromoCodeId, {
        expand: ['coupon'],
      });
    } catch (error) {
      this.logger.error(`Failed to get promotion code: ${error}`);
      throw error;
    }
  }

  async deactivatePromotionCode(
    stripePromoCodeId: string,
  ): Promise<Stripe.PromotionCode> {
    try {
      const promoCode = await this.stripe.promotionCodes.update(
        stripePromoCodeId,
        {
          active: false,
        },
      );
      this.logger.log(`Stripe promotion code deactivated: ${promoCode.id}`);
      return promoCode;
    } catch (error) {
      this.logger.error(`Failed to deactivate promotion code: ${error}`);
      throw error;
    }
  }

  async deleteCoupon(stripeCouponId: string): Promise<Stripe.DeletedCoupon> {
    try {
      const deleted = await this.stripe.coupons.del(stripeCouponId);
      this.logger.log(`Stripe coupon deleted: ${stripeCouponId}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete Stripe coupon: ${error}`);
      throw error;
    }
  }

  async updatePaymentIntentAmount(
    paymentIntentId: string,
    newAmount: number,
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const amountInCents = Math.round(newAmount * 100);
      return await this.stripe.paymentIntents.update(paymentIntentId, {
        amount: amountInCents,
        metadata,
      });
    } catch (error) {
      this.logger.error(`Failed to update PaymentIntent amount: ${error}`);
      throw error;
    }
  }

  private mapStripeStatusToPaymentStatus(
    stripeStatus: string,
  ): PaymentStatusResult['status'] {
    return mapStripeStatusToPaymentStatus(stripeStatus);
  }
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error}`);
      throw error;
    }
  }
}
