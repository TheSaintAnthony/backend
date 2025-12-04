export interface PaymentCreationResult {
  transactionId: string;
  requiresUserAction: boolean;
  actionUrl?: string;
  referenceCode?: string;
  entityCode?: string;
  expiresAt?: Date;
  metadata?: Record<string, string>;
}
