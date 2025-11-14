export interface InvoiceCancelResult {
  success: boolean;
  externalInvoiceId: string;
  externalInvoiceNumber?: string;
  cancelledAt?: Date;
  creditNoteId?: string;
  creditNoteNumber?: string;
  errorMessage?: string;
  errorCode?: string;
}

