import {
  IsInt,
  IsPositive,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteRoomDto {
  @IsInt()
  @IsPositive()
  roomId: number;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;
}

export class GetPriceQuoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteRoomDto)
  rooms: QuoteRoomDto[];
}
