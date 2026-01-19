import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type TableStatusDocument = TableStatus & Document;

export enum TableStatusType {
  Available = 'available',
  Occupied = 'occupied',
  Reserved = 'reserved',
  Cleaning = 'cleaning',
}

@Schema({
  timestamps: true,
  collection: 'table_statuses',
})
export class TableStatus {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'RestaurantTable', required: true, index: true })
  tableId!: string;

  @Prop({
    type: String,
    enum: Object.values(TableStatusType),
    default: TableStatusType.Available,
    index: true
  })
  status!: TableStatusType;

  @Prop({ type: Date, index: true })
  occupiedSince?: Date;

  @Prop({ type: Date })
  availableSince?: Date;

  @Prop({ type: Date })
  cleaningSince?: Date;

  @Prop({ type: Date })
  reservedFrom?: Date;

  @Prop({ type: Date })
  reservedUntil?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  assignedServerId?: string;

  @Prop({ type: String, trim: true })
  assignedServerName?: string;

  @Prop({ type: Number, min: 1, max: 20 })
  currentPartySize?: number;

  @Prop({ type: Number, default: 0 })
  currentBillAmount?: number;

  @Prop({ type: String, trim: true, maxlength: 500 })
  notes?: string;

  @Prop({ type: String, trim: true })
  reservationCustomerName?: string;

  @Prop({ type: String, trim: true })
  reservationCustomerPhone?: string;

  @Prop({ type: Number, min: 60, max: 300 })
  reservationEstimatedDuration?: number; // in minutes

  @Prop({ type: String, trim: true, maxlength: 500 })
  reservationSpecialRequests?: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  reservationNotes?: string;

  @Prop({ type: Date })
  lastStatusChange?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  lastUpdatedBy?: string;

  @Prop({ type: String, trim: true })
  lastUpdatedByName?: string;
}

export const TableStatusSchema = SchemaFactory.createForClass(TableStatus);

// Indexes for performance
TableStatusSchema.index({ restaurantId: 1, tableId: 1 }, { unique: true });
TableStatusSchema.index({ restaurantId: 1, status: 1 });
TableStatusSchema.index({ restaurantId: 1, assignedServerId: 1 });
TableStatusSchema.index({ occupiedSince: 1 });
TableStatusSchema.index({ reservedFrom: 1, reservedUntil: 1 });