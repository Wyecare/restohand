import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionOrderStatus } from './update-order-status.dto';

export class BulkUpdateOrderStatusDto {
  @ApiProperty({
    description: 'Array of order IDs to update',
    type: [String],
    example: ['order1', 'order2', 'order3']
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderIds: string[];

  @ApiProperty({
    description: 'Status to set for all orders',
    enum: SessionOrderStatus,
    example: SessionOrderStatus.PREPARING
  })
  @IsNotEmpty()
  @IsEnum(SessionOrderStatus)
  status: SessionOrderStatus;

  @ApiPropertyOptional({
    description: 'Estimated completion time in minutes (applied to all orders)',
    example: 15
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedTime?: number;
}