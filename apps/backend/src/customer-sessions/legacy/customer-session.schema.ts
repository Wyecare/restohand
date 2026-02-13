import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerSessionDocument = CustomerSession & Document;

@Schema({
  timestamps: true,
  collection: 'customer_sessions'
})
export class CustomerSession {
  @Prop({ required: true, unique: true })
  sessionId: string;

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

  @Prop({ default: 'active', enum: ['active', 'completed', 'expired', 'archived'] })
  status: string;

  @Prop({ default: Date.now })
  lastActivity: Date;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  // Session expires after 4 hours of inactivity (only for non-archived sessions)
  @Prop({
    default: () => new Date(Date.now() + 4 * 60 * 60 * 1000),
  })
  expiresAt: Date;
}

export const CustomerSessionSchema = SchemaFactory.createForClass(CustomerSession);

// Index for efficient queries
CustomerSessionSchema.index({ sessionId: 1 });
CustomerSessionSchema.index({ restaurantId: 1, tableId: 1, status: 1 });
// TTL index only for non-archived sessions
CustomerSessionSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: { $ne: 'archived' } }
  }
);