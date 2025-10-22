import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { OrderProgressStage } from '../../common/enums/order-progress.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
class OrderItemPricing {
  @Prop({ type: Number, required: true, min: 0 })
  unitAmount!: number;

  @Prop({ type: String, required: true, default: 'INR' })
  currency!: string;

  @Prop({ type: Number, default: 0 })
  taxAmount!: number;

  @Prop({ type: Number, default: 0 })
  discountAmount!: number;
}

const OrderItemPricingSchema = SchemaFactory.createForClass(OrderItemPricing);

@Schema({ _id: false })
class OrderItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'MenuItem' })
  menuItemId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: OrderItemPricingSchema, required: true })
  pricing!: OrderItemPricing;

  @Prop({ type: String, trim: true })
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

  @Prop({ type: String, required: true, trim: true })
  orderNumber!: string;

  @Prop({ type: String, trim: true })
  tableNumber?: string;

  @Prop({ type: String, trim: true })
  customerName?: string;

  @Prop({ type: String, trim: true })
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
    enum: Object.values(OrderProgressStage).filter(
      (value) => typeof value === 'number'
    ),
    default: OrderProgressStage.NotStarted,
  })
  progress!: OrderProgressStage;

  @Prop({ type: [OrderItemSchema], default: [] })
  items!: OrderItem[];

  @Prop({ type: Number, min: 0, default: 0 })
  subTotalAmount!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  taxAmount!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  discountAmount!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  totalAmount!: number;

  @Prop({
    type: String,
    enum: ['upi', 'cash'],
    default: 'upi',
  })
  paymentMethod!: 'upi' | 'cash';

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: String, trim: true })
  statusNote?: string;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ type: String, trim: true })
  paymentProvider?: string;

  @Prop({ type: String, trim: true })
  paymentTransactionId?: string;

  @Prop({ type: Date })
  readyAt?: Date;

  @Prop({ type: Boolean, default: false })
  isArchived!: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ restaurantId: 1, orderNumber: 1 }, { unique: true });
OrderSchema.index({ restaurantId: 1, status: 1 });
OrderSchema.index({ restaurantId: 1, paymentStatus: 1 });
