import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateLookupDto {
  @ApiProperty({
    description: 'Name of the lookup value',
    example: 'Wi-Fi',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
