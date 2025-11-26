import { IsDateString, IsUUID, IsOptional, IsArray, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiPropertyOptional({
    description: 'Room ID to check (for single room check)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ValidateIf((o) => !o.roomIds || o.roomIds.length === 0)
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({
    description: 'Array of room IDs to check (for batch check)',
    example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @ValidateIf((o) => !o.roomId)
  @IsArray()
  @IsUUID(undefined, { each: true })
  roomIds?: string[];

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
