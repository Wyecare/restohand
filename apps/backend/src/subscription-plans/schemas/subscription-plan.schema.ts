import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionPlanDocument = SubscriptionPlan & Document;

@Schema({ timestamps: true })
export class SubscriptionPlan {
  @Prop({ unique: true, sparse: true })
  cashfree_plan_id?: string;

  @Prop({ required: true })
  plan_name: string;

  @Prop({ required: true, enum: ['PERIODIC', 'ON_DEMAND'] })
  plan_type: string;

  @Prop({ required: true })
  plan_currency: string;

  @Prop()
  plan_recurring_amount: number;

  @Prop({ required: true })
  plan_max_amount: number;

  @Prop()
  plan_max_cycles: number;

  @Prop()
  plan_intervals: number;

  @Prop({ enum: ['DAY', 'WEEK', 'MONTH', 'YEAR'] })
  plan_interval_type: string;

  @Prop()
  plan_note: string;

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] })
  plan_status: string;

  // Our custom business fields
  @Prop({ default: true })
  is_active: boolean;

  @Prop()
  tier: string; // 'basic', 'professional', 'enterprise'

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: false })
  is_popular: boolean;

  @Prop({ default: false })
  is_template: boolean;

  @Prop()
  template_id: string; // Reference to template used

  @Prop()
  display_name: string;

  @Prop()
  description: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  // Audit fields
  @Prop({ required: true })
  created_by: string; // Admin user ID

  @Prop()
  updated_by: string;

  @Prop({ default: Date.now })
  created_at: Date;

  @Prop({ default: Date.now })
  updated_at: Date;

  // Sync status with Cashfree
  @Prop({ default: 'PENDING', enum: ['PENDING', 'SYNCED', 'FAILED'] })
  cashfree_sync_status: string;

  @Prop()
  cashfree_sync_error: string;

  @Prop()
  last_synced_at: Date;
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);

// Indexes
SubscriptionPlanSchema.index({ cashfree_plan_id: 1 });
SubscriptionPlanSchema.index({ tier: 1 });
SubscriptionPlanSchema.index({ is_active: 1 });
SubscriptionPlanSchema.index({ is_popular: 1 });
SubscriptionPlanSchema.index({ created_by: 1 });
SubscriptionPlanSchema.index({ cashfree_sync_status: 1 });