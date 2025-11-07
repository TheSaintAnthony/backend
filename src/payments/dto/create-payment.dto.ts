import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Invoice ID', example: 1 })
  @IsInt()
  @IsPositive()
  invoiceId: number;

  @ApiProperty({ description: 'Payment amount', example: '500.00' })
  @IsNumberString()
  amount: string;

  @ApiProperty({ description: 'Payment method ID', example: 1 })
  @IsInt()
  @IsPositive()
  paymentMethodId: number;

  @ApiPropertyOptional({
    description: 'Transaction ID from payment gateway',
    example: 'txn_abc123',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
