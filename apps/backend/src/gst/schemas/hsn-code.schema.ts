import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HsnCodeDocument = HsnCode & Document;

@Schema({
  timestamps: true,
  collection: 'hsn_codes',
})
export class HsnCode {
  @Prop({ type: String, required: true, unique: true, index: true })
  code!: string; // HSN code (e.g., '1006' for rice)

  @Prop({ type: String, required: true, trim: true })
  description!: string; // Description of the HSN code

  @Prop({ type: String, trim: true })
  chapter?: string; // HSN chapter

  @Prop({ type: String, trim: true })
  heading?: string; // HSN heading

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  defaultGstRate!: number; // Default GST rate for this HSN code

  @Prop({ type: [String], default: [] })
  keywords!: string[]; // Search keywords (e.g., ['rice', 'basmati', 'grain'])

  @Prop({ type: String, enum: ['food', 'beverage', 'other'], default: 'food' })
  category!: 'food' | 'beverage' | 'other';

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: false })
  isPopular!: boolean; // Mark frequently used HSN codes
}

export const HsnCodeSchema = SchemaFactory.createForClass(HsnCode);

// Text search index for keywords and description
HsnCodeSchema.index({
  description: 'text',
  keywords: 'text'
}, {
  weights: {
    description: 10,
    keywords: 5
  }
});

// Index for efficient filtering
HsnCodeSchema.index({ category: 1, isActive: 1, isPopular: -1 });