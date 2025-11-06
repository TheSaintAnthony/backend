import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsString,
  IsOptional,
} from 'class-validator';

export class EditPaymentDto {
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  paymentMethodId?: number;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
