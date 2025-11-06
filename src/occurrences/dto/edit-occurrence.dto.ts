import { IsInt, IsPositive, IsString, IsOptional } from 'class-validator';

export class EditOccurrenceDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;
}
