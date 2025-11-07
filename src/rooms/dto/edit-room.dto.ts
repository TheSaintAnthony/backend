import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsBoolean,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditRoomDto {
  @ApiPropertyOptional({
    description: 'Room type ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  roomTypeId?: number;

  @ApiPropertyOptional({
    description: 'Room name',
    example: 'Premium Ocean View Suite',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Room description',
    example: 'Luxury suite with panoramic ocean views',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Number of beds',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedCount?: number;

  @ApiPropertyOptional({
    description: 'Number of bathrooms',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathroomCount?: number;

  @ApiPropertyOptional({
    description: 'Availability status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
