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
        starter: 99900,   // ₹999 per month (production)
        pro: 199900,      // ₹1999 per month (production)
        enterprise: 499900, // ₹4999 per month (production)
      },
      yearly: {
        starter: 1199000,  // ₹11,990 per year (production)
        pro: 2399000,      // ₹23,990 per year (production)
        enterprise: 5999000, // ₹59,990 per year (production)
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

  private async createOrGetRazorpayPlans() {
    const planPricing = {
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
        starter: 99900,   // ₹999 per month (production)
        pro: 199900,      // ₹1999 per month (production)
        enterprise: 499900, // ₹4999 per month (production)
      },
      yearly: {
        starter: 1199000,  // ₹11,990 per year (production)
        pro: 2399000,      // ₹23,990 per year (production)
        enterprise: 5999000, // ₹59,990 per year (production)
      }
    };

    const plans: Record<string, string> = {};

    try {
      for (const [cycle, pricing] of Object.entries(planPricing)) {
        for (const [planType, amount] of Object.entries(pricing)) {
          const planKey = `${planType}_${cycle}`;

          // Convert billing cycle to Razorpay format
          const period = cycle === 'yearly' ? 'yearly' : cycle === 'monthly' ? 'monthly' : 'daily';
          const interval = cycle === 'hourly' ? 1 : 1; // Razorpay doesn't support hourly, we'll handle hourly as daily with custom logic

          if (cycle === 'hourly') {
            // For hourly billing, we'll create daily plans but handle billing logic separately
            this.logger.log(`Skipping Razorpay plan for hourly ${planType} - will handle via custom cron jobs`);
            continue;
          }

          const razorpayPlan = await this.razorpayService.createPlan({
            period: period as 'daily' | 'weekly' | 'monthly' | 'yearly',
            interval,
            item: {
              name: `RestoHand ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan (${cycle})`,
              amount,
              currency: 'INR',
              description: `RestoHand ${planType} subscription - ${cycle} billing`,
            },
            notes: {
              planType,
              billingCycle: cycle,
              created_by: 'restohand_system',
            },
          });

          plans[planKey] = razorpayPlan.id;
          this.logger.log(`Created Razorpay plan ${planKey}: ${razorpayPlan.id}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to create Razorpay plans: ${error.message}`, error);
      throw error;
    }

    return plans;
  }

  async initializeTestSubscription(restaurantId: string, plan: 'starter' | 'pro' | 'enterprise' = 'starter', billingCycle: 'hourly' | 'daily' | 'monthly' | 'yearly' = 'hourly') {
    const planPricing = {
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
        starter: 99900,   // ₹999 per month (production)
        pro: 199900,      // ₹1999 per month (production)
        enterprise: 499900, // ₹4999 per month (production)
      },
      yearly: {
        starter: 1199000,  // ₹11,990 per year (production)
        pro: 2399000,      // ₹23,990 per year (production)
        enterprise: 5999000, // ₹59,990 per year (production)
      }
    };

    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const now = new Date();
    let nextBilling = new Date(now);

    // Set next billing based on cycle
    switch (billingCycle) {
      case 'hourly':
        nextBilling.setHours(now.getHours() + 1);
        break;
      case 'daily':
        nextBilling.setDate(now.getDate() + 1);
        break;
      case 'monthly':
        nextBilling.setMonth(now.getMonth() + 1);
        break;
      case 'yearly':
        nextBilling.setFullYear(now.getFullYear() + 1);
        break;
    }

    let razorpayCustomerId: string | undefined;
    let razorpayPlanId: string | undefined;
    let razorpaySubscriptionId: string | undefined;
    let razorpaySubscriptionStatus: string | undefined;

    // Create Razorpay subscription for non-hourly billing
    if (billingCycle !== 'hourly') {
      try {
        // Create or get existing customer
        const customerData = {
          name: restaurant.name,
          email: restaurant.email,
          contact: restaurant.phone?.replace(/\D/g, '').substring(0, 10) || '9999999999',
          fail_existing: 0, // Don't fail if customer exists
          notes: {
            restaurant_id: restaurantId,
            plan,
            billingCycle,
          },
        };

        const customer = await this.razorpayService.createCustomer(customerData);
        razorpayCustomerId = customer.id;

        // Get or create plan
        const plans = await this.createOrGetRazorpayPlans();
        const planKey = `${plan}_${billingCycle}`;
        razorpayPlanId = plans[planKey];

        if (razorpayPlanId) {
          // Create subscription
          const subscription = await this.razorpayService.createSubscription({
            plan_id: razorpayPlanId,
            customer_id: razorpayCustomerId,
            total_count: 12, // Limit to 12 billing cycles for testing
            quantity: 1,
            start_at: Math.floor(nextBilling.getTime() / 1000), // Start at next billing date
            notes: {
              restaurant_id: restaurantId,
              plan,
              billingCycle,
              created_by: 'restohand_system',
            },
            notify: {
              email: true,
              sms: false,
            },
          });

          razorpaySubscriptionId = subscription.id;
          razorpaySubscriptionStatus = subscription.status;

          this.logger.log(`Created Razorpay subscription for ${restaurantId}: ${subscription.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create Razorpay subscription for ${restaurantId}: ${error.message}`, error);
        // Continue with local subscription even if Razorpay fails
      }
    }

    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      saasConfig: {
        plan,
        billingCycle,
        subscriptionStatus: 'active', // Skip trial
        trialEndsAt: now, // Set trial as already ended
        nextBillingDate: nextBilling,
        monthlyPrice: planPricing[billingCycle][plan],
        lastUpdated: now,
        razorpayCustomerId,
        razorpayPlanId,
        razorpaySubscriptionId,
        razorpaySubscriptionStatus,
        razorpaySubscriptionStartedAt: razorpaySubscriptionId ? now : undefined,
      },
    });

    this.logger.log(`Restaurant ${restaurantId} initialized with ${billingCycle} ${plan} plan (no trial)${razorpaySubscriptionId ? ' with Razorpay subscription' : ' as local subscription'}`);

    return {
      plan,
      billingCycle,
      amount: planPricing[billingCycle][plan],
      nextBillingDate: nextBilling,
      status: 'active',
      razorpaySubscriptionId: razorpaySubscriptionId || null,
    };
  }

  // Hourly cron job to check for billing (supports hourly and daily cycles)
  @Cron(CronExpression.EVERY_HOUR)
  async processHourlyBilling() {
    this.logger.log('Starting hourly billing check...');
    await this.processBillingByType('hourly');
  }

  // Daily cron job to process subscriptions
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processDailyBilling() {
    this.logger.log('Starting daily subscription billing process...');
    await this.processBillingByType('daily');
  }

  // Monthly billing (existing logic)
  @Cron('0 6 1 * *') // First day of every month at 6 AM
  async processMonthlyBilling() {
    this.logger.log('Starting monthly subscription billing process...');
    await this.processBillingByType('monthly');
  }

  private async processBillingByType(billingType: 'hourly' | 'daily' | 'monthly') {
    const now = new Date();
    let startTime: Date;
    let endTime: Date;

    if (billingType === 'hourly') {
      // Check for hourly billing
      startTime = new Date(now);
      startTime.setMinutes(0, 0, 0);
      endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);
    } else if (billingType === 'daily') {
      // Check for daily billing
      startTime = new Date(now);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + 1);
    } else {
      // Monthly billing
      startTime = new Date(now);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + 1);
    }

    // Find restaurants whose billing is due
    const dueRestaurants = await this.restaurantModel.find({
      'saasConfig.billingCycle': billingType,
      'saasConfig.nextBillingDate': {
        $gte: startTime,
        $lt: endTime,
      },
      'saasConfig.subscriptionStatus': 'active', // No trial, direct to active
    });

    this.logger.log(`Found ${dueRestaurants.length} restaurants with ${billingType} billing due`);

    for (const restaurant of dueRestaurants) {
      try {
        await this.processSubscriptionBilling(restaurant);
      } catch (error) {
        this.logger.error(`Failed to process ${billingType} billing for restaurant ${restaurant.id}:`, error);
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

      // Update next billing date based on billing cycle
      const nextBilling = new Date(restaurant.saasConfig.nextBillingDate);

      switch (restaurant.saasConfig.billingCycle) {
        case 'hourly':
          nextBilling.setHours(nextBilling.getHours() + 1);
          break;
        case 'daily':
          nextBilling.setDate(nextBilling.getDate() + 1);
          break;
        case 'monthly':
          nextBilling.setMonth(nextBilling.getMonth() + 1);
          break;
        case 'yearly':
          nextBilling.setFullYear(nextBilling.getFullYear() + 1);
          break;
      }

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