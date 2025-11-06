import { IsInt, IsPositive, IsNumberString, IsOptional } from 'class-validator';

export class CreateInvoiceDto {
  @IsInt()
  @IsPositive()
  reservationId: number;

  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;
}
