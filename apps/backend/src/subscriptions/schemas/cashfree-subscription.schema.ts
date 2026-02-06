import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CashfreeSubscriptionDocument = CashfreeSubscription & Document;

export enum CashfreeSubscriptionStatus {
  INITIALIZED = 'INITIALIZED',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  BANK_APPROVAL_PENDING = 'BANK_APPROVAL_PENDING',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
}

@Schema({ collection: 'cashfree_subscriptions', timestamps: true })
export class CashfreeSubscription {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Restaurant' })
  restaurant_id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  cashfree_subscription_id: string;

  @Prop() // Internal Cashfree ID from order_id webhooks (e.g., "10864334")
  cf_subscription_id?: string;

  @Prop({ required: true })
  cashfree_customer_id: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'SubscriptionPlan' })
  plan_id: Types.ObjectId;

  @Prop({ required: true, enum: CashfreeSubscriptionStatus, default: CashfreeSubscriptionStatus.INITIALIZED })
  status: CashfreeSubscriptionStatus;

  @Prop({ required: true, default: 1 })
  current_cycle: number;

  @Prop({ required: true, default: 0 })
  cycles_completed: number;

  @Prop()
  failure_reason?: string;

  // Payment authorization
  @Prop({ required: true })
  authorization_amount: number;

  @Prop()
  auth_link?: string; // Cashfree payment link for authorization

  @Prop({ required: true, default: false })
  is_authorized: boolean;

  // Billing dates
  @Prop()
  current_cycle_start?: Date;

  @Prop()
  current_cycle_end?: Date;

  @Prop()
  next_billing_at?: Date;

  // Trial information
  @Prop()
  trial_ends_at?: Date;

  @Prop({ required: true, default: false })
  is_in_trial: boolean;

  // Customer information (cached for convenience)
  @Prop({ required: true })
  customer_email: string;

  @Prop({ required: true })
  customer_phone: string;

  @Prop({ required: true })
  customer_name: string;

  // Cashfree webhook data
  @Prop({ type: Object })
  last_webhook_data?: any;

  @Prop()
  last_webhook_at?: Date;

  // Audit fields
  @Prop({ required: true })
  created_by: string;

  @Prop()
  updated_by?: string;

  @Prop({ default: Date.now })
  created_at: Date;

  @Prop({ default: Date.now })
  updated_at: Date;
}

export const CashfreeSubscriptionSchema = SchemaFactory.createForClass(CashfreeSubscription);

// Create indexes
CashfreeSubscriptionSchema.index({ restaurant_id: 1 });
CashfreeSubscriptionSchema.index({ cashfree_subscription_id: 1 }, { unique: true });
CashfreeSubscriptionSchema.index({ cashfree_customer_id: 1 });
CashfreeSubscriptionSchema.index({ status: 1 });
CashfreeSubscriptionSchema.index({ next_billing_at: 1 });
CashfreeSubscriptionSchema.index({ trial_ends_at: 1 });

// Virtual for populating plan details
CashfreeSubscriptionSchema.virtual('plan', {
  ref: 'SubscriptionPlan',
  localField: 'plan_id',
  foreignField: '_id',
  justOne: true,
});

// Virtual for populating restaurant details
CashfreeSubscriptionSchema.virtual('restaurant', {
  ref: 'Restaurant',
  localField: 'restaurant_id',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtual fields are serialized
CashfreeSubscriptionSchema.set('toJSON', { virtuals: true });
CashfreeSubscriptionSchema.set('toObject', { virtuals: true });