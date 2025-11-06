import {
  IsInt,
  IsPositive,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateReservationRoomDto {
  @IsInt()
  @IsPositive()
  roomId: number;

  @IsInt()
  @IsPositive()
  reservationId: number;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestsCount?: number;
}
