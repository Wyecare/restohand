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
    try {
      // Generate payment link for restaurant
      const paymentLink = `${process.env.FRONTEND_URL || 'https://app.restohand.com'}/subscription?payment=${orderId}`;

      // Create payment notification
      const message = `Dear ${restaurant.name},\n\nYour subscription payment of ₹${restaurant.saasConfig.monthlyPrice / 100} is due.\n\nPay securely here: ${paymentLink}\n\nRazorpay Order ID: ${orderId}\n\nBest regards,\nRestohand Team`;

      this.logger.log(`Billing notification prepared for ${restaurant.email}:`);
      this.logger.log(`Payment Link: ${paymentLink}`);
      this.logger.log(`Amount: ₹${restaurant.saasConfig.monthlyPrice / 100}`);

      // TODO: Implement actual email/SMS service integration
      // Example implementations:
      // await this.emailService.send({
      //   to: restaurant.email,
      //   subject: 'Subscription Payment Due - Restohand',
      //   body: message,
      //   html: this.generatePaymentEmailTemplate(restaurant, paymentLink, orderId)
      // });

      // await this.smsService.send({
      //   to: restaurant.phone,
      //   message: `Restohand subscription payment due. Pay here: ${paymentLink}`
      // });

      this.logger.log(`Billing notification sent to ${restaurant.email} for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to send billing notification to ${restaurant.email}:`, error);
    }
  }

  private generatePaymentEmailTemplate(restaurant: Restaurant, paymentLink: string, orderId: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Restohand Subscription</h1>
            </div>
            <div class="content">
              <h2>Hello ${restaurant.name}!</h2>
              <p>Your monthly subscription payment is due.</p>
              <p><strong>Amount:</strong> ₹${restaurant.saasConfig.monthlyPrice / 100}</p>
              <p><strong>Plan:</strong> ${restaurant.saasConfig.plan.charAt(0).toUpperCase() + restaurant.saasConfig.plan.slice(1)}</p>
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p>Please click the button below to complete your payment:</p>
              <a href="${paymentLink}" class="button">Pay Now</a>
              <p>If you have any questions, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2024 Restohand. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
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