import {
  IsInt,
  IsPositive,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationRoomDto {
  @ApiProperty({ description: 'Room ID', example: 1 })
  @IsInt()
  @IsPositive()
  roomId: number;

  @ApiProperty({ description: 'Reservation ID', example: 1 })
  @IsInt()
  @IsPositive()
  reservationId: number;

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
}
