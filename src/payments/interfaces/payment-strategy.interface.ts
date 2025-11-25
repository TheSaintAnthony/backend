import { PaymentCaptureResult } from './payment-capture-result.interface';
import { PaymentCreationResult } from './payment-creation-result.interface';
import { PaymentStatusResult } from './payment-status-result.interface';

export interface IPaymentStrategy {
  createPayment(params: {
    amount: string;
    currency: string;
    orderId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentCreationResult>;

  capturePayment(transactionId: string): Promise<PaymentCaptureResult>;

  getPaymentStatus(transactionId: string): Promise<PaymentStatusResult>;
}
