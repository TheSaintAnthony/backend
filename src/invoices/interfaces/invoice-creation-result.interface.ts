export interface InvoiceCreationResult {
  success: boolean;
  externalInvoiceId?: string;
  externalInvoiceNumber?: string;
  invoiceUrl?: string;
  pdfUrl?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  totalAmount?: string;
  errorMessage?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

