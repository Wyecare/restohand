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
    @Body() body: { plan: 'starter' | 'pro' | 'enterprise' },
  ) {
    await this.subscriptionsService.upgradePlan(restaurantId, body.plan);
    return { message: 'Plan upgraded successfully', plan: body.plan };
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

  @Post('create-payment-intent')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Create payment intent for subscription' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment intent created successfully',
    schema: {
      type: 'object',
      properties: {
        razorpayOrderId: { type: 'string' },
        razorpayKey: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  async createPaymentIntent(
    @Param('restaurantId') restaurantId: string,
    @Body() body: { plan: 'starter' | 'pro' | 'enterprise' }
  ) {
    const planPricing = {
      starter: 99900, // ₹999
      pro: 199900,    // ₹1999
      enterprise: 499900, // ₹4999
    };

    const amount = planPricing[body.plan];

    const razorpayOrder = await this.razorpayService.createOrder({
      amount,
      currency: 'INR',
      receipt: `subscription_${restaurantId}_${Date.now()}`,
      notes: {
        restaurantId,
        type: 'subscription',
        plan: body.plan,
      },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      razorpayKey: this.razorpayService.publicKey,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      description: `${body.plan.charAt(0).toUpperCase() + body.plan.slice(1)} Plan Subscription`,
    };
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