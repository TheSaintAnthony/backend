import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
export class GetMenusDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description: 'Filter by restaurant ID',
  })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}
