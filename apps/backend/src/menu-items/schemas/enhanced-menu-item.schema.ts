import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type EnhancedMenuItemDocument = EnhancedMenuItem & Document;

@Schema({ _id: false })
class NutritionalInfo {
  @ApiProperty({ description: 'Calories' })
  @Prop({ type: Number, min: 0 })
  calories?: number;

  @ApiProperty({ description: 'Protein (g)' })
  @Prop({ type: Number, min: 0 })
  protein?: number;

  @ApiProperty({ description: 'Carbs (g)' })
  @Prop({ type: Number, min: 0 })
  carbs?: number;

  @ApiProperty({ description: 'Fat (g)' })
  @Prop({ type: Number, min: 0 })
  fat?: number;
}

@Schema({ _id: false })
class MenuItemPricing {
  @ApiProperty({ description: 'Base price of the item' })
  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @ApiProperty({ description: 'Original price (for discount display)' })
  @Prop({ type: Number, min: 0 })
  originalPrice?: number;

  @ApiProperty({ description: 'Currency code', default: 'INR' })
  @Prop({ type: String, required: true, default: 'INR' })
  currency: string;

  @ApiProperty({ description: 'Is tax inclusive pricing', default: false })
  @Prop({ type: Boolean, default: false })
  isTaxInclusive: boolean;
}

const NutritionalInfoSchema = SchemaFactory.createForClass(NutritionalInfo);
const MenuItemPricingSchema = SchemaFactory.createForClass(MenuItemPricing);

@Schema({
  collection: 'menu_items',
  timestamps: true,
  versionKey: false,
})
export class EnhancedMenuItem {
  @ApiProperty({ description: 'Restaurant ID' })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  })
  restaurantId: Types.ObjectId;

  @ApiProperty({ description: 'Category ID' })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'EnhancedMenuCategory',
    required: true,
    index: true,
  })
  categoryId: Types.ObjectId;

  @ApiProperty({ description: 'Item name in English' })
  @Prop({ type: String, required: true, trim: true })
  nameEn: string;

  @ApiProperty({ description: 'Item name in Arabic' })
  @Prop({ type: String, trim: true })
  nameAr?: string;

  @ApiProperty({ description: 'Item description in English' })
  @Prop({ type: String, trim: true, maxlength: 1000 })
  descriptionEn?: string;

  @ApiProperty({ description: 'Item description in Arabic' })
  @Prop({ type: String, trim: true, maxlength: 1000 })
  descriptionAr?: string;

  @ApiProperty({ description: 'Primary image URL' })
  @Prop({ type: String, trim: true })
  imageUrl?: string;

  @ApiProperty({ description: 'Additional image URLs' })
  @Prop({ type: [String], default: [] })
  additionalImages: string[];

  @ApiProperty({ description: 'Item pricing information' })
  @Prop({ type: MenuItemPricingSchema, required: true })
  pricing: MenuItemPricing;

  @ApiProperty({ description: 'Display order for sorting' })
  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  @ApiProperty({ description: 'Is item available for ordering', default: true })
  @Prop({ type: Boolean, default: true })
  isAvailable: boolean;

  @ApiProperty({ description: 'Is item blocked/hidden', default: false })
  @Prop({ type: Boolean, default: false })
  isBlocked: boolean;

  @ApiProperty({ description: 'Item status', enum: ['Active', 'Inactive'], default: 'Active' })
  @Prop({ type: String, enum: ['Active', 'Inactive'], default: 'Active' })
  status: string;

  // Dietary & Lifestyle Information
  @ApiProperty({ description: 'Is vegetarian item', default: false })
  @Prop({ type: Boolean, default: false })
  isVeg: boolean;

  @ApiProperty({ description: 'Is vegan item', default: false })
  @Prop({ type: Boolean, default: false })
  isVegan: boolean;

  @ApiProperty({ description: 'Is gluten-free item', default: false })
  @Prop({ type: Boolean, default: false })
  isGlutenFree: boolean;

  @ApiProperty({ description: 'Contains allergens', type: [String] })
  @Prop({ type: [String], default: [] })
  allergens: string[];

  @ApiProperty({ description: 'Spice level', enum: ['None', 'Mild', 'Medium', 'Hot', 'Extra Hot'] })
  @Prop({ type: String, enum: ['None', 'Mild', 'Medium', 'Hot', 'Extra Hot'], default: 'None' })
  spiceLevel: string;

  @ApiProperty({ description: 'Preparation time in minutes' })
  @Prop({ type: Number, min: 0 })
  preparationTime?: number;

  @ApiProperty({ description: 'Nutritional information' })
  @Prop({ type: NutritionalInfoSchema })
  nutritionalInfo?: NutritionalInfo;

  @ApiProperty({ description: 'Item tags for filtering and search' })
  @Prop({ type: [String], default: [] })
  tags: string[];

  // GST Configuration
  @ApiProperty({ description: 'HSN code for GST calculation' })
  @Prop({ type: String, trim: true })
  hsnCode?: string;

  @ApiProperty({ description: 'GST rate ID' })
  @Prop({ type: String, trim: true })
  gstRateId?: string;

  @ApiProperty({ description: 'Cached GST rate for quick calculation' })
  @Prop({ type: Number, min: 0, max: 100 })
  gstRate?: number;

  // Add-ons and Customization
  @ApiProperty({ description: 'Associated addon IDs' })
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'MenuAddon' }], default: [] })
  addonIds: Types.ObjectId[];

  @ApiProperty({ description: 'Data source', enum: ['manual', 'pdf_extraction', 'import'], default: 'manual' })
  @Prop({ type: String, enum: ['manual', 'pdf_extraction', 'import'], default: 'manual' })
  source: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export const EnhancedMenuItemSchema = SchemaFactory.createForClass(EnhancedMenuItem);

// Indexes
EnhancedMenuItemSchema.index({ restaurantId: 1, categoryId: 1, displayOrder: 1 });
EnhancedMenuItemSchema.index({ restaurantId: 1, status: 1, isBlocked: 1 });
EnhancedMenuItemSchema.index({ restaurantId: 1, isVeg: 1, isVegan: 1 });
EnhancedMenuItemSchema.index({ restaurantId: 1, source: 1 });
EnhancedMenuItemSchema.index({ restaurantId: 1, tags: 1 });