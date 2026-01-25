import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RestaurantDocument = Restaurant & Document;

@Schema({ _id: false })
class RestaurantAddress {
  @Prop({ type: String, required: true, trim: true })
  line1!: string;

  @Prop({ type: String, trim: true })
  line2?: string;

  @Prop({ type: String, required: true, trim: true })
  city!: string;

  @Prop({ type: String, required: true, trim: true })
  state!: string;

  @Prop({ type: String, required: true, trim: true })
  postalCode!: string;

  @Prop({ type: String, required: true, trim: true, default: 'IN' })
  country!: string;
}

const RestaurantAddressSchema = SchemaFactory.createForClass(RestaurantAddress);

@Schema({ _id: false })
class RestaurantUpiConfig {
  @Prop({ type: String, required: true, trim: true })
  vpa!: string;

  @Prop({ type: String, required: true, trim: true })
  displayName!: string;

  @Prop({
    type: String,
    enum: ['static', 'dynamic'],
    default: 'static',
  })
  mode!: 'static' | 'dynamic';
}

const RestaurantUpiConfigSchema =
  SchemaFactory.createForClass(RestaurantUpiConfig);

@Schema({ _id: false })
class RestaurantSettings {
  @Prop({ type: String, default: 'ORD' })
  orderNumberPrefix!: string;

  @Prop({ type: String, default: 'INR' })
  currency!: string;

  @Prop({ type: String, default: 'en-IN' })
  locale!: string;

  @Prop({ type: Boolean, default: true })
  enableTax!: boolean;

  @Prop({ type: Boolean, default: false })
  selfOrderingEnabled!: boolean;
}

const RestaurantSettingsSchema =
  SchemaFactory.createForClass(RestaurantSettings);

@Schema({ _id: false })
class RazorpayLinkedAccount {
  @Prop({ type: String, required: true, trim: true })
  accountId!: string;

  @Prop({
    type: String,
    enum: ['created', 'activated', 'suspended', 'needs_clarification'],
    default: 'created'
  })
  status!: string;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date })
  activatedAt?: Date;

  @Prop({ type: String, trim: true })
  referenceId?: string;

  @Prop({ type: Boolean, default: false })
  canReceivePayments!: boolean;
}

const RazorpayLinkedAccountSchema = SchemaFactory.createForClass(RazorpayLinkedAccount);

@Schema({ _id: false })
class SaasConfig {
  @Prop({
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    default: 'starter'
  })
  plan!: 'starter' | 'pro' | 'enterprise';

  @Prop({
    type: String,
    enum: ['monthly'],
    default: 'monthly'
  })
  billingCycle!: 'monthly';

  @Prop({
    type: String,
    enum: ['trial', 'active', 'suspended', 'cancelled'],
    default: 'active'
  })
  subscriptionStatus!: 'trial' | 'active' | 'suspended' | 'cancelled';

  @Prop({ type: Date, required: true })
  trialEndsAt!: Date;

  @Prop({ type: Date, required: true })
  nextBillingDate!: Date;

  @Prop({ type: Number, required: true, default: 79900 }) // ₹799 in paise (standard monthly plan)
  monthlyPrice!: number;

  @Prop({ type: Date, default: Date.now })
  lastUpdated!: Date;

  // Razorpay subscription data
  @Prop({ type: String })
  razorpayCustomerId?: string;

  @Prop({ type: String })
  razorpayPlanId?: string;

  @Prop({ type: String })
  razorpaySubscriptionId?: string;

  @Prop({
    type: String,
    enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired']
  })
  razorpaySubscriptionStatus?: string;

  @Prop({ type: Date })
  razorpaySubscriptionStartedAt?: Date;

  @Prop({ type: Date })
  razorpaySubscriptionEndedAt?: Date;
}

const SaasConfigSchema = SchemaFactory.createForClass(SaasConfig);

@Schema({ _id: false })
class PaymentConfig {
  @Prop({ type: String, trim: true })
  linkedAccountId?: string;

  @Prop({ type: String, trim: true })
  razorpayContactId?: string;

  @Prop({ type: String, trim: true })
  razorpayFundAccountId?: string;

  @Prop({ type: Boolean, default: true })
  canReceivePayments!: boolean;

  @Prop({ type: Boolean, default: true })
  directSettlement!: boolean;

