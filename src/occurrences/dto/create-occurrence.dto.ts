import {
  IsInt,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOccurrenceDto {
  @ApiProperty({ description: 'Reservation ID', example: 1 })
  @IsInt()
  @IsPositive()
  reservationId: number;

  @ApiProperty({
    description: 'Occurrence description',
    example: 'Room service requested',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Occurrence status ID', example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;
}
