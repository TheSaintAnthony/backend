import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLookupDto {
  @ApiProperty({
    description: 'Name of the lookup value',
    example: 'Wi-Fi',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

/** DTO for lookups with multi-language support (amenities, highlights, room types, etc.) */
export class CreateLookupWithTranslationsDto extends CreateLookupDto {
  @ApiPropertyOptional({ description: 'Name (English)' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Name (French)' })
  @IsOptional()
  @IsString()
  nameFr?: string;

  @ApiPropertyOptional({ description: 'Name (German)' })
  @IsOptional()
  @IsString()
  nameDe?: string;
}
