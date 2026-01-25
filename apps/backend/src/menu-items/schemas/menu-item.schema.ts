import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type MenuItemDocument = MenuItem & Document;

@Schema({ _id: false })
class MenuItemPricing {
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, required: true, default: 'INR' })
  currency!: string;

  @Prop({ type: Boolean, default: false })
  isTaxInclusive!: boolean;
}

const MenuItemPricingSchema = SchemaFactory.createForClass(MenuItemPricing);

@Schema({
  timestamps: true,
  collection: 'menu_items',
})
export class MenuItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', index: true })
  branchId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'MenuCategory', trim: true })
  categoryId?: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  description?: string;

  @Prop({ type: MenuItemPricingSchema, required: true })
  pricing!: MenuItemPricing;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Boolean, default: true })
  isAvailable!: boolean;

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;

  @Prop({ type: [String], default: [] })
  imageUrls!: string[];

  // Smart GST Configuration
  @Prop({
    type: String,
    enum: ['cooked_food', 'fresh_items', 'packaged_items', 'beverages', 'alcohol', 'sweets', 'ice_cream'],
    default: 'cooked_food'
  })
  foodCategory!: 'cooked_food' | 'fresh_items' | 'packaged_items' | 'beverages' | 'alcohol' | 'sweets' | 'ice_cream';

  @Prop({ type: String, trim: true })
  hsnCode!: string; // Auto-assigned based on foodCategory

  @Prop({ type: Number, min: 0, max: 100 })
  gstRate!: number; // Auto-calculated based on category + restaurant config

  @Prop({ type: Number, min: 0, max: 100 })
  overrideGstRate?: number; // Manual override for special cases

  @Prop({ type: Boolean, default: false })
  exemptFromGst!: boolean; // Auto-set for fresh items, alcohol

  @Prop({ type: Boolean, default: false })
  useStateVat!: boolean; // Auto-set for alcohol

  @Prop({ type: Number, min: 0, max: 1, default: 1 })
  categoryConfidence!: number; // How confident the auto-detection was
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

MenuItemSchema.index({ restaurantId: 1, branchId: 1, categoryId: 1, displayOrder: 1 });
MenuItemSchema.index({ branchId: 1, categoryId: 1 });
