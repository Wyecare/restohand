import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type MenuPriceTagDocument = MenuPriceTag & Document;

@Schema({ _id: false })
class PriceTagRule {
  @Prop({ type: String, enum: ['always', 'date_range', 'day_of_week', 'time_range'], required: true })
  type!: 'always' | 'date_range' | 'day_of_week' | 'time_range';

  @Prop({ type: Date })
  startDate?: Date; // For date_range

  @Prop({ type: Date })
  endDate?: Date; // For date_range

  @Prop({ type: [Number] }) // 0=Sunday, 1=Monday, etc.
  daysOfWeek?: number[]; // For day_of_week

  @Prop({ type: String }) // Format: "HH:MM"
  startTime?: string; // For time_range

  @Prop({ type: String }) // Format: "HH:MM"
  endTime?: string; // For time_range
}

const PriceTagRuleSchema = SchemaFactory.createForClass(PriceTagRule);

@Schema({ _id: false })
class ItemPriceOverride {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'MenuItem', required: true })
  menuItemId!: string;

  @Prop({ type: Number, required: true, min: 0 })
  price!: number;

  @Prop({ type: String, default: 'INR' })
  currency!: string;

  @Prop({ type: String, enum: ['fixed', 'percentage_off', 'amount_off'], default: 'fixed' })
  discountType!: 'fixed' | 'percentage_off' | 'amount_off';

  @Prop({ type: Number, min: 0 })
  discountValue?: number; // Percentage (0-100) or fixed amount

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

const ItemPriceOverrideSchema = SchemaFactory.createForClass(ItemPriceOverride);

@Schema({
  timestamps: true,
  collection: 'menu_price_tags',
})
export class MenuPriceTag {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string; // e.g., "Weekend Special", "Happy Hour", "Christmas Offer"

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, required: true })
  color!: string; // Hex color for UI identification

  @Prop({ type: Boolean, default: false })
  isActive!: boolean; // Only one price tag can be active per branch at a time

  @Prop({ type: Boolean, default: false })
  isDefault!: boolean; // The default/regular pricing

  @Prop({ type: Number, default: 0 })
  priority!: number; // Higher number = higher priority when multiple tags could apply

  @Prop({ type: PriceTagRuleSchema })
  applicabilityRule?: PriceTagRule; // When this price tag should be applied

  @Prop({ type: [ItemPriceOverrideSchema], default: [] })
  itemPrices!: ItemPriceOverride[]; // Specific prices for items

  @Prop({ type: Boolean, default: false })
  autoActivate!: boolean; // Automatically activate based on rules

  @Prop({ type: Date })
  activatedAt?: Date;

  @Prop({ type: Date })
  deactivatedAt?: Date;

  @Prop({ type: String })
  activatedBy?: string; // User ID who activated this tag

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;
}

export const MenuPriceTagSchema = SchemaFactory.createForClass(MenuPriceTag);

// Indexes for performance
MenuPriceTagSchema.index({ restaurantId: 1, branchId: 1, isActive: 1 });
MenuPriceTagSchema.index({ branchId: 1, isDefault: 1 });
MenuPriceTagSchema.index({ 'itemPrices.menuItemId': 1 });
MenuPriceTagSchema.index({ priority: -1, displayOrder: 1 });