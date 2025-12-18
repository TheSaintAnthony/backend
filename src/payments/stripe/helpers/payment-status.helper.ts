import type { PaymentStatusResult } from '../../interfaces';

/**
 * Maps Stripe payment status to internal payment status
 */
export function mapStripeStatusToPaymentStatus(
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
