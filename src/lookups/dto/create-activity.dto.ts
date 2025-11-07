import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateActivityDto {
  @ApiProperty({
    description: 'Activity name',
    example: 'Spa Treatment',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Activity description',
    example: 'Relaxing spa treatment with aromatherapy',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}
