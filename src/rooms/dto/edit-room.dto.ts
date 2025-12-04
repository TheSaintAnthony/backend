import {
  IsInt,
  IsString,
  IsOptional,
  IsBoolean,
  Min,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NestedImageDto } from 'src/images/dto/nested-image.dto';
export class EditRoomDto {
  @ApiPropertyOptional({
    description: 'Room type ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;
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
    description: 'Number of identical rooms available (quantity)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
  @ApiPropertyOptional({
    description: 'Availability status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
  @ApiPropertyOptional({
    description: 'Property ID',
    example: '34093nv',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  propertyId?: string;
  @ApiPropertyOptional({
    description: 'Images for the room (replaces existing images)',
    type: [NestedImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedImageDto)
  images?: NestedImageDto[];
}
