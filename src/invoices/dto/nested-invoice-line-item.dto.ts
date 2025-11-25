import {
  IsNumberString,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NestedInvoiceLineItemDto {
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
  @IsUUID()
  itemReferenceId?: string;

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
