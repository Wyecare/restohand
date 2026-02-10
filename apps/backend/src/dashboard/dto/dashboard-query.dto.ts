import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DashboardPeriod {
  TODAY = 'today',
  WEEK = '7d',
  MONTH = '30d',
  QUARTER = '3m',
  YEAR = '1y',
}

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Branch ID to filter metrics by',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Predefined time period',
    enum: DashboardPeriod,
    example: DashboardPeriod.TODAY,
  })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod;

  @ApiPropertyOptional({
    description: 'Custom start date (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}