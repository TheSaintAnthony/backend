import {
  IsString,
  IsEmail,
  IsNotEmpty,
  ValidateNested,
  IsArray,
  IsOptional,
  IsNumberString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAddressDto } from 'src/addresses/dto';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class CreatePropertyDto {
  @ApiProperty({ description: 'Property name', example: 'Grand Hotel' })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiPropertyOptional({ description: 'Property name (English)' })
  @IsOptional()
  @IsString()
  nameEn?: string;
  @ApiPropertyOptional({ description: 'Property name (French)' })
  @IsOptional()
  @IsString()
  nameFr?: string;
  @ApiPropertyOptional({ description: 'Property name (German)' })
  @IsOptional()
  @IsString()
  nameDe?: string;
  @ApiProperty({
    description: 'Short description',
    example: 'Luxury hotel in the heart of the city',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
  @ApiProperty({
    description: 'Detailed information about the property',
    example: 'Our hotel offers world-class amenities...',
  })
  @IsString()
  @IsNotEmpty()
  about: string;
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
  @ApiProperty({ description: 'Property address', type: CreateAddressDto })
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;
  @ApiProperty({
    description: 'Contact email',
    example: 'contact@grandhotel.com',
  })
  @IsEmail()
  email: string;
  @ApiProperty({ description: 'Contact phone number', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
  @ApiProperty({
    description: 'Check-in time',
    example: '15:00',
  })
  @IsString()
  @IsNotEmpty()
  checkInTime: string;
  @ApiProperty({
    description: 'Check-out time',
    example: '11:00',
  })
  @IsString()
  @IsNotEmpty()
  checkOutTime: string;
  @ApiProperty({
    description: 'Tourism fee',
    example: '5.00',
  })
  @IsNumberString()
  tourismFee: string;
  @ApiPropertyOptional({
    description: 'Arrival instructions for guests',
    example: 'Park in the underground garage. The entrance code is 1234.',
  })
  @IsOptional()
  @IsString()
  arrivalInstructions?: string;
  @ApiPropertyOptional({ description: 'Arrival instructions (English)' })
  @IsOptional()
  @IsString()
  arrivalInstructionsEn?: string;
  @ApiPropertyOptional({ description: 'Arrival instructions (French)' })
  @IsOptional()
  @IsString()
  arrivalInstructionsFr?: string;
  @ApiPropertyOptional({ description: 'Arrival instructions (German)' })
  @IsOptional()
  @IsString()
  arrivalInstructionsDe?: string;
  @ApiPropertyOptional({
    description: 'Images for the property',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
