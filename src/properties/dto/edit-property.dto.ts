import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
  IsArray,
  IsNumberString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EditAddressDto } from 'src/addresses/dto';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class EditPropertyDto {
  @ApiPropertyOptional({ description: 'Property name', example: 'Grand Hotel' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiPropertyOptional({
    description: 'Short description',
    example: 'Premier luxury hotel',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description: string;
  @ApiPropertyOptional({
    description: 'Detailed information',
    example: 'Our renovated hotel features...',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  about: string;
  @ApiPropertyOptional({
    description: 'Property address',
    type: EditAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EditAddressDto)
  address: EditAddressDto;
  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'info@grandhotel.com',
  })
  @IsOptional()
  @IsEmail()
  email: string;
  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
  @ApiPropertyOptional({
    description: 'Check-in time',
    example: '14:00',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  checkInTime: string;
  @ApiPropertyOptional({
    description: 'Check-out time',
    example: '12:00',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  checkOutTime: string;
  @ApiPropertyOptional({
    description: 'Tourism fee',
    example: '5.00',
  })
  @IsOptional()
  @IsNumberString()
  tourismFee?: string;
  @ApiPropertyOptional({
    description: 'Images for the property (replaces existing images)',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
