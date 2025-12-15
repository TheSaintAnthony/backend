import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
  Length,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromoCodeDto {
  @ApiProperty({
    description: 'Name for the coupon/promo code',
    example: 'Summer Sale 2024',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'The promotional code users will enter',
    example: 'SUMMER2024',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  code: string;

  @ApiProperty({
    description: 'Type of discount',
    enum: ['percentage', 'fixed_amount'],
    example: 'percentage',
  })
  @IsEnum(['percentage', 'fixed_amount'])
  discountType: 'percentage' | 'fixed_amount';

  @ApiProperty({
    description:
      'Value of the discount (percentage 1-100 as integer, or fixed amount)',
    example: 15,
  })
  @IsNumber()
  @Min(1)
  @ValidateIf((o) => o.discountType === 'percentage')
  @IsInt({ message: 'Percentage discount must be an integer (1-100)' })
  @Max(100, { message: 'Percentage discount cannot exceed 100%' })
  discountValue: number;

  @ApiPropertyOptional({
    description: 'Currency for fixed amount discounts',
    example: 'EUR',
    default: 'EUR',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Maximum total redemptions allowed',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional({
    description: 'Maximum redemptions per user',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptionsPerUser?: number;

  @ApiPropertyOptional({
    description: 'Expiration date for the promo code',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Whether the promo code is visible to users in their account',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isVisibleToUsers?: boolean;

  @ApiPropertyOptional({
    description: 'List of product/room IDs this code is restricted to',
    example: ['room-id-1', 'room-id-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictedToProducts?: string[];
}
