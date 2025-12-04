import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsInt,
  IsNumberString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class EditMenuItemDto {
  @ApiPropertyOptional({
    description: 'Item name',
    example: 'Bacalhau à Brás',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
  @ApiPropertyOptional({
    description: 'Item description',
    example: 'Traditional Portuguese cod dish with eggs and potatoes',
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({
    description: 'Item price in euros',
    example: '18.50',
  })
  @IsOptional()
  @IsNumberString()
  price?: string;
  @ApiPropertyOptional({
    description: 'Item category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @ApiPropertyOptional({
    description: 'Display order',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
