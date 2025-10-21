import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { OrderProgressStage } from '../../common/enums/order-progress.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
class OrderItemPricing {
  @Prop({ required: true, min: 0 })
  unitAmount!: number;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ default: 0 })
  taxAmount!: number;

  @Prop({ default: 0 })
  discountAmount!: number;
}

const OrderItemPricingSchema = SchemaFactory.createForClass(OrderItemPricing);

@Schema({ _id: false })
class OrderItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'MenuItem' })
  menuItemId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ type: OrderItemPricingSchema, required: true })
  pricing!: OrderItemPricing;

  @Prop({ trim: true })
  notes?: string;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({
  timestamps: true,
  collection: 'orders',
})
export class Order {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Session', index: true })
  sessionId?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  createdBy?: string;

  @Prop({ required: true, trim: true })
  orderNumber!: string;

  @Prop({ trim: true })
  tableNumber?: string;

  @Prop({ trim: true })
  customerName?: string;

  @Prop({ trim: true })
  customerPhone?: string;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.Pending,
    index: true,
  })
  status!: OrderStatus;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.Pending,
    index: true,
  })
  paymentStatus!: PaymentStatus;

  @Prop({
    type: Number,
    enum: Object.values(OrderProgressStage),
    default: OrderProgressStage.NotStarted,
  })
  progress!: OrderProgressStage;

  @Prop({ type: [OrderItemSchema], default: [] })
  items!: OrderItem[];

  @Prop({ min: 0, default: 0 })
  subTotalAmount!: number;

  @Prop({ min: 0, default: 0 })
  taxAmount!: number;

  @Prop({ min: 0, default: 0 })
  discountAmount!: number;

  @Prop({ min: 0, default: 0 })
  totalAmount!: number;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  statusNote?: string;

  @Prop()
  paidAt?: Date;

  @Prop({ trim: true })
  paymentProvider?: string;

  @Prop({ trim: true })
  paymentTransactionId?: string;

  @Prop()
  readyAt?: Date;

  @Prop({ default: false })
  isArchived!: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ restaurantId: 1, orderNumber: 1 }, { unique: true });
OrderSchema.index({ restaurantId: 1, status: 1 });
OrderSchema.index({ restaurantId: 1, paymentStatus: 1 });
