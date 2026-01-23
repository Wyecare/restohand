import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModificationType, ModificationStatus } from '../schemas/order-modification.schema';

class ModificationItemDataDto {
  @ApiPropertyOptional({ description: 'Menu item ID for add/update operations' })
  @IsOptional()
  @IsMongoId()
  menuItemId?: string;

  @ApiPropertyOptional({ description: 'Item name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Item quantity', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Item unit amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitAmount?: number;

  @ApiPropertyOptional({ description: 'Special instructions or notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Original quantity for update operations', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalQuantity?: number;

  @ApiPropertyOptional({ description: 'New quantity for update operations', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  newQuantity?: number;
}

export class CreateOrderModificationDto {
  @ApiProperty({ description: 'Order ID to modify' })
  @IsMongoId()
  orderId!: string;

  @ApiProperty({ enum: ModificationType, description: 'Type of modification' })
  @IsEnum(ModificationType)
  type!: ModificationType;

  @ApiPropertyOptional({ description: 'Item data for the modification' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ModificationItemDataDto)
  itemData?: ModificationItemDataDto;

  @ApiPropertyOptional({ description: 'Reason for modification' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Customer notes' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Whether to notify kitchen', default: false })
  @IsOptional()
  @IsBoolean()
  notifyKitchen?: boolean;
}

export class ProcessOrderModificationDto {
  @ApiProperty({ enum: ModificationStatus, description: 'New status for the modification' })
  @IsEnum([ModificationStatus.APPROVED, ModificationStatus.REJECTED, ModificationStatus.APPLIED])
  status!: ModificationStatus.APPROVED | ModificationStatus.REJECTED | ModificationStatus.APPLIED;

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Amount difference to apply', minimum: 0 })
  @IsOptional()
  @IsNumber()
  amountDifference?: number;
}

export class OrderModificationQueryDto {
  @ApiPropertyOptional({ enum: ModificationStatus, description: 'Filter by modification status' })
  @IsOptional()
  @IsEnum(ModificationStatus)
  status?: ModificationStatus;

  @ApiPropertyOptional({ enum: ModificationType, description: 'Filter by modification type' })
  @IsOptional()
  @IsEnum(ModificationType)
  type?: ModificationType;

  @ApiPropertyOptional({ description: 'Filter by order ID' })
  @IsOptional()
  @IsMongoId()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Filter by order number' })
  @IsOptional()
  @IsString()
  orderNumber?: string;
}