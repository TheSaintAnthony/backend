export const RESERVATION_STATUS_NAMES = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
} as const;

export const INVOICE_STATUS_NAMES = {
  PENDING: 'Pending',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
} as const;

export const DEFAULT_DEPOSIT_AMOUNT = '0.00';
