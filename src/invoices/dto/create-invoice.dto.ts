import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsOptional,
  IsString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsDateString,
  Length,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NestedInvoiceLineItemDto } from './nested-invoice-line-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Reservation ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  reservationId: string;

  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Total invoice amount', example: '1230.00' })
  @IsNumberString()
  totalAmount: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  // Customer billing information (snapshot - will be copied from user if not provided)
  @ApiProperty({ description: 'Customer name', example: 'João Silva' })
  @IsString()
  customerName: string;

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

  @ApiProperty({
    description: 'Customer email',
    example: 'joao.silva@example.com',
  })
  @IsEmail()
  customerEmail: string;

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

  @ApiProperty({
    description: 'Invoice type ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  invoiceTypeId: string;

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
    description: 'Invoice provider ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiProperty({ description: 'Invoice status ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  statusId: string;

  @ApiProperty({
    description: 'Invoice line items',
    type: [NestedInvoiceLineItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedInvoiceLineItemDto)
  lineItems: NestedInvoiceLineItemDto[];
}
