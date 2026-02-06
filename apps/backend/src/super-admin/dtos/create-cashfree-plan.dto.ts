import { IsString, IsNumber, IsEnum, IsOptional, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CashfreePlanType {
  PERIODIC = 'PERIODIC',
  ON_DEMAND = 'ON_DEMAND'
}

export enum CashfreeIntervalType {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR'
}

export class CreateCashfreePlanDto {
  @ApiProperty({
    description: 'Unique plan name/identifier',
    example: 'restohand_professional_monthly'
  })
  @IsString()
  plan_name!: string;

  @ApiProperty({
    description: 'Plan type - PERIODIC for subscription billing',
    enum: CashfreePlanType,
    example: CashfreePlanType.PERIODIC
  })
  @IsEnum(CashfreePlanType)
  plan_type!: CashfreePlanType;

  @ApiProperty({
    description: 'Plan amount in smallest currency unit (paise for INR)',
    example: 99900,
    minimum: 100
  })
  @IsNumber()
  @Min(100)
  plan_amount!: number;

  @ApiProperty({
    description: 'Maximum amount that can be charged (for variable billing)',
    example: 99900,
    minimum: 100
  })
  @IsNumber()
  @Min(100)
  plan_max_amount!: number;

  @ApiProperty({
    description: 'Maximum number of billing cycles',
    example: 12,
    minimum: 1,
    maximum: 999
  })
  @IsNumber()
  @Min(1)
  @Max(999)
  plan_max_cycles!: number;

  @ApiProperty({
    description: 'Number of intervals between charges',
    example: 1,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  plan_intervals!: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'INR'
  })
  @IsString()
  plan_currency!: string;

  @ApiProperty({
    description: 'Interval type for billing frequency',
    enum: CashfreeIntervalType,
    example: CashfreeIntervalType.MONTH
  })
  @IsEnum(CashfreeIntervalType)
  plan_interval_type!: CashfreeIntervalType;

  @ApiProperty({
    description: 'Plan description/notes',
    example: 'Professional plan with monthly billing at ₹999',
    required: false
  })
  @IsOptional()
  @IsString()
  plan_note?: string;

  @ApiProperty({
    description: 'Additional metadata for plan categorization',
    example: {
      tier: 'professional',
      features: 'unlimited_locations,analytics,priority_support',
      display_name: 'Professional Plan',
      is_popular: true
    },
    required: false
  })
  @IsOptional()
  @IsObject()
  plan_metadata?: Record<string, any>;
}