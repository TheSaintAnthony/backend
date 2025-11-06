import {
  IsInt,
  IsPositive,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BookingRoomDto {
  @IsInt()
  @IsPositive()
  roomId: number;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestsCount?: number;
}

export class CreateBookingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookingRoomDto)
  rooms: BookingRoomDto[];

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsInt()
  @IsPositive()
  paymentMethodId: number;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
