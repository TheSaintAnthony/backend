import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAddressDto } from 'src/addresses/dto';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class CreateResidenceDto {
  @ApiProperty({
    description: 'Residence name',
    example: 'Ocean View Residences',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiPropertyOptional({ description: 'Residence name (English)' })
  @IsOptional()
  @IsString()
  nameEn?: string;
  @ApiPropertyOptional({ description: 'Residence name (French)' })
  @IsOptional()
  @IsString()
  nameFr?: string;
  @ApiPropertyOptional({ description: 'Residence name (German)' })
  @IsOptional()
  @IsString()
  nameDe?: string;
  @ApiPropertyOptional({
    description: 'Short description',
    example: 'Luxury residences with ocean views',
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({
    description: 'Detailed information about the residence',
    example: 'Our premium residences offer...',
  })
  @IsOptional()
  @IsString()
  about?: string;
  @ApiPropertyOptional({ description: 'Short description (English)' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;
  @ApiPropertyOptional({ description: 'Short description (French)' })
  @IsOptional()
  @IsString()
  descriptionFr?: string;
  @ApiPropertyOptional({ description: 'Short description (German)' })
  @IsOptional()
  @IsString()
  descriptionDe?: string;
  @ApiPropertyOptional({ description: 'Detailed information (English)' })
  @IsOptional()
  @IsString()
  aboutEn?: string;
  @ApiPropertyOptional({ description: 'Detailed information (French)' })
  @IsOptional()
  @IsString()
  aboutFr?: string;
  @ApiPropertyOptional({ description: 'Detailed information (German)' })
  @IsOptional()
  @IsString()
  aboutDe?: string;
  @ApiPropertyOptional({
    description: 'Residence address',
    type: CreateAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'contact@residences.com',
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
    description: 'Images for the residence',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
