import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type EnhancedMenuCategoryDocument = EnhancedMenuCategory & Document;

@Schema({
  collection: 'menu_categories',
  timestamps: true,
  versionKey: false,
})
export class EnhancedMenuCategory {
  @ApiProperty({ description: 'Restaurant ID' })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  })
  restaurantId: Types.ObjectId;

  @ApiProperty({ description: 'Category name in English' })
  @Prop({ type: String, required: true, trim: true })
  nameEn: string;

  @ApiProperty({ description: 'Category name in Arabic' })
  @Prop({ type: String, trim: true })
  nameAr?: string;

  @ApiProperty({ description: 'Category description in English' })
  @Prop({ type: String, trim: true, maxlength: 500 })
  descriptionEn?: string;

  @ApiProperty({ description: 'Category description in Arabic' })
  @Prop({ type: String, trim: true, maxlength: 500 })
  descriptionAr?: string;

  @ApiProperty({ description: 'Category image URL' })
  @Prop({ type: String, trim: true })
  imageUrl?: string;

  @ApiProperty({ description: 'Display order for sorting' })
  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  @ApiProperty({ description: 'Is category available for ordering', default: true })
  @Prop({ type: Boolean, default: true })
  isAvailable: boolean;

  @ApiProperty({ description: 'Is category blocked/hidden', default: false })
  @Prop({ type: Boolean, default: false })
  isBlocked: boolean;

  @ApiProperty({ description: 'Category status', enum: ['Active', 'Inactive'], default: 'Active' })
  @Prop({ type: String, enum: ['Active', 'Inactive'], default: 'Active' })
  status: string;

  @ApiProperty({ description: 'Data source', enum: ['manual', 'pdf_extraction', 'import'], default: 'manual' })
  @Prop({ type: String, enum: ['manual', 'pdf_extraction', 'import'], default: 'manual' })
  source: string;

  // GST Configuration for Category Default
  @ApiProperty({ description: 'Default GST rate ID for items in this category' })
  @Prop({ type: String, trim: true })
  defaultGstRateId?: string;

  @ApiProperty({ description: 'Default GST rate percentage' })
  @Prop({ type: Number, min: 0, max: 100 })
  defaultGstRate?: number;

  @ApiProperty({ description: 'GST category type' })
  @Prop({ type: String, trim: true })
  gstCategoryType?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export const EnhancedMenuCategorySchema = SchemaFactory.createForClass(EnhancedMenuCategory);

// Indexes
EnhancedMenuCategorySchema.index({ restaurantId: 1, displayOrder: 1 });
EnhancedMenuCategorySchema.index({ restaurantId: 1, status: 1, isBlocked: 1 });
EnhancedMenuCategorySchema.index({ restaurantId: 1, source: 1 });