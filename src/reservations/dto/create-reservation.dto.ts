import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsNumberString,
} from 'class-validator';

export class CreateReservationDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;

  @IsNumberString()
  totalPrice: string;

  @IsInt()
  @IsPositive()
  paymentStatusId: number;

  @IsOptional()
  @IsNumberString()
  depositAmount?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
