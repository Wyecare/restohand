import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ZoneDocument = Zone & Document;

@Schema({ timestamps: true })
export class Zone {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);

// Ensure zone names are unique per restaurant and branch
ZoneSchema.index({ restaurantId: 1, branchId: 1, name: 1 }, { unique: true });
ZoneSchema.index({ branchId: 1, isActive: 1 });