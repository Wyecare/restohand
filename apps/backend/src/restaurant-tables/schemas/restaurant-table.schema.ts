import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type RestaurantTableDocument = RestaurantTable & Document;

@Schema({
  timestamps: true,
  collection: 'restaurant_tables',
})
export class RestaurantTable {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  tableNumber!: string;

  @Prop({ type: String, trim: true })
  displayName?: string;

  @Prop({ type: Number, min: 1, max: 20 })
  capacity?: number;

  @Prop({ type: String, trim: true })
  zone?: string;

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  // Layout positioning fields
  @Prop({ type: Number, default: 0 })
  layoutX?: number;

  @Prop({ type: Number, default: 0 })
  layoutY?: number;

  @Prop({ type: Number, default: 120 })
  layoutWidth?: number;

  @Prop({ type: Number, default: 80 })
  layoutHeight?: number;

  @Prop({ type: Number, default: 0 })
  layoutRotation?: number;
}

export const RestaurantTableSchema = SchemaFactory.createForClass(RestaurantTable);

RestaurantTableSchema.index(
  { restaurantId: 1, tableNumber: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
