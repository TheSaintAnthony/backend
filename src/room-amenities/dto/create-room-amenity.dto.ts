import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomAmenityDto {
  @ApiProperty({
    description: 'Room ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  roomId: string;

  @ApiProperty({
    description: 'Amenity ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  amenityId: string;
}
