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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAddressDto } from 'src/addresses/dto';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class CreateRestaurantDto {
  @ApiProperty({ description: 'Restaurant name', example: 'Restaurante do Mar' })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiPropertyOptional({
    description: 'Restaurant description',
    example: 'Fine dining restaurant specializing in seafood',
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ description: 'Restaurant address', type: CreateAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'contact@restaurant.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
  @ApiPropertyOptional({ description: 'Contact phone number', example: '+1234567890' })
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
    description: 'Opening hours (JSON string or text)',
    example: '{"monday": "12:00-22:00", "tuesday": "12:00-22:00"}',
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
    enum: ['€', '€€', '€€€'],
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
    description: 'Images for the restaurant',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
