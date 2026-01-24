import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { RazorpayService } from '../payments/razorpay.service';
import { Subscription, SubscriptionDocument, SubscriptionPlan, SubscriptionStatus, SubscriptionPlanDetails } from './schemas/subscription.schema';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { PlanCacheService } from './plan-cache.service';


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
  isTestPlan?: boolean;    // NEW: Indicate if this is a test plan
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private readonly razorpayService: RazorpayService,
    private readonly configService: ConfigService,
    private readonly planCacheService: PlanCacheService,
  ) {}

  /**
   * Convert Razorpay plan to our internal format
   */
  private convertRazorpayPlanToInternal(razorpayPlan: any): PlanConfig & { razorpayPlanId: string } {
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
      const razorpayPlans = await this.planCacheService.getAllPlans();

      const plans = razorpayPlans
        .filter(plan => {
          const isTestPlan = plan.notes?.test_mode === 'true';
          return includeTestPlans ? true : !isTestPlan;
        })
        .map(plan => {
          const converted = this.convertRazorpayPlanToInternal(plan);
          const tier = plan.notes?.tier || 'unknown';

          return {
            razorpayPlanId: plan.id,
            planType: this.mapTierToPlanType(tier, plan.period, converted.isTestPlan),
            name: converted.name,
            amount: converted.amount,
            currency: converted.currency,
            period: converted.period,
            interval: converted.interval,
            features: converted.features,
            monthlyEquivalent: converted.period === 'yearly' ? Math.round(converted.amount / 12) : converted.amount,
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
          const tierOrder = { starter: 1, professional: 2, enterprise: 3, founding_member: 4, early_adopter: 5 };
          const aTierOrder = tierOrder[a.tier] || 999;
          const bTierOrder = tierOrder[b.tier] || 999;

          if (aTierOrder !== bTierOrder) {
            return aTierOrder - bTierOrder;
          }

          const periodOrder = { daily: 1, weekly: 2, monthly: 3, yearly: 4 };
          return (periodOrder[a.period] || 999) - (periodOrder[b.period] || 999);
        });

      this.logger.log(`Retrieved ${plans.length} plans from Razorpay (includeTestPlans: ${includeTestPlans})`);
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
  private mapTierToPlanType(tier: string, period: string, isTestPlan = false): SubscriptionPlan | null {
    // For test plans, map to the closest production equivalent
    if (isTestPlan) {
      const testMapping: Record<string, SubscriptionPlan> = {
        'starter': SubscriptionPlan.STARTER_MONTHLY,
        'professional': SubscriptionPlan.PROFESSIONAL_MONTHLY,
        'enterprise': SubscriptionPlan.ENTERPRISE_MONTHLY,
        'founding_member': SubscriptionPlan.FOUNDING_MEMBER,
        'early_adopter': SubscriptionPlan.EARLY_ADOPTER,
      };
      return testMapping[tier] || null;
    }

    // Production plan mapping
    const mapping: Record<string, SubscriptionPlan> = {
      'starter-monthly': SubscriptionPlan.STARTER_MONTHLY,
      'starter-yearly': SubscriptionPlan.STARTER_YEARLY,
      'professional-monthly': SubscriptionPlan.PROFESSIONAL_MONTHLY,
      'professional-yearly': SubscriptionPlan.PROFESSIONAL_YEARLY,
      'enterprise-monthly': SubscriptionPlan.ENTERPRISE_MONTHLY,
      'enterprise-yearly': SubscriptionPlan.ENTERPRISE_YEARLY,
      'founding_member-monthly': SubscriptionPlan.FOUNDING_MEMBER,
      'early_adopter-monthly': SubscriptionPlan.EARLY_ADOPTER,
    };

    return mapping[`${tier}-${period}`] || null;
  }

  async getPlanConfig(planType: SubscriptionPlan): Promise<PlanConfig> {
    try {
      // Get the actual Razorpay plan ID for this plan type
      const razorpayPlanId = await this.planCacheService.mapLegacyPlanToRazorpayId(planType);
      if (!razorpayPlanId) {
        throw new BadRequestException(`No Razorpay plan found for plan type: ${planType}`);
      }

      // Fetch the plan details from Razorpay
      const razorpayPlan = await this.planCacheService.getPlan(razorpayPlanId);
      if (!razorpayPlan) {
        throw new BadRequestException(`Razorpay plan ${razorpayPlanId} not found`);
      }

      // Convert to internal format
      const config = this.convertRazorpayPlanToInternal(razorpayPlan);
      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get plan config for ${planType}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get test plan for a specific tier (for development/testing)
   */
  async getTestPlan(tier: 'starter' | 'professional' | 'enterprise'): Promise<PlanConfig | null> {
    try {
      const testPlan = await this.planCacheService.getTestPlan(tier);
      if (!testPlan) {
        this.logger.warn(`No test plan found for tier: ${tier}`);
        return null;
      }

      return this.convertRazorpayPlanToInternal(testPlan);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get test plan for ${tier}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Sync plans from Razorpay (force refresh cache)
   */
  async syncPlansFromRazorpay(): Promise<void> {
    try {
      await this.planCacheService.syncPlansFromRazorpay();
      this.logger.log('Successfully synced plans from Razorpay');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync plans from Razorpay: ${errorMessage}`);
      throw error;
    }
  }

  async getSubscriptionByRestaurant(restaurantId: string): Promise<SubscriptionDocument | null> {
    if (!Types.ObjectId.isValid(restaurantId)) {
      throw new BadRequestException('Invalid restaurant ID');
    }

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
        isTrialActive: false,
        trialEndsAt: null,
        currentStart: null,
        currentEnd: null,
        nextChargeAt: null,
        features: null,
      };
    }

    const now = new Date();
    const isTrialActive = subscription.isTrialActive && subscription.trialEnd && subscription.trialEnd > now;
    const isSubscriptionActive = [SubscriptionStatus.ACTIVE, SubscriptionStatus.AUTHENTICATED].includes(subscription.status);

    // Get latest Razorpay data if subscription exists
    let razorpayData = null;
    if (subscription.razorpaySubscriptionId) {
      try {
        const razorpaySubscription = await this.razorpayService.getSubscription(subscription.razorpaySubscriptionId);
        razorpayData = {
          id: razorpaySubscription.id,
          status: razorpaySubscription.status,
          currentStart: razorpaySubscription.current_start ? new Date(razorpaySubscription.current_start * 1000) : null,
          currentEnd: razorpaySubscription.current_end ? new Date(razorpaySubscription.current_end * 1000) : null,
          chargeAt: razorpaySubscription.charge_at ? new Date(razorpaySubscription.charge_at * 1000) : null,
          totalCount: razorpaySubscription.total_count,
          paidCount: razorpaySubscription.paid_count,
          remainingCount: razorpaySubscription.remaining_count,
        };
      } catch (error) {
        this.logger.error(`Failed to fetch Razorpay subscription ${subscription.razorpaySubscriptionId}: ${error.message}`);
      }
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
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        isTrialActive: subscription.isTrialActive,
        chargeAt: subscription.chargeAt,
        quantity: subscription.quantity,
        totalCount: subscription.totalCount,
        paidCount: subscription.paidCount,
        remainingCount: subscription.remainingCount,
        billingHistory: subscription.billingHistory || [],
        lastWebhookAt: subscription.lastWebhookAt,
        lastWebhookEvent: subscription.lastWebhookEvent,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
      plan: subscription.plan,
      status: subscription.status,
      isActive: isTrialActive || isSubscriptionActive,
      isTrialActive,
      trialEndsAt: subscription.trialEnd,
      currentStart: razorpayData?.currentStart || subscription.currentStart,
      currentEnd: razorpayData?.currentEnd || subscription.currentEnd,
      nextChargeAt: razorpayData?.chargeAt || subscription.chargeAt,
      features: subscription.plan.features,
      razorpayData,
    };
  }

  async upgradePlan(restaurantId: string, newPlan: 'starter' | 'pro' | 'enterprise', billingCycle: 'hourly' | 'daily' | 'monthly' | 'yearly' = 'monthly') {
    const planPricing = {
      // Test pricing for different billing cycles
      hourly: {
        starter: 100,    // ₹1 per hour for testing
        pro: 200,        // ₹2 per hour for testing
        enterprise: 500, // ₹5 per hour for testing
      },
      daily: {
        starter: 1000,   // ₹10 per day for testing
        pro: 2000,       // ₹20 per day for testing
        enterprise: 5000, // ₹50 per day for testing
      },
      monthly: {
        starter: 29900,   // ₹299 per month
        pro: 59900,       // ₹599 per month
        enterprise: 99900, // ₹999 per month
      },
      yearly: {
        starter: 299000,  // ₹2,990 per year (10 months pricing)
        pro: 599000,      // ₹5,990 per year (10 months pricing)
        enterprise: 999000, // ₹9,990 per year (10 months pricing)
      }
    };

    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      'saasConfig.plan': newPlan,
      'saasConfig.billingCycle': billingCycle,
      'saasConfig.monthlyPrice': planPricing[billingCycle][newPlan],
      'saasConfig.lastUpdated': new Date(),
    });

    this.logger.log(`Restaurant ${restaurantId} upgraded to ${newPlan} plan`);
  }

  async suspendSubscription(restaurantId: string, reason: string) {
    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      'saasConfig.subscriptionStatus': 'suspended',
      'saasConfig.lastUpdated': new Date(),
    });

    this.logger.warn(`Restaurant ${restaurantId} subscription suspended: ${reason}`);
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
  private async getOrCreateRazorpayPlan(tier: 'starter' | 'professional' | 'enterprise' = 'professional'): Promise<string> {
    try {
      // Try to get existing plan from Razorpay
      const existingPlan = await this.planCacheService.getTestPlan(tier);
      if (existingPlan) {
        this.logger.log(`Using existing Razorpay plan: ${existingPlan.id} for tier: ${tier}`);
        return existingPlan.id;
      }

      // Fallback: Get any professional monthly plan
      const plans = await this.getAllPlans(true); // Include test plans
      const fallbackPlan = plans.find(p =>
        p.tier === 'professional' &&
        (p.period === 'monthly' || p.period === 'daily')
      );

      if (fallbackPlan) {
        this.logger.log(`Using fallback Razorpay plan: ${fallbackPlan.razorpayPlanId}`);
        return fallbackPlan.razorpayPlanId;
      }

      throw new Error('No suitable plans found in Razorpay. Please create plans first.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Razorpay plan: ${errorMessage}`, error);
      throw error;
    }
  }

  async createSubscription(restaurantId: string) {
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
        contact: restaurant.phone?.replace(/\D/g, '').substring(0, 10) || '9999999999',
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
      this.logger.error(`Failed to create subscription for ${restaurantId}: ${error.message}`, error);
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

      this.logger.log(`Payment successful for restaurant ${restaurantId}, amount: ₹${payment.amount / 100}`);
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
      const subscription = await this.razorpayService.getSubscription(restaurant.saasConfig.razorpaySubscriptionId);

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
        payments: []
      };
    } catch (error) {
      this.logger.error(`Failed to fetch payment history for ${restaurantId}: ${error.message}`);
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
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.AUTHENTICATED] },
    });

    const trialSubscriptions = await this.subscriptionModel.countDocuments({
      isTrialActive: true,
      trialEnd: { $gt: new Date() },
    });

    const monthlyRecurringRevenue = analytics
      .filter(item => item._id.status === 'active')
      .reduce((total, item) => {
        // Convert yearly to monthly equivalent
        const monthlyAmount = item._id.planType.includes('yearly')
          ? Math.round(item.totalRevenue / 12)
          : item.totalRevenue;
        return total + (monthlyAmount * item.count);
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
      churnRate: totalSubscriptions > 0
        ? ((totalSubscriptions - activeSubscriptions) / totalSubscriptions * 100).toFixed(2)
        : '0',
    };
  }

  async createGrandfatheredSubscription(
    restaurantId: string,
    planType: SubscriptionPlan.FOUNDING_MEMBER | SubscriptionPlan.EARLY_ADOPTER,
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

    this.logger.log(`Created grandfathered subscription for restaurant ${restaurantId}: ${reason}`);
    return subscription;
  }

  // Legacy support methods for gradual migration
  async migrateLegacySubscription(restaurantId: string): Promise<SubscriptionDocument | null> {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant?.saasConfig) {
      return null;
    }

    // Check if already migrated
    const existingSubscription = await this.getSubscriptionByRestaurant(restaurantId);
    if (existingSubscription) {
      return existingSubscription;
    }

    // Map legacy plan to new plan type
    const legacyToNewPlan = {
      starter: SubscriptionPlan.STARTER_MONTHLY,
      pro: SubscriptionPlan.PROFESSIONAL_MONTHLY,
      enterprise: SubscriptionPlan.ENTERPRISE_MONTHLY,
      standard: SubscriptionPlan.PROFESSIONAL_MONTHLY, // Default mapping
    };

    const planType = legacyToNewPlan[restaurant.saasConfig.plan] || SubscriptionPlan.PROFESSIONAL_MONTHLY;

    try {
      // Create new subscription record from legacy data
      const planConfig = await this.getPlanConfig(planType);
      const subscriptionPlanDetails: SubscriptionPlanDetails = {
        razorpayPlanId: restaurant.saasConfig.razorpayPlanId || '',
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
        razorpaySubscriptionId: restaurant.saasConfig.razorpaySubscriptionId || '',
        razorpayCustomerId: restaurant.saasConfig.razorpayCustomerId || '',
        plan: subscriptionPlanDetails,
        status: this.mapLegacyStatus(restaurant.saasConfig.subscriptionStatus),
        currentStart: restaurant.saasConfig.razorpaySubscriptionStartedAt,
        currentEnd: restaurant.saasConfig.nextBillingDate,
        trialStart: restaurant.saasConfig.trialStartedAt,
        trialEnd: restaurant.saasConfig.trialEndsAt,
        isTrialActive: restaurant.saasConfig.trialEndsAt ? restaurant.saasConfig.trialEndsAt > new Date() : false,
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
      this.logger.log(`Migrated legacy subscription for restaurant ${restaurantId}`);

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to migrate legacy subscription for ${restaurantId}: ${error.message}`);
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