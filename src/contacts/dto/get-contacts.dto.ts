import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetContactsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['pending', 'replied', 'archived'],
    example: 'pending',
  })
  @IsOptional()
  @IsIn(['pending', 'replied', 'archived'])
  status?: string;
}
