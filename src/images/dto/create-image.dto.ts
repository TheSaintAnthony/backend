import {
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsUrl,
  MaxLength,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateImageDto {
  @ApiProperty({
    description: 'Entity type code (e.g., property, room, activity)',
    example: 'room',
  })
  @IsString()
  @IsNotEmpty()
  entityTypeCode: string;
  @ApiProperty({
    description: 'ID of the entity this image belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  entityId: string;
  @ApiProperty({
    description: 'URL of the image',
    example: 'https://example.com/image.jpg',
  })
  @IsUrl()
  @MaxLength(500)
  url: string;
  @ApiPropertyOptional({
    description: 'Alt text for accessibility and SEO',
    example: 'Spacious ocean view room with king size bed',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;
  @ApiPropertyOptional({
    description: 'Caption or description of the image',
    example: 'Main bedroom with panoramic ocean views',
  })
  @IsOptional()
  @IsString()
  caption?: string;
  @ApiPropertyOptional({
    description: 'Display order (lower number = displayed first)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
  @ApiPropertyOptional({
    description: 'Whether this is the primary/featured image',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
  @ApiPropertyOptional({
    description: 'Image width in pixels',
    example: 1920,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;
  @ApiPropertyOptional({
    description: 'Image height in pixels',
    example: 1080,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;
  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 524288,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;
  @ApiPropertyOptional({
    description: 'MIME type of the image',
    example: 'image/jpeg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mimeType?: string;
  @ApiPropertyOptional({
    description: 'Original filename',
    example: 'ocean-view-room.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFilename?: string;
  @ApiPropertyOptional({
    description: 'Storage provider (s3, cloudinary, etc.)',
    example: 's3',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  storageProvider?: string;
}
