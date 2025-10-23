import { IsString, IsOptional, IsNumber, IsEnum, IsDate, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableStatusType, TablePriority } from '../schemas/table-status.schema';

export class UpdateTableStatusDto {
  @ApiProperty({ enum: TableStatusType })
  @IsEnum(TableStatusType)
  status!: TableStatusType;

  @ApiPropertyOptional({ enum: TablePriority })
  @IsOptional()
  @IsEnum(TablePriority)
  priority?: TablePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentPartySize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedWaiter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  estimatedAvailableAt?: Date;
}

export class TableOrderResponseDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  orderedAt!: Date;
}

export class TableReservationResponseDto {
  @ApiProperty()
  guestName!: string;

  @ApiPropertyOptional()
  guestPhone?: string;

  @ApiProperty()
  partySize!: number;

  @ApiProperty()
  reservedFrom!: Date;

  @ApiProperty()
  reservedTo!: Date;

  @ApiPropertyOptional()
  notes?: string;
}

export class TableMetricsResponseDto {
  @ApiProperty()
  totalOrders!: number;

  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  averageOrderValue!: number;

  @ApiProperty()
  occupancyMinutes!: number;

  @ApiProperty()
  turnoverCount!: number;

  @ApiPropertyOptional()
  lastOrderAt?: Date;

  @ApiPropertyOptional()
  lastOccupiedAt?: Date;
}

export class TableStatusResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  tableId!: string;

  @ApiProperty()
  tableLabel!: string;

  @ApiProperty({ enum: TableStatusType })
  status!: TableStatusType;

  @ApiProperty({ enum: TablePriority })
  priority!: TablePriority;

  @ApiProperty({ type: [TableOrderResponseDto] })
  currentOrders!: TableOrderResponseDto[];

  @ApiPropertyOptional({ type: TableReservationResponseDto })
  currentReservation?: TableReservationResponseDto;

  @ApiPropertyOptional()
  currentPartySize?: number;

  @ApiPropertyOptional()
  assignedWaiter?: string;

  @ApiPropertyOptional()
  statusNote?: string;

  @ApiProperty()
  statusChangedAt!: Date;

  @ApiPropertyOptional()
  statusChangedBy?: string;

  @ApiPropertyOptional()
  occupiedSince?: Date;

  @ApiPropertyOptional()
  estimatedAvailableAt?: Date;

  @ApiProperty({ type: TableMetricsResponseDto })
  dailyMetrics!: TableMetricsResponseDto;

  @ApiProperty()
  date!: Date;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CreateReservationDto {
  @ApiProperty()
  @IsString()
  guestName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  partySize!: number;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  reservedFrom!: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  reservedTo!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FloorPlanStatusOverviewDto {
  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  floorPlanId!: string;

  @ApiProperty()
  totalTables!: number;

  @ApiProperty()
  availableTables!: number;

  @ApiProperty()
  occupiedTables!: number;

  @ApiProperty()
  reservedTables!: number;

  @ApiProperty()
  tablesNeedingAttention!: number;

  @ApiProperty()
  totalSeats!: number;

  @ApiProperty()
  occupiedSeats!: number;

  @ApiProperty()
  todayRevenue!: number;

  @ApiProperty()
  todayOrders!: number;

  @ApiProperty()
  averageTurnover!: number;

  @ApiProperty()
  peakOccupancyTime?: string;

  @ApiProperty()
  lastUpdated!: Date;
}