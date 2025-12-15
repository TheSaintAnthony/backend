import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePromoCodeVisibilityDto {
  @ApiProperty({
    description: 'Whether the promo code should be visible to users',
    example: true,
  })
  @IsBoolean()
  isVisibleToUsers: boolean;
}
