import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  check,
  varchar,
  text,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { reservations } from './reservations.schema';
import { users } from './users.schema';
import {
  invoiceStatus,
  invoiceTypes,
  invoiceProviders,
} from './lookup-tables.schema';

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('EUR').notNull(),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerCompanyName: varchar('customer_company_name', { length: 255 }),
    customerTaxId: varchar('customer_tax_id', { length: 50 }),
    customerEmail: varchar('customer_email', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 50 }),
    customerAddress: text('customer_address'),
    customerCountry: varchar('customer_country', { length: 2 }),
    invoiceNumber: varchar('invoice_number', { length: 50 }),
    invoiceTypeId: uuid('invoice_type_id')
      .notNull()
      .references(() => invoiceTypes.id),
    dueDate: timestamp('due_date', { withTimezone: true }),
    notes: text('notes'),
    providerId: uuid('provider_id').references(() => invoiceProviders.id),
    externalInvoiceId: varchar('external_invoice_id', { length: 255 }),
    externalInvoiceNumber: varchar('external_invoice_number', { length: 100 }),
    externalInvoiceUrl: text('external_invoice_url'),
    externalInvoicePdfPath: text('external_invoice_pdf_path'),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    syncError: text('sync_error'),
    statusId: uuid('status_id')
      .notNull()
      .references(() => invoiceStatus.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    checkTotalAmount: check(
      'check_total_amount_positive',
      sql`${table.totalAmount} >= 0`,
    ),
  }),
);

export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    productCode: varchar('product_code', { length: 100 }),
    itemType: varchar('item_type', { length: 50 }),
    itemReferenceId: uuid('item_reference_id'),
    quantity: numeric('quantity', { precision: 10, scale: 2 })
      .notNull()
      .default('1.00'),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    discount: numeric('discount', { precision: 10, scale: 2 }).default('0.00'),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    checkQuantity: check('check_quantity_positive', sql`${table.quantity} > 0`),
    checkUnitPrice: check(
      'check_unit_price_positive',
      sql`${table.unitPrice} >= 0`,
    ),
    checkTotalAmount: check(
      'check_line_total_positive',
      sql`${table.totalAmount} >= 0`,
    ),
    checkDiscount: check(
      'check_discount_positive',
      sql`${table.discount} >= 0`,
    ),
  }),
);
