import { IsInt, IsPositive, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiProperty({ description: 'Room ID to check', example: 1 })
  @IsInt()
  @IsPositive()
  roomId: number;

  @ApiProperty({
    description: 'Check-in date (ISO 8601 format)',
    example: '2025-12-20',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    description: 'Check-out date (ISO 8601 format)',
    example: '2025-12-25',
  })
  @IsDateString()
  checkOut: string;
}
