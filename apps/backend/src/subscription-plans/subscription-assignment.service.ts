import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';

@Injectable()
export class SubscriptionAssignmentService {
  private readonly logger = new Logger(SubscriptionAssignmentService.name);

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(SubscriptionPlan.name) private subscriptionPlanModel: Model<SubscriptionPlanDocument>,
  ) {}

  /**
   * Assign a subscription plan to a restaurant
   */
  async assignPlanToRestaurant(
    restaurantId: string,
    planId: string,
    startDate?: Date,
    duration?: number, // Duration in months
  ): Promise<RestaurantDocument> {
    // Validate the plan exists
    const plan = await this.subscriptionPlanModel.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Subscription plan not found: ${planId}`);
    }

    // Validate the restaurant exists
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant not found: ${restaurantId}`);
    }

    const subscriptionStartedAt = startDate || new Date();
    let subscriptionExpiresAt: Date | undefined;

    // Calculate expiration date based on plan interval
    if (plan.plan_interval_type && plan.plan_intervals) {
      const durationMonths = duration || (plan.plan_intervals * plan.plan_max_cycles);
      subscriptionExpiresAt = new Date(subscriptionStartedAt);

      switch (plan.plan_interval_type) {
        case 'DAY':
          subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + (durationMonths * 30)); // Approximate
          break;
        case 'WEEK':
          subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + (durationMonths * 7));
          break;
        case 'MONTH':
          subscriptionExpiresAt.setMonth(subscriptionExpiresAt.getMonth() + durationMonths);
          break;
        case 'YEAR':
          subscriptionExpiresAt.setFullYear(subscriptionExpiresAt.getFullYear() + (durationMonths / 12));
          break;
      }
    }

    // Update restaurant with subscription details
    const updatedRestaurant = await this.restaurantModel.findByIdAndUpdate(
      restaurantId,
      {
        currentSubscriptionPlanId: planId,
        subscriptionStartedAt,
        subscriptionExpiresAt,
        subscriptionStatus: 'active',
      },
      { new: true }
    );

    this.logger.log(
      `Assigned plan ${plan.display_name} (${planId}) to restaurant ${restaurant.name} (${restaurantId})`
    );

    return updatedRestaurant;
  }

  /**
   * Upgrade/downgrade restaurant plan
   */
  async changePlan(
    restaurantId: string,
    newPlanId: string,
    effectiveDate?: Date,
  ): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant not found: ${restaurantId}`);
    }

    const oldPlan = restaurant.currentSubscriptionPlanId
      ? await this.subscriptionPlanModel.findById(restaurant.currentSubscriptionPlanId)
      : null;

    const newPlan = await this.subscriptionPlanModel.findById(newPlanId);
    if (!newPlan) {
      throw new NotFoundException(`Subscription plan not found: ${newPlanId}`);
    }

    // Log the plan change
    if (oldPlan) {
      this.logger.log(
        `Changing plan for restaurant ${restaurant.name} from ${oldPlan.display_name} to ${newPlan.display_name}`
      );
    } else {
      this.logger.log(
        `Assigning first plan for restaurant ${restaurant.name}: ${newPlan.display_name}`
      );
    }

    // Use the assignment method with effective date
    return this.assignPlanToRestaurant(restaurantId, newPlanId, effectiveDate);
  }

  /**
   * Cancel subscription (move to trial or suspended)
   */
  async cancelSubscription(
    restaurantId: string,
    reason?: string,
  ): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant not found: ${restaurantId}`);
    }

    const updatedRestaurant = await this.restaurantModel.findByIdAndUpdate(
      restaurantId,
      {
        subscriptionStatus: 'suspended',
        // Keep the plan ID for potential reactivation
        // currentSubscriptionPlanId: null, // Don't remove, just suspend
      },
      { new: true }
    );

    this.logger.log(
      `Cancelled subscription for restaurant ${restaurant.name} (${restaurantId}). Reason: ${reason || 'Not specified'}`
    );

    return updatedRestaurant;
  }

  /**
   * Reactivate suspended subscription
   */
  async reactivateSubscription(
    restaurantId: string,
    newExpirationDate?: Date,
  ): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant not found: ${restaurantId}`);
    }

    if (!restaurant.currentSubscriptionPlanId) {
      throw new Error('Restaurant has no plan to reactivate. Please assign a plan first.');
    }

    const updates: any = {
      subscriptionStatus: 'active',
      subscriptionStartedAt: new Date(),
    };

    if (newExpirationDate) {
      updates.subscriptionExpiresAt = newExpirationDate;
    }

    const updatedRestaurant = await this.restaurantModel.findByIdAndUpdate(
      restaurantId,
      updates,
      { new: true }
    );

    this.logger.log(
      `Reactivated subscription for restaurant ${restaurant.name} (${restaurantId})`
    );

    return updatedRestaurant;
  }

  /**
   * Get all restaurants with their subscription details
   */
  async getRestaurantsWithSubscriptions(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const restaurants = await this.restaurantModel
      .find()
      .populate('currentSubscriptionPlanId')
      .sort({ subscriptionStartedAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.restaurantModel.countDocuments();

    return {
      restaurants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get restaurants that need subscription attention (expired, expiring soon)
   */
  async getSubscriptionAlerts() {
    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    // Expired subscriptions
    const expired = await this.restaurantModel
      .find({
        subscriptionExpiresAt: { $lt: now },
        subscriptionStatus: 'active',
      })
      .populate('currentSubscriptionPlanId')
      .exec();

    // Expiring soon (within 1 week)
    const expiringSoon = await this.restaurantModel
      .find({
        subscriptionExpiresAt: {
          $gte: now,
          $lte: oneWeekFromNow,
        },
        subscriptionStatus: 'active',
      })
      .populate('currentSubscriptionPlanId')
      .exec();

    // Trial users (potential conversions)
    const trialUsers = await this.restaurantModel
      .find({
        subscriptionStatus: 'trial',
      })
      .exec();

    return {
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      trialUsers: trialUsers.length,
      details: {
        expired,
        expiringSoon,
        trialUsers,
      },
    };
  }

  /**
   * Auto-assign default starter plan to new restaurants
   */
  async assignDefaultPlanToNewRestaurant(restaurantId: string): Promise<RestaurantDocument> {
    // Find the starter plan
    const starterPlan = await this.subscriptionPlanModel.findOne({
      tier: 'starter',
      is_active: true,
    });

    if (!starterPlan) {
      this.logger.warn('No starter plan found for auto-assignment');
      return null;
    }

    // Assign 30-day trial of starter plan
    return this.assignPlanToRestaurant(restaurantId, starterPlan._id.toString(), new Date(), 1);
  }

  /**
   * Check and update expired subscriptions (run this as a cron job)
   */
  async processExpiredSubscriptions(): Promise<void> {
    const now = new Date();

    const expiredSubscriptions = await this.restaurantModel.find({
      subscriptionExpiresAt: { $lt: now },
      subscriptionStatus: 'active',
    });

    for (const restaurant of expiredSubscriptions) {
      await this.restaurantModel.findByIdAndUpdate(restaurant._id, {
        subscriptionStatus: 'expired',
      });

      this.logger.log(
        `Marked subscription as expired for restaurant ${restaurant.name} (${restaurant._id})`
      );
    }

    this.logger.log(`Processed ${expiredSubscriptions.length} expired subscriptions`);
  }
}