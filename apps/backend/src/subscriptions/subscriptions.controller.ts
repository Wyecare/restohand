import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { RazorpayService } from '../payments/razorpay.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Subscriptions')
@Controller('restaurants/:restaurantId/subscription')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly razorpayService: RazorpayService
  ) {}

  @Get('status')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Get subscription status for restaurant' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        restaurantId: { type: 'string' },
        plan: { type: 'string', enum: ['starter', 'pro', 'enterprise'] },
        status: { type: 'string', enum: ['trial', 'active', 'suspended', 'cancelled'] },
        isActive: { type: 'boolean' },
        trialEndsAt: { type: 'string', format: 'date-time' },
        nextBillingDate: { type: 'string', format: 'date-time' },
        monthlyPrice: { type: 'number' },
        daysUntilBilling: { type: 'number' },
      },
    },
  })
  async getSubscriptionStatus(@Param('restaurantId') restaurantId: string) {
    return this.subscriptionsService.getSubscriptionStatus(restaurantId);
  }

  @Patch('upgrade')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan upgraded successfully',
  })
  async upgradePlan(
    @Param('restaurantId') restaurantId: string,
  ) {
    // Since we only have one plan now, this just reactivates subscription
    await this.subscriptionsService.reactivateSubscription(restaurantId);
    return {
      message: 'Subscription reactivated successfully'
    };
  }

  @Post('reactivate')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Reactivate suspended subscription' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription reactivated successfully',
  })
  async reactivateSubscription(@Param('restaurantId') restaurantId: string) {
    await this.subscriptionsService.reactivateSubscription(restaurantId);
    return { message: 'Subscription reactivated successfully' };
  }

  @Post('create')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Create Razorpay subscription' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription created successfully',
    schema: {
      type: 'object',
      properties: {
        subscriptionId: { type: 'string' },
        customerId: { type: 'string' },
        planId: { type: 'string' },
        status: { type: 'string' },
        amount: { type: 'number' },
        nextBillingDate: { type: 'string', format: 'date-time' },
      },
    },
  })
  async createSubscription(
    @Param('restaurantId') restaurantId: string,
  ) {
    const result = await this.subscriptionsService.createSubscription(restaurantId);
    return {
      message: 'Subscription created successfully',
      ...result,
    };
  }

  @Get('payment-history')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Get payment history for subscription' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
  })
  async getPaymentHistory(@Param('restaurantId') restaurantId: string) {
    return this.subscriptionsService.getPaymentHistory(restaurantId);
  }
}

@ApiTags('Admin - Subscriptions')
@Controller('admin/subscriptions')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('analytics')
  @Roles(UserRole.Admin) // Assuming you have an Admin role
  @ApiOperation({ summary: 'Get subscription analytics' })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalRestaurants: { type: 'number' },
        monthlyRecurringRevenue: { type: 'number' },
        byStatus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              count: { type: 'number' },
              totalRevenue: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getAnalytics() {
    return this.subscriptionsService.getAnalytics();
  }

  @Post(':restaurantId/suspend')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Suspend restaurant subscription' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  async suspendSubscription(
    @Param('restaurantId') restaurantId: string,
    @Body() body: { reason: string },
  ) {
    await this.subscriptionsService.suspendSubscription(restaurantId, body.reason);
    return { message: 'Subscription suspended successfully' };
  }
}