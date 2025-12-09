import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateActivityCategoryDto {
  @ApiProperty({
    description: 'Name of the activity category',
    example: 'Outdoor',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
