import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type KitchenStationDocument = KitchenStation & Document;

export enum StationType {
  GRILL = 'grill',
  FRYER = 'fryer',
  SALAD = 'salad',
  BEVERAGE = 'beverage',
  DESSERT = 'dessert',
  PREPARATION = 'preparation',
  GENERAL = 'general',
}

@Schema({
  timestamps: true,
  collection: 'kitchen_stations',
})
export class KitchenStation {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(StationType),
    required: true,
    index: true,
  })
  type!: StationType;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Number, default: 1, min: 1 })
  capacity!: number; // Number of parallel orders this station can handle

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  displayOrder!: number;

  // Performance tracking
  @Prop({ type: Number, default: 0 })
  currentLoad!: number; // Number of orders currently assigned

  @Prop({ type: Number, default: 15 }) // minutes
  avgPrepTime!: number; // Average preparation time in minutes

  @Prop({ type: Number, default: 0 })
  todayOrdersCount!: number;

  @Prop({ type: Number, default: 0 })
  todayAvgPrepTime!: number;

  @Prop({ type: Date })
  lastOrderAt?: Date;
}

export const KitchenStationSchema = SchemaFactory.createForClass(KitchenStation);

// Indexes for efficient querying
KitchenStationSchema.index({ restaurantId: 1, type: 1 });
KitchenStationSchema.index({ restaurantId: 1, isActive: 1 });
KitchenStationSchema.index({ restaurantId: 1, displayOrder: 1 });