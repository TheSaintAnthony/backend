import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingRoomDto } from './create-booking.dto';

export class UpdateReservationRoomDto {
  @ApiPropertyOptional({
    description: 'Check-in date (ISO 8601)',
    example: '2025-12-20',
  })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({
    description: 'Check-out date (ISO 8601)',
    example: '2025-12-25',
  })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({
    description: 'Number of guests',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestsCount?: number;
}

export class UpdateReservationDto {
  @ApiPropertyOptional({
    description: 'Special requests or notes',
    example: 'Late check-in required',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({
    description: 'Update reservation rooms (check-in, check-out, guests)',
    type: [UpdateReservationRoomDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReservationRoomDto)
  rooms?: UpdateReservationRoomDto[];
}

