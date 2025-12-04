import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EditAddressDto } from 'src/addresses/dto';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class EditResidenceDto {
  @ApiPropertyOptional({ description: 'Residence name', example: 'Ocean View Residences' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
  @ApiPropertyOptional({
    description: 'Short description',
    example: 'Luxury residences with ocean views',
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({
    description: 'Detailed information',
    example: 'Our premium residences offer...',
  })
  @IsOptional()
  @IsString()
  about?: string;
  @ApiPropertyOptional({
    description: 'Residence address',
    type: EditAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EditAddressDto)
  address?: EditAddressDto;
  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'info@residences.com',
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
    description: 'Images for the residence (replaces existing images)',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
