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

@Schema({ _id: false })
class OrderItemGst {
  @Prop({ type: String, trim: true })
  hsnCode?: string;

  @Prop({ type: String, trim: true })
  gstRateId?: string;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  gstRate!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  cgstAmount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  sgstAmount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  igstAmount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalTaxAmount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  taxableAmount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalWithTax!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  grossAmount!: number;

  @Prop({ type: Boolean, default: false })
  isTaxInclusive!: boolean;
}

const OrderItemPricingSchema = SchemaFactory.createForClass(OrderItemPricing);
const OrderItemGstSchema = SchemaFactory.createForClass(OrderItemGst);

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

  @Prop({ type: OrderItemGstSchema, required: false })
  gst?: OrderItemGst;

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

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', index: true })
  branchId?: string;

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

  @Prop({ type: String, trim: true, lowercase: true })
  customerEmail?: string;

  @Prop({
    type: String,
    trim: true,
    uppercase: true,
    match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  })
  customerGstin?: string;

  @Prop({ type: String, trim: true })
  customerState?: string;

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
  cgstAmount!: number; // Total CGST for all items

  @Prop({ type: Number, min: 0, default: 0 })
  sgstAmount!: number; // Total SGST for all items

  @Prop({ type: Number, min: 0, default: 0 })
  igstAmount!: number; // Total IGST for all items

  @Prop({ type: String, enum: ['intra-state', 'inter-state'] })
  taxType?: 'intra-state' | 'inter-state'; // Type of GST applied

  @Prop({ type: Number, min: 0, default: 0 })
  discountAmount!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  grossAmount!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  roundOffAmount!: number; // Rounding adjustment

  @Prop({ type: Number, min: 0, default: 0 })
  totalAmount!: number;

  @Prop({
    type: String,
    enum: ['upi', 'cash', 'pending'],
    default: 'pending',
  })
  paymentMethod!: 'upi' | 'cash' | 'pending';

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

  @Prop({ type: String, trim: true, index: true })
  razorpayOrderId?: string;

  @Prop({ type: SchemaTypes.Mixed })
  paymentMeta?: Record<string, unknown>;

  @Prop({ type: Date })
  readyAt?: Date;

  @Prop({ type: String, trim: true })
  taxInvoiceNumber?: string; // Reference to generated tax invoice

  @Prop({ type: Date })
  taxInvoiceGeneratedAt?: Date;

  @Prop({ type: Date })
  billGeneratedAt?: Date;

  @Prop({ type: Boolean, default: false })
  isArchived!: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ restaurantId: 1, orderNumber: 1 }, { unique: true });
OrderSchema.index({ restaurantId: 1, branchId: 1, orderNumber: 1 }, { unique: true });
OrderSchema.index({ restaurantId: 1, status: 1 });
OrderSchema.index({ restaurantId: 1, paymentStatus: 1 });
OrderSchema.index({ branchId: 1, status: 1 });
OrderSchema.index({ branchId: 1, createdAt: -1 });
