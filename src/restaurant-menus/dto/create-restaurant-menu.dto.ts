import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class CreateRestaurantMenuDto {
  @ApiProperty({
    description: 'ID of the restaurant this menu belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  restaurantId: string;
  @ApiProperty({
    description: 'Menu name',
    example: 'Menu Almoço',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiPropertyOptional({
    description: 'Menu description',
    example: 'Our lunch menu featuring fresh local ingredients',
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ description: 'Menu name (English)' })
  @IsOptional()
  @IsString()
  nameEn?: string;
  @ApiPropertyOptional({ description: 'Menu name (French)' })
  @IsOptional()
  @IsString()
  nameFr?: string;
  @ApiPropertyOptional({ description: 'Menu name (German)' })
  @IsOptional()
  @IsString()
  nameDe?: string;
  @ApiPropertyOptional({ description: 'Menu description (English)' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;
  @ApiPropertyOptional({ description: 'Menu description (French)' })
  @IsOptional()
  @IsString()
  descriptionFr?: string;
  @ApiPropertyOptional({ description: 'Menu description (German)' })
  @IsOptional()
  @IsString()
  descriptionDe?: string;
  @ApiPropertyOptional({
    description: 'Whether the menu is active',
    example: true,
    default: true,
  })
  @IsOptional()
  isActive?: boolean;
  @ApiPropertyOptional({
    description: 'Display order',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
  @ApiPropertyOptional({
    description: 'Images for the menu',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
