import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type TableStatusDocument = TableStatus & Document;

export enum TableStatusType {
  Available = 'available',
  Occupied = 'occupied',
  Reserved = 'reserved',
  NeedsAttention = 'needs_attention',
  Cleaning = 'cleaning',
  OutOfOrder = 'out_of_order'
}

export enum TablePriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent'
}

@Schema({ _id: false })
class TableOrder {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', required: true })
  orderId!: string;

  @Prop({ type: String, required: true, trim: true })
  orderNumber!: string;

  @Prop({ type: String, enum: ['pending', 'accepted', 'in_progress', 'ready', 'completed', 'cancelled'] })
  status!: string;

  @Prop({ type: Number, default: 0 })
  totalAmount!: number;

  @Prop({ type: Date })
  orderedAt!: Date;
}

const TableOrderSchema = SchemaFactory.createForClass(TableOrder);

@Schema({ _id: false })
class TableReservation {
  @Prop({ type: String, required: true, trim: true })
  guestName!: string;

  @Prop({ type: String, trim: true })
  guestPhone?: string;

  @Prop({ type: Number, required: true, min: 1 })
  partySize!: number;

  @Prop({ type: Date, required: true })
  reservedFrom!: Date;

  @Prop({ type: Date, required: true })
  reservedTo!: Date;

  @Prop({ type: String, trim: true })
  notes?: string;
}

const TableReservationSchema = SchemaFactory.createForClass(TableReservation);

@Schema({ _id: false })
class TableMetrics {
  @Prop({ type: Number, default: 0 })
  totalOrders!: number;

  @Prop({ type: Number, default: 0 })
  totalRevenue!: number;

  @Prop({ type: Number, default: 0 })
  averageOrderValue!: number;

  @Prop({ type: Number, default: 0 })
  occupancyMinutes!: number; // Total minutes occupied today

  @Prop({ type: Number, default: 0 })
  turnoverCount!: number; // Number of seatings today

  @Prop({ type: Date })
  lastOrderAt?: Date;

  @Prop({ type: Date })
  lastOccupiedAt?: Date;
}

const TableMetricsSchema = SchemaFactory.createForClass(TableMetrics);

@Schema({
  timestamps: true,
  collection: 'table_statuses',
})
export class TableStatus {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, index: true })
  tableId!: string; // Floor plan table ID

  @Prop({ type: String, required: true, trim: true })
  tableLabel!: string;

  @Prop({
    type: String,
    enum: Object.values(TableStatusType),
    default: TableStatusType.Available,
    index: true
  })
  status!: TableStatusType;

  @Prop({
    type: String,
    enum: Object.values(TablePriority),
    default: TablePriority.Normal
  })
  priority!: TablePriority;

  @Prop({ type: [TableOrderSchema], default: [] })
  currentOrders!: TableOrder[];

  @Prop({ type: TableReservationSchema })
  currentReservation?: TableReservation;

  @Prop({ type: Number, min: 0 })
  currentPartySize?: number;

  @Prop({ type: String, trim: true })
  assignedWaiter?: string; // User ID of assigned waiter

  @Prop({ type: String, trim: true })
  statusNote?: string;

  @Prop({ type: Date })
  statusChangedAt!: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  statusChangedBy?: string;

  @Prop({ type: Date })
  occupiedSince?: Date;

  @Prop({ type: Date })
  estimatedAvailableAt?: Date;

  @Prop({ type: TableMetricsSchema, default: () => ({}) })
  dailyMetrics!: TableMetrics;

  @Prop({ type: Date, default: Date.now })
  date!: Date; // For daily partitioning

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const TableStatusSchema = SchemaFactory.createForClass(TableStatus);

// Indexes for efficient queries
TableStatusSchema.index({ restaurantId: 1, tableId: 1, date: 1 }, { unique: true });
TableStatusSchema.index({ restaurantId: 1, status: 1 });
TableStatusSchema.index({ restaurantId: 1, assignedWaiter: 1 });
TableStatusSchema.index({ date: 1 }, { expireAfterSeconds: 86400 * 30 }); // Auto-delete after 30 days