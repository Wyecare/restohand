import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionHistoryDocument = SessionHistory & Document;

@Schema({
  timestamps: true,
  collection: 'session_history'
})
export class SessionHistory {
  @Prop({ required: true })
  originalSessionId: string;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RestaurantTable', required: true })
  tableId: Types.ObjectId;

  @Prop({ required: true })
  tableNumber: string;

  @Prop()
  customerName?: string;

  @Prop()
  customerPhone?: string;

  @Prop({ required: true })
  sessionStartedAt: Date;

  @Prop({ required: true })
  sessionCompletedAt: Date;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Order' }] })
  orderIds: Types.ObjectId[];

  @Prop()
  totalAmount?: number;

  @Prop()
  paymentStatus?: string;
}

export const SessionHistorySchema = SchemaFactory.createForClass(SessionHistory);

// Indexes for efficient queries
SessionHistorySchema.index({ originalSessionId: 1 });
SessionHistorySchema.index({ restaurantId: 1, tableId: 1 });
SessionHistorySchema.index({ sessionCompletedAt: -1 });