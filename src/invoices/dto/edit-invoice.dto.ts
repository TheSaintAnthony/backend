import {
  IsNumberString,
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  Length,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditInvoiceDto {
  @ApiPropertyOptional({
    description: 'Total invoice amount',
    example: '1500.00',
  })
  @IsOptional()
  @IsNumberString()
  totalAmount?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Customer name', example: 'João Silva' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Customer company name (for B2B invoices)',
    example: 'Silva Tourism Lda',
  })
  @IsOptional()
  @IsString()
  customerCompanyName?: string;

  @ApiPropertyOptional({
    description:
      'Customer Tax ID (NIF for PT, VAT for EU, etc.) - Optional for individual consumers',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  customerTaxId?: string;

  @ApiPropertyOptional({
    description: 'Customer email',
    example: 'joao.silva@example.com',
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({
    description: 'Customer phone',
    example: '+351912345678',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Customer billing address',
    example: 'Rua Example, 123, 1000-001 Lisboa, Portugal',
  })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({
    description: 'Customer country (ISO 2-letter code)',
    example: 'PT',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  customerCountry?: string;

  @ApiPropertyOptional({
    description: 'Internal invoice number',
    example: 'INV-2024-001',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'Invoice type ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  invoiceTypeId?: string;

  @ApiPropertyOptional({
    description: 'Invoice due date',
    example: '2024-02-15T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the invoice',
    example: 'Payment terms: 30 days',
  })
  @IsOptional()
  @IsString()
  notes?: string;


  @ApiPropertyOptional({
    description: 'External invoice ID from provider',
    example: 'CEGID-123456',
  })
  @IsOptional()
  @IsString()
  externalInvoiceId?: string;

  @ApiPropertyOptional({
    description: 'External invoice number from provider',
    example: 'FT 2024/00123',
  })
  @IsOptional()
  @IsString()
  externalInvoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'URL to view invoice in external system',
    example: 'https://example.com/invoice/123',
  })
  @IsOptional()
  @IsString()
  externalInvoiceUrl?: string;

  @ApiPropertyOptional({
    description: 'Path to downloaded PDF',
    example: '/invoices/2024/invoice-123.pdf',
  })
  @IsOptional()
  @IsString()
  externalInvoicePdfPath?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when synced with external system',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  syncedAt?: string;

  @ApiPropertyOptional({
    description: 'Error message if sync failed',
    example: 'Connection timeout',
  })
  @IsOptional()
  @IsString()
  syncError?: string;

  @ApiPropertyOptional({
    description: 'Invoice status ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  statusId?: string;
}
