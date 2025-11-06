import { IsInt, IsPositive } from 'class-validator';

export class CreateActivityPropertyDto {
  @IsInt()
  @IsPositive()
  activityId: number;

  @IsInt()
  @IsPositive()
  propertyId: number;
}
