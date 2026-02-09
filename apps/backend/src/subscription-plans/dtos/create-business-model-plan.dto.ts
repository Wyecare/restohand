import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PlanType {
  PERIODIC = 'PERIODIC',
  ON_DEMAND = 'ON_DEMAND'
}

export enum IntervalType {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR'
}

export enum SubscriptionTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export class UsageLimitsDto {
  @ApiProperty({ description: 'Maximum branches allowed (-1 for unlimited)', example: 1 })
  @IsNumber()
  max_branches!: number;

  @ApiProperty({ description: 'Maximum tables allowed (-1 for unlimited)', example: 20 })
  @IsNumber()
  max_tables!: number;

  @ApiProperty({ description: 'Maximum staff allowed (-1 for unlimited)', example: 5 })
  @IsNumber()
  max_staff!: number;

  @ApiProperty({ description: 'Maximum menu items allowed (-1 for unlimited)', example: 75 })
  @IsNumber()
  max_menu_items!: number;

  @ApiProperty({ description: 'Maximum monthly orders (optional)', example: 1000, required: false })
  @IsOptional()
  @IsNumber()
  max_monthly_orders?: number;
}

export class PricingDto {
  @ApiProperty({ description: 'Base subscription fee in paisa', example: 99900 })
  @IsNumber()
  @Min(0)
  base_subscription_fee!: number;

  @ApiProperty({ description: 'Transaction fee percentage', example: 2.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  transaction_fee_percentage!: number;

  @ApiProperty({ description: 'Currency code', example: 'INR' })
  @IsString()
  currency!: string;
}

export class FeatureAccessDto {
  @ApiProperty({ description: 'QR menu ordering access', example: true })
  @IsBoolean()
  qr_menu_ordering!: boolean;

  @ApiProperty({ description: 'Digital receipts access', example: true })
  @IsBoolean()
  digital_receipts!: boolean;

  @ApiProperty({ description: 'Basic POS access', example: true })
  @IsBoolean()
  basic_pos!: boolean;

  @ApiProperty({ description: 'Order management access', example: true })
  @IsBoolean()
  order_management!: boolean;

  @ApiProperty({ description: 'Real-time analytics access', example: true })
  @IsBoolean()
  real_time_analytics!: boolean;

  @ApiProperty({ description: 'Advanced analytics access', example: false })
  @IsOptional()
  @IsBoolean()
  advanced_analytics?: boolean;

  @ApiProperty({ description: 'Customer CRM access', example: false })
  @IsOptional()
  @IsBoolean()
  customer_crm?: boolean;

  @ApiProperty({ description: 'Inventory management access', example: false })
  @IsOptional()
  @IsBoolean()
  inventory_management?: boolean;

  @ApiProperty({ description: 'Multi-location management access', example: false })
  @IsOptional()
  @IsBoolean()
  multi_location_management?: boolean;

  @ApiProperty({ description: 'Priority support access', example: false })
  @IsOptional()
  @IsBoolean()
  priority_support?: boolean;

  @ApiProperty({ description: 'Custom integrations access', example: false })
  @IsOptional()
  @IsBoolean()
  custom_integrations?: boolean;

  @ApiProperty({ description: 'API access', example: false })
  @IsOptional()
  @IsBoolean()
  api_access?: boolean;

  @ApiProperty({ description: 'White label options access', example: false })
  @IsOptional()
  @IsBoolean()
  white_label_options?: boolean;
}

export class TargetMarketDto {
  @ApiProperty({ description: 'Target market segment', example: 'Small cafes, QSRs, family restaurants' })
  @IsString()
  segment!: string;

  @ApiProperty({ description: 'Ideal business size', example: '40-60 seats' })
  @IsString()
  ideal_size!: string;

  @ApiProperty({ description: 'Use cases for this plan', example: ['QR-based self-ordering', 'Digital payment acceptance'] })
  @IsArray()
  @IsString({ each: true })
  use_cases!: string[];
}

export class CreateBusinessModelPlanDto {
  // Core Cashfree Plan Fields
  @ApiProperty({ description: 'Unique plan name/identifier', example: 'restohand_starter_monthly' })
  @IsString()
  plan_name!: string;

  @ApiProperty({ description: 'Plan type', enum: PlanType, example: PlanType.PERIODIC })
  @IsEnum(PlanType)
  plan_type!: PlanType;

  @ApiProperty({ description: 'Plan amount in paisa', example: 99900, minimum: 100 })
  @IsNumber()
  @Min(100)
  plan_amount!: number;

  @ApiProperty({ description: 'Maximum amount in paisa', example: 99900, minimum: 100 })
  @IsNumber()
  @Min(100)
  plan_max_amount!: number;

  @ApiProperty({ description: 'Maximum billing cycles', example: 12, minimum: 1, maximum: 999 })
  @IsNumber()
  @Min(1)
  @Max(999)
  plan_max_cycles!: number;

  @ApiProperty({ description: 'Number of intervals between charges', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  plan_intervals!: number;

  @ApiProperty({ description: 'Currency code', example: 'INR' })
  @IsString()
  plan_currency!: string;

  @ApiProperty({ description: 'Interval type for billing frequency', enum: IntervalType, example: IntervalType.MONTH })
  @IsEnum(IntervalType)
  plan_interval_type!: IntervalType;

  @ApiProperty({ description: 'Plan description/notes', required: false })
  @IsOptional()
  @IsString()
  plan_note?: string;

  // Business Model Fields
  @ApiProperty({ description: 'Subscription tier', enum: SubscriptionTier, example: SubscriptionTier.STARTER })
  @IsEnum(SubscriptionTier)
  tier!: SubscriptionTier;

  @ApiProperty({ description: 'Display name for the plan', example: 'Starter' })
  @IsString()
  display_name!: string;

  @ApiProperty({ description: 'Plan description', example: 'Perfect for small cafes and QSRs' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'List of features', example: ['qr_menu_ordering', 'digital_receipts'] })
  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @ApiProperty({ description: 'Whether this plan is marked as popular', example: false })
  @IsOptional()
  @IsBoolean()
  is_popular?: boolean;

  // Business Model Usage Limits
  @ApiProperty({ description: 'Usage limits for the plan', type: UsageLimitsDto })
  @ValidateNested()
  @Type(() => UsageLimitsDto)
  usage_limits!: UsageLimitsDto;

  // Business Model Pricing Structure
  @ApiProperty({ description: 'Pricing structure for the plan', type: PricingDto })
  @ValidateNested()
  @Type(() => PricingDto)
  pricing!: PricingDto;

  // Feature Gates per Plan
  @ApiProperty({ description: 'Feature access permissions', type: FeatureAccessDto })
  @ValidateNested()
  @Type(() => FeatureAccessDto)
  feature_access!: FeatureAccessDto;

  // Target Market Information
  @ApiProperty({ description: 'Target market information', type: TargetMarketDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetMarketDto)
  target_market?: TargetMarketDto;

  // Legacy compatibility
  @ApiProperty({
    description: 'Legacy metadata for backward compatibility',
    required: false,
    example: {
      tier: 'starter',
      features: 'qr_menu_ordering,digital_receipts',
      display_name: 'Starter',
      is_popular: false
    }
  })
  @IsOptional()
  @IsObject()
  plan_metadata?: Record<string, any>;
}