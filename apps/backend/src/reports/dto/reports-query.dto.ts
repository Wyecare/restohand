import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export enum ReportsPeriod {
  TODAY = 'today',
  WEEK = '7d',
  MONTH = '30d',
  QUARTER = '3m',
  YEAR = '1y',
}

export class ReportsQueryDto {
  @ApiPropertyOptional({
    description: 'Branch ID to filter data',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Predefined period',
    enum: ReportsPeriod,
    default: ReportsPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(ReportsPeriod)
  period?: ReportsPeriod;

  @ApiPropertyOptional({
    description: 'Custom start date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}