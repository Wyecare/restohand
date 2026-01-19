import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type OrderCounterDocument = OrderCounter & Document;

@Schema({
  collection: 'order_counters',
})
export class OrderCounter {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, unique: true, index: true })
  restaurantId!: string;

  @Prop({ type: Number, default: 0, min: 0 })
  lastOrderNumber!: number;
}

export const OrderCounterSchema = SchemaFactory.createForClass(OrderCounter);