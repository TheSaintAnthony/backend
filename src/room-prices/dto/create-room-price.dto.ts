import {
  IsInt,
  IsPositive,
  IsNumberString,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomPriceDto {
  @ApiProperty({ description: 'Room ID', example: 1 })
  @IsInt()
  @IsPositive()
  roomId: number;

  @ApiProperty({ description: 'Price per night', example: '150.00' })
  @IsNumberString()
  price: string;

  @ApiProperty({
    description: 'Price start date (ISO 8601)',
    example: '2025-12-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Price end date (ISO 8601)',
    example: '2025-12-31',
  })
  @IsDateString()
  endDate: string;
}
