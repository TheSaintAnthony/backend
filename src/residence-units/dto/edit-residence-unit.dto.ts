import {
  IsInt,
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumberString,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class EditResidenceUnitDto {
  @ApiPropertyOptional({
    description: 'Residence ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  residenceId?: string;
  @ApiPropertyOptional({
    description: 'Unit name',
    example: 'T3 - Apartamento 201',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
  @ApiPropertyOptional({
    description: 'Typology',
    example: 'T3',
  })
  @IsOptional()
  @IsString()
  typology?: string;
  @ApiPropertyOptional({
    description: 'Price in euros',
    example: '450000.00',
  })
  @IsOptional()
  @IsNumberString()
  price?: string;
  @ApiPropertyOptional({
    description: 'Area in square meters',
    example: '120.50',
  })
  @IsOptional()
  @IsNumberString()
  area?: string;
  @ApiPropertyOptional({
    description: 'Floor number',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  floor?: number;
  @ApiPropertyOptional({
    description: 'Status',
    example: 'available',
    enum: ['available', 'reserved', 'sold'],
  })
  @IsOptional()
  @IsIn(['available', 'reserved', 'sold'])
  status?: string;
  @ApiPropertyOptional({
    description: 'Unit description',
    example: 'Beautiful apartment with ocean view',
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({
    description: 'Number of bedrooms',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  bedroomCount?: number;
  @ApiPropertyOptional({
    description: 'Number of bathrooms',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  bathroomCount?: number;
  @ApiPropertyOptional({
    description: 'Images for the unit (replaces existing images)',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
