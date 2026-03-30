import Stripe from 'stripe';
import type { Logger } from '@nestjs/common';

interface InvoiceLineItem {
  priceId?: string;
  priceData?: {
    currency: string;
    product: string;
    unitAmount: number;
  };
  amount?: number;
  currency?: string;
  quantity: number;
  description: string;
}

/**
 * Creates invoice items for a Stripe invoice
 */
export async function createInvoiceItems(
  stripe: Stripe,
  invoiceId: string,
  customerId: string,
  lineItems: InvoiceLineItem[],
  logger: Logger,
): Promise<void> {
  for (const item of lineItems) {
    try {
      if (
        item.priceId &&
        item.priceId.trim() !== '' &&
        item.priceId.startsWith('price_')
      ) {
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoiceId,
          price: item.priceId,
          quantity: item.quantity,
          description: item.description,
        } as Stripe.InvoiceItemCreateParams);
      } else if (item.priceData) {
        if (item.priceData.unitAmount < 0) {
          await stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoiceId,
            amount: item.priceData.unitAmount * item.quantity,
            currency: item.priceData.currency,
            description: item.description,
          });
        } else {
          await stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoiceId,
            price_data: {
              currency: item.priceData.currency,
              product: item.priceData.product,
              unit_amount: item.priceData.unitAmount,
            },
            quantity: item.quantity,
            description: item.description,
          } as Stripe.InvoiceItemCreateParams);
        }
      } else if (
        typeof item.amount === 'number' &&
        item.currency &&
        item.currency.trim() !== ''
      ) {
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoiceId,
          amount: item.amount,
          currency: item.currency,
          description: item.description,
        });
      }
    } catch (error) {
      logger.error(
        `Failed to create invoice item for invoice ${invoiceId}: ${error}`,
      );
      throw error;
    }
  }
}

/**
 * Pays a Stripe invoice with retry logic
 */
export async function payInvoiceWithRetry(
  stripe: Stripe,
  invoiceId: string,
  logger: Logger,
): Promise<Stripe.Invoice> {
  logger.log(
    `[STRIPE INVOICE] Calling pay() with paid_out_of_band=true for invoice ${invoiceId}`,
  );

  let invoice = await stripe.invoices.pay(invoiceId, {
    paid_out_of_band: true,
  });

  logger.log(
    `[STRIPE INVOICE] Invoice ${invoiceId} pay() call completed. Status: ${invoice.status}`,
  );

  if (invoice.status !== 'paid') {
    logger.warn(
      `[STRIPE INVOICE] Invoice ${invoiceId} status is '${invoice.status}' after pay() call. Waiting and re-checking...`,
    );

    for (let attempt = 1; attempt <= 5; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));

      const recheckedInvoice = await stripe.invoices.retrieve(invoiceId);

      logger.log(
        `[STRIPE INVOICE] Re-check attempt ${attempt}/5 for invoice ${invoiceId}. Status: ${recheckedInvoice.status}`,
      );

      if (recheckedInvoice.status === 'paid') {
        logger.log(
          `[STRIPE INVOICE] Invoice ${invoiceId} confirmed as paid after re-check attempt ${attempt}.`,
        );
        return recheckedInvoice;
      }

      if (recheckedInvoice.status === 'open' && attempt < 5) {
        logger.warn(
          `[STRIPE INVOICE] Invoice ${invoiceId} still open. Retrying pay() call...`,
        );
        try {
          invoice = await stripe.invoices.pay(invoiceId, {
            paid_out_of_band: true,
          });
          logger.log(
            `[STRIPE INVOICE] Retry pay() call completed. Status: ${invoice.status}`,
          );
          if (invoice.status === 'paid') {
            return invoice;
          }
        } catch (retryError: any) {
          logger.warn(
            `[STRIPE INVOICE] Retry pay() call failed: ${retryError.message}`,
          );
        }
      }
    }

    const finalCheck = await stripe.invoices.retrieve(invoiceId);
    if (finalCheck.status !== 'paid') {
      logger.error(
        `[STRIPE INVOICE] CRITICAL: Invoice ${invoiceId} still not paid after all attempts. Final status: '${finalCheck.status}'. Invoice details: ${JSON.stringify(
          {
            id: finalCheck.id,
            status: finalCheck.status,
            amount_paid: finalCheck.amount_paid,
            amount_due: finalCheck.amount_due,
            total: finalCheck.total,
            auto_advance: finalCheck.auto_advance,
          },
        )}`,
      );
      throw new Error(
        `Invoice payment failed. Invoice status: ${finalCheck.status}. Expected: 'paid'. Invoice ID: ${invoiceId}`,
      );
    }

    return finalCheck;
  }

  logger.log(
    `[STRIPE INVOICE] Invoice ${invoiceId} paid successfully. Status: ${invoice.status}`,
  );

  return invoice;
}
