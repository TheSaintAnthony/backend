import {
  IsInt,
  IsPositive,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  Min,
  ArrayMinSize,
  IsNotEmpty,
  IsObject,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingRoomDto {
  @ApiProperty({ description: 'Room ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  roomId: string;

  @ApiProperty({
    description: 'Check-in date (ISO 8601)',
    example: '2025-12-20',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    description: 'Check-out date (ISO 8601)',
    example: '2025-12-25',
  })
  @IsDateString()
  checkOut: string;

  @ApiPropertyOptional({
    description: 'Number of guests',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  guestsCount: string;
}

export class CreateBookingDto {
  @ApiProperty({
    description: 'List of rooms to book',
    type: [BookingRoomDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookingRoomDto)
  rooms: BookingRoomDto[];

  @ApiPropertyOptional({
    description: 'Special requests or notes',
    example: 'Late check-in required',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({ description: 'Payment method ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  paymentMethodId: string;

  @ApiPropertyOptional({
    description: 'Payment transaction ID',
    example: 'txn_123456',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Payment-specific metadata (e.g., phoneNumber for MB Way)',
    example: { phoneNumber: '+351912345678' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
