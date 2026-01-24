import { IsEnum, IsOptional, IsBoolean, IsObject, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '../schemas/subscription.schema';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    description: 'New subscription plan type',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PROFESSIONAL_MONTHLY,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  planType?: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'When to schedule the change (now, cycle_end, or timestamp)',
    example: 'now',
    default: 'now',
  })
  @IsOptional()
  @IsString()
  scheduleChangeAt?: string;

  @ApiPropertyOptional({
    description: 'Whether to notify customer of the change',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  customerNotify?: boolean;

  @ApiPropertyOptional({
    description: 'Additional notes for the update',
    example: { upgrade_reason: 'customer_requested', previous_plan: 'starter_monthly' },
  })
  @IsOptional()
  @IsObject()
  notes?: Record<string, any>;
}