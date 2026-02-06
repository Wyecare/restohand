import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCashfreePlanDto {
  @ApiProperty({
    description: 'Updated plan amount in smallest currency unit (paise for INR)',
    example: 119900,
    minimum: 100,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  plan_amount?: number;

  @ApiProperty({
    description: 'Updated maximum amount that can be charged',
    example: 119900,
    minimum: 100,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  plan_max_amount?: number;

  @ApiProperty({
    description: 'Updated plan description/notes',
    example: 'Professional plan with monthly billing at ₹1199 (updated)',
    required: false
  })
  @IsOptional()
  @IsString()
  plan_note?: string;

  @ApiProperty({
    description: 'Updated metadata for plan',
    example: {
      tier: 'professional',
      features: 'unlimited_locations,analytics,priority_support,api_access',
      display_name: 'Professional Plan',
      is_popular: true,
      updated_at: '2024-02-01'
    },
    required: false
  })
  @IsOptional()
  @IsObject()
  plan_metadata?: Record<string, any>;
}