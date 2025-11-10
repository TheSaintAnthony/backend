import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  paymentMethodId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  paymentStatusId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalReferenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: Date;
}
