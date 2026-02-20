import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
}

export class UpdateReportDto {
  @ApiPropertyOptional({ enum: ReportStatus, example: 'reviewed' })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: string;
}
