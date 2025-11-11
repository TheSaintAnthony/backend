import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  invoiceId: number;

  @ApiProperty()
  @IsNumberString()
  amount: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  paymentMethodId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  paymentStatusId: number;

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
