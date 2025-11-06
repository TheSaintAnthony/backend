import { IsString, IsEmail, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAddressDto } from 'src/addresses/dto';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  about: string;

  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  checkInTime: string;

  @IsString()
  @IsNotEmpty()
  checkOutTime: string;
}
