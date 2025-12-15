import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
  IsArray,
  IsInt,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EditAddressDto } from 'src/addresses/dto';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class EditRestaurantDto {
  @ApiPropertyOptional({
    description: 'Restaurant name',
    example: 'Restaurante do Mar',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
  @ApiPropertyOptional({
    description: 'Restaurant description',
    example: 'Fine dining restaurant specializing in seafood',
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({
    description: 'Restaurant address',
    type: EditAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EditAddressDto)
  address?: EditAddressDto;
  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'info@restaurant.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://www.restaurant.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;
  @ApiPropertyOptional({
    description: 'Opening hours',
    example: '{"monday": "12:00-22:00"}',
  })
  @IsOptional()
  @IsString()
  openingHours?: string;
  @ApiPropertyOptional({
    description: 'Cuisine type',
    example: 'Mediterranean',
  })
  @IsOptional()
  @IsString()
  cuisineType?: string;
  @ApiPropertyOptional({
    description: 'Price range',
    example: '€€',
  })
  @IsOptional()
  @IsString()
  priceRange?: string;
  @ApiPropertyOptional({
    description: 'Restaurant capacity',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
  @ApiPropertyOptional({
    description: 'Images for the restaurant (replaces existing images)',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
