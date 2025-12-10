import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class EditResidenceContactDto {
  @ApiPropertyOptional({
    description: 'Status',
    example: 'contacted',
    enum: ['pending', 'contacted', 'closed'],
  })
  @IsOptional()
  @IsIn(['pending', 'contacted', 'closed'])
  status?: string;
}
