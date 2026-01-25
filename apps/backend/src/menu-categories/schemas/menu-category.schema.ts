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

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', index: true })
  branchId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, maxlength: 300 })
  description?: string;

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: String, trim: true })
  imageUrl?: string;
}

export const MenuCategorySchema = SchemaFactory.createForClass(MenuCategory);

MenuCategorySchema.index({ restaurantId: 1, branchId: 1, displayOrder: 1 });
MenuCategorySchema.index({ branchId: 1, displayOrder: 1 });
