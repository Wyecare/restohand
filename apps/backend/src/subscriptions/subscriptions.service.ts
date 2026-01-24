import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { RazorpayService } from '../payments/razorpay.service';
import { Subscription, SubscriptionDocument, SubscriptionPlan, SubscriptionStatus, SubscriptionPlanDetails } from './schemas/subscription.schema';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { ConfigService } from '@nestjs/config';


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
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly planConfigs: Record<SubscriptionPlan, PlanConfig>;

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private readonly razorpayService: RazorpayService,
    private readonly configService: ConfigService,
  ) {
    this.planConfigs = this.initializePlanConfigs();
  }

  private initializePlanConfigs(): Record<SubscriptionPlan, PlanConfig> {
    return {
      [SubscriptionPlan.STARTER_MONTHLY]: {
        name: 'RestoHand Starter - Monthly',
        amount: 69900, // ₹699
        currency: 'INR',
        period: 'monthly',
        interval: 1,
        features: {
          locations: 1,
          tables: 10,
          analytics: 'basic_analytics',
          support: 'email_support',
          customBranding: false,
          inventoryAlerts: false,
          customIntegrations: false,
          dedicatedManager: false,
        },
      },
      [SubscriptionPlan.STARTER_YEARLY]: {
        name: 'RestoHand Starter - Yearly',
        amount: 769900, // ₹7,699 (2 months free)
        currency: 'INR',
        period: 'yearly',
        interval: 1,
        features: {
          locations: 1,
          tables: 10,
          analytics: 'basic_analytics',
          support: 'email_support',
          customBranding: false,
          inventoryAlerts: false,
          customIntegrations: false,
          dedicatedManager: false,
        },
      },
      [SubscriptionPlan.PROFESSIONAL_MONTHLY]: {
        name: 'RestoHand Professional - Monthly',
        amount: 129900, // ₹1,299
        currency: 'INR',
        period: 'monthly',
        interval: 1,
        features: {
          locations: 3,
          tables: 'unlimited',
          analytics: 'advanced_analytics',
          support: 'priority_support',
          customBranding: true,
          inventoryAlerts: true,
          customIntegrations: false,
          dedicatedManager: false,
        },
      },
      [SubscriptionPlan.PROFESSIONAL_YEARLY]: {
        name: 'RestoHand Professional - Yearly',
        amount: 1429900, // ₹14,299 (2 months free)
        currency: 'INR',
        period: 'yearly',
        interval: 1,
        features: {
          locations: 3,
          tables: 'unlimited',
          analytics: 'advanced_analytics',
          support: 'priority_support',
          customBranding: true,
          inventoryAlerts: true,
          customIntegrations: false,
          dedicatedManager: false,
        },
      },
      [SubscriptionPlan.ENTERPRISE_MONTHLY]: {
        name: 'RestoHand Enterprise - Monthly',
        amount: 249900, // ₹2,499
        currency: 'INR',
        period: 'monthly',
        interval: 1,
        features: {
          locations: 'unlimited',
          tables: 'unlimited',
          analytics: 'advanced_analytics',
          support: 'phone_support',
          customBranding: true,
          inventoryAlerts: true,
          customIntegrations: true,
          dedicatedManager: true,
        },
      },
      [SubscriptionPlan.ENTERPRISE_YEARLY]: {
        name: 'RestoHand Enterprise - Yearly',
        amount: 2749900, // ₹27,499 (2 months free)
        currency: 'INR',
        period: 'yearly',
        interval: 1,
        features: {
          locations: 'unlimited',
          tables: 'unlimited',
          analytics: 'advanced_analytics',
          support: 'phone_support',
          customBranding: true,
          inventoryAlerts: true,
          customIntegrations: true,
          dedicatedManager: true,
        },
      },
      [SubscriptionPlan.FOUNDING_MEMBER]: {
        name: 'RestoHand Founding Member - Monthly',
        amount: 69900, // ₹699 forever with Professional features
        currency: 'INR',
        period: 'monthly',
        interval: 1,
        features: {
          locations: 3,
          tables: 'unlimited',
          analytics: 'advanced_analytics',
          support: 'priority_support',
          customBranding: true,
          inventoryAlerts: true,
          customIntegrations: false,
          dedicatedManager: false,
        },
      },
      [SubscriptionPlan.EARLY_ADOPTER]: {
        name: 'RestoHand Early Adopter - Monthly',
        amount: 99900, // ₹999 with Professional features
        currency: 'INR',
        period: 'monthly',
        interval: 1,
        features: {
          locations: 3,
          tables: 'unlimited',
          analytics: 'advanced_analytics',
          support: 'priority_support',
          customBranding: true,
          inventoryAlerts: true,
          customIntegrations: false,
          dedicatedManager: false,
        },
      },
    };
  }

  async getAllPlans() {
    return Object.entries(this.planConfigs).map(([planType, config]) => ({
      planType: planType as SubscriptionPlan,
      name: config.name,
      amount: config.amount,
      currency: config.currency,
      period: config.period,
      interval: config.interval,
      features: config.features,
      monthlyEquivalent: config.period === 'yearly' ? Math.round(config.amount / 12) : config.amount,
      isPopular: planType === SubscriptionPlan.PROFESSIONAL_MONTHLY || planType === SubscriptionPlan.PROFESSIONAL_YEARLY,
      isLegacy: planType === SubscriptionPlan.FOUNDING_MEMBER || planType === SubscriptionPlan.EARLY_ADOPTER,
    }));
  }

  async getPlanConfig(planType: SubscriptionPlan): Promise<PlanConfig> {
    const config = this.planConfigs[planType];
    if (!config) {
      throw new BadRequestException(`Invalid plan type: ${planType}`);
    }
    return config;
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

  private async createOrGetRazorpayPlan(): Promise<string> {
    const PLAN_AMOUNT = 79900; // ₹799 per month

    try {
      const razorpayPlan = await this.razorpayService.createPlan({
        period: 'monthly',
        interval: 1,
        item: {
          name: 'RestoHand Subscription Plan',
          amount: PLAN_AMOUNT,
          currency: 'INR',
          description: 'RestoHand restaurant management subscription - monthly billing',
        },
        notes: {
          created_by: 'restohand_system',
          plan_type: 'standard',
        },
      });

      this.logger.log(`Created Razorpay plan: ${razorpayPlan.id}`);
      return razorpayPlan.id;
    } catch (error) {
      this.logger.error(`Failed to create Razorpay plan: ${error.message}`, error);
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
        email: restaurant.email,
        contact: restaurant.phone?.replace(/\D/g, '').substring(0, 10) || '9999999999',
        fail_existing: 0,
        notes: {
          restaurant_id: restaurantId,
          created_by: 'restohand_system',
        },
      };

      const customer = await this.razorpayService.createCustomer(customerData);
      this.logger.log(`Created/fetched Razorpay customer: ${customer.id}`);

      // Create plan
      const planId = await this.createOrGetRazorpayPlan();

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