import {
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
export class QuoteRoomDto {
  @ApiProperty({
    description: 'Room ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  roomId: string;
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
  @ApiPropertyOptional({
    description: 'Number of guests',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestsCount?: number;
  @ApiPropertyOptional({
    description: 'Number of rooms to book (quantity)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
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
    description: 'Promo code ID to apply discount',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  promoCodeId?: string;
}
