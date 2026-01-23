import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type OrderStationAssignmentDocument = OrderStationAssignment & Document;

export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Schema({
  timestamps: true,
  collection: 'order_station_assignments',
})
export class OrderStationAssignment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', required: true, index: true })
  orderId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  orderNumber!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'KitchenStation', required: true, index: true })
  stationId!: string;

  @Prop({ type: String, required: true, trim: true })
  stationName!: string;

  @Prop({
    type: String,
    enum: Object.values(AssignmentStatus),
    default: AssignmentStatus.ASSIGNED,
    index: true,
  })
  status!: AssignmentStatus;

  @Prop({ type: Number, default: 1, min: 1 })
  estimatedPrepTime!: number; // in minutes

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number })
  actualPrepTime?: number; // calculated when completed

  @Prop({ type: String, trim: true })
  notes?: string;

  // Which menu items from the order are assigned to this station
  @Prop({ type: [String], default: [] })
  menuItemIds!: string[];
}

export const OrderStationAssignmentSchema = SchemaFactory.createForClass(OrderStationAssignment);

// Indexes for efficient querying
OrderStationAssignmentSchema.index({ orderId: 1, stationId: 1 });
OrderStationAssignmentSchema.index({ restaurantId: 1, status: 1 });
OrderStationAssignmentSchema.index({ stationId: 1, status: 1 });
OrderStationAssignmentSchema.index({ restaurantId: 1, stationId: 1, status: 1 });