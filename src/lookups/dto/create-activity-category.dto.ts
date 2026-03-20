import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateActivityCategoryDto {
  @ApiProperty({
    description: 'Name of the activity category',
    example: 'Outdoor',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiPropertyOptional({ description: 'Name in English' })
  @IsOptional()
  @IsString()
  nameEn?: string;
  @ApiPropertyOptional({ description: 'Name in French' })
  @IsOptional()
  @IsString()
  nameFr?: string;
  @ApiPropertyOptional({ description: 'Name in German' })
  @IsOptional()
  @IsString()
  nameDe?: string;
}
