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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingRoomDto {
  @ApiProperty({ description: 'Room ID', example: 1 })
  @IsInt()
  @IsPositive()
  roomId: number;

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
  guestsCount: number;
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

  @ApiProperty({ description: 'Payment method ID', example: 1 })
  @IsInt()
  @IsPositive()
  paymentMethodId: number;

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
