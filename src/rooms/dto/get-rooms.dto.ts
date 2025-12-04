import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
export class GetRoomsDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description: 'Filter by property ID',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}
