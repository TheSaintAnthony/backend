import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateMenuCategoryDto {
  @ApiProperty({
    description: 'Name of the menu category',
    example: 'Appetizers',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Display order for sorting',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Name in English' })
  @IsOptional()
  @IsString()
  nameEn?: string;
  @ApiPropertyOptional({ description: 'Name in French' })
  @IsOptional()
  @IsString()
  nameFr?: string;
  @ApiPropertyOptional({ description: 'Name in German' })
  @IsOptional()
  @IsString()
  nameDe?: string;
}
