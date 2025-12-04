import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateOccurrenceDto {
  @ApiProperty({
    description: 'Reservation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  reservationId: string;
  @ApiProperty({
    description: 'Occurrence description',
    example: 'Room service requested',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
  @ApiPropertyOptional({
    description: 'Occurrence status ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  statusId?: string;
}
