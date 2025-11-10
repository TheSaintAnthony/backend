import {
  IsInt,
  IsPositive,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteRoomDto {
  @ApiProperty({ description: 'Room ID', example: 1 })
  @IsInt()
  @IsPositive()
  roomId: number;

  @ApiProperty({
    description: 'Check-in date (ISO 8601)',
    example: '2025-12-20',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    description: 'Check-out date (ISO 8601)',
    example: '2025-12-25',
  })
  @IsDateString()
  checkOut: string;
}

export class GetPriceQuoteDto {
  @ApiProperty({
    description: 'List of rooms to get price quotes for',
    type: [QuoteRoomDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteRoomDto)
  rooms: QuoteRoomDto[];

  @ApiPropertyOptional({
    description: 'Whether to create holds for available rooms (default: true)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  createHolds?: boolean;
}
