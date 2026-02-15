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
    enum: ['starter', 'professional', 'enterprise'],
    default: 'starter'
  })
  plan!: 'starter' | 'professional' | 'enterprise';

  @Prop({
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  })
  billingCycle!: 'monthly' | 'yearly';

  @Prop({ type: Date, default: Date.now })
  lastUpdated!: Date;

  // Razorpay subscription data (primary source of truth)
  @Prop({ type: String })
  razorpayCustomerId?: string;

  @Prop({ type: String })
  razorpayPlanId?: string;

  @Prop({ type: String })
  razorpaySubscriptionId?: string;

  @Prop({
    type: String,
    enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'],
    default: 'created'
  })
  razorpaySubscriptionStatus!: 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired';

  @Prop({ type: Date })
  razorpaySubscriptionStartedAt?: Date;

  @Prop({ type: Date })
  razorpaySubscriptionEndedAt?: Date;

  @Prop({ type: Date })
  razorpayCurrentPeriodStart?: Date;

  @Prop({ type: Date })
  razorpayCurrentPeriodEnd?: Date;

  @Prop({ type: Date })
  razorpayNextChargeAt?: Date;
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
class BankAccount {
  @Prop({ type: String, required: true, trim: true })
  accountNumber!: string;

  @Prop({ type: String, required: true, trim: true })
  ifscCode!: string;

  @Prop({ type: String, required: true, trim: true })
  accountHolderName!: string;

  @Prop({ type: String, trim: true })
  bankName?: string;

  @Prop({ type: Boolean, default: false })
  isVerified?: boolean;

  @Prop({ type: Date })
  verifiedAt?: Date;
}

const BankAccountSchema = SchemaFactory.createForClass(BankAccount);

@Schema({ _id: false })
class Documents {
  @Prop({ type: String, trim: true })
  pan?: string;

  @Prop({ type: String, trim: true })
  gst?: string;

  @Prop({ type: String, trim: true })
  cin?: string;

  @Prop({ type: String, trim: true })
  fssaiLicense?: string;

  @Prop({ type: Array, default: [] })
  uploadedDocuments?: Array<{
    type: string;
    url: string;
    uploadedAt: Date;
    verified: boolean;
  }>;
}

const DocumentsSchema = SchemaFactory.createForClass(Documents);

@Schema({ _id: false })
class GstConfiguration {
  @Prop({
    type: String,
    enum: ['standalone', 'hotel_under_7500', 'hotel_above_7500', 'catering_standalone', 'catering_premium'],
    required: true
  })
  establishmentType!: 'standalone' | 'hotel_under_7500' | 'hotel_above_7500' | 'catering_standalone' | 'catering_premium';

  @Prop({ type: Number, required: true, enum: [5, 18] })
  defaultGstRate!: 5 | 18;

  @Prop({ type: Boolean, required: true })
  canClaimITC!: boolean;

  @Prop({ type: String, required: true, trim: true })
  businessState!: string;

  @Prop({
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional field
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(v);
      },
      message: 'Invalid GSTIN format. Must be 15 characters (e.g., 29ABCDE1234F1Z5)'
    }
  })
  gstin?: string;

  @Prop({ type: Number, min: 0 })
  roomTariff?: number; // For hotel validation (required if hotel type)

  @Prop({ type: Boolean, default: false })
  servesAlcohol!: boolean;

  @Prop({ type: Boolean, default: false })
  enableServiceCharge!: boolean;

  @Prop({ type: Number, min: 0, max: 50 })
  serviceChargeRate?: number; // Percentage (0-50%)

  @Prop({ type: Boolean, default: false })
  integratedWithDeliveryPlatforms!: boolean;

  @Prop({ type: Boolean, default: true })
  isGstEnabled!: boolean;

  @Prop({ type: Date, default: Date.now })
  configuredAt!: Date;

  @Prop({ type: Date })
  lastUpdatedAt?: Date;
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

@Schema({ _id: false })
class CashfreeConfig {
  @Prop({ type: String })
  vendorId?: string;

  @Prop({
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'BLOCKED', 'IN_BENE_CREATION', 'PENDING'],
  })
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'IN_BENE_CREATION' | 'PENDING';

  @Prop({ type: Date })
  onboardedAt?: Date;

  @Prop({ type: Date })
  activatedAt?: Date;

  @Prop({
    type: String,
    enum: ['PENDING', 'IN_DOCUMENT_REVIEW', 'COMPLETED', 'ON_HOLD', 'BLOCKED'],
  })
  kycStatus?: 'PENDING' | 'IN_DOCUMENT_REVIEW' | 'COMPLETED' | 'ON_HOLD' | 'BLOCKED';

  @Prop({ type: Object })
  scheduleOption?: {
    scheduleId: number;
    message: string;
  };

  @Prop({ type: Date })
  lastSyncAt?: Date;

  @Prop({
    type: String,
    enum: ['PENDING', 'VERIFIED', 'FAILED'],
  })
  bankVerificationStatus?: 'PENDING' | 'VERIFIED' | 'FAILED';

  @Prop({ type: Date })
  bankVerifiedAt?: Date;

  @Prop({ type: String })
  bankVerificationError?: string;

  @Prop({ type: Array, default: [] })
  settlementHistory?: Array<{
    amount: number;
    settledAt: Date;
    settlementId: string;
    status: string;
  }>;
}

const CashfreeConfigSchema = SchemaFactory.createForClass(CashfreeConfig);

@Schema({ _id: false })
class MigrationStatus {
  @Prop({ type: Boolean, default: false })
  cashfreeVendorOnboarded?: boolean;

  @Prop({ type: Date })
  cashfreeOnboardedAt?: Date;

  @Prop({ type: Boolean, default: false })
  subscriptionMigrated?: boolean;

  @Prop({ type: Date })
  subscriptionMigratedAt?: Date;

  @Prop({ type: Boolean, default: false })
  razorpayDisabled?: boolean;

  @Prop({ type: Date })
  razorpayDisabledAt?: Date;

  @Prop({ type: String })
  migrationPhase?: 'not_started' | 'vendor_onboarded' | 'payment_testing' | 'subscription_migrated' | 'completed';
}

const MigrationStatusSchema = SchemaFactory.createForClass(MigrationStatus);

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

  @Prop({ type: BankAccountSchema })
  bankAccount?: BankAccount;

  @Prop({ type: DocumentsSchema })
  documents?: Documents;

  @Prop({ type: CashfreeConfigSchema })
  cashfreeConfig?: CashfreeConfig;

  @Prop({ type: MigrationStatusSchema, default: () => ({}) })
  migrationStatus?: MigrationStatus;

  @Prop({ type: String })
  ownerId?: string;

  @Prop({ type: String, trim: true })
  email?: string;

  @Prop({ type: String, trim: true })
  phone?: string;

  // Subscription Management
  @Prop({ type: String, ref: 'SubscriptionPlan' })
  currentSubscriptionPlanId?: string;

  @Prop({ type: Date })
  subscriptionStartedAt?: Date;

  @Prop({ type: Date })
  subscriptionExpiresAt?: Date;

  @Prop({
    type: String,
    enum: ['active', 'suspended', 'expired', 'trial'],
    default: 'trial'
  })
  subscriptionStatus?: 'active' | 'suspended' | 'expired' | 'trial';
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ slug: 1 }, { unique: true });
RestaurantSchema.index({ 'address.city': 1 });
