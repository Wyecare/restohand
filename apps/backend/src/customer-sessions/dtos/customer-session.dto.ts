import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsUUID,
} from 'class-validator';
import {
  SessionStatus,
  SessionClosureReason,
} from '../schemas/customer-session.schema';

export class CreateCustomerSessionDto {
  @ApiProperty({ description: 'Restaurant slug' })
  @IsString()
  restaurantSlug!: string;

  @ApiProperty({ description: 'Table ID' })
  @IsString()
  tableId!: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Device fingerprint' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

export class UpdateSessionStatusDto {
  @ApiProperty({ enum: SessionStatus })
  @IsEnum(SessionStatus)
  status!: SessionStatus;

  @ApiPropertyOptional({ enum: SessionClosureReason })
  @IsOptional()
  @IsEnum(SessionClosureReason)
  closureReason?: SessionClosureReason;

  @ApiPropertyOptional({ description: 'Closure notes' })
  @IsOptional()
  @IsString()
  closureNotes?: string;
}

export class CustomerSessionResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiPropertyOptional()
  branchId?: string;

  @ApiProperty()
  tableId!: string;

  @ApiProperty()
  tableNumber!: string;

  @ApiProperty()
  customerNumber!: number;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional()
  closedAt?: string;

  @ApiPropertyOptional({ enum: SessionClosureReason })
  closureReason?: SessionClosureReason;

  @ApiProperty()
  expiresAt!: string;

  @ApiPropertyOptional()
  closedBy?: string;

  @ApiPropertyOptional()
  closureNotes?: string;

  @ApiProperty()
  totalOrders!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiPropertyOptional()
  lastActivityAt?: string;

  // Session aggregation (basic fields only - detailed billing calculated dynamically)
  @ApiProperty()
  subTotalAmount!: number;

  @ApiProperty()
  paidAmount!: number;

  @ApiProperty()
  pendingAmount!: number;

  @ApiProperty()
  allOrdersPaid!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

// Note: This DTO is deprecated - billing calculations are now handled by the BillCalculatorService
// and returned with full tax breakdown. This DTO is kept for backward compatibility but should
// be replaced with BillCalculation interface from the billing module.
export class SessionBillCalculationDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  subTotalAmount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  paidAmount!: number;

  @ApiProperty()
  pendingAmount!: number;

  @ApiProperty({ type: 'array', items: { type: 'string' } })
  orderIds!: string[];

  @ApiProperty()
  calculatedAt!: string;
}

export class FindSessionsQueryDto {
  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  returnEmpty?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number | string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number | string;
}
