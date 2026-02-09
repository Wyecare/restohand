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

  @Prop({ enum: ['starter', 'professional', 'enterprise'], required: true })
  tier: string; // 'starter', 'professional', 'enterprise'

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: false })
  is_popular: boolean;

  @Prop({ default: false })
  is_template: boolean;

  @Prop()
  template_id: string; // Reference to template used

  @Prop({ required: true })
  display_name: string;

  @Prop()
  description: string;

  // Business Model Usage Limits
  @Prop({ type: Object, required: true })
  usage_limits: {
    max_branches: number; // 1, 3, -1 (unlimited)
    max_tables: number; // 20, 50, -1 (unlimited)
    max_staff: number; // 5, 15, -1 (unlimited)
    max_menu_items: number; // 75, 200, -1 (unlimited)
    max_monthly_orders?: number; // Optional limit for orders per month
  };

  // Business Model Pricing Structure
  @Prop({ type: Object, required: true })
  pricing: {
    base_subscription_fee: number; // Monthly fee in paisa (99900, 299900, 599900)
    transaction_fee_percentage: number; // Always 2.0 for all plans
    currency: string; // INR
  };

  // Feature Gates per Plan
  @Prop({ type: Object, required: true })
  feature_access: {
    qr_menu_ordering: boolean;
    digital_receipts: boolean;
    basic_pos: boolean;
    order_management: boolean;
    real_time_analytics: boolean;
    advanced_analytics?: boolean;
    customer_crm?: boolean;
    inventory_management?: boolean;
    multi_location_management?: boolean;
    priority_support?: boolean;
    custom_integrations?: boolean;
    api_access?: boolean;
    white_label_options?: boolean;
  };

  // Target Market Information
  @Prop({ type: Object })
  target_market: {
    segment: string; // 'Small cafes, QSRs, family restaurants'
    ideal_size: string; // '40-60 seats'
    use_cases: string[];
  };

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