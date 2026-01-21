import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type OrderModificationDocument = OrderModification & Document;

export enum ModificationType {
  ADD_ITEM = 'add_item',
  REMOVE_ITEM = 'remove_item',
  UPDATE_QUANTITY = 'update_quantity',
  UPDATE_NOTES = 'update_notes',
  CANCEL_ORDER = 'cancel_order',
}

export enum ModificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPLIED = 'applied',
}

@Schema({ _id: false })
class ModificationItemData {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'MenuItem' })
  menuItemId?: string;

  @Prop({ type: String, trim: true })
  name?: string;

  @Prop({ type: Number, min: 0 })
  quantity?: number;

  @Prop({ type: Number, min: 0 })
  unitAmount?: number;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Number, min: 0 })
  originalQuantity?: number;

  @Prop({ type: Number, min: 0 })
  newQuantity?: number;
}

const ModificationItemDataSchema = SchemaFactory.createForClass(ModificationItemData);

@Schema({
  timestamps: true,
  collection: 'order_modifications',
})
export class OrderModification {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', required: true, index: true })
  orderId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  orderNumber!: string;

  @Prop({
    type: String,
    enum: Object.values(ModificationType),
    required: true,
  })
  type!: ModificationType;

  @Prop({
    type: String,
    enum: Object.values(ModificationStatus),
    default: ModificationStatus.PENDING,
    index: true,
  })
  status!: ModificationStatus;

  @Prop({ type: ModificationItemDataSchema })
  itemData?: ModificationItemData;

  @Prop({ type: String, trim: true })
  reason?: string;

  @Prop({ type: String, trim: true })
  customerNotes?: string;

  @Prop({ type: Number, default: 0 })
  amountDifference!: number; // Positive for additional charges, negative for refunds

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  requestedBy?: string; // Customer or staff member who requested

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  processedBy?: string; // Staff member who processed the modification

  @Prop({ type: Date })
  processedAt?: Date;

  @Prop({ type: Date })
  appliedAt?: Date;

  @Prop({ type: String, trim: true })
  rejectionReason?: string;

  @Prop({ type: Boolean, default: false })
  notifyKitchen!: boolean;

  @Prop({ type: Boolean, default: false })
  kitchenNotified!: boolean;

  @Prop({ type: Date })
  kitchenNotifiedAt?: Date;
}

export const OrderModificationSchema = SchemaFactory.createForClass(OrderModification);

// Indexes for efficient querying
OrderModificationSchema.index({ orderId: 1, status: 1 });
OrderModificationSchema.index({ restaurantId: 1, status: 1 });
OrderModificationSchema.index({ orderNumber: 1 });