import {
  IsString,
  IsEmail,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EditAddressDto } from 'src/addresses/dto';

export class EditUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EditAddressDto)
  address: EditAddressDto;
}
