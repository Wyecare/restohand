import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';

@Injectable()
export class SubscriptionEnforcementService {
  private readonly logger = new Logger(SubscriptionEnforcementService.name);

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(SubscriptionPlan.name) private subscriptionPlanModel: Model<SubscriptionPlanDocument>,
  ) {}

  /**
   * Check if restaurant can add more branches
   */
  async checkBranchLimit(restaurantId: string): Promise<void> {
    const plan = await this.getRestaurantPlan(restaurantId);
    if (!plan || plan.usage_limits.max_branches === -1) return; // Unlimited

    const currentBranchCount = await this.getBranchCount(restaurantId);

    if (currentBranchCount >= plan.usage_limits.max_branches) {
      throw new ForbiddenException(
        `Branch limit reached. Your ${plan.tier} plan allows ${plan.usage_limits.max_branches} branch(es). Upgrade to add more branches.`
      );
    }
  }

  /**
   * Check if restaurant can add more tables
   */
  async checkTableLimit(restaurantId: string, branchId?: string): Promise<void> {
    const plan = await this.getRestaurantPlan(restaurantId);
    if (!plan || plan.usage_limits.max_tables === -1) return; // Unlimited

    const currentTableCount = await this.getTableCount(restaurantId, branchId);

    if (currentTableCount >= plan.usage_limits.max_tables) {
      throw new ForbiddenException(
        `Table limit reached. Your ${plan.tier} plan allows ${plan.usage_limits.max_tables} table(s). Upgrade to add more tables.`
      );
    }
  }

  /**
   * Check if restaurant can add more staff members
   */
  async checkStaffLimit(restaurantId: string): Promise<void> {
    const plan = await this.getRestaurantPlan(restaurantId);
    if (!plan || plan.usage_limits.max_staff === -1) return; // Unlimited

    const currentStaffCount = await this.getStaffCount(restaurantId);

    if (currentStaffCount >= plan.usage_limits.max_staff) {
      throw new ForbiddenException(
        `Staff limit reached. Your ${plan.tier} plan allows ${plan.usage_limits.max_staff} staff member(s). Upgrade to add more staff.`
      );
    }
  }

  /**
   * Check if restaurant can add more menu items
   */
  async checkMenuItemLimit(restaurantId: string): Promise<void> {
    const plan = await this.getRestaurantPlan(restaurantId);
    if (!plan || plan.usage_limits.max_menu_items === -1) return; // Unlimited

    const currentMenuItemCount = await this.getMenuItemCount(restaurantId);

    if (currentMenuItemCount >= plan.usage_limits.max_menu_items) {
      throw new ForbiddenException(
        `Menu item limit reached. Your ${plan.tier} plan allows ${plan.usage_limits.max_menu_items} menu item(s). Upgrade to add more items.`
      );
    }
  }

  /**
   * Check if restaurant has access to a specific feature
   */
  async checkFeatureAccess(restaurantId: string, feature: string): Promise<void> {
    const plan = await this.getRestaurantPlan(restaurantId);
    if (!plan) {
      throw new ForbiddenException('No active subscription plan found. Please subscribe to access this feature.');
    }

    const hasAccess = plan.feature_access[feature];
    if (!hasAccess) {
      throw new ForbiddenException(
        `Feature '${feature}' is not available in your ${plan.tier} plan. Upgrade to access this feature.`
      );
    }
  }

  /**
   * Get comprehensive usage status for restaurant
   */
  async getUsageStatus(restaurantId: string) {
    const plan = await this.getRestaurantPlan(restaurantId);
    if (!plan) {
      return {
        hasPlan: false,
        message: 'No active subscription plan found',
      };
    }

    const [branchCount, tableCount, staffCount, menuItemCount] = await Promise.all([
      this.getBranchCount(restaurantId),
      this.getTableCount(restaurantId),
      this.getStaffCount(restaurantId),
      this.getMenuItemCount(restaurantId),
    ]);

    return {
      hasPlan: true,
      plan: {
        tier: plan.tier,
        display_name: plan.display_name,
      },
      usage: {
        branches: {
          current: branchCount,
          limit: plan.usage_limits.max_branches,
          unlimited: plan.usage_limits.max_branches === -1,
          percentage: plan.usage_limits.max_branches === -1 ? 0 : (branchCount / plan.usage_limits.max_branches) * 100,
        },
        tables: {
          current: tableCount,
          limit: plan.usage_limits.max_tables,
          unlimited: plan.usage_limits.max_tables === -1,
          percentage: plan.usage_limits.max_tables === -1 ? 0 : (tableCount / plan.usage_limits.max_tables) * 100,
        },
        staff: {
          current: staffCount,
          limit: plan.usage_limits.max_staff,
          unlimited: plan.usage_limits.max_staff === -1,
          percentage: plan.usage_limits.max_staff === -1 ? 0 : (staffCount / plan.usage_limits.max_staff) * 100,
        },
        menuItems: {
          current: menuItemCount,
          limit: plan.usage_limits.max_menu_items,
          unlimited: plan.usage_limits.max_menu_items === -1,
          percentage: plan.usage_limits.max_menu_items === -1 ? 0 : (menuItemCount / plan.usage_limits.max_menu_items) * 100,
        },
      },
      feature_access: plan.feature_access,
    };
  }

  // Helper methods for counting current usage
  private async getRestaurantPlan(restaurantId: string): Promise<SubscriptionPlan | null> {
    const restaurant = await this.restaurantModel.findById(restaurantId)
      .select('currentSubscriptionPlanId')
      .exec();

    if (!restaurant?.currentSubscriptionPlanId) {
      this.logger.warn(`No subscription plan found for restaurant ${restaurantId}`);
      return null;
    }

    return this.subscriptionPlanModel.findById(restaurant.currentSubscriptionPlanId).exec();
  }

  private async getBranchCount(restaurantId: string): Promise<number> {
    // Count branches for this restaurant
    // This would depend on your branch/location schema
    // For now, assuming single restaurant = 1 branch unless multi-location is implemented
    return 1;
  }

  private async getTableCount(restaurantId: string, branchId?: string): Promise<number> {
    // This would query your tables collection
    // Placeholder implementation - you'll need to implement based on your table schema
    try {
      // Example query - adjust based on your actual table schema
      const { RestaurantTable } = await import('../restaurant-tables/schemas/restaurant-table.schema');
      const TableModel = this.restaurantModel.db.model('RestaurantTable');

      const query: any = { restaurantId, isActive: true };
      if (branchId) {
        query.branchId = branchId;
      }

      return TableModel.countDocuments(query);
    } catch (error) {
      this.logger.warn(`Could not count tables for restaurant ${restaurantId}: ${error.message}`);
      return 0;
    }
  }

  private async getStaffCount(restaurantId: string): Promise<number> {
    // This would query your staff/user collection
    // Placeholder implementation
    try {
      const { User } = await import('../users/schemas/user.schema');
      const UserModel = this.restaurantModel.db.model('User');

      return UserModel.countDocuments({
        restaurantId,
        isActive: true,
        role: { $ne: 'customer' } // Exclude customers from staff count
      });
    } catch (error) {
      this.logger.warn(`Could not count staff for restaurant ${restaurantId}: ${error.message}`);
      return 0;
    }
  }

  private async getMenuItemCount(restaurantId: string): Promise<number> {
    // This would query your menu items collection
    // Placeholder implementation
    try {
      const { MenuItem } = await import('../menu-items/schemas/menu-item.schema');
      const MenuItemModel = this.restaurantModel.db.model('MenuItem');

      return MenuItemModel.countDocuments({
        restaurantId,
        isActive: true
      });
    } catch (error) {
      this.logger.warn(`Could not count menu items for restaurant ${restaurantId}: ${error.message}`);
      return 0;
    }
  }
}