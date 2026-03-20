import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportSubject {
  DISCRIMINATION_HARASSMENT = 'discrimination_harassment',
  SECURITY_VIOLATION = 'security_violation',
  FINANCIAL_MISCONDUCT = 'financial_misconduct',
  OTHER = 'other',
}

export enum Relationship {
  EMPLOYEE = 'employee',
  CLIENT = 'client',
  CANDIDATE = 'candidate',
  PARTNER = 'partner',
  SUPPLIER = 'supplier',
}

export class CreateReportDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isAnonymous: boolean;

  @ApiPropertyOptional({ example: 'João Silva' })
  @ValidateIf((o) => !o.isAnonymous)
  @IsString()
  @IsNotEmpty()
  reporterName?: string;

  @ApiPropertyOptional({ example: 'joao@example.com' })
  @ValidateIf((o) => !o.isAnonymous)
  @IsEmail()
  reporterEmail?: string;

  @ApiProperty({
    enum: ReportSubject,
    example: ReportSubject.DISCRIMINATION_HARASSMENT,
  })
  @IsEnum(ReportSubject)
  subject: ReportSubject;

  @ApiProperty({ enum: Relationship, example: Relationship.EMPLOYEE })
  @IsEnum(Relationship)
  relationship: Relationship;

  @ApiProperty({ example: '2025-02-15' })
  @IsString()
  @IsNotEmpty()
  occurrenceDate: string;

  @ApiProperty({ example: 'Descrição detalhada do relato...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  goodFaithDeclaration: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  dataConsentGiven: boolean;

  @ApiPropertyOptional({
    example: 'pt',
    enum: ['pt', 'en', 'fr', 'de'],
    description: 'User locale for email localization',
  })
  @IsOptional()
  @IsString()
  locale?: string;
}
