import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type InventoryItemDocument = InventoryItem & Document;

@Schema({ _id: false })
class InventoryItemPricing {
  @Prop({ type: Number, required: true, min: 0 })
  costPerUnit!: number;

  @Prop({ type: String, required: true, default: 'INR' })
  currency!: string;

  @Prop({ type: Number, min: 0 })
  sellingPrice?: number;

  @Prop({ type: String, trim: true })
  supplier?: string;

  @Prop({ type: Date })
  lastPurchaseDate?: Date;
}

const InventoryItemPricingSchema = SchemaFactory.createForClass(InventoryItemPricing);

@Schema({ _id: false })
class StockLevels {
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  currentStock!: number;

  @Prop({ type: Number, required: true, min: 0 })
  minimumStock!: number;

  @Prop({ type: Number, min: 0 })
  maximumStock?: number;

  @Prop({ type: Number, min: 0 })
  reorderPoint!: number;

  @Prop({ type: Number, min: 0 })
  reorderQuantity!: number;
}

const StockLevelsSchema = SchemaFactory.createForClass(StockLevels);

@Schema({ _id: false })
class InventoryTracking {
  @Prop({ type: Date, default: Date.now })
  lastUpdated!: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  lastUpdatedBy?: string;

  @Prop({ type: Number, default: 0 })
  totalConsumed!: number; // Total consumed this month

  @Prop({ type: Number, default: 0 })
  totalPurchased!: number; // Total purchased this month

  @Prop({ type: Boolean, default: false })
  isLowStock!: boolean;

  @Prop({ type: Boolean, default: false })
  isOutOfStock!: boolean;
}

const InventoryTrackingSchema = SchemaFactory.createForClass(InventoryTracking);

@Schema({
  timestamps: true,
  collection: 'inventory_items',
})
export class InventoryItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, required: true, trim: true })
  category!: string; // 'vegetables', 'meat', 'dairy', 'spices', 'beverages', etc.

  @Prop({ type: String, required: true, trim: true })
  unit!: string; // 'kg', 'liters', 'pieces', 'boxes', etc.

  @Prop({ type: String, trim: true })
  sku?: string; // Stock Keeping Unit

  @Prop({ type: String, trim: true })
  barcode?: string;

  @Prop({ type: InventoryItemPricingSchema, required: true })
  pricing!: InventoryItemPricing;

  @Prop({ type: StockLevelsSchema, required: true })
  stockLevels!: StockLevels;

  @Prop({ type: InventoryTrackingSchema, default: () => ({}) })
  tracking!: InventoryTracking;

  @Prop({ type: [String], default: [] })
  tags!: string[]; // 'perishable', 'frozen', 'organic', etc.

  @Prop({ type: Date })
  expiryDate?: Date;

  @Prop({ type: Number, min: 0 })
  shelfLifeDays?: number; // Days until expiry for perishable items

  @Prop({ type: String, trim: true })
  storageLocation?: string; // 'freezer', 'pantry', 'cold storage', etc.

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: true })
  trackStock!: boolean; // Whether to track this item's stock

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'MenuItem' })
  usedInMenuItems!: string[]; // Menu items that use this ingredient
}

export const InventoryItemSchema = SchemaFactory.createForClass(InventoryItem);

// Indexes for performance
InventoryItemSchema.index({ restaurantId: 1, name: 1 });
InventoryItemSchema.index({ restaurantId: 1, category: 1 });
InventoryItemSchema.index({ restaurantId: 1, 'tracking.isLowStock': 1 });
InventoryItemSchema.index({ restaurantId: 1, 'tracking.isOutOfStock': 1 });
InventoryItemSchema.index({ restaurantId: 1, isActive: 1 });