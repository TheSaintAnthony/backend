import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'joao@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+351 912 345 678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Informações sobre reservas' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'Gostaria de saber mais...' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
