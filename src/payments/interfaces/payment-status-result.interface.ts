export interface PaymentStatusResult {
  transactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'refunded';
  amount?: string;
  completedAt?: Date;
}
