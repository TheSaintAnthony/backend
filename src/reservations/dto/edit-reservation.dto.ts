import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsNumberString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditReservationDto {
  @ApiPropertyOptional({ description: 'Reservation status ID', example: 2 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;

  @ApiPropertyOptional({ description: 'Total price', example: '550.00' })
  @IsOptional()
  @IsNumberString()
  totalPrice?: string;

  @ApiPropertyOptional({ description: 'Payment status ID', example: 2 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  paymentStatusId?: number;

  @ApiPropertyOptional({ description: 'Deposit amount', example: '150.00' })
  @IsOptional()
  @IsNumberString()
  depositAmount?: string;

  @ApiPropertyOptional({
    description: 'Special requests',
    example: 'Late checkout requested',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
