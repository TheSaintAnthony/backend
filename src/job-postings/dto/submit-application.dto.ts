import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class SubmitApplicationDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'joao@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+351 912 345 678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'Tenho X anos de experiência...' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: 'Rua A, Lisboa' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'licenciatura' })
  @IsOptional()
  @IsString()
  qualifications?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  hotelExperience?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  restaurantExperience?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  realEstateExperience?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  driverLicense?: boolean;

  @ApiPropertyOptional({ example: 'https://www.linkedin.com/in/joaosilva' })
  @IsOptional()
  @IsUrl()
  linkedinProfile?: string;
}
