import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional, IsUUID, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetResidenceContactsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by residence ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  residenceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by residence unit ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  residenceUnitId?: string;

  @ApiPropertyOptional({
    description: 'Filter by contact status',
    enum: ['pending', 'contacted', 'closed'],
    example: 'pending',
  })
  @IsOptional()
  @IsIn(['pending', 'contacted', 'closed'])
  status?: string;
}
