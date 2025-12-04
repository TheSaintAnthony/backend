import { InvoiceCreationData } from './invoice-creation-data.interface';
import { InvoiceCreationResult } from './invoice-creation-result.interface';
import { InvoiceStatusResult } from './invoice-status-result.interface';
import { InvoiceCancelResult } from './invoice-cancel-result.interface';
export interface IInvoiceStrategy {
  createInvoice(data: InvoiceCreationData): Promise<InvoiceCreationResult>;
  getInvoiceStatus(externalInvoiceId: string): Promise<InvoiceStatusResult>;
  cancelInvoice(externalInvoiceId: string): Promise<InvoiceCancelResult>;
  downloadInvoicePdf?(externalInvoiceId: string): Promise<Buffer>;
  syncInvoiceStatuses?(
    externalInvoiceIds: string[],
  ): Promise<InvoiceStatusResult[]>;
}
