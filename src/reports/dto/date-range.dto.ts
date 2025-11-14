import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum GroupByPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(GroupByPeriod)
  groupBy?: GroupByPeriod;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomTypeId?: number;
}

