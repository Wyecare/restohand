import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CashfreeSubscription, CashfreeSubscriptionDocument, CashfreeSubscriptionStatus } from './schemas/cashfree-subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../subscription-plans/schemas/subscription-plan.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { CashfreeService } from '../payments/cashfree.service';
import {
  CreateCashfreeSubscriptionDto,
  UpdateCashfreeSubscriptionDto,
  CancelSubscriptionDto,
  RetryPaymentDto,
} from './dto/cashfree-subscription.dto';

@Injectable()
export class CashfreeSubscriptionService {
  private readonly logger = new Logger(CashfreeSubscriptionService.name);

  constructor(
    @InjectModel(CashfreeSubscription.name)
    private cashfreeSubscriptionModel: Model<CashfreeSubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private subscriptionPlanModel: Model<SubscriptionPlanDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    private readonly cashfreeService: CashfreeService,
  ) {}

  // Get all available subscription plans for restaurants
  async getAvailablePlans() {
    try {
      const plans = await this.subscriptionPlanModel
        .find({ is_active: true })
        .sort({ is_popular: -1, plan_recurring_amount: 1 })
        .lean();

      const featuredPlans = plans.filter(plan => plan.is_popular);

      return {
        plans,
        total: plans.length,
        featured_plans: featuredPlans,
      };
    } catch (error) {
      this.logger.error(`Failed to get available plans: ${error.message}`);
      throw error;
    }
  }

