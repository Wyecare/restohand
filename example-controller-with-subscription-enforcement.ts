// Example: How to use subscription enforcement in your controllers

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Import the subscription enforcement guards and decorators
import { SubscriptionLimitGuard } from '../subscription-plans/guards/subscription-limit.guard';
import { FeatureAccessGuard } from '../subscription-plans/guards/feature-access.guard';
import {
  RequireTableLimit,
  RequireStaffLimit,
  RequireMenuItemLimit
} from '../subscription-plans/decorators/subscription-limit.decorator';
import {
  RequireAdvancedAnalytics,
  RequireInventoryManagement,
  RequireMultiLocationManagement
} from '../subscription-plans/decorators/feature-access.decorator';

@ApiTags('Restaurant Management')
@Controller('restaurants/:restaurantId')
@UseGuards(JwtAuthGuard) // Always require authentication first
@ApiBearerAuth()
export class ExampleRestaurantController {

  // Example 1: Create a new table - requires table limit check
  @Post('tables')
  @UseGuards(SubscriptionLimitGuard) // Add the subscription limit guard
  @RequireTableLimit() // This decorator tells the guard to check table limits
  @ApiOperation({ summary: 'Create a new table (requires subscription table limit check)' })
  async createTable(@Body() createTableDto: any) {
    // If we reach here, the restaurant is within their table limits
    // Implement table creation logic
    return { message: 'Table created successfully' };
  }

  // Example 2: Add a staff member - requires staff limit check
  @Post('staff')
  @UseGuards(SubscriptionLimitGuard)
  @RequireStaffLimit()
  @ApiOperation({ summary: 'Add a staff member (requires subscription staff limit check)' })
  async addStaff(@Body() addStaffDto: any) {
    // If we reach here, the restaurant is within their staff limits
    // Implement staff addition logic
    return { message: 'Staff member added successfully' };
  }

  // Example 3: Create menu item - requires menu item limit check
  @Post('menu-items')
  @UseGuards(SubscriptionLimitGuard)
  @RequireMenuItemLimit()
  @ApiOperation({ summary: 'Create menu item (requires subscription menu item limit check)' })
  async createMenuItem(@Body() createMenuItemDto: any) {
    // If we reach here, the restaurant is within their menu item limits
    // Implement menu item creation logic
    return { message: 'Menu item created successfully' };
  }

  // Example 4: Access advanced analytics - requires feature access check
  @Post('analytics/advanced')
  @UseGuards(FeatureAccessGuard) // Add the feature access guard
  @RequireAdvancedAnalytics() // This decorator checks if the plan includes advanced analytics
  @ApiOperation({ summary: 'Get advanced analytics (Professional+ feature)' })
  async getAdvancedAnalytics() {
    // If we reach here, the restaurant's plan includes advanced analytics
    // Implement advanced analytics logic
    return { message: 'Advanced analytics data', data: [] };
  }

  // Example 5: Inventory management - requires feature access check
  @Post('inventory')
  @UseGuards(FeatureAccessGuard)
  @RequireInventoryManagement()
  @ApiOperation({ summary: 'Access inventory management (Professional+ feature)' })
  async manageInventory(@Body() inventoryDto: any) {
    // If we reach here, the restaurant's plan includes inventory management
    // Implement inventory management logic
    return { message: 'Inventory updated successfully' };
  }

  // Example 6: Multi-location management - requires feature access check
  @Post('branches')
  @UseGuards(FeatureAccessGuard)
  @RequireMultiLocationManagement()
  @ApiOperation({ summary: 'Manage multiple locations (Professional+ feature)' })
  async manageBranches(@Body() branchDto: any) {
    // If we reach here, the restaurant's plan includes multi-location management
    // Implement branch management logic
    return { message: 'Branch managed successfully' };
  }

  // Example 7: Combining both limit and feature checks
  @Post('branches/new-with-tables')
  @UseGuards(SubscriptionLimitGuard, FeatureAccessGuard) // Use both guards
  @RequireTableLimit() // Check table limits
  @RequireMultiLocationManagement() // Check feature access
  @ApiOperation({ summary: 'Create new branch with tables (requires Professional+ and within limits)' })
  async createBranchWithTables(@Body() branchData: any) {
    // If we reach here, the restaurant:
    // 1. Has multi-location management feature in their plan
    // 2. Is within their table limits
    // Implement branch + table creation logic
    return { message: 'Branch with tables created successfully' };
  }
}

// Error Response Examples:

// If table limit is exceeded (Starter plan with 20 tables):
// {
//   "statusCode": 403,
//   "message": "Table limit reached. Your starter plan allows 20 table(s). Upgrade to add more tables.",
//   "error": "Forbidden"
// }

// If feature is not available (Starter plan trying to access advanced analytics):
// {
//   "statusCode": 403,
//   "message": "Feature 'advanced_analytics' is not available in your starter plan. Upgrade to access this feature.",
//   "error": "Forbidden"
// }

// Usage in your existing controllers:
// 1. Add @UseGuards(SubscriptionLimitGuard) to endpoints that create resources
// 2. Add @RequireTableLimit(), @RequireStaffLimit(), etc. decorators
// 3. Add @UseGuards(FeatureAccessGuard) to premium feature endpoints
// 4. Add @RequireAdvancedAnalytics(), @RequireInventoryManagement(), etc. decorators

// The guards will automatically:
// 1. Extract restaurantId from request params, body, or user
// 2. Look up the restaurant's current subscription plan
// 3. Check limits/feature access against the plan
// 4. Throw ForbiddenException with helpful upgrade message if limits exceeded