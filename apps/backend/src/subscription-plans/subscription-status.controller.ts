import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionEnforcementService } from './subscription-enforcement.service';

@ApiTags('Subscription Status')
@Controller('restaurants/:restaurantId/subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionStatusController {
  constructor(
    private readonly subscriptionEnforcement: SubscriptionEnforcementService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get restaurant subscription status and usage limits' })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        hasPlan: { type: 'boolean' },
        plan: {
          type: 'object',
          properties: {
            tier: { type: 'string' },
            display_name: { type: 'string' },
          },
        },
        usage: {
          type: 'object',
          properties: {
            branches: {
              type: 'object',
              properties: {
                current: { type: 'number' },
                limit: { type: 'number' },
                unlimited: { type: 'boolean' },
                percentage: { type: 'number' },
              },
            },
            tables: {
              type: 'object',
              properties: {
                current: { type: 'number' },
                limit: { type: 'number' },
                unlimited: { type: 'boolean' },
                percentage: { type: 'number' },
              },
            },
            staff: {
              type: 'object',
              properties: {
                current: { type: 'number' },
                limit: { type: 'number' },
                unlimited: { type: 'boolean' },
                percentage: { type: 'number' },
              },
            },
            menuItems: {
              type: 'object',
              properties: {
                current: { type: 'number' },
                limit: { type: 'number' },
                unlimited: { type: 'boolean' },
                percentage: { type: 'number' },
              },
            },
          },
        },
        feature_access: {
          type: 'object',
          properties: {
            qr_menu_ordering: { type: 'boolean' },
            digital_receipts: { type: 'boolean' },
            basic_pos: { type: 'boolean' },
            order_management: { type: 'boolean' },
            real_time_analytics: { type: 'boolean' },
            advanced_analytics: { type: 'boolean' },
            customer_crm: { type: 'boolean' },
            inventory_management: { type: 'boolean' },
            multi_location_management: { type: 'boolean' },
            priority_support: { type: 'boolean' },
            custom_integrations: { type: 'boolean' },
            api_access: { type: 'boolean' },
            white_label_options: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getSubscriptionStatus(@Param('restaurantId') restaurantId: string) {
    return this.subscriptionEnforcement.getUsageStatus(restaurantId);
  }

  @Get('limits/check')
  @ApiOperation({ summary: 'Check all subscription limits for restaurant' })
  @ApiResponse({
    status: 200,
    description: 'Limit checks completed',
    schema: {
      type: 'object',
      properties: {
        limits: {
          type: 'object',
          properties: {
            canAddBranch: { type: 'boolean' },
            canAddTable: { type: 'boolean' },
            canAddStaff: { type: 'boolean' },
            canAddMenuItem: { type: 'boolean' },
          },
        },
        errors: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async checkAllLimits(@Param('restaurantId') restaurantId: string) {
    const results = {
      limits: {
        canAddBranch: true,
        canAddTable: true,
        canAddStaff: true,
        canAddMenuItem: true,
      },
      errors: [],
    };

    // Check each limit and capture any errors
    try {
      await this.subscriptionEnforcement.checkBranchLimit(restaurantId);
    } catch (error) {
      results.limits.canAddBranch = false;
      results.errors.push(error.message);
    }

    try {
      await this.subscriptionEnforcement.checkTableLimit(restaurantId);
    } catch (error) {
      results.limits.canAddTable = false;
      results.errors.push(error.message);
    }

    try {
      await this.subscriptionEnforcement.checkStaffLimit(restaurantId);
    } catch (error) {
      results.limits.canAddStaff = false;
      results.errors.push(error.message);
    }

    try {
      await this.subscriptionEnforcement.checkMenuItemLimit(restaurantId);
    } catch (error) {
      results.limits.canAddMenuItem = false;
      results.errors.push(error.message);
    }

    return results;
  }
}