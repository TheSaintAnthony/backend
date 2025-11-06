import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsDateString,
} from 'class-validator';

export class CreateRoomPriceDto {
  @IsInt()
  @IsPositive()
  roomId: number;

  @IsNumberString()
  price: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