  // Get subscription status for a restaurant
  async getSubscriptionStatus(restaurantId: string) {
    try {
      const subscription = await this.cashfreeSubscriptionModel
        .findOne({ restaurant_id: new Types.ObjectId(restaurantId) })
        .populate('plan_id')
        .lean();

      if (!subscription) {
        return {
          restaurant_id: restaurantId,
          has_subscription: false,
          is_active: false,
          is_in_trial: false,
          features: [],
          usage_limits: {
            max_locations: 1,
            max_tables: 5,
            max_staff: 2,
            max_monthly_orders: 50,
          },
        };
      }

      const plan = subscription.plan_id as any;
      const isActive = subscription.status === CashfreeSubscriptionStatus.ACTIVE;
      const isInTrial = subscription.is_in_trial &&
        subscription.trial_ends_at &&
        new Date() < new Date(subscription.trial_ends_at) &&
        subscription.status !== CashfreeSubscriptionStatus.CANCELLED;

      // Only consider it as "having a subscription" if it's active or in trial
      const hasActiveSubscription = isActive || isInTrial;

      return {
        restaurant_id: restaurantId,
        has_subscription: hasActiveSubscription,
        subscription,
        is_active: isActive,
        is_in_trial: isInTrial,
        trial_ends_at: subscription.trial_ends_at,
        next_billing_at: subscription.next_billing_at,
        features: hasActiveSubscription ? (plan?.features || []) : [],
        usage_limits: hasActiveSubscription ? {
          max_locations: plan?.metadata?.max_locations || 1,
          max_tables: plan?.metadata?.max_tables || 5,
          max_staff: plan?.metadata?.max_staff || 2,
          max_monthly_orders: plan?.metadata?.max_monthly_orders || 50,
        } : {
          max_locations: 1,
          max_tables: 5,
          max_staff: 2,
          max_monthly_orders: 50,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription status for restaurant ${restaurantId}: ${error.message}`);
      throw error;
    }
  }

  // Create new Cashfree subscription
  async createSubscription(createDto: CreateCashfreeSubscriptionDto, adminId: string) {
    try {
      // Validate restaurant exists
      const restaurant = await this.restaurantModel.findById(createDto.restaurant_id);
      if (!restaurant) {
        throw new NotFoundException('Restaurant not found');
      }

      // Validate plan exists
      const plan = await this.subscriptionPlanModel.findById(createDto.plan_id);
      if (!plan || !plan.is_active) {
        throw new NotFoundException('Subscription plan not found or inactive');
      }

      // Check if restaurant already has an active subscription
      const existingSubscription = await this.cashfreeSubscriptionModel.findOne({
        restaurant_id: new Types.ObjectId(createDto.restaurant_id),
        status: { $in: [CashfreeSubscriptionStatus.ACTIVE, CashfreeSubscriptionStatus.INITIALIZED] },
      });

      if (existingSubscription) {
        throw new BadRequestException('Restaurant already has an active subscription');
      }

      // Create customer in Cashfree
      const customerData = {
        customer_id: `restaurant_${createDto.restaurant_id}`,
        customer_email: createDto.customer_email,
        customer_phone: createDto.customer_phone,
        customer_name: createDto.customer_name,
      };

      const cashfreeCustomer = await this.cashfreeService.createCustomer(customerData);
      this.logger.log('Cashfree customer response:', JSON.stringify(cashfreeCustomer));

      // Create subscription in Cashfree with authorization details
      const subscriptionData = {
        subscription_id: `sub_${createDto.restaurant_id}_${Date.now()}`,
        customer_id: cashfreeCustomer.customer_id,
        plan_id: plan.cashfree_plan_id,
        customer_details: {
          customer_email: createDto.customer_email,
          customer_phone: createDto.customer_phone,
          customer_name: createDto.customer_name,
        },
        authorization_amount: plan.plan_recurring_amount, // Amount in paise
        return_url: createDto.return_url || `${process.env.FRONTEND_URL}/subscription/payment-success`,
      };

      const cashfreeSubscription = await this.cashfreeService.createSubscription(subscriptionData);

      // Extract Cashfree internal subscription ID for webhook handling
      const cfSubscriptionId = cashfreeSubscription.cf_subscription_id;

      // We'll use Cashfree SDK on frontend instead of direct URL
      this.logger.log(`Subscription session ID for frontend SDK: ${cashfreeSubscription.subscription_session_id}`);
      this.logger.log(`Cashfree internal subscription ID: ${cfSubscriptionId}`);

      // Calculate trial period (30 days for new customers)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      // Calculate next billing date (after trial)
      const nextBillingAt = new Date(trialEndsAt);
      nextBillingAt.setDate(nextBillingAt.getDate() + 1);

      // Save subscription to database
      const subscription = new this.cashfreeSubscriptionModel({
        restaurant_id: new Types.ObjectId(createDto.restaurant_id),
        cashfree_subscription_id: cashfreeSubscription.subscription_id,
        cf_subscription_id: cfSubscriptionId, // Store internal CF ID for webhook handling
        cashfree_customer_id: customerData.customer_id, // Use the customer_id we created
        plan_id: new Types.ObjectId(createDto.plan_id),
        status: CashfreeSubscriptionStatus.INITIALIZED,
        authorization_amount: plan.plan_recurring_amount, // First cycle amount
        customer_email: createDto.customer_email,
        customer_phone: createDto.customer_phone,
        customer_name: createDto.customer_name,
        trial_ends_at: trialEndsAt,
        is_in_trial: true,
        next_billing_at: nextBillingAt,
        created_by: adminId,
      });

      const savedSubscription = await subscription.save();

      this.logger.log(`Created Cashfree subscription for restaurant ${createDto.restaurant_id}: ${savedSubscription._id}`);

      // Return subscription with authorization URL from Cashfree
      const populatedSubscription = await this.cashfreeSubscriptionModel
        .findById(savedSubscription._id)
        .populate('plan_id')
        .lean();

      const result = {
        subscription: populatedSubscription,
        subscription_session_id: cashfreeSubscription.subscription_session_id || null,
        requires_authorization: !!cashfreeSubscription.subscription_session_id,
        checkout_type: 'sdk', // Frontend will use Cashfree SDK
      };

      this.logger.log(`Final service response: ${JSON.stringify({
        subscription_session_id: result.subscription_session_id,
        requires_authorization: result.requires_authorization,
        checkout_type: result.checkout_type
      }, null, 2)}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw error;
    }
  }

  // Retry failed payment for subscription
  async retryFailedPayment(subscriptionId: string, returnUrl?: string) {
    try {
      const subscription = await this.cashfreeSubscriptionModel
        .findOne({ cashfree_subscription_id: subscriptionId })
        .populate('plan_id');

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      // For retry, we use Cashfree's retry payment API
      const retryResult = await this.cashfreeService.retrySubscriptionPayment({
        subscription_id: subscriptionId,
        return_url: returnUrl || `${process.env.FRONTEND_URL}/subscription/payment-success`,
      });

      return {
        payment_session_id: retryResult.payment_session_id || `retry_${subscriptionId}_${Date.now()}`,
        payment_link: retryResult.payment_link || retryResult.authorization_url,
        authorization_amount: subscription.authorization_amount,
      };
    } catch (error) {
      this.logger.error(`Failed to retry payment: ${error.message}`);
      throw error;
    }
  }

  // Update subscription plan
  async updateSubscription(subscriptionId: string, updateDto: UpdateCashfreeSubscriptionDto, adminId: string) {
    try {
      const subscription = await this.cashfreeSubscriptionModel
        .findOne({ cashfree_subscription_id: subscriptionId })
        .populate('plan_id');

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      const newPlan = await this.subscriptionPlanModel.findById(updateDto.plan_id);
      if (!newPlan || !newPlan.is_active) {
        throw new NotFoundException('New subscription plan not found or inactive');
      }

      // In Cashfree, we need to cancel the current subscription and create a new one
      // This is because Cashfree doesn't support plan changes mid-cycle

      // Cancel current subscription
      await this.cashfreeService.cancelSubscription({
        subscription_id: subscription.cashfree_subscription_id,
      });

      // Create new subscription with new plan
      const newSubscriptionData = {
        subscription_id: `sub_${subscription.restaurant_id}_${Date.now()}`,
        customer_id: subscription.cashfree_customer_id,
        plan_id: newPlan.cashfree_plan_id,
      };

      const newCashfreeSubscription = await this.cashfreeService.createSubscription(newSubscriptionData);

      // Update database record
      const updatedSubscription = await this.cashfreeSubscriptionModel.findByIdAndUpdate(
        subscription._id,
        {
          cashfree_subscription_id: newCashfreeSubscription.subscription_id,
          plan_id: new Types.ObjectId(updateDto.plan_id),
          authorization_amount: newPlan.plan_recurring_amount,
          is_authorized: false, // Need to re-authorize for new plan
          auth_link: null,
          updated_by: adminId,
          updated_at: new Date(),
        },
        { new: true }
      ).populate('plan_id');

      this.logger.log(`Updated subscription plan for ${subscriptionId} to plan ${newPlan._id}`);

      return updatedSubscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription: ${error.message}`);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, cancelDto: CancelSubscriptionDto, adminId: string) {
    try {
      const subscription = await this.cashfreeSubscriptionModel
        .findOne({ cashfree_subscription_id: subscriptionId })
        .populate('plan_id');

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      // Cancel in Cashfree
      await this.cashfreeService.cancelSubscription({
        subscription_id: subscription.cashfree_subscription_id,
      });

      // Update database status
      const cancelledSubscription = await this.cashfreeSubscriptionModel.findByIdAndUpdate(
        subscription._id,
        {
          status: CashfreeSubscriptionStatus.CANCELLED,
          failure_reason: cancelDto.reason || 'User requested cancellation',
          updated_by: adminId,
          updated_at: new Date(),
        },
        { new: true }
      ).populate('plan_id');

      this.logger.log(`Cancelled subscription ${subscriptionId}`);

      return cancelledSubscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw error;
    }
  }

  // Get payment history for a restaurant
  async getPaymentHistory(restaurantId: string) {
    try {
      const subscription = await this.cashfreeSubscriptionModel
        .findOne({ restaurant_id: new Types.ObjectId(restaurantId) })
        .populate('plan_id')
        .lean();

      if (!subscription) {
        return {
          subscription_id: null,
          payments: [],
          cycles: [],
        };
      }

      // Get payment history from Cashfree
      const paymentHistory = await this.cashfreeService.getSubscriptionPayments(
        subscription.cashfree_subscription_id
      );

      return {
        subscription_id: subscription.cashfree_subscription_id,
        payments: paymentHistory?.payments || [],
        cycles: paymentHistory?.cycles || [],
      };
    } catch (error) {
      this.logger.error(`Failed to get payment history for restaurant ${restaurantId}: ${error.message}`);
      throw error;
    }
  }

  // Handle Cashfree webhook for subscription events
  async handleSubscriptionWebhook(eventType: string, payload: any) {
    try {
      this.logger.log(`Handling Cashfree webhook: ${eventType}`);

      const subscriptionId = payload.subscription?.subscription_id;
      if (!subscriptionId) {
        this.logger.warn('Webhook payload missing subscription_id');
        return;
      }

      let subscription = await this.cashfreeSubscriptionModel.findOne({
        cashfree_subscription_id: subscriptionId,
      });

      // If not found, try to find by cf_subscription_id (Cashfree internal ID)
      if (!subscription) {
        subscription = await this.cashfreeSubscriptionModel.findOne({
          cf_subscription_id: subscriptionId,
        });
      }

      // Primary approach: Find by customer email and recent creation (since webhook CF IDs don't match our stored IDs)
      if (!subscription) {
        const customerEmail = payload?.customer_details?.customer_email;

        if (customerEmail) {
          this.logger.log(`Trying to find subscription by email: ${customerEmail}`);

          // Try to find by customer email and recent creation (within last 2 hours)
          const twoHoursAgo = new Date();
          twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

          subscription = await this.cashfreeSubscriptionModel.findOne({
            customer_email: customerEmail,
            created_at: { $gte: twoHoursAgo },
            status: { $in: ['INITIALIZED', 'BANK_APPROVAL_PENDING'] }
          }).sort({ created_at: -1 }); // Get the most recent one

          if (subscription) {
            this.logger.log(`Found subscription by customer email: ${customerEmail} (ID: ${subscription._id})`);
          } else {
            this.logger.warn(`No recent subscription found for email: ${customerEmail}`);

            // Log all subscriptions for this email for debugging
            const allSubs = await this.cashfreeSubscriptionModel.find({
              customer_email: customerEmail
            }).select('_id status created_at cf_subscription_id').sort({ created_at: -1 });

            this.logger.log(`All subscriptions for ${customerEmail}:`, allSubs);
          }
        }
      }

      if (!subscription) {
        this.logger.warn(`Subscription not found for webhook: ${subscriptionId}`);
        return;
      }

      // Update last webhook data
      await this.cashfreeSubscriptionModel.findByIdAndUpdate(subscription._id, {
        last_webhook_data: payload,
        last_webhook_at: new Date(),
      });

      switch (eventType) {
        case 'SUBSCRIPTION_BANK_APPROVAL_SUCCESS':
          await this.handleSubscriptionActivated(subscription, payload);
          break;
        case 'SUBSCRIPTION_PAYMENT_SUCCESS':
          await this.handlePaymentSuccess(subscription, payload);
          break;
        case 'SUBSCRIPTION_PAYMENT_FAILED':
          await this.handlePaymentFailed(subscription, payload);
          break;
        case 'SUBSCRIPTION_CANCELLED':
          await this.handleSubscriptionCancelled(subscription, payload);
          break;
        case 'SUBSCRIPTION_AUTHORIZATION_SUCCESS':
          await this.handleAuthorizationSuccess(subscription, payload);
          break;
        case 'SUBSCRIPTION_AUTHORIZATION_FAILED':
          await this.handleAuthorizationFailed(subscription, payload);
          break;
        default:
          this.logger.log(`Unhandled webhook event: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle subscription webhook: ${error.message}`);
      throw error;
    }
  }

  private async handleSubscriptionActivated(subscription: CashfreeSubscriptionDocument, payload: any) {
    await this.cashfreeSubscriptionModel.findByIdAndUpdate(subscription._id, {
      status: CashfreeSubscriptionStatus.ACTIVE,
      is_authorized: true,
      updated_at: new Date(),
    });

    this.logger.log(`Subscription activated: ${subscription.cashfree_subscription_id}`);
  }

  private async handlePaymentSuccess(subscription: CashfreeSubscriptionDocument, payload: any) {
    await this.cashfreeSubscriptionModel.findByIdAndUpdate(subscription._id, {
      cycles_completed: subscription.cycles_completed + 1,
      current_cycle: subscription.current_cycle + 1,
      updated_at: new Date(),
    });

    this.logger.log(`Payment successful for subscription: ${subscription.cashfree_subscription_id}`);
  }

  private async handlePaymentFailed(subscription: CashfreeSubscriptionDocument, payload: any) {
    await this.cashfreeSubscriptionModel.findByIdAndUpdate(subscription._id, {
      failure_reason: payload.payment?.failure_reason || 'Payment failed',
      updated_at: new Date(),
    });

    this.logger.log(`Payment failed for subscription: ${subscription.cashfree_subscription_id}`);
  }

  private async handleSubscriptionCancelled(subscription: CashfreeSubscriptionDocument, payload: any) {
    await this.cashfreeSubscriptionModel.findByIdAndUpdate(subscription._id, {
      status: CashfreeSubscriptionStatus.CANCELLED,
      updated_at: new Date(),
    });

    this.logger.log(`Subscription cancelled: ${subscription.cashfree_subscription_id}`);
  }

  private async handleAuthorizationSuccess(subscription: CashfreeSubscriptionDocument, payload: any) {
    await this.cashfreeSubscriptionModel.findByIdAndUpdate(subscription._id, {
      is_authorized: true,
      status: CashfreeSubscriptionStatus.ACTIVE, // Set to ACTIVE after successful authorization
      is_in_trial: true, // Enable trial period
      updated_at: new Date(),
    });

    this.logger.log(`Authorization successful for subscription: ${subscription.cashfree_subscription_id} - Now ACTIVE in trial`);
  }

  private async handleAuthorizationFailed(subscription: CashfreeSubscriptionDocument, payload: any) {
    await this.cashfreeSubscriptionModel.findByIdAndUpdate(subscription._id, {
      status: CashfreeSubscriptionStatus.AUTHORIZATION_FAILED,
      failure_reason: payload.payment?.failure_reason || 'Authorization failed',
      updated_at: new Date(),
    });

    this.logger.log(`Authorization failed for subscription: ${subscription.cashfree_subscription_id}`);
  }
}