import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type MenuModifierDocument = MenuModifier & Document;

@Schema({ _id: false })
class ModifierOption {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Number, default: 0, min: 0 })
  priceAdjustment!: number; // Additional cost for this option

  @Prop({ type: String, default: 'INR' })
  currency!: string;

  @Prop({ type: Boolean, default: true })
  isAvailable!: boolean;

  @Prop({ type: Boolean, default: true })
  inStock!: boolean;

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;

  @Prop({ type: String })
  imageUrl?: string;

  @Prop({ type: Number, default: 0, min: 0 })
  calories?: number;

  @Prop({ type: [String], default: [] })
  allergens!: string[]; // Common allergens like nuts, dairy, gluten
}

const ModifierOptionSchema = SchemaFactory.createForClass(ModifierOption);

@Schema({
  timestamps: true,
  collection: 'menu_modifiers',
})
export class MenuModifier {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string; // e.g., "Pizza Toppings", "Drink Size", "Spice Level"

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, enum: ['single', 'multiple'], default: 'single' })
  selectionType!: 'single' | 'multiple'; // Radio buttons vs checkboxes

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  minSelections!: number; // Minimum options to select (0 = optional)

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  maxSelections!: number; // Maximum options to select

  @Prop({ type: Number, default: 0, min: 0 })
  freeOptions!: number; // First N selections are free (no price added)

  @Prop({ type: Boolean, default: true })
  unique!: boolean; // If false, same option can be selected multiple times with quantity

  @Prop({ type: Boolean, default: false })
  isRequired!: boolean; // If true, customer must make a selection

  @Prop({ type: [ModifierOptionSchema], default: [] })
  options!: ModifierOption[];

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'MenuItem', default: [] })
  applicableMenuItems!: string[]; // Which menu items this modifier applies to

  @Prop({ type: [String], default: [] })
  applicableCategories!: string[]; // Or apply to entire categories
}

export const MenuModifierSchema = SchemaFactory.createForClass(MenuModifier);

// Indexes for performance
MenuModifierSchema.index({ restaurantId: 1, branchId: 1, displayOrder: 1 });
MenuModifierSchema.index({ branchId: 1, isActive: 1 });
MenuModifierSchema.index({ applicableMenuItems: 1 });
MenuModifierSchema.index({ applicableCategories: 1 });