import { Injectable, Logger } from '@nestjs/common';
import { IPaymentStrategy } from '../interfaces/payment-strategy.interface';
import {
  PaymentCaptureResult,
  PaymentCreationResult,
  PaymentStatusResult,
} from '../interfaces';
import { PaypalService } from './paypal.service';

@Injectable()
export class PaypalPaymentStrategy implements IPaymentStrategy {
  private readonly logger = new Logger(PaypalPaymentStrategy.name);

  constructor(private paypalService: PaypalService) {}

  async createPayment(params: {
    amount: string;
    currency: string;
    orderId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentCreationResult> {
    const order = await this.paypalService.createOrder({
      invoiceId: Number(params.orderId),
      amount: params.amount,
    });

    const approveLink = order.links?.find((link) => link.rel === 'approve');

    return {
      transactionId: order.orderId!,
      requiresUserAction: true,
      actionUrl: approveLink?.href,
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    };
  }

  async capturePayment(transactionId: string): Promise<PaymentCaptureResult> {
    try {
      const result = await this.paypalService.captureOrder(transactionId);

      return {
        success: true,
        transactionId,
        status: 'completed',
        amountCaptured: result.status,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to capture PayPal payment: ${errorMessage}`);
      return {
        success: false,
        transactionId,
        status: 'failed',
        errorMessage,
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResult> {
    try {
      const order = await this.paypalService.getOrder(transactionId);

      return {
        transactionId,
        status: this.mapPaypalStatus(order.status as string),
        amount: order.purchaseUnits?.[0]?.amount?.value,
        completedAt: order.updateTime ? new Date(order.updateTime) : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get PayPal status: ${errorMessage}`);
      throw error;
    }
  }

  private mapPaypalStatus(paypalStatus: string): PaymentStatusResult['status'] {
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      COMPLETED: 'completed',
      APPROVED: 'pending',
      CREATED: 'pending',
      SAVED: 'pending',
      VOIDED: 'failed',
      PAYER_ACTION_REQUIRED: 'pending',
    };

    return statusMap[paypalStatus] || 'pending';
  }
}
