import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class EditAddressDto {
  @ApiPropertyOptional({
    description: 'Street address',
    example: '456 Oak Ave',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  street: string;
  @ApiPropertyOptional({ description: 'City name', example: 'Los Angeles' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city: string;
  @ApiPropertyOptional({ description: 'Postal/ZIP code', example: '90001' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  zipCode: string;
  @ApiPropertyOptional({ description: 'Country name', example: 'USA' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  country: string;
}
