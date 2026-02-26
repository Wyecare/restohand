import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type InventoryCountDocument = InventoryCount & Document;

@Schema({ _id: false })
class CountItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'InventoryItem', required: true })
  inventoryItemId!: string;

  @Prop({ type: Number, required: true, min: 0 })
  systemCount!: number; // Current stock in system

  @Prop({ type: Number, required: true, min: 0 })
  physicalCount!: number; // Actual counted quantity

  @Prop({ type: Number, required: true })
  difference!: number; // physicalCount - systemCount

  @Prop({ type: Number, min: 0 })
  unitCost?: number; // Cost per unit at time of count

  @Prop({ type: Number })
  valueDifference?: number; // difference * unitCost

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  countedBy?: string;

  @Prop({ type: Date })
  countedAt?: Date;
}

const CountItemSchema = SchemaFactory.createForClass(CountItem);

@Schema({ _id: false })
class CountSummary {
  @Prop({ type: Number, default: 0 })
  totalItems!: number;

  @Prop({ type: Number, default: 0 })
  itemsWithVariance!: number;

  @Prop({ type: Number, default: 0 })
  totalSystemValue!: number;

  @Prop({ type: Number, default: 0 })
  totalPhysicalValue!: number;

  @Prop({ type: Number, default: 0 })
  totalVarianceValue!: number;

  @Prop({ type: Number, default: 0 })
  variancePercentage!: number; // (totalVarianceValue / totalSystemValue) * 100
}

const CountSummarySchema = SchemaFactory.createForClass(CountSummary);

@Schema({
  timestamps: true,
  collection: 'inventory_counts',
})
export class InventoryCount {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: string;

  @Prop({ type: String, required: true, unique: true })
  countNumber!: string; // Auto-generated: IC-YYYYMMDD-001

  @Prop({ type: String, required: true, trim: true })
  name!: string; // e.g., "Monthly Stock Count - January 2024"

  @Prop({
    type: String,
    enum: ['draft', 'in_progress', 'completed', 'approved', 'cancelled'],
    default: 'draft',
    index: true
  })
  status!: 'draft' | 'in_progress' | 'completed' | 'approved' | 'cancelled';

  @Prop({
    type: String,
    enum: ['spot_check', 'full_count', 'cycle_count', 'category_count'],
    required: true
  })
  countType!: 'spot_check' | 'full_count' | 'cycle_count' | 'category_count';

  @Prop({ type: [String], default: [] })
  categories!: string[]; // Specific categories to count (for category_count)

  @Prop({ type: [CountItemSchema], default: [] })
  items!: CountItem[];

  @Prop({ type: CountSummarySchema, default: () => ({}) })
  summary!: CountSummary;

  @Prop({ type: Date })
  scheduledDate?: Date;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: string;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'User', default: [] })
  assignedTo!: string[]; // Staff assigned to perform count

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  approvedBy?: string;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Boolean, default: false })
  updateSystemStock!: boolean; // Whether to update system stock with physical count

  @Prop({ type: Boolean, default: false })
  systemStockUpdated!: boolean; // Whether system stock has been updated

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'StockMovement', default: [] })
  adjustmentMovements!: string[]; // Stock movements created from this count

  @Prop({ type: Number, min: 0, max: 100 })
  accuracyThreshold?: number; // Acceptable variance percentage

  @Prop({ type: Boolean, default: false })
  requiresApproval!: boolean; // If variance exceeds threshold
}

export const InventoryCountSchema = SchemaFactory.createForClass(InventoryCount);

// Indexes for performance
InventoryCountSchema.index({ restaurantId: 1, createdAt: -1 });
InventoryCountSchema.index({ restaurantId: 1, branchId: 1, status: 1 });
InventoryCountSchema.index({ branchId: 1, status: 1, createdAt: -1 });
InventoryCountSchema.index({ countNumber: 1 }, { unique: true });
InventoryCountSchema.index({ restaurantId: 1, countType: 1, createdAt: -1 });
InventoryCountSchema.index({ assignedTo: 1, status: 1 });