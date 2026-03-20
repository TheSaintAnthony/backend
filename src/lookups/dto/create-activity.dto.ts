import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumberString,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class CreateActivityDto {
  @ApiProperty({
    description: 'Activity name',
    example: 'Spa Treatment',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiProperty({
    description: 'Activity description',
    example: 'Relaxing spa treatment with aromatherapy',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
  @ApiProperty({
    description: 'Activity category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  categoryId: string;
  @ApiProperty({
    description: 'Activity price',
    example: '50.00',
  })
  @IsNumberString()
  price: string;
  @ApiProperty({
    description: 'Activity duration',
    example: '60 minutes',
  })
  @IsString()
  @IsNotEmpty()
  duration: string;
  @ApiPropertyOptional({
    description: 'Maximum number of guests',
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;
  @ApiPropertyOptional({
    description: 'Images for the activity',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
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
  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;
  @ApiPropertyOptional({ description: 'Description in French' })
  @IsOptional()
  @IsString()
  descriptionFr?: string;
  @ApiPropertyOptional({ description: 'Description in German' })
  @IsOptional()
  @IsString()
  descriptionDe?: string;
}
