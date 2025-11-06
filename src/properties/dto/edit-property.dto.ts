import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EditAddressDto } from 'src/addresses/dto';

export class EditPropertyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  about: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EditAddressDto)
  address: EditAddressDto;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  checkInTime: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  checkOutTime: string;
}
