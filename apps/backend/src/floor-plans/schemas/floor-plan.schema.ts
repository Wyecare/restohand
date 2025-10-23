import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { FloorPlanDivider, FloorPlanDividerSchema, FloorPlanSection, FloorPlanSectionSchema, FloorPlanDecoration, FloorPlanDecorationSchema } from './floor-plan-elements.schema';

export type FloorPlanDocument = FloorPlan & Document;

@Schema({ _id: false })
class FloorPlanTable {
  @Prop({ type: String, required: true, trim: true })
  id!: string;

  @Prop({ type: Number, required: true })
  x!: number;

  @Prop({ type: Number, required: true })
  y!: number;

  @Prop({ type: Number, required: true, min: 40 })
  width!: number;

  @Prop({ type: Number, required: true, min: 40 })
  height!: number;

  @Prop({ type: Number, default: 0 })
  rotation!: number;

  @Prop({
    type: String,
    enum: ['rectangle', 'circle', 'square'],
    default: 'rectangle'
  })
  shape!: 'rectangle' | 'circle' | 'square';

  @Prop({ type: String, required: true, trim: true })
  label!: string;

  @Prop({ type: Number, required: true, min: 1, max: 20 })
  capacity!: number;

  @Prop({ type: String, trim: true })
  zone?: string;

  @Prop({ type: String, trim: true })
  color?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'RestaurantTable' })
  restaurantTableId?: string; // Link to actual table in restaurant_tables collection
}

const FloorPlanTableSchema = SchemaFactory.createForClass(FloorPlanTable);

@Schema({ _id: false })
class FloorPlanMetadata {
  @Prop({ type: Number, required: true, min: 400, max: 4000 })
  canvasWidth!: number;

  @Prop({ type: Number, required: true, min: 300, max: 3000 })
  canvasHeight!: number;

  @Prop({ type: String, default: '#f8fafc' })
  backgroundColor?: string;

  @Prop({ type: String, trim: true })
  backgroundImage?: string;

  @Prop({ type: Number, default: 1, min: 0.1, max: 3 })
  gridSize!: number;

  @Prop({ type: Boolean, default: true })
  showGrid!: boolean;

  @Prop({ type: Number, default: 1, min: 0.5, max: 2 })
  zoomLevel!: number;
}

const FloorPlanMetadataSchema = SchemaFactory.createForClass(FloorPlanMetadata);

@Schema({
  timestamps: true,
  collection: 'floor_plans',
})
export class FloorPlan {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  description?: string;

  @Prop({ type: [FloorPlanTableSchema], default: [] })
  tables!: FloorPlanTable[];

  @Prop({ type: [FloorPlanSectionSchema], default: [] })
  sections!: FloorPlanSection[];

  @Prop({ type: [FloorPlanDividerSchema], default: [] })
  dividers!: FloorPlanDivider[];

  @Prop({ type: [FloorPlanDecorationSchema], default: [] })
  decorations!: FloorPlanDecoration[];

  @Prop({ type: FloorPlanMetadataSchema, required: true })
  metadata!: FloorPlanMetadata;

  @Prop({ type: Boolean, default: false })
  isActive!: boolean; // Only one active floor plan per restaurant

  @Prop({ type: String, trim: true })
  version?: string;

  @Prop({ type: Date })
  lastUsedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  lastModifiedBy?: string;
}

export const FloorPlanSchema = SchemaFactory.createForClass(FloorPlan);

// Indexes
FloorPlanSchema.index({ restaurantId: 1, isActive: 1 });
FloorPlanSchema.index({ restaurantId: 1, name: 1 });
FloorPlanSchema.index({ restaurantId: 1, lastUsedAt: -1 });