import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
export class GetMenuItemsDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description: 'Filter by menu ID',
  })
  @IsOptional()
  @IsUUID()
  menuId?: string;
}
