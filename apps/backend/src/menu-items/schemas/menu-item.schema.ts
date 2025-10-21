import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type MenuItemDocument = MenuItem & Document;

@Schema({ _id: false })
class MenuItemPricing {
  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ default: false })
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

  @Prop({ trim: true })
  categoryId?: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  @Prop({ type: MenuItemPricingSchema, required: true })
  pricing!: MenuItemPricing;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ default: true })
  isAvailable!: boolean;

  @Prop({ default: 0 })
  displayOrder!: number;

  @Prop({ type: [String], default: [] })
  imageUrls!: string[];
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

MenuItemSchema.index({ restaurantId: 1, categoryId: 1, displayOrder: 1 });
