import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiPropertyOptional({ description: 'Reservation status ID', example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;

  @ApiProperty({ description: 'Total reservation price', example: '500.00' })
  @IsNumberString()
  totalPrice: string;

  @ApiProperty({ description: 'Payment status ID', example: 1 })
  @IsInt()
  @IsPositive()
  paymentStatusId: number;

  @ApiPropertyOptional({ description: 'Deposit amount', example: '100.00' })
  @IsOptional()
  @IsNumberString()
  depositAmount?: string;

  @ApiPropertyOptional({
    description: 'Special requests',
    example: 'Early check-in needed',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
