import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsString,
  IsOptional,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditPaymentDto {
  @ApiPropertyOptional({ description: 'Payment amount', example: '550.00' })
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional({ description: 'Payment method ID', example: 2 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  paymentMethodId?: number;

  @ApiPropertyOptional({
    description: 'Transaction ID',
    example: 'txn_xyz789',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
