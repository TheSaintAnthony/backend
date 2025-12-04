import {
  IsNumberString,
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class EditPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  amount?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentStatusId?: string;
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
