import { IsOptional, IsNumberString, IsDateString } from 'class-validator';

export class EditRoomPriceDto {
  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
