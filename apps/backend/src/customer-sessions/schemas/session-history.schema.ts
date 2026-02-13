import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type SessionHistoryDocument = SessionHistory & Document;

export enum SessionAction {
  SESSION_CREATED = 'session_created',
  ORDER_PLACED = 'order_placed',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_PAID = 'order_paid',
  SESSION_CLOSED = 'session_closed',
  SESSION_REOPENED = 'session_reopened',
  BILL_CALCULATED = 'bill_calculated',
  PAYMENT_ATTEMPTED = 'payment_attempted',
  PAYMENT_FAILED = 'payment_failed',
  STAFF_ACTION = 'staff_action',
}

@Schema({
  timestamps: true,
  collection: 'session_history',
})
export class SessionHistory {
  @Prop({ type: String, required: true, index: true })
  sessionId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'CustomerSession', required: true, index: true })
  customerSessionId!: string;

  @Prop({ type: String, enum: Object.values(SessionAction), required: true })
  action!: SessionAction;

  @Prop({ type: SchemaTypes.Mixed })
  metadata?: any;

  // Context
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order' })
  orderId?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  actorId?: string; // User who performed the action

  @Prop({ type: String })
  actorType?: 'customer' | 'staff' | 'system';

  @Prop({ type: String })
  description?: string;

  // Snapshot data
  @Prop({ type: Number })
  sessionTotalAmount?: number;

  @Prop({ type: Number })
  sessionOrderCount?: number;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String })
  ipAddress?: string;
}

export const SessionHistorySchema = SchemaFactory.createForClass(SessionHistory);

// Indexes for efficient queries
SessionHistorySchema.index({ sessionId: 1, createdAt: -1 });
SessionHistorySchema.index({ customerSessionId: 1, action: 1 });
SessionHistorySchema.index({ orderId: 1 });
SessionHistorySchema.index({ actorId: 1, action: 1 });