import {
  IsString,
  IsEmail,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EditAddressDto } from 'src/addresses/dto';

export class EditUserDto {
  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: 'Address information',
    type: EditAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EditAddressDto)
  address: EditAddressDto;

  @ApiPropertyOptional({
    description: 'NIF / VAT number',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  nif?: string;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Corp',
  })
  @IsOptional()
  @IsString()
  companyName?: string;
}
