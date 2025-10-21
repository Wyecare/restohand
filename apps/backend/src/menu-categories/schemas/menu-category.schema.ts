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

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true, maxlength: 300 })
  description?: string;

  @Prop({ default: 0 })
  displayOrder!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const MenuCategorySchema = SchemaFactory.createForClass(MenuCategory);

MenuCategorySchema.index({ restaurantId: 1, displayOrder: 1 });
