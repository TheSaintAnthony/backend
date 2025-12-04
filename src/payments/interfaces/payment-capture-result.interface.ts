export interface PaymentCaptureResult {
  success: boolean;
  transactionId: string;
  status: 'completed' | 'failed' | 'pending';
  amountCaptured?: string;
  errorMessage?: string;
}
