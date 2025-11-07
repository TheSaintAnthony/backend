import {
  IsInt,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({
    description: 'ID of the property this room belongs to',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  propertyId: number;

  @ApiPropertyOptional({
    description: 'Room type ID (e.g., Single, Double, Suite)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  roomTypeId?: number;

  @ApiProperty({
    description: 'Room name',
    example: 'Ocean View Suite',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Room description',
    example: 'Beautiful suite with ocean view and modern amenities',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Number of beds in the room',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedCount?: number;

  @ApiPropertyOptional({
    description: 'Number of bathrooms in the room',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathroomCount?: number;

  @ApiPropertyOptional({
    description: 'Whether the room is available for booking',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
