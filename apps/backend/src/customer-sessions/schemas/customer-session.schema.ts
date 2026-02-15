import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type CustomerSessionDocument = CustomerSession & Document;

export enum SessionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ABANDONED = 'abandoned',
}

export enum SessionClosureReason {
  PAYMENT_COMPLETED = 'payment_completed',
  STAFF_CLOSED = 'staff_closed',
  AUTO_TIMEOUT = 'auto_timeout',
  MANUAL_CLOSURE = 'manual_closure',
  TABLE_CLEARED = 'table_cleared',
}

@Schema({
  timestamps: true,
  collection: 'customer_sessions',
})
export class CustomerSession {
  @Prop({ type: String, required: true, unique: true, index: true })
  sessionId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', index: true })
  branchId?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'RestaurantTable', required: true, index: true })
  tableId!: string;

  @Prop({ type: String, required: true })
  tableNumber!: string;

  @Prop({ type: Number, required: true, index: true })
  customerNumber!: number;

  @Prop({ type: String, enum: Object.values(SessionStatus), default: SessionStatus.ACTIVE, index: true })
  status!: SessionStatus;

  // Session metadata
  @Prop({ type: Date, default: Date.now })
  startedAt!: Date;

  @Prop({ type: Date })
  closedAt?: Date;

  @Prop({ type: String, enum: Object.values(SessionClosureReason) })
  closureReason?: SessionClosureReason;

  // Device/User tracking
  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  deviceFingerprint?: string;

  // Session expiry
  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  // Staff who closed the session
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  closedBy?: string;

  @Prop({ type: String })
  closureNotes?: string;

  // Session metrics
  @Prop({ type: Number, default: 0 })
  totalOrders!: number;

  @Prop({ type: Number, default: 0 })
  totalAmount!: number;

  @Prop({ type: Number })
  lastActivityAt?: Date;

  // Session aggregation (basic fields only - billing calculated dynamically)
  @Prop({ type: Number, default: 0 })
  subTotalAmount!: number;

  @Prop({ type: Number, default: 0 })
  paidAmount!: number;

  @Prop({ type: Number, default: 0 })
  pendingAmount!: number;

  @Prop({ type: Boolean, default: false })
  allOrdersPaid!: boolean;
}

export const CustomerSessionSchema = SchemaFactory.createForClass(CustomerSession);

// Indexes for efficient queries
CustomerSessionSchema.index({ restaurantId: 1, tableId: 1, status: 1 });
CustomerSessionSchema.index({ tableId: 1, customerNumber: 1 }, { unique: true }); // Unique customer number per table
CustomerSessionSchema.index({ branchId: 1, status: 1 });
CustomerSessionSchema.index({ expiresAt: 1 }); // For auto-cleanup
CustomerSessionSchema.index({ sessionId: 1 }, { unique: true });
CustomerSessionSchema.index({ status: 1, lastActivityAt: 1 }); // For finding abandoned sessions