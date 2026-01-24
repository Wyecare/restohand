import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum SubscriptionStatus {
  CREATED = 'created',
  AUTHENTICATED = 'authenticated',
  ACTIVE = 'active',
  PENDING = 'pending',
  HALTED = 'halted',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

export enum SubscriptionPlan {
  STARTER_MONTHLY = 'starter_monthly',
  STARTER_YEARLY = 'starter_yearly',
  PROFESSIONAL_MONTHLY = 'professional_monthly',
  PROFESSIONAL_YEARLY = 'professional_yearly',
  ENTERPRISE_MONTHLY = 'enterprise_monthly',
  ENTERPRISE_YEARLY = 'enterprise_yearly',
  FOUNDING_MEMBER = 'founding_member',
  EARLY_ADOPTER = 'early_adopter',
}

@Schema()
export class SubscriptionPlanDetails {
  @Prop({ required: true, type: String })
  razorpayPlanId!: string;

  @Prop({ required: true, type: String, enum: SubscriptionPlan })
  planType!: SubscriptionPlan;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ required: true, type: Number })
  amount!: number; // in paise

  @Prop({ required: true, type: String })
  currency!: string;

  @Prop({ required: true, type: String })
  period!: string; // monthly, yearly

  @Prop({ required: true, type: Number })
  interval!: number;

  @Prop({ type: Object })
  features?: {
    locations?: number | string; // number or "unlimited"
    tables?: number | string; // number or "unlimited"
    analytics?: string;
    support?: string;
    customBranding?: boolean;
    inventoryAlerts?: boolean;
    customIntegrations?: boolean;
    dedicatedManager?: boolean;
  };
}

export const SubscriptionPlanDetailsSchema = SchemaFactory.createForClass(SubscriptionPlanDetails);

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  razorpaySubscriptionId!: string;

  @Prop({ type: String })
  razorpayCustomerId?: string;

  @Prop({ type: SubscriptionPlanDetailsSchema, required: true })
  plan!: SubscriptionPlanDetails;

  @Prop({ required: true, type: String, enum: SubscriptionStatus, default: SubscriptionStatus.CREATED })
  status!: SubscriptionStatus;

  @Prop({ type: Date })
  currentStart?: Date;

  @Prop({ type: Date })
  currentEnd?: Date;

  @Prop({ type: Date })
  trialStart?: Date;

  @Prop({ type: Date })
  trialEnd?: Date;

  @Prop({ type: Boolean, default: false })
  isTrialActive?: boolean;

  @Prop({ type: Date })
  chargeAt?: Date;

  @Prop({ type: Date })
  startAt?: Date;

  @Prop({ type: Date })
  endAt?: Date;

  @Prop({ type: Date })
  endedAt?: Date;

  @Prop({ type: Number, default: 1 })
  quantity!: number;

  @Prop({ type: Number, default: 0 })
  authAttempts!: number;

  @Prop({ type: Number })
  totalCount?: number;

  @Prop({ type: Number, default: 0 })
  paidCount!: number;

  @Prop({ type: Number })
  remainingCount?: number;

  @Prop({ type: Boolean, default: false })
  customerNotify!: boolean;

  @Prop({ type: Date })
  expireBy?: Date;

  @Prop({ type: String })
  shortUrl?: string;

  @Prop({ type: Boolean, default: false })
  hasScheduledChanges!: boolean;

  @Prop({ type: String })
  scheduleChangeAt?: string;

  @Prop({ type: Date })
  pausedAt?: Date;

  @Prop({ type: String })
  pauseInitiatedBy?: string;

  @Prop({ type: Object })
  notes?: Record<string, any>;

  @Prop({ type: Object })
  billingHistory?: Array<{
    invoiceId: string;
    amount: number;
    paidAt: Date;
    status: string;
  }>;

  // Grandfathering support
  @Prop({ type: Boolean, default: false })
  isGrandfathered!: boolean;

  @Prop({ type: String })
  grandfatherReason?: string; // 'founding_member', 'early_adopter', etc.

  @Prop({ type: Date })
  grandfatheredAt?: Date;

  @Prop({ type: Date })
  lastWebhookAt?: Date;

  @Prop({ type: String })
  lastWebhookEvent?: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Indexes for efficient queries
SubscriptionSchema.index({ restaurantId: 1 });
SubscriptionSchema.index({ razorpaySubscriptionId: 1 }, { unique: true });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ 'plan.planType': 1 });
SubscriptionSchema.index({ chargeAt: 1 });
SubscriptionSchema.index({ trialEnd: 1 });
SubscriptionSchema.index({ createdAt: -1 });