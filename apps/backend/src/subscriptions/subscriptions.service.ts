import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { RazorpayService } from '../payments/razorpay.service';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
  SubscriptionPlanDetails,
} from './schemas/subscription.schema';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { ConfigService } from '@nestjs/config';

// Legacy interface for backward compatibility
export interface PlanConfig {
  name: string;
  amount: number;
  currency: string;
  period: string;
  interval: number;
  features: {
    locations?: number | string;
    tables?: number | string;
    analytics?: string;
    support?: string;
    customBranding?: boolean;
    inventoryAlerts?: boolean;
    customIntegrations?: boolean;
    dedicatedManager?: boolean;
  };
  razorpayPlanId?: string; // NEW: Link to actual Razorpay plan
  isTestPlan?: boolean; // NEW: Indicate if this is a test plan
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    private readonly razorpayService: RazorpayService,
    private readonly configService: ConfigService,
  ) {}

  private parseFeatures(featuresString: string): any {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(featuresString);
      return parsed;
    } catch (error) {
      // If JSON parsing fails, treat as comma-separated string or single string
      if (featuresString.includes(',')) {
        return featuresString.split(',').reduce((acc, feature) => {
          acc[feature.trim()] = true;
          return acc;
        }, {});
      }
      // Single feature string - return as object
      return { [featuresString]: true };
    }
  }

  private mapTierAndPeriodToEnum(
    tier: string = 'professional',
    period: string = 'monthly'
  ): string {
    // For test plans or unrecognized periods, default to monthly
    const normalizedPeriod = ['monthly', 'yearly'].includes(period)
      ? period
      : 'monthly';

    switch (tier) {
      case 'starter':
        return normalizedPeriod === 'yearly'
          ? 'starter_yearly'
          : 'starter_monthly';
      case 'professional':
        return normalizedPeriod === 'yearly'
          ? 'professional_yearly'
          : 'professional_monthly';
      case 'enterprise':
        return normalizedPeriod === 'yearly'
          ? 'enterprise_yearly'
          : 'enterprise_monthly';
      case 'founding_member':
        return 'founding_member';
      case 'early_adopter':
        return 'early_adopter';
      default:
        // Fallback to professional monthly for unknown tiers
        return 'professional_monthly';
    }
  }

  /**
   * Convert Razorpay plan to our internal format
   */
  private convertRazorpayPlanToInternal(
    razorpayPlan: any
  ): PlanConfig & { razorpayPlanId: string } {
    const notes = razorpayPlan.notes || {};
    const tier = notes.tier || 'unknown';
    const features = this.getFeaturesForTier(tier);
    const isTestPlan = notes.test_mode === 'true';

    return {
      name: razorpayPlan.item?.name || `Plan ${razorpayPlan.id}`,
      amount: razorpayPlan.item?.amount || 0,
      currency: razorpayPlan.item?.currency || 'INR',
      period: razorpayPlan.period || 'monthly',
      interval: razorpayPlan.interval || 1,
      features,
      razorpayPlanId: razorpayPlan.id,
      isTestPlan,
    };
  }

  /**
   * Get features based on tier from plan notes
   */
  private getFeaturesForTier(tier: string) {
    const featureMap = {
      starter: {
        locations: 1,
        tables: 10,
        analytics: 'basic_analytics',
        support: 'email_support',
        customBranding: false,
        inventoryAlerts: false,
        customIntegrations: false,
        dedicatedManager: false,
      },
      professional: {
        locations: 3,
        tables: 'unlimited',
        analytics: 'advanced_analytics',
        support: 'priority_support',
        customBranding: true,
        inventoryAlerts: true,
        customIntegrations: false,
        dedicatedManager: false,
      },
      enterprise: {
        locations: 'unlimited',
        tables: 'unlimited',
        analytics: 'advanced_analytics',
        support: 'phone_support',
        customBranding: true,
        inventoryAlerts: true,
        customIntegrations: true,
        dedicatedManager: true,
      },
      founding_member: {
        locations: 3,
        tables: 'unlimited',
        analytics: 'advanced_analytics',
        support: 'priority_support',
        customBranding: true,
        inventoryAlerts: true,
        customIntegrations: false,
        dedicatedManager: false,
      },
      early_adopter: {
        locations: 3,
        tables: 'unlimited',
        analytics: 'advanced_analytics',
        support: 'priority_support',
        customBranding: true,
        inventoryAlerts: true,
        customIntegrations: false,
        dedicatedManager: false,
      },
    };

    return featureMap[tier] || featureMap.starter;
  }

  /**
   * Get all available plans from Razorpay (cached)
   */
  async getAllPlans(includeTestPlans = false) {
    try {
      console.log(
        'Fetching all plans from Razorpay, includeTestPlans:',
        includeTestPlans
      );
      const response = await this.razorpayService.getAllPlans({ count: 100 });
      const razorpayPlans = response.items || [];

      const plans = razorpayPlans
        .filter((plan) => {
          const isTestPlan = plan.notes?.test_mode === 'true';
          return includeTestPlans ? true : !isTestPlan;
        })
        .map((plan) => {
          const converted = this.convertRazorpayPlanToInternal(plan);
          const tier = plan.notes?.tier || 'unknown';

          return {
            razorpayPlanId: plan.id,
            planType: this.mapTierToPlanType(
              tier,
              plan.period,
              converted.isTestPlan
            ),
            name: converted.name,
            amount: converted.amount,
            currency: converted.currency,
            period: converted.period,
            interval: converted.interval,
            features: converted.features,
            monthlyEquivalent:
              converted.period === 'yearly'
                ? Math.round(converted.amount / 12)
                : converted.amount,
            isPopular: tier === 'professional',
            isLegacy: tier === 'founding_member' || tier === 'early_adopter',
            isTestPlan: converted.isTestPlan,
            tier,
            notes: plan.notes,
            createdAt: plan.created_at,
          };
        })
        .sort((a, b) => {
          // Sort by tier priority, then by period
          const tierOrder = {
            starter: 1,
            professional: 2,
            enterprise: 3,
            founding_member: 4,
            early_adopter: 5,
          };
          const aTierOrder = tierOrder[a.tier] || 999;
          const bTierOrder = tierOrder[b.tier] || 999;

          if (aTierOrder !== bTierOrder) {
            return aTierOrder - bTierOrder;
          }

          const periodOrder = { daily: 1, weekly: 2, monthly: 3, yearly: 4 };
          return (
            (periodOrder[a.period] || 999) - (periodOrder[b.period] || 999)
          );
        });

      this.logger.log(
        `Retrieved ${plans.length} plans from Razorpay (includeTestPlans: ${includeTestPlans})`
      );
      return plans;
    } catch (error) {
      this.logger.error(`Failed to get plans: ${error.message}`);
      throw new BadRequestException('Unable to fetch subscription plans');
    }
  }

  /**
   * Map tier and period to internal SubscriptionPlan enum
   * Handles both production plans and test plans
   */
  private mapTierToPlanType(
    tier: string,
    period: string,
    isTestPlan = false
  ): string | null {
    // Return dynamic plan identifier based on tier and period
    return `${tier}_${period}`;
  }

  async getPlanConfig(planType: string): Promise<PlanConfig> {
    try {
      // Get the actual Razorpay plan ID for this plan type
      // Get plans directly from Razorpay based on plan type
      const response = await this.razorpayService.getAllPlans({ count: 100 });
      const plans = response.items || [];

      // Find plan matching the requested type (e.g., "starter_monthly")
      const [tier, period] = planType.split('_');
      const matchingPlan = plans.find((p: any) =>
        p.notes?.tier === tier &&
        p.period === period
      );
      if (!matchingPlan) {
        throw new BadRequestException(`No plan found for type: ${planType}`);
      }
      const razorpayPlanId = matchingPlan.id;
      if (!razorpayPlanId) {
        throw new BadRequestException(
          `No Razorpay plan found for plan type: ${planType}`
        );
      }

      // Fetch the plan details from Razorpay
      const razorpayPlan = await this.razorpayService.getPlan(razorpayPlanId);
      if (!razorpayPlan) {
        throw new BadRequestException(
          `Razorpay plan ${razorpayPlanId} not found`
        );
      }

      // Convert to internal format
      const config = this.convertRazorpayPlanToInternal(razorpayPlan);
      return config;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get plan config for ${planType}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Get test plan for a specific tier (for development/testing)
   */
  async getTestPlan(
    tier: 'starter' | 'professional' | 'enterprise'
  ): Promise<any | null> {
    try {
      // Fetch all plans and filter for test plans
      const response = await this.razorpayService.getAllPlans({ count: 100 });
      const plans = response.items || [];

      const testPlans = plans.filter(p =>
        p.notes?.tier === tier &&
        p.notes?.test_mode === 'true'
      );

      if (testPlans.length === 0) {
        this.logger.warn(`No test plan found for tier: ${tier}`);
        return null;
      }

      // Prefer ultra-fast plans (7-day intervals) for testing
      const ultraFastPlan = testPlans.find(p =>
        p.period === 'daily' &&
        p.interval === 7 &&
        p.notes?.billing_cycle === 'ultra_fast'
      );
      if (ultraFastPlan) {
        return ultraFastPlan;
      }

      // Return first available test plan
      return testPlans[0];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get test plan for ${tier}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Sync plans from Razorpay (force refresh cache)
   */
  async syncPlansFromRazorpay(): Promise<void> {
    try {
      // No need to sync - we fetch directly from Razorpay now
      this.logger.log('Successfully synced plans from Razorpay');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync plans from Razorpay: ${errorMessage}`);
      throw error;
    }
  }

  async getSubscriptionByRestaurant(
    restaurantId: string
  ): Promise<SubscriptionDocument | null> {
    if (!Types.ObjectId.isValid(restaurantId)) {
      throw new BadRequestException('Invalid restaurant ID');
    }

    // First try to find an active subscription
    const activeSubscription = await this.subscriptionModel
      .findOne({
        restaurantId: new Types.ObjectId(restaurantId),
        status: {
          $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.AUTHENTICATED],
        },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (activeSubscription) {
      return activeSubscription;
    }

    // If no active subscription, return the most recent one (for status display)
    return this.subscriptionModel
      .findOne({ restaurantId: new Types.ObjectId(restaurantId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getSubscriptionStatus(restaurantId: string) {
    const subscription = await this.getSubscriptionByRestaurant(restaurantId);

    if (!subscription) {
      return {
        restaurantId,
        hasSubscription: false,
        plan: null,
        status: null,
        isActive: false,
        isInTrialPeriod: false,
        trialEndsAt: null,
        currentStart: null,
        currentEnd: null,
        nextChargeAt: null,
        features: null,
      };
    }

    const now = new Date();
    const isSubscriptionActive = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.AUTHENTICATED,
      SubscriptionStatus.CREATED,
    ].includes(subscription.status);

    // Get latest Razorpay data if subscription exists
    let razorpayData = null;
    if (subscription.razorpaySubscriptionId) {
      try {
        const razorpaySubscription = await this.razorpayService.getSubscription(
          subscription.razorpaySubscriptionId
        );
        razorpayData = {
          id: razorpaySubscription.id,
          status: razorpaySubscription.status,
          currentStart: razorpaySubscription.current_start
            ? new Date(razorpaySubscription.current_start * 1000)
            : null,
          currentEnd: razorpaySubscription.current_end
            ? new Date(razorpaySubscription.current_end * 1000)
            : null,
          chargeAt: razorpaySubscription.charge_at
            ? new Date(razorpaySubscription.charge_at * 1000)
            : null,
          totalCount: razorpaySubscription.total_count,
          paidCount: razorpaySubscription.paid_count,
          remainingCount: razorpaySubscription.remaining_count,
        };
      } catch (error) {
        this.logger.error(
          `Failed to fetch Razorpay subscription ${subscription.razorpaySubscriptionId}: ${error.message}`
        );
      }
    }

    // Get restaurant details for checkout data
    const restaurant = await this.restaurantModel.findById(restaurantId);

    // Reconstruct checkout data if subscription is in 'created' status
    let checkoutData = null;
    if (subscription.status === SubscriptionStatus.CREATED && restaurant) {
      const isTrialDisabled = this.configService.get('DISABLE_TRIAL_PERIOD') === 'true';

      checkoutData = {
        subscriptionId: subscription.razorpaySubscriptionId,
        customerId: subscription.razorpayCustomerId,
        planId: subscription.plan.razorpayPlanId,
        customerDetails: {
          name: restaurant.name,
          email: restaurant.email || 'no-email@restohand.com',
          contact: restaurant.phone?.replace(/\D/g, '').substring(0, 10) || '9999999999',
        },
        authenticationAmount: isTrialDisabled ? subscription.plan.amount : 500, // ₹5 for trial, full amount for immediate
        trialMode: !isTrialDisabled
      };
    }

    return {
      restaurantId,
      hasSubscription: true,
      subscription: {
        id: subscription._id,
        razorpaySubscriptionId: subscription.razorpaySubscriptionId,
        razorpayCustomerId: subscription.razorpayCustomerId,
        plan: subscription.plan,
        status: subscription.status,
        isGrandfathered: subscription.isGrandfathered,
        grandfatherReason: subscription.grandfatherReason,
        currentStart: subscription.currentStart,
        currentEnd: subscription.currentEnd,
        // Trial period handled by Razorpay start_at date
        startAt: subscription.startAt,
        chargeAt: subscription.chargeAt,
        quantity: subscription.quantity,
        totalCount: subscription.totalCount,
        paidCount: subscription.paidCount,
        remainingCount: subscription.remainingCount,
        authAttempts: subscription.authAttempts,
        expireBy: subscription.expireBy,
        shortUrl: subscription.shortUrl, // DEPRECATED: Use checkout instead
        hasScheduledChanges: subscription.hasScheduledChanges,
        scheduleChangeAt: subscription.scheduleChangeAt,
        customerNotify: subscription.customerNotify,
        billingHistory: subscription.billingHistory || [],
        lastWebhookAt: subscription.lastWebhookAt,
        lastWebhookEvent: subscription.lastWebhookEvent,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,

        // NEW: Add checkout data for 'created' subscriptions
        checkout: checkoutData,
      },
      plan: subscription.plan,
      status: subscription.status,
      isActive: isSubscriptionActive,
      // For Razorpay native trials, check if subscription hasn't started yet
      isInTrialPeriod: subscription.startAt && subscription.startAt > now,
      trialEndsAt: subscription.startAt, // When actual billing begins
      currentStart: razorpayData?.currentStart || subscription.currentStart,
      currentEnd: razorpayData?.currentEnd || subscription.currentEnd,
      nextChargeAt: razorpayData?.chargeAt || subscription.chargeAt,
      features: subscription.plan.features,
      razorpayData,
    };
  }

  async upgradePlan(
    restaurantId: string,
    newPlan: 'starter' | 'pro' | 'enterprise',
    billingCycle: 'hourly' | 'daily' | 'monthly' | 'yearly' = 'monthly'
  ) {
    // Get plan pricing directly from Razorpay
    const response = await this.razorpayService.getAllPlans({ count: 100 });
    const plans = response.items || [];

    // Map legacy 'pro' to 'professional'
    const planMapping: Record<string, string> = { pro: 'professional' };
    const targetPlan = planMapping[newPlan] || newPlan;

    const matchingPlan = plans.find((p: any) =>
      p.notes?.tier === targetPlan &&
      p.period === billingCycle &&
      p.notes?.test_mode !== 'true'
    );

    if (!matchingPlan) {
      throw new Error(`No matching plan found for ${newPlan} with ${billingCycle} billing`);
    }

    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      'saasConfig.plan': newPlan,
      'saasConfig.billingCycle': billingCycle,
      'saasConfig.monthlyPrice': matchingPlan.item.amount,
      'saasConfig.lastUpdated': new Date(),
    });

    this.logger.log(`Restaurant ${restaurantId} upgraded to ${newPlan} plan`);
  }

  async suspendSubscription(restaurantId: string, reason: string) {
    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      'saasConfig.subscriptionStatus': 'suspended',
      'saasConfig.lastUpdated': new Date(),
    });

    this.logger.warn(
      `Restaurant ${restaurantId} subscription suspended: ${reason}`
    );
  }

  async reactivateSubscription(restaurantId: string) {
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      'saasConfig.subscriptionStatus': 'active',
      'saasConfig.nextBillingDate': nextBilling,
      'saasConfig.lastUpdated': new Date(),
    });

    this.logger.log(`Restaurant ${restaurantId} subscription reactivated`);
  }

  /**
   * Get or create a Razorpay plan for subscription creation
   * Now uses existing plans from Razorpay instead of creating new ones
   */
  private async getOrCreateRazorpayPlan(
    tier: 'starter' | 'professional' | 'enterprise' = 'professional'
  ): Promise<string> {
    try {
      // Try to get existing plan from Razorpay
      const existingPlan = await this.getTestPlan(tier);
      if (existingPlan) {
        this.logger.log(
          `Using existing Razorpay plan: ${existingPlan.id} for tier: ${tier}`
        );
        return existingPlan.id;
      }

      // Fallback: Get any professional monthly plan
      const plans = await this.getAllPlans(true); // Include test plans
      const fallbackPlan = plans.find(
        (p) =>
          p.tier === 'professional' &&
          (p.period === 'monthly' || p.period === 'daily')
      );

      if (fallbackPlan) {
        this.logger.log(
          `Using fallback Razorpay plan: ${fallbackPlan.razorpayPlanId}`
        );
        return fallbackPlan.razorpayPlanId;
      }

      throw new Error(
        'No suitable plans found in Razorpay. Please create plans first.'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Razorpay plan: ${errorMessage}`, error);
      throw error;
    }
  }

  // Overload for DTO-based creation (from controller)
  async createSubscription(dto: CreateSubscriptionDto): Promise<any>;
  // Existing method signature
  async createSubscription(restaurantId: string): Promise<any>;
  // Implementation
  async createSubscription(
    restaurantIdOrDto: string | CreateSubscriptionDto
  ): Promise<any> {
    // Handle DTO object
    if (typeof restaurantIdOrDto === 'object') {
      return this.createSubscriptionFromDto(restaurantIdOrDto);
    }

    // Handle string restaurantId (existing logic)
    return this.createSubscriptionLegacy(restaurantIdOrDto);
  }

  /**
   * Create subscription from DTO (called from controller)
   */
  private async createSubscriptionFromDto(
    dto: CreateSubscriptionDto
  ): Promise<any> {
    const { restaurantId, planId, totalCount, startAt, customerNotify, notes } =
      dto;

    // Validate restaurant exists
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new BadRequestException(
        `Restaurant with ID ${restaurantId} not found`
      );
    }

    // Check if restaurant already has an active subscription
    const existingSubscription = await this.subscriptionModel.findOne({
      restaurantId: new Types.ObjectId(restaurantId),
      status: {
        $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.AUTHENTICATED],
      },
    });

    if (existingSubscription) {
      throw new BadRequestException(
        'Restaurant already has an active subscription'
      );
    }

    // Validate the plan exists in Razorpay
    const plan = await this.razorpayService.getPlan(planId);
    if (!plan) {
      throw new BadRequestException(`Plan with ID ${planId} not found`);
    }

    try {
      // Create customer in Razorpay
      const customerData = {
        name: restaurant.name,
        email: restaurant.email || 'no-email@restohand.com',
        contact:
          restaurant.phone?.replace(/\D/g, '').substring(0, 10) || '9999999999',
        fail_existing: 0 as const,
        notes: {
          restaurant_id: restaurantId,
          created_by: 'subscription_page',
        },
      };

      const customer = await this.razorpayService.createCustomer(customerData);
      this.logger.log(`Created/fetched Razorpay customer: ${customer.id}`);

      // Create subscription in Razorpay - check if trial is disabled
      const isTrialDisabled = this.configService.get('DISABLE_TRIAL_PERIOD') === 'true';

      // If trial is disabled or start_at is provided, start immediately
      // If trial is enabled and no start_at provided, set to 30 days from now
      const trialStartDate = isTrialDisabled ? undefined : (startAt || Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000));

      const subscriptionData = {
        plan_id: planId,
        customer_id: customer.id,
        total_count: totalCount || 12, // Default to 12 billing cycles if not specified
        start_at: trialStartDate,
        customer_notify: customerNotify ?? false,
        notes: {
          restaurant_id: restaurantId,
          plan_id: planId,
          tier: plan.notes?.tier || 'unknown',
          created_from: 'subscription_page',
          trial_period_days: isTrialDisabled ? '0' : (startAt ? '0' : '30'), // Track if trial was applied
          trial_disabled: isTrialDisabled ? 'true' : 'false',
          ...notes,
        },
      };

      const razorpaySubscription =
        await this.razorpayService.createSubscription(subscriptionData);
      this.logger.log(
        `Created Razorpay subscription: ${razorpaySubscription.id}`
      );

      // Create subscription in our database
      const subscription = new this.subscriptionModel({
        restaurantId: new Types.ObjectId(restaurantId),
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayCustomerId: customer.id,
        plan: {
          razorpayPlanId: planId,
          planType: this.mapTierAndPeriodToEnum(plan.notes?.tier, plan.period), // Map to valid enum
          name: plan.item.name,
          amount: plan.item.amount,
          currency: plan.item.currency,
          period: plan.period,
          interval: plan.interval,
          features: plan.notes?.features
            ? this.parseFeatures(plan.notes.features)
            : {},
        },
        status: razorpaySubscription.status as SubscriptionStatus,
        quantity: razorpaySubscription.quantity || 1,
        totalCount: razorpaySubscription.total_count,
        paidCount: razorpaySubscription.paid_count || 0,
        remainingCount: razorpaySubscription.remaining_count,
        authAttempts: razorpaySubscription.auth_attempts || 0,
        currentStart: razorpaySubscription.current_start
          ? new Date(razorpaySubscription.current_start * 1000)
          : undefined,
        currentEnd: razorpaySubscription.current_end
          ? new Date(razorpaySubscription.current_end * 1000)
          : undefined,
        chargeAt: razorpaySubscription.charge_at
          ? new Date(razorpaySubscription.charge_at * 1000)
          : undefined,
        startAt: razorpaySubscription.start_at
          ? new Date(razorpaySubscription.start_at * 1000)
          : undefined,
        endAt: razorpaySubscription.end_at
          ? new Date(razorpaySubscription.end_at * 1000)
          : undefined,
        endedAt: razorpaySubscription.ended_at
          ? new Date(razorpaySubscription.ended_at * 1000)
          : undefined,
        expireBy: razorpaySubscription.expire_by
          ? new Date(razorpaySubscription.expire_by * 1000)
          : undefined,
        shortUrl: razorpaySubscription.short_url, // CRITICAL: Store the payment URL
        hasScheduledChanges:
          razorpaySubscription.has_scheduled_changes || false,
        scheduleChangeAt: razorpaySubscription.schedule_change_at,
        customerNotify: razorpaySubscription.customer_notify || false,
        notes: razorpaySubscription.notes || {},
      });

      const savedSubscription = await subscription.save();

      // Update restaurant's SaaS config with Razorpay subscription data
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'saasConfig.plan': plan.notes?.tier || 'professional',
        'saasConfig.billingCycle': plan.period === 'yearly' ? 'yearly' : 'monthly',
        'saasConfig.razorpaySubscriptionId': razorpaySubscription.id,
        'saasConfig.razorpaySubscriptionStatus': razorpaySubscription.status,
        'saasConfig.razorpayCustomerId': customer.id,
        'saasConfig.razorpayPlanId': planId,
        'saasConfig.razorpaySubscriptionStartedAt': razorpaySubscription.start_at
          ? new Date(razorpaySubscription.start_at * 1000)
          : undefined,
        'saasConfig.razorpayCurrentPeriodStart': razorpaySubscription.current_start
          ? new Date(razorpaySubscription.current_start * 1000)
          : undefined,
        'saasConfig.razorpayCurrentPeriodEnd': razorpaySubscription.current_end
          ? new Date(razorpaySubscription.current_end * 1000)
          : undefined,
        'saasConfig.razorpayNextChargeAt': razorpaySubscription.charge_at
          ? new Date(razorpaySubscription.charge_at * 1000)
          : undefined,
        'saasConfig.lastUpdated': new Date(),
      });

      this.logger.log(
        `Subscription created successfully for restaurant ${restaurantId}`
      );

      return {
        id: savedSubscription._id,
        restaurantId,
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayCustomerId: customer.id,
        plan: savedSubscription.plan,
        status: savedSubscription.status,
        // Remove shortUrl since we'll use Checkout instead
        // shortUrl: razorpaySubscription.short_url,
        startAt: razorpaySubscription.start_at
          ? new Date(razorpaySubscription.start_at * 1000)
          : undefined,
        trialPeriodDays: isTrialDisabled ? 0 : (startAt ? 0 : 30), // Indicate if trial was applied

        // Add checkout-specific data
        checkout: {
          subscriptionId: razorpaySubscription.id,
          customerId: customer.id,
          planId: planId,
          customerDetails: {
            name: restaurant.name,
            email: restaurant.email || 'no-email@restohand.com',
            contact: restaurant.phone?.replace(/\D/g, '').substring(0, 10) || '9999999999',
          },
          authenticationAmount: isTrialDisabled ? plan.item.amount : 500, // ₹5 for trial, full amount for immediate
          trialMode: !isTrialDisabled
        }
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create subscription for restaurant ${restaurantId}: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd: boolean = true
  ): Promise<any> {
    try {
      // First, find the subscription in our database to get the Razorpay subscription ID
      const subscription = await this.subscriptionModel.findById(
        subscriptionId
      );
      if (!subscription) {
        throw new BadRequestException(
          `Subscription with ID ${subscriptionId} not found`
        );
      }

      const razorpaySubscriptionId = subscription.razorpaySubscriptionId;
      if (!razorpaySubscriptionId) {
        throw new BadRequestException(
          `No Razorpay subscription ID found for subscription ${subscriptionId}`
        );
      }

      // Cancel the subscription in Razorpay
      let cancelledSubscription;
      try {
        // Try to cancel at cycle end first (if requested)
        cancelledSubscription = await this.razorpayService.cancelSubscription(
          razorpaySubscriptionId,
          { cancel_at_cycle_end: cancelAtCycleEnd }
        );
      } catch (error: any) {
        // If "no billing cycle" error and user requested cycle end cancellation, try immediate
        if (
          cancelAtCycleEnd &&
          error?.error?.description?.includes('no billing cycle is going on')
        ) {
          this.logger.warn(
            `Cannot cancel at cycle end (no active cycle), trying immediate cancellation for ${razorpaySubscriptionId}`
          );
          cancelledSubscription = await this.razorpayService.cancelSubscription(
            razorpaySubscriptionId,
            { cancel_at_cycle_end: false }
          );
        }
        // If subscription is already cancelled in Razorpay, just sync our database
        else if (
          error?.error?.description?.includes(
            'not cancellable in cancelled status'
          )
        ) {
          this.logger.warn(
            `Subscription ${razorpaySubscriptionId} already cancelled in Razorpay, syncing database`
          );
          await this.subscriptionModel.findByIdAndUpdate(subscriptionId, {
            status: SubscriptionStatus.CANCELLED,
            endAt: new Date(),
          });
          return {
            message: 'Subscription was already cancelled, database updated',
            localSubscriptionId: subscriptionId,
            razorpaySubscriptionId,
            alreadyCancelled: true,
          };
        } else {
          throw error;
        }
      }

      // Update subscription status in our database
      await this.subscriptionModel.findByIdAndUpdate(subscriptionId, {
        status: SubscriptionStatus.CANCELLED,
        endAt: cancelAtCycleEnd ? undefined : new Date(), // If immediate cancellation, set endAt to now
      });

      this.logger.log(
        `Subscription ${subscriptionId} (Razorpay: ${razorpaySubscriptionId}) cancelled successfully`
      );
      return {
        ...cancelledSubscription,
        localSubscriptionId: subscriptionId,
        razorpaySubscriptionId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to cancel subscription ${subscriptionId}: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Handle subscription webhook events from Razorpay
   */
  async handleSubscriptionWebhook(event: string, payload: any): Promise<void> {
    try {
      const subscription = payload?.subscription || payload;
      const subscriptionId = subscription?.id;

      if (!subscriptionId) {
        this.logger.warn(
          'Subscription webhook received without subscription ID',
          { event, payload }
        );
        return;
      }

      this.logger.log(
        `Processing subscription webhook: ${event} for ${subscriptionId}`
      );

      // Find subscription in our database
      const localSubscription = await this.subscriptionModel.findOne({
        razorpaySubscriptionId: subscriptionId,
      });

      if (!localSubscription) {
        this.logger.warn(
          `Local subscription not found for Razorpay ID: ${subscriptionId}`
        );
        return;
      }

      // Handle different subscription events
      switch (event) {
        case 'subscription.cancelled':
          await this.subscriptionModel.findByIdAndUpdate(
            localSubscription._id,
            {
              status: SubscriptionStatus.CANCELLED,
              endAt: new Date(),
            }
          );
          this.logger.log(
            `Subscription ${subscriptionId} marked as cancelled via webhook`
          );
          break;

        case 'subscription.authenticated':
          // Customer completed payment authorization - update status
          await this.subscriptionModel.findByIdAndUpdate(
            localSubscription._id,
            {
              status: SubscriptionStatus.AUTHENTICATED,
              authAttempts: subscription?.auth_attempts || 0,
              lastWebhookAt: new Date(),
              lastWebhookEvent: event,
            }
          );
          this.logger.log(
            `Subscription ${subscriptionId} authenticated - payment method added via webhook`
          );
          break;

        case 'subscription.activated':
          await this.subscriptionModel.findByIdAndUpdate(
            localSubscription._id,
            {
              status: SubscriptionStatus.ACTIVE,
              currentStart: subscription?.current_start
                ? new Date(subscription.current_start * 1000)
                : undefined,
              currentEnd: subscription?.current_end
                ? new Date(subscription.current_end * 1000)
                : undefined,
              chargeAt: subscription?.charge_at
                ? new Date(subscription.charge_at * 1000)
                : undefined,
              lastWebhookAt: new Date(),
              lastWebhookEvent: event,
            }
          );
          this.logger.log(
            `Subscription ${subscriptionId} marked as active via webhook`
          );
          break;

        case 'subscription.completed':
          await this.subscriptionModel.findByIdAndUpdate(
            localSubscription._id,
            {
              status: SubscriptionStatus.COMPLETED,
              endAt: new Date(),
            }
          );
          this.logger.log(
            `Subscription ${subscriptionId} marked as completed via webhook`
          );
          break;

        case 'subscription.paused':
          await this.subscriptionModel.findByIdAndUpdate(
            localSubscription._id,
            {
              status: SubscriptionStatus.PAUSED,
            }
          );
          this.logger.log(
            `Subscription ${subscriptionId} marked as paused via webhook`
          );
          break;

        case 'subscription.resumed':
          await this.subscriptionModel.findByIdAndUpdate(
            localSubscription._id,
            {
              status: SubscriptionStatus.ACTIVE,
              lastWebhookAt: new Date(),
              lastWebhookEvent: event,
            }
          );
          this.logger.log(
            `Subscription ${subscriptionId} marked as resumed via webhook`
          );
          break;

        case 'subscription.charged':
          // Payment successful - update billing history and payment count
          const paymentData = payload?.payment;
          if (paymentData) {
            const billingEntry = {
              invoiceId: paymentData.invoice_id || `inv_${Date.now()}`,
              amount: paymentData.amount || 0,
              paidAt: new Date(paymentData.created_at * 1000 || Date.now()),
              status: paymentData.status || 'captured',
            };

            await this.subscriptionModel.findByIdAndUpdate(
              localSubscription._id,
              {
                paidCount:
                  subscription?.paid_count || localSubscription.paidCount + 1,
                remainingCount: subscription?.remaining_count,
                chargeAt: subscription?.charge_at
                  ? new Date(subscription.charge_at * 1000)
                  : undefined,
                currentStart: subscription?.current_start
                  ? new Date(subscription.current_start * 1000)
                  : undefined,
                currentEnd: subscription?.current_end
                  ? new Date(subscription.current_end * 1000)
                  : undefined,
                lastWebhookAt: new Date(),
                lastWebhookEvent: event,
                $push: { billingHistory: billingEntry } as any,
              }
            );

            this.logger.log(
              `Payment recorded for subscription ${subscriptionId}: ₹${
                paymentData.amount / 100
              }`
            );
          }
          break;

        default:
          this.logger.log(`Unhandled subscription webhook event: ${event}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process subscription webhook ${event}: ${errorMessage}`,
        error
      );
      // Don't throw error to avoid webhook retries for our internal issues
    }
  }

  /**
   * Existing createSubscription method (legacy, for string restaurantId)
   */
  private async createSubscriptionLegacy(restaurantId: string) {
    const SUBSCRIPTION_AMOUNT = 79900; // ₹799 per month

    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    try {
      // Create or get existing customer
      const customerData = {
        name: restaurant.name,
        email: restaurant.email || 'no-email@restohand.com',
        contact:
          restaurant.phone?.replace(/\D/g, '').substring(0, 10) || '9999999999',
        fail_existing: 0 as const,
        notes: {
          restaurant_id: restaurantId,
          created_by: 'restohand_system',
        },
      };

      const customer = await this.razorpayService.createCustomer(customerData);
      this.logger.log(`Created/fetched Razorpay customer: ${customer.id}`);

      // Get existing plan from Razorpay
      const planId = await this.getOrCreateRazorpayPlan('professional');

      // Create subscription
      const subscription = await this.razorpayService.createSubscription({
        plan_id: planId,
        customer_id: customer.id,
        quantity: 1,
        notes: {
          restaurant_id: restaurantId,
          created_by: 'restohand_system',
        },
        notify: {
          email: true,
          sms: false,
        },
      });

      this.logger.log(`Created Razorpay subscription: ${subscription.id}`);

      // Update restaurant with subscription data
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        saasConfig: {
          plan: 'standard',
          billingCycle: 'monthly',
          subscriptionStatus: 'active',
          trialEndsAt: now,
          nextBillingDate: nextBilling,
          monthlyPrice: SUBSCRIPTION_AMOUNT,
          lastUpdated: now,
          razorpayCustomerId: customer.id,
          razorpayPlanId: planId,
          razorpaySubscriptionId: subscription.id,
          razorpaySubscriptionStatus: subscription.status,
          razorpaySubscriptionStartedAt: now,
        },
      });

      return {
        subscriptionId: subscription.id,
        customerId: customer.id,
        planId: planId,
        status: subscription.status,
        amount: SUBSCRIPTION_AMOUNT,
        nextBillingDate: nextBilling,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create subscription for ${restaurantId}: ${error.message}`,
        error
      );
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  // Webhook handlers for Razorpay subscription events
  async handleSubscriptionWebhook(event: string, payload: any) {
    this.logger.log(`Processing subscription webhook: ${event}`);

    try {
      switch (event) {
        case 'subscription.activated':
          await this.handleSubscriptionActivated(payload);
          break;
        case 'subscription.charged':
          await this.handleSubscriptionCharged(payload);
          break;
        case 'subscription.pending':
          await this.handleSubscriptionPending(payload);
          break;
        case 'subscription.halted':
        case 'subscription.cancelled':
          await this.handleSubscriptionSuspended(payload);
          break;
        case 'subscription.paused':
          await this.handleSubscriptionPaused(payload);
          break;
        case 'subscription.resumed':
          await this.handleSubscriptionResumed(payload);
          break;
        default:
          this.logger.log(`Unhandled subscription event: ${event}`);
      }
    } catch (error) {
      this.logger.error(`Error handling webhook ${event}:`, error);
      throw error;
    }
  }

  private async handleSubscriptionActivated(payload: any) {
    const subscription = payload.subscription;
    const restaurantId = subscription.notes?.restaurant_id;

    if (restaurantId) {
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'saasConfig.razorpaySubscriptionStatus': 'active',
        'saasConfig.subscriptionStatus': 'active',
        'saasConfig.lastUpdated': new Date(),
      });
      this.logger.log(`Subscription activated for restaurant ${restaurantId}`);
    }
  }

  private async handleSubscriptionCharged(payload: any) {
    const subscription = payload.subscription;
    const payment = payload.payment;
    const restaurantId = subscription.notes?.restaurant_id;

    if (restaurantId) {
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'saasConfig.subscriptionStatus': 'active',
        'saasConfig.nextBillingDate': nextBilling,
        'saasConfig.lastUpdated': new Date(),
      });

      this.logger.log(
        `Payment successful for restaurant ${restaurantId}, amount: ₹${
          payment.amount / 100
        }`
      );
    }
  }

  private async handleSubscriptionPending(payload: any) {
    const subscription = payload.subscription;
    const restaurantId = subscription.notes?.restaurant_id;

    if (restaurantId) {
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'saasConfig.razorpaySubscriptionStatus': 'pending',
        'saasConfig.lastUpdated': new Date(),
      });
      this.logger.log(`Subscription pending for restaurant ${restaurantId}`);
    }
  }

  private async handleSubscriptionSuspended(payload: any) {
    const subscription = payload.subscription;
    const restaurantId = subscription.notes?.restaurant_id;

    if (restaurantId) {
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'saasConfig.subscriptionStatus': 'suspended',
        'saasConfig.razorpaySubscriptionStatus': subscription.status,
        'saasConfig.lastUpdated': new Date(),
      });
      this.logger.log(`Subscription suspended for restaurant ${restaurantId}`);
    }
  }

  private async handleSubscriptionPaused(payload: any) {
    const subscription = payload.subscription;
    const restaurantId = subscription.notes?.restaurant_id;

    if (restaurantId) {
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'saasConfig.subscriptionStatus': 'suspended',
        'saasConfig.razorpaySubscriptionStatus': 'paused',
        'saasConfig.lastUpdated': new Date(),
      });
      this.logger.log(`Subscription paused for restaurant ${restaurantId}`);
    }
  }

  private async handleSubscriptionResumed(payload: any) {
    const subscription = payload.subscription;
    const restaurantId = subscription.notes?.restaurant_id;

    if (restaurantId) {
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'saasConfig.subscriptionStatus': 'active',
        'saasConfig.razorpaySubscriptionStatus': 'active',
        'saasConfig.lastUpdated': new Date(),
      });
      this.logger.log(`Subscription resumed for restaurant ${restaurantId}`);
    }
  }

  async getPaymentHistory(restaurantId: string) {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant?.saasConfig?.razorpaySubscriptionId) {
      return { payments: [] };
    }

    try {
      // Get subscription to fetch payment history
      const subscription = await this.razorpayService.getSubscription(
        restaurant.saasConfig.razorpaySubscriptionId
      );

      // In a real implementation, you'd fetch actual payment history from Razorpay
      // For now, return basic subscription info
      return {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan_id: subscription.plan_id,
          created_at: subscription.created_at,
          current_start: subscription.current_start,
          current_end: subscription.current_end,
        },
        // TODO: Implement actual payment history fetching
        payments: [],
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch payment history for ${restaurantId}: ${error.message}`
      );
      return { payments: [] };
    }
  }

  async getSubscriptionAnalytics() {
    const analytics = await this.subscriptionModel.aggregate([
      {
        $group: {
          _id: {
            status: '$status',
            planType: '$plan.planType',
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$plan.amount' },
        },
      },
    ]);

    const totalSubscriptions = await this.subscriptionModel.countDocuments();
    const activeSubscriptions = await this.subscriptionModel.countDocuments({
      status: {
        $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.AUTHENTICATED],
      },
    });

    const trialSubscriptions = await this.subscriptionModel.countDocuments({
      isTrialActive: true,
      trialEnd: { $gt: new Date() },
    });

    const monthlyRecurringRevenue = analytics
      .filter((item) => item._id.status === 'active')
      .reduce((total, item) => {
        // Convert yearly to monthly equivalent
        const monthlyAmount = item._id.planType.includes('yearly')
          ? Math.round(item.totalRevenue / 12)
          : item.totalRevenue;
        return total + monthlyAmount * item.count;
      }, 0);

    const planDistribution = analytics.reduce((acc, item) => {
      const key = item._id.planType;
      if (!acc[key]) {
        acc[key] = { count: 0, revenue: 0 };
      }
      acc[key].count += item.count;
      acc[key].revenue += item.totalRevenue;
      return acc;
    }, {});

    return {
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      monthlyRecurringRevenue,
      planDistribution,
      statusDistribution: analytics,
      churnRate:
        totalSubscriptions > 0
          ? (
              ((totalSubscriptions - activeSubscriptions) /
                totalSubscriptions) *
              100
            ).toFixed(2)
          : '0',
    };
  }

  async createGrandfatheredSubscription(
    restaurantId: string,
    planType: 'founding_member' | 'early_adopter',
    reason: string
  ): Promise<SubscriptionDocument> {
    const subscription = await this.createSubscription({
      restaurantId,
      planType,
      notes: {
        grandfathered: true,
        reason,
        special_pricing: true,
      },
    });

    // Mark as grandfathered
    subscription.isGrandfathered = true;
    subscription.grandfatherReason = reason;
    subscription.grandfatheredAt = new Date();
    await subscription.save();

    this.logger.log(
      `Created grandfathered subscription for restaurant ${restaurantId}: ${reason}`
    );
    return subscription;
  }

  // Legacy support methods for gradual migration
  async migrateLegacySubscription(
    restaurantId: string
  ): Promise<SubscriptionDocument | null> {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant?.saasConfig) {
      return null;
    }

    // Check if already migrated
    const existingSubscription = await this.getSubscriptionByRestaurant(
      restaurantId
    );
    if (existingSubscription) {
      return existingSubscription;
    }

    // Get plans directly from Razorpay based on legacy plan name
    const response = await this.razorpayService.getAllPlans({ count: 100 });
    const plans = response.items || [];

    // Find plan matching the legacy plan type (starter -> starter, pro -> professional, etc.)
    const legacyPlanMappings = {
      starter: 'starter',
      pro: 'professional',
      enterprise: 'enterprise',
      standard: 'professional',
    };

    const targetTier = legacyPlanMappings[restaurant.saasConfig.plan] || 'professional';
    const matchingPlan = plans.find((p: any) =>
      p.notes?.tier === targetTier &&
      p.period === 'monthly' &&
      p.notes?.test_mode !== 'true'
    );

    if (!matchingPlan) {
      throw new Error(`No matching plan found for legacy plan: ${restaurant.saasConfig.plan}`);
    }

    const planType = `${targetTier}_monthly`;

    try {
      // Create new subscription record from legacy data
      const planConfig = await this.getPlanConfig(planType);
      const subscriptionPlanDetails: SubscriptionPlanDetails = {
        razorpayPlanId: matchingPlan.id,
        planType,
        name: planConfig.name,
        amount: restaurant.saasConfig.monthlyPrice || planConfig.amount,
        currency: 'INR',
        period: restaurant.saasConfig.billingCycle || 'monthly',
        interval: 1,
        features: planConfig.features,
      };

      const subscription = new this.subscriptionModel({
        restaurantId: new Types.ObjectId(restaurantId),
        razorpaySubscriptionId:
          restaurant.saasConfig.razorpaySubscriptionId || '',
        razorpayCustomerId: restaurant.saasConfig.razorpayCustomerId || '',
        plan: subscriptionPlanDetails,
        status: this.mapLegacyStatus(restaurant.saasConfig.subscriptionStatus),
        currentStart: restaurant.saasConfig.razorpaySubscriptionStartedAt,
        currentEnd: restaurant.saasConfig.nextBillingDate,
        trialStart: restaurant.saasConfig.trialStartedAt,
        trialEnd: restaurant.saasConfig.trialEndsAt,
        isTrialActive: restaurant.saasConfig.trialEndsAt
          ? restaurant.saasConfig.trialEndsAt > new Date()
          : false,
        chargeAt: restaurant.saasConfig.nextBillingDate,
        quantity: 1,
        lastWebhookAt: restaurant.saasConfig.lastUpdated,
        lastWebhookEvent: 'migrated_from_legacy',
        notes: {
          migratedFromLegacy: true,
          originalSaasConfig: restaurant.saasConfig,
        },
      });

      await subscription.save();
      this.logger.log(
        `Migrated legacy subscription for restaurant ${restaurantId}`
      );

      return subscription;
    } catch (error) {
      this.logger.error(
        `Failed to migrate legacy subscription for ${restaurantId}: ${error.message}`
      );
      throw error;
    }
  }

  private mapLegacyStatus(legacyStatus: string): SubscriptionStatus {
    const statusMap = {
      active: SubscriptionStatus.ACTIVE,
      suspended: SubscriptionStatus.HALTED,
      pending: SubscriptionStatus.PENDING,
      cancelled: SubscriptionStatus.CANCELLED,
      trial: SubscriptionStatus.ACTIVE,
    };
    return statusMap[legacyStatus] || SubscriptionStatus.CREATED;
  }
}
