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

  @Prop({ type: String, trim: true })
  hsnCode?: string; // HSN code for GST calculation

  @Prop({ type: SchemaTypes.ObjectId, ref: 'GstRate' })
  gstRateId?: string; // Reference to specific GST rate

  @Prop({ type: Number, min: 0, max: 100 })
  gstRate?: number; // Cached GST rate for quick calculation
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

MenuItemSchema.index({ restaurantId: 1, categoryId: 1, displayOrder: 1 });
