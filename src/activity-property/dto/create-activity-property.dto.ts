import { IsInt, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateActivityPropertyDto {
  @ApiProperty({ description: 'Activity ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  activityId: string;

  @ApiProperty({ description: 'Property ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  propertyId: string;
}
