import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateActivityPropertyDto {
  @ApiProperty({ description: 'Activity ID', example: 1 })
  @IsInt()
  @IsPositive()
  activityId: number;

  @ApiProperty({ description: 'Property ID', example: 1 })
  @IsInt()
  @IsPositive()
  propertyId: number;
}
