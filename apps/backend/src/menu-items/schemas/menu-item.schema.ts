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

@Schema({ _id: false })
class NutritionalInfo {
  @Prop({ type: Number, min: 0 })
  calories?: number;

  @Prop({ type: Number, min: 0 })
  protein?: number; // grams

  @Prop({ type: Number, min: 0 })
  carbohydrates?: number; // grams

  @Prop({ type: Number, min: 0 })
  fat?: number; // grams

  @Prop({ type: Number, min: 0 })
  fiber?: number; // grams

  @Prop({ type: Number, min: 0 })
  sugar?: number; // grams

  @Prop({ type: Number, min: 0 })
  sodium?: number; // milligrams

  @Prop({ type: String })
  servingSize?: string; // e.g., "1 slice", "100g"
}

const NutritionalInfoSchema = SchemaFactory.createForClass(NutritionalInfo);

@Schema({ _id: false })
class Ingredient {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  quantity?: string; // e.g., "2 cups", "100g"

  @Prop({ type: [String], default: [] })
  allergens!: string[]; // Common allergens

  @Prop({ type: Boolean, default: false })
  isOptional!: boolean;

  @Prop({ type: Boolean, default: false })
  isOrganic!: boolean;

  @Prop({ type: Boolean, default: false })
  isVegan!: boolean;

  @Prop({ type: Boolean, default: false })
  isVegetarian!: boolean;

  @Prop({ type: Boolean, default: false })
  isGlutenFree!: boolean;

  @Prop({ type: Boolean, default: false })
  isDairyFree!: boolean;
}

const IngredientSchema = SchemaFactory.createForClass(Ingredient);

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

  // Enhanced POS Features
  @Prop({ type: NutritionalInfoSchema })
  nutritionalInfo?: NutritionalInfo;

  @Prop({ type: [IngredientSchema], default: [] })
  ingredients!: Ingredient[];

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'MenuModifier', default: [] })
  applicableModifiers!: string[]; // Modifiers that can be applied to this item

  // Special Pricing System
  @Prop({ type: Boolean, default: false })
  hasSpecialPrice!: boolean; // Whether special pricing is active

  @Prop({ type: Number, min: 0 })
  specialPrice?: number; // Special/discounted price

  @Prop({ type: String, trim: true })
  specialPriceLabel?: string; // e.g., "Happy Hour", "Weekend Special"

  // Dietary Information (can be computed from ingredients or manually set)
  @Prop({ type: Object })
  dietaryInfo?: {
    isVegan?: boolean;
    isVegetarian?: boolean;
    isGlutenFree?: boolean;
    isDairyFree?: boolean;
    isNutFree?: boolean;
    isSpicy?: boolean;
    isHalal?: boolean;
    isKosher?: boolean;
  };

  // Legacy dietary flags (computed from ingredients)
  @Prop({ type: Boolean, default: false })
  isVegan!: boolean;

  @Prop({ type: Boolean, default: false })
  isVegetarian!: boolean;

  @Prop({ type: Boolean, default: false })
  isGlutenFree!: boolean;

  @Prop({ type: Boolean, default: false })
  isDairyFree!: boolean;

  @Prop({ type: Boolean, default: false })
  hasNuts!: boolean;

  @Prop({ type: [String], default: [] })
  allergens!: string[]; // Aggregated from ingredients

  // Preparation Information
  @Prop({ type: String, maxlength: 100 })
  preparationTime?: string;

  @Prop({ type: String, maxlength: 500 })
  preparationInstructions?: string;

  @Prop({ type: String, enum: ['easy', 'medium', 'hard'] })
  preparationDifficulty?: 'easy' | 'medium' | 'hard';

  @Prop({ type: [String], default: [] })
  kitchenStations!: string[]; // Which kitchen stations need to prepare this item
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

MenuItemSchema.index({ restaurantId: 1, branchId: 1, categoryId: 1, displayOrder: 1 });
MenuItemSchema.index({ branchId: 1, categoryId: 1 });
MenuItemSchema.index({ applicableModifiers: 1 });
MenuItemSchema.index({ isVegan: 1, isVegetarian: 1, isGlutenFree: 1 });
MenuItemSchema.index({ allergens: 1 });
