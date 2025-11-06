import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class EditAddressDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  country: string;
}
