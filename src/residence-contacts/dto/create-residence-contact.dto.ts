import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateResidenceContactDto {
  @ApiPropertyOptional({
    description: 'ID of the residence',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  residenceId?: string;
  @ApiPropertyOptional({
    description: 'ID of the specific residence unit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  residenceUnitId?: string;
  @ApiProperty({
    description: 'Contact name',
    example: 'João Silva',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiProperty({
    description: 'Contact email',
    example: 'joao@example.com',
  })
  @IsEmail()
  email: string;
  @ApiPropertyOptional({
    description: 'Contact phone',
    example: '+351 912 345 678',
  })
  @IsOptional()
  @IsString()
  phone?: string;
  @ApiPropertyOptional({
    description: 'Message from the contact',
    example: 'I am interested in this property...',
  })
  @IsOptional()
  @IsString()
  message?: string;
}
