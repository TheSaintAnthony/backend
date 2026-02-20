import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

export class UpdateContactDto {
  @ApiPropertyOptional({
    enum: ['pending', 'replied', 'archived'],
    example: 'replied',
  })
  @IsOptional()
  @IsIn(['pending', 'replied', 'archived'])
  status?: string;
}
