import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

@Schema({ timestamps: true })
export class ReceiptDocument {
  @Prop({ type: String, required: true, unique: true })
  receiptNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId!: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Order' }], required: true })
  orderIds!: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId; // Who marked the payment as paid (staff/waiter)

  @Prop()
  tableNumber?: string;

  @Prop()
  customerName?: string;

  @Prop()
  customerPhone?: string;

  @Prop()
  customerEmail?: string;

  @Prop({ type: [Object], required: true })
  items!: ReceiptItem[];

  @Prop({ required: true })
  subtotal!: number;

  @Prop({ required: true })
  taxAmount!: number;

  @Prop({ required: true })
  cgstAmount!: number;

  @Prop({ required: true })
  sgstAmount!: number;

  @Prop({ required: true })
  igstAmount!: number;

  @Prop({ required: true, default: 0 })
  discountAmount!: number;

  @Prop({ required: true })
  roundOffAmount!: number;

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({
    required: true,
    enum: ['paid', 'pending', 'failed'],
    default: 'pending',
  })
  paymentStatus!: string;

  @Prop({
    required: true,
    enum: ['cash', 'upi', 'card', 'restohand', 'pending'],
    default: 'pending',
  })
  paymentMethod!: string;

  @Prop()
  paymentProvider?: string;

  @Prop()
  transactionId?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  notes?: string;

  @Prop({ enum: ['inter-state', 'intra-state'], default: 'intra-state' })
  taxType?: string;

  @Prop({ default: Date.now })
  issuedAt!: Date;
}

export type ReceiptDocumentDocument = ReceiptDocument & Document;
export const ReceiptDocumentSchema =
  SchemaFactory.createForClass(ReceiptDocument);

// Create indexes
ReceiptDocumentSchema.index({ receiptNumber: 1 }, { unique: true });
ReceiptDocumentSchema.index({ restaurantId: 1, createdAt: -1 });
ReceiptDocumentSchema.index({ orderIds: 1 });
