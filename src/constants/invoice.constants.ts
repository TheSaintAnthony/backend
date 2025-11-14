export enum InvoiceProvider {}

export enum InvoiceTypeName {
  INVOICE = 'invoice',
  CREDIT_NOTE = 'credit_note',
  RECEIPT = 'receipt',
  PRO_FORMA = 'pro_forma',
}

export enum InvoiceLineItemType {
  ACCOMMODATION = 'accommodation',
  SERVICE = 'service',
  FEE = 'fee',
  TAX = 'tax',
  DISCOUNT = 'discount',
}

export enum ProductCode {
  ROOM_STANDARD = 'ROOM_STANDARD',
  ROOM_DELUXE = 'ROOM_DELUXE',
  ROOM_SUITE = 'ROOM_SUITE',
  BREAKFAST = 'BREAKFAST',
  PARKING = 'PARKING',
  LAUNDRY = 'LAUNDRY',
  CLEANING_FEE = 'CLEANING_FEE',
  TOURIST_TAX = 'TOURIST_TAX',
}
