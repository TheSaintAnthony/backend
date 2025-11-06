import { IsInt, IsPositive, IsDateString } from 'class-validator';

export class CheckAvailabilityDto {
  @IsInt()
  @IsPositive()
  roomId: number;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;
}
