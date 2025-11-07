import { IsOptional, IsNumberString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditRoomPriceDto {
  @ApiPropertyOptional({ description: 'Price per night', example: '175.00' })
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiPropertyOptional({
    description: 'Price start date (ISO 8601)',
    example: '2025-12-15',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Price end date (ISO 8601)',
    example: '2026-01-15',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
