import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type CallWaiterDocument = CallWaiter & Document;

export enum CallWaiterType {
  Assistance = 'assistance',
  Emergency = 'emergency',
  BillRequest = 'bill_request',
  Complaint = 'complaint',
  Feedback = 'feedback'
}

export enum CallWaiterStatus {
  Pending = 'pending',
  Acknowledged = 'acknowledged',
  InProgress = 'in_progress',
  Resolved = 'resolved',
  Ignored = 'ignored'
}

export enum CallWaiterUrgency {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent'
}

@Schema({
  timestamps: true,
  collection: 'call_waiter_alerts',
})
export class CallWaiter {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, index: true })
  tableId!: string;

  @Prop({ type: String, required: true, trim: true })
  tableLabel!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order' })
  orderId?: string;

  @Prop({ type: String, trim: true })
  orderNumber?: string;

  @Prop({
    type: String,
    enum: Object.values(CallWaiterType),
    required: true,
    index: true
  })
  type!: CallWaiterType;

  @Prop({
    type: String,
    enum: Object.values(CallWaiterUrgency),
    default: CallWaiterUrgency.Normal
  })
  urgency!: CallWaiterUrgency;

  @Prop({
    type: String,
    enum: Object.values(CallWaiterStatus),
    default: CallWaiterStatus.Pending,
    index: true
  })
  status!: CallWaiterStatus;

  @Prop({ type: String, trim: true })
  message?: string;

  @Prop({ type: String, trim: true })
  customerName?: string;

  @Prop({ type: String, trim: true })
  customerPhone?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  assignedWaiterId?: string;

  @Prop({ type: String, trim: true })
  assignedWaiterName?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  acknowledgedBy?: string;

  @Prop({ type: Date })
  acknowledgedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  resolvedBy?: string;

  @Prop({ type: Date })
  resolvedAt?: Date;

  @Prop({ type: String, trim: true })
  resolutionNote?: string;

  @Prop({ type: Number, default: 0 })
  responseTimeMinutes?: number;

  @Prop({ type: Boolean, default: false })
  fcmSent!: boolean;

  @Prop({ type: Date })
  fcmSentAt?: Date;

  @Prop({ type: String, trim: true })
  fcmError?: string;

  @Prop({ type: Boolean, default: false })
  isArchived!: boolean;
}

export const CallWaiterSchema = SchemaFactory.createForClass(CallWaiter);

// Indexes for efficient queries
CallWaiterSchema.index({ restaurantId: 1, status: 1 });
CallWaiterSchema.index({ restaurantId: 1, assignedWaiterId: 1, status: 1 });
CallWaiterSchema.index({ restaurantId: 1, tableId: 1, createdAt: -1 });
CallWaiterSchema.index({ restaurantId: 1, urgency: 1, status: 1 });
CallWaiterSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 * 7 }); // Auto-delete after 7 days