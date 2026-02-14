import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  CALL_WAITER = 'call_waiter',
  ORDER_STATUS_UPDATE = 'order_status_update',
  ORDER_READY = 'order_ready',
  TABLE_STATUS_UPDATE = 'table_status_update',
  SYSTEM_ALERT = 'system_alert',
  REMINDER = 'reminder'
}

export enum NotificationUrgency {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived'
}

@Schema({
  timestamps: true,
  collection: 'notifications'
})
export class Notification {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Restaurant' })
  restaurantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  recipientId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: NotificationUrgency, default: NotificationUrgency.NORMAL })
  urgency: NotificationUrgency;

  @Prop({ enum: NotificationStatus, default: NotificationStatus.UNREAD })
  status: NotificationStatus;

  // Related entities
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop()
  orderNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'RestaurantTable' })
  tableId?: Types.ObjectId;

  @Prop()
  tableNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'CallWaiter' })
  callWaiterId?: Types.ObjectId;

  // Additional data
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // FCM tracking
  @Prop({ default: false })
  fcmSent: boolean;

  @Prop()
  fcmSentAt?: Date;

  @Prop()
  fcmMessageId?: string;

  // Read tracking
  @Prop()
  readAt?: Date;

  @Prop()
  archivedAt?: Date;

  // Sender info (for system notifications)
  @Prop({ type: Types.ObjectId, ref: 'User' })
  senderId?: Types.ObjectId;

  @Prop()
  senderName?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes for performance
NotificationSchema.index({ restaurantId: 1, recipientId: 1, createdAt: -1 });
NotificationSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ urgency: 1, status: 1, createdAt: -1 });

// Unique index to prevent duplicate payment notifications
// This ensures one payment notification per recipient per order
NotificationSchema.index(
  {
    restaurantId: 1,
    recipientId: 1,
    type: 1,
    orderId: 1
  },
  {
    unique: true,
    sparse: true, // Allows null values in orderId
    name: 'unique_payment_notification_per_order'
  }
);

// Unique index to prevent duplicate call waiter notifications
// This ensures one call waiter notification per recipient per call
NotificationSchema.index(
  {
    restaurantId: 1,
    recipientId: 1,
    type: 1,
    callWaiterId: 1
  },
  {
    unique: true,
    sparse: true, // Allows null values in callWaiterId
    name: 'unique_call_waiter_notification_per_call'
  }
);