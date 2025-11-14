export interface InvoiceCreationData {
  customerName: string;
  customerNif?: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  invoiceDate: Date;
  dueDate?: Date;
  invoiceTypeId: number;
  currency?: string;
  notes?: string;
  lineItems: InvoiceLineItemData[];
  internalReferenceId: string;
  internalInvoiceNumber?: string;
}

export interface InvoiceLineItemData {
  description: string;
  productCode?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  itemType?: string;
  startDate?: Date;
  endDate?: Date;
}

