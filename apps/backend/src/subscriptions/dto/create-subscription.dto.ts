import { IsString, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Restaurant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  restaurantId: string;

  @ApiProperty({
    description: 'Razorpay plan ID',
    example: 'plan_MhY0fgHr8H1234',
  })
  @IsString()
  planId: string;

  @ApiPropertyOptional({
    description: 'Total count of billing cycles (default: 12 for yearly plans)',
    example: 12,
  })
  @IsOptional()
  @IsNumber()
  totalCount?: number;

  @ApiPropertyOptional({
    description: 'Unix timestamp when subscription should start',
    example: 1640995200,
  })
  @IsOptional()
  @IsNumber()
  startAt?: number;

  @ApiPropertyOptional({
    description: 'Whether to notify customer via email/SMS',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  customerNotify?: boolean;

  @ApiPropertyOptional({
    description: 'Additional notes for the subscription',
    example: { source: 'website', campaign: 'early_bird' },
  })
  @IsOptional()
  @IsObject()
  notes?: Record<string, any>;
}