import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type MenuCategoryDocument = MenuCategory & Document;

@Schema({
  timestamps: true,
  collection: 'menu_categories',
})
export class MenuCategory {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, maxlength: 300 })
  description?: string;

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  // GST Configuration for Category Default
  @Prop({ type: String, trim: true })
  defaultGstRateId?: string; // Predefined GST rate identifier (e.g., "food-5", "beverages-12")

  @Prop({ type: Number, min: 0, max: 100 })
  defaultGstRate?: number; // Default GST rate percentage for quick calculation

  @Prop({ type: String, trim: true })
  gstCategoryType?: string; // e.g., "Food", "Beverages", "Alcoholic Beverages"
}

export const MenuCategorySchema = SchemaFactory.createForClass(MenuCategory);

MenuCategorySchema.index({ restaurantId: 1, displayOrder: 1 });
