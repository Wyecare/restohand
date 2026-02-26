import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type TransferOrderDocument = TransferOrder & Document;

@Schema({ _id: false })
class TransferOrderItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'InventoryItem', required: true })
  inventoryItemId!: string;

  @Prop({ type: Number, required: true, min: 0 })
  requestedQuantity!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  approvedQuantity!: number; // May be different from requested

  @Prop({ type: Number, default: 0, min: 0 })
  transferredQuantity!: number; // Actual quantity transferred

  @Prop({ type: Number, min: 0 })
  unitCost?: number; // Cost at source branch

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'partial', 'transferred', 'cancelled'],
    default: 'pending'
  })
  status!: 'pending' | 'approved' | 'partial' | 'transferred' | 'cancelled';
}

const TransferOrderItemSchema = SchemaFactory.createForClass(TransferOrderItem);

@Schema({ _id: false })
class TransferTracking {
  @Prop({ type: Date })
  requestedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  requestedBy?: string;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  approvedBy?: string;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  sentBy?: string;

  @Prop({ type: Date })
  receivedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  receivedBy?: string;

  @Prop({ type: String, trim: true })
  rejectionReason?: string;

  @Prop({ type: Date })
  rejectedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  rejectedBy?: string;
}

const TransferTrackingSchema = SchemaFactory.createForClass(TransferTracking);

@Schema({
  timestamps: true,
  collection: 'transfer_orders',
})
export class TransferOrder {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  sourceBranchId!: string; // Branch sending items

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  destinationBranchId!: string; // Branch receiving items

  @Prop({ type: String, required: true, unique: true })
  transferNumber!: string; // Auto-generated: TR-YYYYMMDD-001

  @Prop({
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'in_transit', 'partial', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  })
  status!: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_transit' | 'partial' | 'completed' | 'cancelled';

  @Prop({ type: [TransferOrderItemSchema], required: true })
  items!: TransferOrderItem[];

  @Prop({ type: Number, default: 0, min: 0 })
  totalValue!: number; // Total value of items being transferred

  @Prop({ type: Date })
  requestedDeliveryDate?: Date;

  @Prop({ type: String, trim: true })
  reason!: string; // Why this transfer is needed

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: TransferTrackingSchema, default: () => ({}) })
  tracking!: TransferTracking;

  @Prop({
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  })
  priority!: 'low' | 'normal' | 'high' | 'urgent';

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  createdBy!: string;

  // Related stock movements (created when transfer is completed)
  @Prop({ type: [SchemaTypes.ObjectId], ref: 'StockMovement', default: [] })
  stockMovementIds!: string[];
}

export const TransferOrderSchema = SchemaFactory.createForClass(TransferOrder);

// Indexes for performance
TransferOrderSchema.index({ restaurantId: 1, createdAt: -1 });
TransferOrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
TransferOrderSchema.index({ sourceBranchId: 1, status: 1, createdAt: -1 });
TransferOrderSchema.index({ destinationBranchId: 1, status: 1, createdAt: -1 });
TransferOrderSchema.index({ transferNumber: 1 }, { unique: true });
TransferOrderSchema.index({ restaurantId: 1, sourceBranchId: 1, destinationBranchId: 1 });