import { IsInt, IsPositive } from 'class-validator';

export class CreateRoomAmenityDto {
  @IsInt()
  @IsPositive()
  roomId: number;

  @IsInt()
  @IsPositive()
  amenityId: number;
}
