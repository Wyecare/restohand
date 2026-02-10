import { IsOptional, IsString, IsEnum, IsObject, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationUrgency, NotificationStatus } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  recipientId: string;

  @ApiPropertyOptional({ description: 'Branch ID (optional)' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ enum: NotificationUrgency, description: 'Notification urgency level' })
  @IsOptional()
  @IsEnum(NotificationUrgency)
  urgency?: NotificationUrgency;

  @ApiPropertyOptional({ description: 'Related order ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Order number' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'Related table ID' })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional({ description: 'Table number' })
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @ApiPropertyOptional({ description: 'Related call waiter ID' })
  @IsOptional()
  @IsString()
  callWaiterId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether FCM notification was sent' })
  @IsOptional()
  @IsBoolean()
  fcmSent?: boolean;

  @ApiPropertyOptional({ description: 'FCM message ID' })
  @IsOptional()
  @IsString()
  fcmMessageId?: string;

  @ApiPropertyOptional({ description: 'Sender ID' })
  @IsOptional()
  @IsString()
  senderId?: string;

  @ApiPropertyOptional({ description: 'Sender name' })
  @IsOptional()
  @IsString()
  senderName?: string;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({ enum: NotificationStatus, description: 'Notification status' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'Read timestamp' })
  @IsOptional()
  @IsDateString()
  readAt?: string;

  @ApiPropertyOptional({ description: 'Archived timestamp' })
  @IsOptional()
  @IsDateString()
  archivedAt?: string;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by recipient ID' })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ enum: NotificationType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ enum: NotificationUrgency, description: 'Filter by urgency' })
  @IsOptional()
  @IsEnum(NotificationUrgency)
  urgency?: NotificationUrgency;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Start date filter (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'Restaurant ID' })
  restaurantId: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  branchId?: string;

  @ApiProperty({ description: 'Recipient user ID' })
  recipientId: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification message' })
  message: string;

  @ApiProperty({ enum: NotificationUrgency, description: 'Urgency level' })
  urgency: NotificationUrgency;

  @ApiProperty({ enum: NotificationStatus, description: 'Status' })
  status: NotificationStatus;

  @ApiPropertyOptional({ description: 'Related order ID' })
  orderId?: string;

  @ApiPropertyOptional({ description: 'Order number' })
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'Related table ID' })
  tableId?: string;

  @ApiPropertyOptional({ description: 'Table number' })
  tableNumber?: string;

  @ApiPropertyOptional({ description: 'Related call waiter ID' })
  callWaiterId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Whether FCM was sent' })
  fcmSent: boolean;

  @ApiPropertyOptional({ description: 'FCM sent timestamp' })
  fcmSentAt?: string;

  @ApiPropertyOptional({ description: 'FCM message ID' })
  fcmMessageId?: string;

  @ApiPropertyOptional({ description: 'Read timestamp' })
  readAt?: string;

  @ApiPropertyOptional({ description: 'Archived timestamp' })
  archivedAt?: string;

  @ApiPropertyOptional({ description: 'Sender ID' })
  senderId?: string;

  @ApiPropertyOptional({ description: 'Sender name' })
  senderName?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}

export class BulkUpdateNotificationsDto {
  @ApiProperty({ description: 'Array of notification IDs to update' })
  @IsString({ each: true })
  notificationIds: string[];

  @ApiProperty({ description: 'Action to perform', enum: ['mark_read', 'mark_unread', 'archive', 'unarchive'] })
  @IsEnum(['mark_read', 'mark_unread', 'archive', 'unarchive'])
  action: 'mark_read' | 'mark_unread' | 'archive' | 'unarchive';
}

export class NotificationStatsDto {
  @ApiProperty({ description: 'Total notifications count' })
  total: number;

  @ApiProperty({ description: 'Unread notifications count' })
  unread: number;

  @ApiProperty({ description: 'Read notifications count' })
  read: number;

  @ApiProperty({ description: 'Archived notifications count' })
  archived: number;

  @ApiProperty({ description: 'Urgent notifications count' })
  urgent: number;
}