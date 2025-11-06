import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsNumberString,
} from 'class-validator';

export class EditReservationDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;

  @IsOptional()
  @IsNumberString()
  totalPrice?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  paymentStatusId?: number;

  @IsOptional()
  @IsNumberString()
  depositAmount?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
