export interface InvoiceCreationData {
  customerName: string;
  customerNif?: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  invoiceDate: Date;
  dueDate?: Date;
  invoiceTypeId: string;
  currency?: string;
  notes?: string;
  lineItems: InvoiceLineItemData[];
  internalReferenceId: string;
  internalInvoiceNumber?: string;
}

export interface InvoiceLineItemData {
  description: string;
  productCode?: string;
  quantity: string;
  unitPrice: string;
  discount?: string;
  itemType?: string;
  startDate?: Date;
  endDate?: Date;
}
