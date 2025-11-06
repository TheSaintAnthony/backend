import { IsInt, IsDateString, IsOptional, Min } from 'class-validator';

export class EditReservationRoomDto {
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestsCount?: number;
}
