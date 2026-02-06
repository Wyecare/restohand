import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  Max,
  Length,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlanType {
  PERIODIC = 'PERIODIC',
  ON_DEMAND = 'ON_DEMAND',
}

export enum PlanIntervalType {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export class CreateSubscriptionPlanDto {
  @ApiProperty({
    description: 'Unique ID to identify the plan. Only alpha-numerics, dot, hyphen and underscore allowed.',
    example: 'restohand_professional_monthly',
    minLength: 1,
    maxLength: 40,
  })
  @IsString()
  @Length(1, 40)
  plan_id: string;

  @ApiProperty({
    description: 'Name of the plan',
    example: 'Professional Monthly Plan',
    minLength: 1,
    maxLength: 40,
  })
  @IsString()
  @Length(1, 40)
  plan_name: string;

  @ApiProperty({
    description: 'Type of the plan',
    enum: PlanType,
    example: PlanType.PERIODIC,
  })
  @IsEnum(PlanType)
  plan_type: PlanType;

  @ApiProperty({
    description: 'Maximum amount for the plan',
    example: 99900,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  plan_max_amount: number;

  @ApiPropertyOptional({
    description: 'Currency of the plan',
    example: 'INR',
    default: 'INR',
  })
  @IsOptional()
  @IsString()
  plan_currency?: string = 'INR';

  @ApiPropertyOptional({
    description: 'Recurring amount for the plan. Required for PERIODIC plan_type.',
    example: 99900,
    minimum: 1,
  })
  @ValidateIf((o) => o.plan_type === PlanType.PERIODIC)
  @IsNumber()
  @Min(1)
  plan_recurring_amount?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of payment cycles for the plan',
    example: 12,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  plan_max_cycles?: number;

  @ApiPropertyOptional({
    description: 'Number of billing cycles between charges. Required for PERIODIC plan_type.',
    example: 1,
    minimum: 1,
  })
  @ValidateIf((o) => o.plan_type === PlanType.PERIODIC)
  @IsNumber()
  @Min(1)
  plan_intervals?: number;

  @ApiPropertyOptional({
    description: 'Interval type for the plan',
    enum: PlanIntervalType,
    example: PlanIntervalType.MONTH,
  })
  @ValidateIf((o) => o.plan_type === PlanType.PERIODIC)
  @IsEnum(PlanIntervalType)
  plan_interval_type?: PlanIntervalType;

  @ApiPropertyOptional({
    description: 'Note for the plan',
    example: 'Professional plan with monthly billing',
  })
  @IsOptional()
  @IsString()
  plan_note?: string;

  // Our custom business fields
  @ApiPropertyOptional({
    description: 'Plan tier category',
    example: 'professional',
  })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional({
    description: 'Display name for the plan in UI',
    example: 'Professional Plan',
  })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({
    description: 'Description of the plan',
    example: 'Best for growing restaurants with advanced features',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'List of features included in the plan',
    example: ['unlimited_orders', 'analytics', 'inventory_management'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    description: 'Mark as popular plan',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_popular?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the plan',
    example: { max_locations: 10, max_staff: 25 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}