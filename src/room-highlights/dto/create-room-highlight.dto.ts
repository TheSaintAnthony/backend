import { IsInt, IsPositive } from 'class-validator';

export class CreateRoomHighlightDto {
  @IsInt()
  @IsPositive()
  roomId: number;

  @IsInt()
  @IsPositive()
  highlightId: number;
}
