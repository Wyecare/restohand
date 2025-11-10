import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { RazorpayService } from '../payments/razorpay.service';

export interface SubscriptionBilling {
  restaurantId: string;
  amount: number;
  currency: string;
  period: string;
  status: 'pending' | 'success' | 'failed';
  razorpayOrderId?: string;
  createdAt: Date;
  paidAt?: Date;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
    private readonly razorpayService: RazorpayService,
  ) {}

  async getSubscriptionStatus(restaurantId: string) {
    const restaurant = await this.restaurantModel.findById(restaurantId);

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Check if restaurant has SaaS configuration
    if (!restaurant.saasConfig) {
      throw new Error('Restaurant not onboarded to SaaS model. Please complete onboarding first.');
    }

    const now = new Date();
    const isTrialActive = restaurant.saasConfig.trialEndsAt > now;
    const isSubscriptionActive = restaurant.saasConfig.subscriptionStatus === 'active';

    let razorpaySubscriptionData = null;

    // Get Razorpay subscription details if available
    if (restaurant.saasConfig.razorpaySubscriptionId) {
      try {
        const razorpaySubscription = await this.razorpayService.getSubscription(restaurant.saasConfig.razorpaySubscriptionId);
        razorpaySubscriptionData = {
          id: razorpaySubscription.id,
          status: razorpaySubscription.status,
          plan_id: razorpaySubscription.plan_id,
          customer_id: razorpaySubscription.customer_id,
          current_start: new Date(razorpaySubscription.current_start * 1000),
          current_end: new Date(razorpaySubscription.current_end * 1000),
          ended_at: razorpaySubscription.ended_at ? new Date(razorpaySubscription.ended_at * 1000) : null,
          charge_at: new Date(razorpaySubscription.charge_at * 1000),
          total_count: razorpaySubscription.total_count,
          paid_count: razorpaySubscription.paid_count,
          remaining_count: razorpaySubscription.remaining_count,
        };
      } catch (error) {
        this.logger.error(`Failed to fetch Razorpay subscription ${restaurant.saasConfig.razorpaySubscriptionId}: ${error.message}`);
      }
    }

    return {
      restaurantId,
      plan: restaurant.saasConfig.plan,
      billingCycle: restaurant.saasConfig.billingCycle,
      status: restaurant.saasConfig.subscriptionStatus,
      isActive: isTrialActive || isSubscriptionActive,
      trialEndsAt: restaurant.saasConfig.trialEndsAt,
      nextBillingDate: restaurant.saasConfig.nextBillingDate,
      monthlyPrice: restaurant.saasConfig.monthlyPrice,
      daysUntilBilling: Math.ceil((restaurant.saasConfig.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      razorpaySubscription: razorpaySubscriptionData,
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

  async getAnalytics() {
    const analytics = await this.restaurantModel.aggregate([
      {
        $group: {
          _id: '$saasConfig.subscriptionStatus',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$saasConfig.monthlyPrice' },
        },
      },
    ]);

    const totalRestaurants = await this.restaurantModel.countDocuments();

    return {
      totalRestaurants,
      byStatus: analytics,
      monthlyRecurringRevenue: analytics
        .filter(item => item._id === 'active')
        .reduce((total, item) => total + item.totalRevenue, 0),
    };
  }
}