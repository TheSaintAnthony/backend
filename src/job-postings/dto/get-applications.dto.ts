import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetApplicationsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by job posting ID' })
  @IsOptional()
  @IsUUID()
  jobPostingId?: string;
}
