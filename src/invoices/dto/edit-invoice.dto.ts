import { IsInt, IsPositive, IsNumberString, IsOptional } from 'class-validator';

export class EditInvoiceDto {
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;
}
