import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceLineItemDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsInt()
  @IsPositive()
  invoiceId: number;

  @ApiProperty({ description: 'Description of the product/service' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Product code' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({ description: 'Type of item' })
  @IsOptional()
  @IsString()
  itemType?: string;

  @ApiPropertyOptional({ description: 'Reference ID to internal item' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  itemReferenceId?: number;

  @ApiProperty({ description: 'Quantity' })
  @IsNumberString()
  quantity: string;

  @ApiProperty({ description: 'Unit price' })
  @IsNumberString()
  unitPrice: string;

  @ApiPropertyOptional({ description: 'Discount amount' })
  @IsOptional()
  @IsNumberString()
  discount?: string;

  @ApiProperty({ description: 'Total amount for line item' })
  @IsNumberString()
  totalAmount: string;

  @ApiPropertyOptional({ description: 'Start date for date-ranged items' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for date-ranged items' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class EditInvoiceLineItemDto {
  @ApiPropertyOptional({ description: 'Description of the product/service' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Product code' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({ description: 'Type of item' })
  @IsOptional()
  @IsString()
  itemType?: string;

  @ApiPropertyOptional({ description: 'Reference ID to internal item' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  itemReferenceId?: number;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumberString()
  quantity?: string;

  @ApiPropertyOptional({ description: 'Unit price' })
  @IsOptional()
  @IsNumberString()
  unitPrice?: string;

  @ApiPropertyOptional({ description: 'Discount amount' })
  @IsOptional()
  @IsNumberString()
  discount?: string;

  @ApiPropertyOptional({ description: 'Total amount for line item' })
  @IsOptional()
  @IsNumberString()
  totalAmount?: string;

  @ApiPropertyOptional({ description: 'Start date for date-ranged items' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for date-ranged items' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

