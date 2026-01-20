import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNotEmpty, MaxLength, IsUUID } from 'class-validator';
import { CallWaiterType, CallWaiterUrgency } from '../schemas/call-waiter.schema';

export class CreateCallWaiterDto {
  @ApiProperty({ description: 'Table ID from the QR scan' })
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty({ enum: CallWaiterType, description: 'Type of assistance needed' })
  @IsEnum(CallWaiterType)
  type!: CallWaiterType;

  @ApiPropertyOptional({ enum: CallWaiterUrgency, description: 'Urgency level' })
  @IsEnum(CallWaiterUrgency)
  @IsOptional()
  urgency?: CallWaiterUrgency;

  @ApiPropertyOptional({ description: 'Additional message from customer' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ description: 'Customer name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Associated order ID if any' })
  @IsUUID()
  @IsOptional()
  orderId?: string;
}

export class UpdateFcmTokenDto {
  @ApiProperty({ description: 'FCM token for push notifications' })
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;
}

export class AcknowledgeCallDto {
  @ApiPropertyOptional({ description: 'Acknowledgment note' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  note?: string;
}

export class ResolveCallDto {
  @ApiProperty({ description: 'Resolution note' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  resolutionNote!: string;
}

export class CallWaiterResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  tableId!: string;

  @ApiProperty()
  tableLabel!: string;

  @ApiProperty({ enum: CallWaiterType })
  type!: CallWaiterType;

  @ApiProperty({ enum: CallWaiterUrgency })
  urgency!: CallWaiterUrgency;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  customerName?: string;

  @ApiPropertyOptional()
  assignedWaiterName?: string;

  @ApiPropertyOptional()
  acknowledgedAt?: Date;

  @ApiPropertyOptional()
  resolvedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}