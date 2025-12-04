import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class EditRestaurantMenuDto {
  @ApiPropertyOptional({
    description: 'Menu name',
    example: 'Menu Almoço',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
  @ApiPropertyOptional({
    description: 'Menu description',
    example: 'Our lunch menu featuring fresh local ingredients',
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({
    description: 'Whether the menu is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional({
    description: 'Display order',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
  @ApiPropertyOptional({
    description: 'Images for the menu (replaces existing images)',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
