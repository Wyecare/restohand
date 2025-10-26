import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type GstRateDocument = GstRate & Document;

@Schema({
  timestamps: true,
  collection: 'gst_rates',
})
export class GstRate {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: String, trim: true, default: 'Standard GST' })
  categoryName!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  cgstRate!: number; // Central GST rate (e.g., 2.5%)

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  sgstRate!: number; // State GST rate (e.g., 2.5%)

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  igstRate!: number; // Integrated GST rate (e.g., 5%)

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  totalGstRate!: number; // Total GST rate (CGST + SGST or IGST)

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: false })
  isDefault!: boolean; // Default rate for new menu items

  @Prop({ type: Date })
  effectiveFrom!: Date;

  @Prop({ type: Date })
  effectiveTo?: Date;

  @Prop({ type: String, trim: true })
  notes?: string;
}

export const GstRateSchema = SchemaFactory.createForClass(GstRate);

// Indexes for efficient queries
GstRateSchema.index({ restaurantId: 1, isActive: 1, effectiveFrom: -1 });
GstRateSchema.index({ restaurantId: 1, isDefault: 1 });
