import {
  IsInt,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateOccurrenceDto {
  @IsInt()
  @IsPositive()
  reservationId: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;
}
