import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type PurchaseOrderDocument = PurchaseOrder & Document;

@Schema({ _id: false })
class PurchaseOrderItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'InventoryItem', required: true })
  inventoryItemId!: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitCost!: number; // in paise

  @Prop({ type: Number, required: true, min: 0 })
  totalCost!: number; // quantity * unitCost

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Number, default: 0 })
  receivedQuantity!: number; // Track partial deliveries

  @Prop({
    type: String,
    enum: ['pending', 'partial', 'received', 'cancelled'],
    default: 'pending'
  })
  status!: 'pending' | 'partial' | 'received' | 'cancelled';
}

const PurchaseOrderItemSchema = SchemaFactory.createForClass(PurchaseOrderItem);

@Schema({ _id: false })
class PurchaseOrderDelivery {
  @Prop({ type: Date })
  expectedDate?: Date;

  @Prop({ type: String, trim: true })
  expectedTime?: string; // HH:mm format

  @Prop({ type: Date })
  actualDate?: Date;

  @Prop({ type: String, trim: true })
  actualTime?: string;

  @Prop({ type: String, trim: true })
  deliveryInstructions?: string;
}

const PurchaseOrderDeliverySchema = SchemaFactory.createForClass(PurchaseOrderDelivery);

@Schema({ _id: false })
class PurchaseOrderTracking {
  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  sentBy?: string;

  @Prop({ type: Date })
  acknowledgedAt?: Date;

  @Prop({ type: String, trim: true })
  acknowledgmentMethod?: string; // email, phone, etc.

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  receivedBy?: string;

  @Prop({ type: String, trim: true })
  cancellationReason?: string;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  cancelledBy?: string;
}

const PurchaseOrderTrackingSchema = SchemaFactory.createForClass(PurchaseOrderTracking);

@Schema({ _id: false })
class PurchaseOrderInvoice {
  @Prop({ type: String, trim: true })
  invoiceNumber?: string;

  @Prop({ type: Date })
  invoiceDate?: Date;

  @Prop({ type: Number, min: 0 })
  invoiceAmount?: number;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Date })
  receivedAt?: Date;
}

const PurchaseOrderInvoiceSchema = SchemaFactory.createForClass(PurchaseOrderInvoice);

@Schema({ _id: false })
class PurchaseOrderPayment {
  @Prop({
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid',
  })
  status!: 'unpaid' | 'partial' | 'paid';

  @Prop({ type: Number, default: 0, min: 0 })
  paidAmount!: number;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'credit'],
  })
  method?: string;

  @Prop({ type: String, trim: true })
  reference?: string;

  @Prop({ type: String, trim: true })
  notes?: string;
}

const PurchaseOrderPaymentSchema = SchemaFactory.createForClass(PurchaseOrderPayment);

@Schema({
  timestamps: true,
  collection: 'purchase_orders',
})
export class PurchaseOrder {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: string; // Destination branch

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Supplier', required: true, index: true })
  supplierId!: string;

  @Prop({ type: String, required: true, unique: true })
  poNumber!: string; // Auto-generated: PO-YYYYMMDD-001

  @Prop({
    type: String,
    enum: ['draft', 'pending', 'sent', 'acknowledged', 'partial', 'delivered', 'cancelled', 'closed'],
    default: 'draft',
    index: true
  })
  status!: 'draft' | 'pending' | 'sent' | 'acknowledged' | 'partial' | 'delivered' | 'cancelled' | 'closed';

  @Prop({ type: [PurchaseOrderItemSchema], required: true })
  items!: PurchaseOrderItem[];

  @Prop({ type: Number, required: true, min: 0 })
  subtotal!: number; // Sum of all item total costs

  @Prop({ type: Number, default: 0, min: 0 })
  taxAmount!: number; // GST amount

  @Prop({ type: Number, default: 0, min: 0 })
  shippingCost!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  discountAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number; // subtotal + tax + shipping - discount

  @Prop({ type: PurchaseOrderDeliverySchema })
  delivery?: PurchaseOrderDelivery;

  @Prop({ type: PurchaseOrderTrackingSchema, default: () => ({}) })
  tracking!: PurchaseOrderTracking;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: String, trim: true })
  terms?: string; // Terms and conditions

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  createdBy!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  approvedBy?: string;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: Number, default: 0 })
  revision!: number; // Track PO revisions

  @Prop({ type: SchemaTypes.ObjectId, ref: 'PurchaseOrder' })
  previousVersionId?: string; // Link to previous version if revised

  @Prop({
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  })
  priority!: 'low' | 'normal' | 'high' | 'urgent';

  @Prop({ type: PurchaseOrderInvoiceSchema })
  invoice?: PurchaseOrderInvoice;

  @Prop({ type: PurchaseOrderPaymentSchema, default: () => ({ status: 'unpaid', paidAmount: 0 }) })
  payment!: PurchaseOrderPayment;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

// Indexes for performance
PurchaseOrderSchema.index({ restaurantId: 1, createdAt: -1 });
PurchaseOrderSchema.index({ restaurantId: 1, branchId: 1, status: 1 });
PurchaseOrderSchema.index({ restaurantId: 1, supplierId: 1, createdAt: -1 });
PurchaseOrderSchema.index({ poNumber: 1 }, { unique: true });
PurchaseOrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ branchId: 1, status: 1, createdAt: -1 });