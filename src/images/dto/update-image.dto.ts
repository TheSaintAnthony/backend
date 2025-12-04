import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class UpdateImageDto {
  @ApiPropertyOptional({
    description: 'URL of the image',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  url?: string;
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
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
  @ApiPropertyOptional({
    description: 'Whether this is the primary/featured image',
    example: true,
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
