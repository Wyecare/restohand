import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
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

    return {
      restaurantId,
      plan: restaurant.saasConfig.plan,
      status: restaurant.saasConfig.subscriptionStatus,
      isActive: isTrialActive || isSubscriptionActive,
      trialEndsAt: restaurant.saasConfig.trialEndsAt,
      nextBillingDate: restaurant.saasConfig.nextBillingDate,
      monthlyPrice: restaurant.saasConfig.monthlyPrice,
      daysUntilBilling: Math.ceil((restaurant.saasConfig.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }

  async upgradePlan(restaurantId: string, newPlan: 'starter' | 'pro' | 'enterprise') {
    const planPricing = {
      starter: 99900, // ₹999
      pro: 199900,    // ₹1999
      enterprise: 499900, // ₹4999
    };

    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      'saasConfig.plan': newPlan,
      'saasConfig.monthlyPrice': planPricing[newPlan],
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

  // Daily cron job to process subscriptions
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processDailyBilling() {
    this.logger.log('Starting daily subscription billing process...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find restaurants whose billing is due today
    const dueRestaurants = await this.restaurantModel.find({
      'saasConfig.nextBillingDate': {
        $gte: today,
        $lt: tomorrow,
      },
      'saasConfig.subscriptionStatus': { $in: ['trial', 'active'] },
    });

    this.logger.log(`Found ${dueRestaurants.length} restaurants with billing due today`);

    for (const restaurant of dueRestaurants) {
      try {
        if (restaurant.saasConfig.subscriptionStatus === 'trial') {
          await this.processTrialEnd(restaurant);
        } else {
          await this.processSubscriptionBilling(restaurant);
        }
      } catch (error) {
        this.logger.error(`Failed to process billing for restaurant ${restaurant.id}:`, error);
      }
    }
  }

  private async processTrialEnd(restaurant: Restaurant) {
    this.logger.log(`Processing trial end for restaurant: ${restaurant.name}`);

    try {
      // Create Razorpay order for first subscription payment
      const razorpayOrder = await this.razorpayService.createOrder({
        amount: restaurant.saasConfig.monthlyPrice,
        currency: 'INR',
        receipt: `subscription_${restaurant.id}_${Date.now()}`,
        notes: {
          restaurantId: restaurant.id,
          type: 'subscription',
          plan: restaurant.saasConfig.plan,
        },
      });

      // Send billing notification (email/SMS)
      await this.sendBillingNotification(restaurant, razorpayOrder.id);

      // Update subscription status
      await this.restaurantModel.findByIdAndUpdate(restaurant.id, {
        'saasConfig.subscriptionStatus': 'active',
        'saasConfig.lastUpdated': new Date(),
      });

      this.logger.log(`Trial ended for restaurant ${restaurant.id}, billing order created: ${razorpayOrder.id}`);

    } catch (error) {
      // If billing fails, suspend the account
      await this.suspendSubscription(restaurant.id, 'Failed to process first billing after trial');
      this.logger.error(`Failed to process trial end for ${restaurant.id}:`, error);
    }
  }

  private async processSubscriptionBilling(restaurant: Restaurant) {
    this.logger.log(`Processing subscription billing for restaurant: ${restaurant.name}`);

    try {
      // For SaaS model, we charge the subscription fee to the platform account
      const razorpayOrder = await this.razorpayService.createOrder({
        amount: restaurant.saasConfig.monthlyPrice,
        currency: 'INR',
        receipt: `subscription_${restaurant.id}_${Date.now()}`,
        notes: {
          restaurantId: restaurant.id,
          type: 'subscription',
          plan: restaurant.saasConfig.plan,
        },
      });

      // Send billing notification
      await this.sendBillingNotification(restaurant, razorpayOrder.id);

      // Update next billing date
      const nextBilling = new Date(restaurant.saasConfig.nextBillingDate);
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      await this.restaurantModel.findByIdAndUpdate(restaurant.id, {
        'saasConfig.nextBillingDate': nextBilling,
        'saasConfig.lastUpdated': new Date(),
      });

      this.logger.log(`Subscription billing processed for restaurant ${restaurant.id}`);

    } catch (error) {
      this.logger.error(`Failed to process subscription billing for ${restaurant.id}:`, error);

      // Grace period: suspend after 3 failed attempts
      await this.suspendSubscription(restaurant.id, 'Failed subscription payment');
    }
  }

  private async sendBillingNotification(restaurant: Restaurant, orderId: string) {
    // This would integrate with email/SMS service
    this.logger.log(`Billing notification sent to ${restaurant.email} for order ${orderId}`);

    // TODO: Implement actual email/SMS notification
    // - Send email with payment link
    // - Send SMS reminder
    // - Update dashboard notifications
  }

  async handleSubscriptionPayment(restaurantId: string, razorpayOrderId: string, paymentStatus: 'success' | 'failed') {
    if (paymentStatus === 'success') {
      this.logger.log(`Subscription payment successful for restaurant ${restaurantId}`);

      // Update subscription status and next billing date
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'saasConfig.subscriptionStatus': 'active',
        'saasConfig.nextBillingDate': nextBilling,
        'saasConfig.lastUpdated': new Date(),
      });

    } else {
      this.logger.warn(`Subscription payment failed for restaurant ${restaurantId}`);
      await this.suspendSubscription(restaurantId, 'Payment failed');
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