import { IsString, IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateRoomTypeDto {
  @ApiProperty({
    description: 'Room type name',
    example: 'Deluxe Suite',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiProperty({
    description: 'Maximum capacity for this room type',
    example: 4,
  })
  @IsInt()
  @IsPositive()
  maxCapacity: number;
}
