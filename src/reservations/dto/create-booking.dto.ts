import {
  IsInt,
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
  @ApiProperty({
    description: 'Room ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
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

  @ApiPropertyOptional({
    description: 'Number of rooms to book (quantity)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
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

  @ApiPropertyOptional({
    description: 'Custom invoice data (overrides user profile data)',
    type: 'object',
    properties: {
      customerName: { type: 'string' },
      customerEmail: { type: 'string' },
      customerPhone: { type: 'string' },
      customerAddress: { type: 'string' },
      customerCity: { type: 'string' },
      customerZipCode: { type: 'string' },
      customerCountry: { type: 'string' },
      customerTaxId: { type: 'string' },
      customerCompanyName: { type: 'string' },
    },
  })
  @IsOptional()
  @IsObject()
  invoiceData?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerCity?: string;
    customerZipCode?: string;
    customerCountry?: string;
    customerTaxId?: string;
    customerCompanyName?: string;
  };
}
