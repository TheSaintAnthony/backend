import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
export class GetResidenceUnitsDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description: 'Filter by residence ID',
  })
  @IsOptional()
  @IsUUID()
  residenceId?: string;
}
