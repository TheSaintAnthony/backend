import { IsInt, IsPositive, IsNumberString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Reservation ID', example: 1 })
  @IsInt()
  @IsPositive()
  reservationId: number;

  @ApiProperty({ description: 'Invoice amount', example: '500.00' })
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({ description: 'Invoice status ID', example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;
}
