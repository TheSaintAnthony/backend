import { IsInt, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class EditReservationRoomDto {
  @ApiPropertyOptional({
    description: 'Check-in date (ISO 8601)',
    example: '2025-12-21',
  })
  @IsOptional()
  @IsDateString()
  checkIn?: string;
  @ApiPropertyOptional({
    description: 'Check-out date (ISO 8601)',
    example: '2025-12-26',
  })
  @IsOptional()
  @IsDateString()
  checkOut?: string;
  @ApiPropertyOptional({
    description: 'Number of guests',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestsCount?: number;
}
