export interface InvoiceStatusResult {
  externalInvoiceId: string;
  externalInvoiceNumber?: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue' | 'unknown';
  totalAmount?: string;
  paidAmount?: string;
  remainingAmount?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  paidDate?: Date;
  invoiceUrl?: string;
  pdfUrl?: string;
  metadata?: Record<string, unknown>;
}
