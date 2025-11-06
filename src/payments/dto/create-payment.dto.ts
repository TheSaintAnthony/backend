import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @IsPositive()
  invoiceId: number;

  @IsNumberString()
  amount: string;

  @IsInt()
  @IsPositive()
  paymentMethodId: number;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
