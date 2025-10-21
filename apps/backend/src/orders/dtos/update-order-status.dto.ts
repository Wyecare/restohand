import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderProgressStage } from '../../common/enums/order-progress.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: OrderProgressStage })
  @IsOptional()
  @IsEnum(OrderProgressStage)
  progress?: OrderProgressStage;

  @ApiPropertyOptional({ example: 'Order delayed due to rush' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  statusNote?: string;
}
