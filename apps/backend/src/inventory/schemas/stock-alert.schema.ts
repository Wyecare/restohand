import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type StockAlertDocument = StockAlert & Document;

@Schema({
  timestamps: true,
  collection: 'stock_alerts',
})
export class StockAlert {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'InventoryItem', required: true, index: true })
  inventoryItemId!: string;

  @Prop({
    type: String,
    enum: ['low_stock', 'out_of_stock', 'expiry_warning', 'reorder_point'],
    required: true,
    index: true
  })
  type!: 'low_stock' | 'out_of_stock' | 'expiry_warning' | 'reorder_point';

  @Prop({
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: true,
    default: 'warning'
  })
  severity!: 'critical' | 'warning' | 'info';

  @Prop({ type: String, required: true, trim: true })
  message!: string;

  @Prop({ type: Number })
  currentStock?: number;

  @Prop({ type: Number })
  minimumStock?: number;

  @Prop({ type: Date })
  expiryDate?: Date;

  @Prop({ type: Boolean, default: false, index: true })
  isRead!: boolean;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  readBy?: string;

  @Prop({ type: Date })
  resolvedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  resolvedBy?: string;

  @Prop({ type: String, trim: true })
  resolution?: string;
}

export const StockAlertSchema = SchemaFactory.createForClass(StockAlert);

// Indexes for performance
StockAlertSchema.index({ restaurantId: 1, isActive: 1, createdAt: -1 });
StockAlertSchema.index({ restaurantId: 1, type: 1, isActive: 1 });
StockAlertSchema.index({ restaurantId: 1, severity: 1, isActive: 1 });
StockAlertSchema.index({ restaurantId: 1, isRead: 1, isActive: 1 });