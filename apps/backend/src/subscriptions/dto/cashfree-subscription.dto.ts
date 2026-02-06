import { IsString, IsEmail, IsOptional, IsPhoneNumber, IsUrl, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCashfreeSubscriptionDto {
  @ApiProperty({ description: 'Restaurant ID' })
  @IsString()
  restaurant_id: string;

  @ApiProperty({ description: 'Subscription Plan ID (MongoDB ObjectId)' })
  @IsString()
  plan_id: string;

  @ApiProperty({ description: 'Customer email address' })
  @IsEmail()
  customer_email: string;

  @ApiProperty({ description: 'Customer phone number' })
  @IsString()
  customer_phone: string;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customer_name: string;

  @ApiPropertyOptional({ description: 'Return URL after payment authorization' })
  @IsOptional()
  @IsString()
  return_url?: string;
}

export class UpdateCashfreeSubscriptionDto {
  @ApiProperty({ description: 'New plan ID to upgrade/downgrade to' })
  @IsString()
  plan_id: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  notes?: Record<string, any>;
}


export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RetryPaymentDto {
  @ApiProperty({ description: 'Subscription ID' })
  @IsString()
  subscription_id: string;

  @ApiPropertyOptional({ description: 'Specific cycle number to retry' })
  @IsOptional()
  cycle_number?: number;
}