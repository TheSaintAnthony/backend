import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Length,
} from 'class-validator';

export class CreateJobPostingDto {
  @ApiProperty({ example: 'Rececionista' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  title: string;

  @ApiProperty({ example: 'Lisboa' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  location: string;

  @ApiProperty({ example: 'Full-time', enum: ['Full-time', 'Part-time'] })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Front Office' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  department: string;

  @ApiPropertyOptional({ example: 'Descrição do cargo...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
