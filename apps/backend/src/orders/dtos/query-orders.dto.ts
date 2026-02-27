import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsNumberString,
} from 'class-validator';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class QueryOrdersDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'ISO date (inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date (inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 'rahul' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '1', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: '20', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({
    example: 'b5bc55d9-132c-4984-8a96-a1077a96af57',
    description: 'Filter by customer session ID'
  })
  @IsOptional()
  @IsString()
  customerSessionId?: string;

  @ApiPropertyOptional({ description: 'Branch ID (ignored; branch is inferred from JWT)' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
