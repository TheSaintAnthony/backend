import { IsInt, IsPositive, IsNumberString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditInvoiceDto {
  @ApiPropertyOptional({ description: 'Invoice amount', example: '550.00' })
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional({ description: 'Invoice status ID', example: 2 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;
}
