import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomHighlightDto {
  @ApiProperty({ description: 'Room ID', example: 1 })
  @IsInt()
  @IsPositive()
  roomId: number;

  @ApiProperty({ description: 'Highlight ID', example: 1 })
  @IsInt()
  @IsPositive()
  highlightId: number;
}
