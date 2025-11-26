import { IsString, IsNotEmpty, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOccurrenceResponseDto {
  @ApiProperty({
    description: 'Occurrence ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  occurrenceId: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Thank you for reporting this issue. We will look into it.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Whether the response is from an admin',
    example: true,
  })
  @IsBoolean()
  isAdmin: boolean;
}
