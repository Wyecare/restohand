import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type OrderEventDocument = OrderEvent & Document;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'order_events',
})
export class OrderEvent {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', required: true, index: true })
  orderId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true })
  type!: string;

  @Prop({ type: SchemaTypes.Mixed })
  payload?: Record<string, unknown>;
}

export const OrderEventSchema = SchemaFactory.createForClass(OrderEvent);
