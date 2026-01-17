import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type MenuAddonDocument = MenuAddon & Document;

@Schema({ _id: false })
class AddonOption {
  @ApiProperty({ description: 'Option name in English' })
  @Prop({ type: String, required: true, trim: true })
  nameEn: string;

  @ApiProperty({ description: 'Option name in Arabic' })
  @Prop({ type: String, trim: true })
  nameAr?: string;

  @ApiProperty({ description: 'Additional price for this option' })
  @Prop({ type: Number, min: 0, default: 0 })
  additionalPrice: number;

  @ApiProperty({ description: 'Is option available', default: true })
  @Prop({ type: Boolean, default: true })
  isAvailable: boolean;

  @ApiProperty({ description: 'Display order for this option' })
  @Prop({ type: Number, default: 0 })
  displayOrder: number;
}

const AddonOptionSchema = SchemaFactory.createForClass(AddonOption);

@Schema({
  collection: 'menu_addons',
  timestamps: true,
  versionKey: false,
})
export class MenuAddon {
  @ApiProperty({ description: 'Restaurant ID' })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  })
  restaurantId: Types.ObjectId;

  @ApiProperty({ description: 'Addon name in English (e.g., "Size", "Toppings")' })
  @Prop({ type: String, required: true, trim: true })
  nameEn: string;

  @ApiProperty({ description: 'Addon name in Arabic' })
  @Prop({ type: String, trim: true })
  nameAr?: string;

  @ApiProperty({ description: 'Addon description in English' })
  @Prop({ type: String, trim: true, maxlength: 500 })
  descriptionEn?: string;

  @ApiProperty({ description: 'Addon description in Arabic' })
  @Prop({ type: String, trim: true, maxlength: 500 })
  descriptionAr?: string;

  @ApiProperty({ description: 'Addon type', enum: ['single_select', 'multi_select', 'quantity'] })
  @Prop({ type: String, enum: ['single_select', 'multi_select', 'quantity'], required: true })
  type: string;

  @ApiProperty({ description: 'Is this addon required for ordering', default: false })
  @Prop({ type: Boolean, default: false })
  isRequired: boolean;

  @ApiProperty({ description: 'Maximum selections allowed (for multi_select)', default: 1 })
  @Prop({ type: Number, min: 1, default: 1 })
  maxSelections: number;

  @ApiProperty({ description: 'Minimum selections required (for multi_select)', default: 0 })
  @Prop({ type: Number, min: 0, default: 0 })
  minSelections: number;

  @ApiProperty({ description: 'Available options for this addon' })
  @Prop({ type: [AddonOptionSchema], default: [] })
  options: AddonOption[];

  @ApiProperty({ description: 'Display order for addon' })
  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  @ApiProperty({ description: 'Is addon available', default: true })
  @Prop({ type: Boolean, default: true })
  isAvailable: boolean;

  @ApiProperty({ description: 'Addon status', enum: ['Active', 'Inactive'], default: 'Active' })
  @Prop({ type: String, enum: ['Active', 'Inactive'], default: 'Active' })
  status: string;

  @ApiProperty({ description: 'Data source', enum: ['manual', 'pdf_extraction', 'import'], default: 'manual' })
  @Prop({ type: String, enum: ['manual', 'pdf_extraction', 'import'], default: 'manual' })
  source: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export const MenuAddonSchema = SchemaFactory.createForClass(MenuAddon);

// Indexes
MenuAddonSchema.index({ restaurantId: 1, displayOrder: 1 });
MenuAddonSchema.index({ restaurantId: 1, status: 1 });
MenuAddonSchema.index({ restaurantId: 1, type: 1 });