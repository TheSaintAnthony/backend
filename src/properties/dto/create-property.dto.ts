import { IsString, IsEmail, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateAddressDto } from 'src/addresses/dto';

export class CreatePropertyDto {
  @ApiProperty({ description: 'Property name', example: 'Grand Hotel' })
  @IsString()
  @IsNotEmpty()
  name: string;

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
}
