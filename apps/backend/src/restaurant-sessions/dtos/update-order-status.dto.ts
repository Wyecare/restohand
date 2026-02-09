import { IsEnum, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SessionOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Order status',
    enum: SessionOrderStatus,
    example: SessionOrderStatus.PREPARING
  })
  @IsNotEmpty()
  @IsEnum(SessionOrderStatus)
  status: SessionOrderStatus;

  @ApiPropertyOptional({
    description: 'Estimated completion time in minutes',
    example: 15
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedTime?: number;

  @ApiPropertyOptional({
    description: 'Progress percentage (0-100)',
    example: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;
}