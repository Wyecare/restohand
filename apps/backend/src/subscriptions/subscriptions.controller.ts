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
    @Body() body: {
      plan: 'starter' | 'pro' | 'enterprise';
      billingCycle?: 'hourly' | 'daily' | 'monthly' | 'yearly';
    },
  ) {
    await this.subscriptionsService.upgradePlan(
      restaurantId,
      body.plan,
      body.billingCycle || 'monthly'
    );
    return {
      message: 'Plan upgraded successfully',
      plan: body.plan,
      billingCycle: body.billingCycle || 'monthly'
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
    @Body() body: {
      plan: 'starter' | 'pro' | 'enterprise';
      billingCycle?: 'hourly' | 'daily' | 'monthly' | 'yearly';
    }
  ) {
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

    const billingCycle = body.billingCycle || 'monthly';
    const amount = planPricing[billingCycle][body.plan];

    const razorpayOrder = await this.razorpayService.createOrder({
      amount,
      currency: 'INR',
      receipt: `subscription_${restaurantId}_${Date.now()}`,
      notes: {
        restaurantId,
        type: 'subscription',
        plan: body.plan,
        billingCycle: billingCycle,
      },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      razorpayKey: this.razorpayService.publicKey,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      description: `${body.plan.charAt(0).toUpperCase() + body.plan.slice(1)} Plan - ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)} Billing`,
    };
  }

  @Post('initialize-test')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Initialize test subscription (no trial, custom billing cycle)' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'Test subscription initialized successfully',
  })
  async initializeTestSubscription(
    @Param('restaurantId') restaurantId: string,
    @Body() body: {
      plan?: 'starter' | 'pro' | 'enterprise';
      billingCycle?: 'hourly' | 'daily' | 'monthly' | 'yearly';
    } = {},
  ) {
    const result = await this.subscriptionsService.initializeTestSubscription(
      restaurantId,
      body.plan || 'starter',
      body.billingCycle || 'hourly'
    );
    return {
      message: 'Test subscription initialized successfully',
      ...result,
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