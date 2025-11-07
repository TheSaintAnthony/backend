import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomAmenityDto {
  @ApiProperty({ description: 'Room ID', example: 1 })
  @IsInt()
  @IsPositive()
  roomId: number;

  @ApiProperty({ description: 'Amenity ID', example: 1 })
  @IsInt()
  @IsPositive()
  amenityId: number;
}