  @Prop({
    type: String,
    enum: ['instant', 'scheduled', 'transfers'],
    default: 'transfers'
  })
  settlementType!: 'instant' | 'scheduled' | 'transfers';

  // Linked account status tracking
  @Prop({
    type: String,
    enum: ['pending_setup', 'pending_approval', 'approved', 'rejected', 'suspended', 'route_not_available'],
    default: 'pending_setup'
  })
  status!: 'pending_setup' | 'pending_approval' | 'approved' | 'rejected' | 'suspended' | 'route_not_available';

  @Prop({ type: String, trim: true })
  error?: string;

  @Prop({ type: Number, default: 0 })
  setupAttempts!: number;

  @Prop({ type: Date })
  lastAttempt?: Date;

  @Prop({ type: Date })
  approvedAt?: Date;
}

const PaymentConfigSchema = SchemaFactory.createForClass(PaymentConfig);

@Schema({ _id: false })
class GstConfiguration {
  @Prop({
    type: String,
    enum: ['standalone', 'hotel_under_7500', 'hotel_above_7500', 'catering'],
    required: true,
    default: 'standalone'
  })
  establishmentType!: 'standalone' | 'hotel_under_7500' | 'hotel_above_7500' | 'catering';

  @Prop({ type: Number, required: true })
  defaultGstRate!: number; // Auto-calculated: 5 or 18

  @Prop({ type: Boolean, required: true })
  canClaimITC!: boolean; // Auto-calculated based on establishmentType

  @Prop({ type: String, required: true, trim: true })
  businessState!: string; // For CGST/SGST vs IGST calculation

  @Prop({
    type: String,
    trim: true,
    uppercase: true,
  })
  gstin?: string;

  @Prop({ type: Number, min: 0, max: 100 })
  customGstRate?: number; // Override default rate if needed

  @Prop({ type: Boolean, default: false })
  exemptFromGst!: boolean; // For special cases

  @Prop({ type: Boolean, default: true })
  isGstEnabled!: boolean; // Master switch for GST
}

const GstConfigurationSchema = SchemaFactory.createForClass(GstConfiguration);

@Schema({ _id: false })
class BusinessDetails {
  @Prop({ type: String, trim: true })
  panNumber?: string;

  @Prop({
    type: String,
    enum: ['sole_proprietorship', 'partnership', 'private_limited', 'public_limited'],
    default: 'sole_proprietorship'
  })
  businessType!: string;

  @Prop({ type: GstConfigurationSchema, required: true })
  gst!: GstConfiguration;
}

const BusinessDetailsSchema = SchemaFactory.createForClass(BusinessDetails);


@Schema({
  timestamps: true,
  collection: 'restaurants',
})
export class Restaurant {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  legalName?: string;

  @Prop({ type: String, required: true, unique: true, index: true, lowercase: true })
  slug!: string;

  @Prop({ type: String, trim: true, lowercase: true })
  contactEmail?: string;

  @Prop({ type: String, trim: true })
  contactPhone?: string;

  @Prop({ type: String, default: 'Asia/Kolkata' })
  timezone!: string;

  @Prop({ type: RestaurantAddressSchema, required: true })
  address!: RestaurantAddress;

  @Prop({ type: RestaurantUpiConfigSchema, required: true })
  upi!: RestaurantUpiConfig;

  @Prop({ type: RestaurantSettingsSchema, default: () => ({}) })
  settings!: RestaurantSettings;

  @Prop({ type: [String], default: ['en', 'ml'] })
  languages!: string[];

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: false })
  isMultibranchEnabled!: boolean;

  @Prop({ type: Number, default: 1, min: 1 })
  branchCount!: number;

  @Prop({ type: Number, default: 10, min: 1 })
  maxBranches!: number;

  @Prop({ type: RazorpayLinkedAccountSchema })
  razorpayAccount?: RazorpayLinkedAccount;

  @Prop({ type: SaasConfigSchema })
  saasConfig?: SaasConfig;

  @Prop({ type: PaymentConfigSchema })
  paymentConfig?: PaymentConfig;

  @Prop({ type: BusinessDetailsSchema })
  businessDetails?: BusinessDetails;

  @Prop({ type: String })
  ownerId?: string;

  @Prop({ type: String, trim: true })
  email?: string;

  @Prop({ type: String, trim: true })
  phone?: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ slug: 1 }, { unique: true });
RestaurantSchema.index({ 'address.city': 1 });
