import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumberString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class CreateResidenceUnitDto {
  @ApiProperty({
    description: 'ID of the residence this unit belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  residenceId: string;
  @ApiProperty({
    description: 'Unit name',
    example: 'T3 - Apartamento 201',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiPropertyOptional({
    description: 'Typology (T1, T2, T3, etc.)',
    example: 'T3',
  })
  @IsOptional()
  @IsString()
  typology?: string;
  @ApiProperty({
    description: 'Price in euros',
    example: '450000.00',
  })
  @IsNumberString()
  price: string;
  @ApiProperty({
    description: 'Area in square meters',
    example: '120.50',
  })
  @IsNumberString()
  area: string;
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
    default: 'available',
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
    description: 'Images for the unit',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
