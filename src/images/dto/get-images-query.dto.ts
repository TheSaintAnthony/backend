import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class GetImagesQueryDto {
  @ApiPropertyOptional({
    description: 'Entity type code to filter by',
    example: 'room',
  })
  @IsOptional()
  @IsString()
  entityTypeCode?: string;
  @ApiPropertyOptional({
    description: 'Entity ID to filter by',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;
  @ApiPropertyOptional({
    description: 'Filter by primary images only',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  primaryOnly?: boolean;
}
