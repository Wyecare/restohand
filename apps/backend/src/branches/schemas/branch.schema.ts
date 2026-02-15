import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ _id: false })
class BranchAddress {
  @Prop({ type: String, required: true, trim: true })
  line1!: string;

  @Prop({ type: String, trim: true })
  line2?: string;

  @Prop({ type: String, required: true, trim: true })
  city!: string;

  @Prop({ type: String, required: true, trim: true })
  state!: string;

  @Prop({ type: String, required: true, trim: true })
  postalCode!: string;

  @Prop({ type: String, required: true, trim: true, default: 'IN' })
  country!: string;
}

const BranchAddressSchema = SchemaFactory.createForClass(BranchAddress);

@Schema({ _id: false })
export class BranchCharge {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, enum: ['percentage', 'fixed'], required: true })
  type!: 'percentage' | 'fixed';

  @Prop({ type: Number, required: true, min: 0 })
  value!: number; // percentage (0-100) or fixed amount in paise

  @Prop({ type: String, enum: ['dine_in', 'takeout', 'delivery', 'all'], default: 'all' })
  applicableFor!: 'dine_in' | 'takeout' | 'delivery' | 'all';

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: false })
  includedInGst!: boolean; // whether this charge should be included in GST calculation

  @Prop({ type: Number, default: 0 })
  sortOrder!: number;
}

const BranchChargeSchema = SchemaFactory.createForClass(BranchCharge);

@Schema({ _id: false })
class BranchSettings {
  @Prop({ type: String, default: 'ORD' })
  orderNumberPrefix!: string;

  @Prop({ type: Boolean, default: true })
  enableTakeout!: boolean;

  @Prop({ type: Boolean, default: true })
  enableDineIn!: boolean;

  @Prop({ type: Boolean, default: false })
  enableDelivery!: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  deliveryRadius!: number; // in km

  @Prop({ type: Number, default: 0, min: 0 })
  deliveryFee!: number; // in paise

  @Prop({ type: Number, default: 0, min: 0 })
  minimumOrderValue!: number; // in paise

  @Prop({ type: String, trim: true })
  openingTime?: string; // HH:mm format

  @Prop({ type: String, trim: true })
  closingTime?: string; // HH:mm format

  @Prop({ type: [Number], default: [0, 1, 2, 3, 4, 5, 6] })
  operatingDays!: number[]; // 0=Sunday, 1=Monday, etc.

  @Prop({ type: [BranchChargeSchema], default: [] })
  charges!: BranchCharge[];
}

const BranchSettingsSchema = SchemaFactory.createForClass(BranchSettings);

@Schema({
  timestamps: true,
  collection: 'branches',
})
export class Branch {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: BranchAddressSchema, required: true })
  address!: BranchAddress;

  @Prop({ type: String, trim: true })
  contactPhone?: string;

  @Prop({ type: String, trim: true, lowercase: true })
  contactEmail?: string;

  @Prop({ type: Boolean, default: false, index: true })
  isMainBranch!: boolean;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: BranchSettingsSchema, default: () => ({}) })
  settings!: BranchSettings;

  @Prop({ type: String, trim: true })
  managerName?: string;

  @Prop({ type: String, trim: true })
  managerPhone?: string;

  @Prop({ type: Number, default: 0 })
  sortOrder!: number; // For ordering in lists

  @Prop({ type: Date })
  establishedDate?: Date;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

// Compound unique index for restaurant + slug
BranchSchema.index({ restaurantId: 1, slug: 1 }, { unique: true });

// Compound unique index to ensure only one main branch per restaurant
BranchSchema.index(
  { restaurantId: 1, isMainBranch: 1 },
  {
    unique: true,
    partialFilterExpression: { isMainBranch: true }
  }
);

// Performance indexes
BranchSchema.index({ restaurantId: 1, isActive: 1 });
BranchSchema.index({ restaurantId: 1, sortOrder: 1 });