import { IsInt, IsPositive, IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditOccurrenceDto {
  @ApiPropertyOptional({
    description: 'Occurrence description',
    example: 'Issue resolved',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Occurrence status ID', example: 2 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  statusId?: number;
}
