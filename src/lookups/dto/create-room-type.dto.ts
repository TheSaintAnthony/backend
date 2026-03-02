import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateRoomTypeDto {
  @ApiProperty({
    description: 'Room type name',
    example: 'Deluxe Suite',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiProperty({
    description: 'Maximum capacity for this room type',
    example: 4,
  })
  @IsInt()
  @IsPositive()
  maxCapacity: number;
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
