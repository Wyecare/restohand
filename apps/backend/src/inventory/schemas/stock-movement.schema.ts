import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type StockMovementDocument = StockMovement & Document;

@Schema({ _id: false })
class MovementDetails {
  @Prop({ type: Number, required: true })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitCost!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalCost!: number;

  @Prop({ type: String, trim: true })
  batchNumber?: string;

  @Prop({ type: Date })
  expiryDate?: Date;

  @Prop({ type: String, trim: true })
  supplier?: string;

  @Prop({ type: String, trim: true })
  invoiceNumber?: string;
}

const MovementDetailsSchema = SchemaFactory.createForClass(MovementDetails);

@Schema({
  timestamps: true,
  collection: 'stock_movements',
})
export class StockMovement {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', index: true })
  branchId?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'InventoryItem', required: true, index: true })
  inventoryItemId!: string;

  @Prop({
    type: String,
    enum: ['purchase', 'consumption', 'waste', 'adjustment', 'transfer'],
    required: true,
    index: true
  })
  type!: 'purchase' | 'consumption' | 'waste' | 'adjustment' | 'transfer';

  @Prop({
    type: String,
    enum: ['in', 'out'],
    required: true
  })
  direction!: 'in' | 'out';

  @Prop({ type: MovementDetailsSchema, required: true })
  details!: MovementDetails;

  @Prop({ type: Number, required: true })
  stockBefore!: number; // Stock level before this movement

  @Prop({ type: Number, required: true })
  stockAfter!: number; // Stock level after this movement

  @Prop({ type: String, trim: true })
  reason?: string; // Reason for adjustment/waste

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order' })
  orderId?: string; // If movement is due to order consumption

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Boolean, default: false })
  isAutomated!: boolean; // True if created automatically (e.g., from order)
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);

// Indexes for performance and analytics
StockMovementSchema.index({ restaurantId: 1, createdAt: -1 });
StockMovementSchema.index({ restaurantId: 1, inventoryItemId: 1, createdAt: -1 });
StockMovementSchema.index({ restaurantId: 1, type: 1, createdAt: -1 });
StockMovementSchema.index({ restaurantId: 1, direction: 1, createdAt: -1 });
StockMovementSchema.index({ branchId: 1, createdAt: -1 });
StockMovementSchema.index({ branchId: 1, inventoryItemId: 1, createdAt: -1 });
StockMovementSchema.index({ branchId: 1, type: 1, createdAt: -1 });