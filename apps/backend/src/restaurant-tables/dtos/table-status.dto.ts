import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsUUID
} from 'class-validator';
import { TableStatusType } from '../schemas/table-status.schema';

export class UpdateTableStatusDto {
  @ApiProperty({
    enum: TableStatusType,
    description: 'New status for the table'
  })
  @IsEnum(TableStatusType)
  status!: TableStatusType;

  @ApiPropertyOptional({
    description: 'Server assigned to this table',
    example: '507f1f77bcf86cd799439011'
  })
  @IsOptional()
  @IsString()
  assignedServerId?: string;

  @ApiPropertyOptional({
    description: 'Current party size at the table',
    minimum: 1,
    maximum: 20
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  currentPartySize?: number;

  @ApiPropertyOptional({
    description: 'Notes or special requests',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Customer name for reservation',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reservationCustomerName?: string;

  @ApiPropertyOptional({
    description: 'Customer phone for reservation',
    maxLength: 20
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  reservationCustomerPhone?: string;

  @ApiPropertyOptional({
    description: 'Reservation start time (ISO string)',
    example: '2024-01-15T18:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  reservedFrom?: string;

  @ApiPropertyOptional({
    description: 'Reservation end time (ISO string)',
    example: '2024-01-15T20:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  reservedUntil?: string;

  @ApiPropertyOptional({
    description: 'Estimated duration of reservation in minutes',
    minimum: 60,
    maximum: 300
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(300)
  reservationEstimatedDuration?: number;

  @ApiPropertyOptional({
    description: 'Special requests for the reservation',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reservationSpecialRequests?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the reservation',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reservationNotes?: string;
}

export class TableStatusResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  tableId!: string;

  @ApiProperty({ enum: TableStatusType })
  status!: TableStatusType;

  @ApiPropertyOptional()
  occupiedSince?: string;

  @ApiPropertyOptional()
  availableSince?: string;

  @ApiPropertyOptional()
  cleaningSince?: string;

  @ApiPropertyOptional()
  reservedFrom?: string;

  @ApiPropertyOptional()
  reservedUntil?: string;

  @ApiPropertyOptional()
  assignedServerId?: string;

  @ApiPropertyOptional()
  assignedServerName?: string;

  @ApiPropertyOptional()
  currentPartySize?: number;

  @ApiPropertyOptional()
  currentBillAmount?: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  reservationCustomerName?: string;

  @ApiPropertyOptional()
  reservationCustomerPhone?: string;

  @ApiPropertyOptional()
  reservationEstimatedDuration?: number;

  @ApiPropertyOptional()
  reservationSpecialRequests?: string;

  @ApiPropertyOptional()
  reservationNotes?: string;

  @ApiPropertyOptional()
  lastStatusChange?: string;

  @ApiPropertyOptional()
  lastUpdatedBy?: string;

  @ApiPropertyOptional()
  lastUpdatedByName?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  // Computed fields for UI
  @ApiPropertyOptional({
    description: 'Time since last status change in milliseconds'
  })
  timeSinceLastChange?: number;

  @ApiPropertyOptional({
    description: 'Time occupied in milliseconds (if status is occupied)'
  })
  occupiedDuration?: number;

  @ApiPropertyOptional({
    description: 'Visual color for status based on timing',
    enum: ['green', 'yellow', 'orange', 'red', 'blue', 'grey']
  })
  statusColor?: string;
}

export class TableStatusStatsDto {
  @ApiProperty()
  totalTables!: number;

  @ApiProperty()
  availableTables!: number;

  @ApiProperty()
  occupiedTables!: number;

  @ApiProperty()
  reservedTables!: number;

  @ApiProperty()
  cleaningTables!: number;

  @ApiProperty()
  averageOccupancyTime!: number;

  @ApiProperty()
  totalRevenue!: number;
}

export class EnhancedRestaurantTableResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  tableNumber!: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  capacity?: number;

  @ApiPropertyOptional()
  zone?: string;

  @ApiProperty({ default: 0 })
  displayOrder!: number;

  @ApiProperty({ default: true })
  isActive!: boolean;

  @ApiPropertyOptional()
  layoutX?: number;

  @ApiPropertyOptional()
  layoutY?: number;

  @ApiPropertyOptional()
  layoutWidth?: number;

  @ApiPropertyOptional()
  layoutHeight?: number;

  @ApiPropertyOptional()
  layoutRotation?: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  // Enhanced with status information
  @ApiPropertyOptional({ type: () => TableStatusResponseDto })
  currentStatus?: TableStatusResponseDto;
}