import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { RazorpayService } from '../payments/razorpay.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { SubscriptionPlan } from './schemas/subscription.schema';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'Plans retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          planType: { type: 'string', enum: Object.values(SubscriptionPlan) },
          name: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          period: { type: 'string' },
          interval: { type: 'number' },
          features: { type: 'object' },
          monthlyEquivalent: { type: 'number' },
          isPopular: { type: 'boolean' },
          isLegacy: { type: 'boolean' },
        },
      },
    },
  })
  async getAllPlans() {
    const isTestMode = process.env.NODE_ENV === 'local';
    return this.subscriptionsService.getAllPlans(isTestMode);
  }

  @Get('restaurant/:restaurantId/status')
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
        hasSubscription: { type: 'boolean' },
        subscription: { type: 'object' },
        plan: { type: 'object' },
        status: { type: 'string' },
        isActive: { type: 'boolean' },
        isTrialActive: { type: 'boolean' },
        trialEndsAt: { type: 'string', format: 'date-time' },
        currentStart: { type: 'string', format: 'date-time' },
        currentEnd: { type: 'string', format: 'date-time' },
        nextChargeAt: { type: 'string', format: 'date-time' },
        features: { type: 'object' },
      },
    },
  })
  async getSubscriptionStatus(@Param('restaurantId') restaurantId: string) {
    return this.subscriptionsService.getSubscriptionStatus(restaurantId);
  }

  @Post()
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        restaurantId: { type: 'string' },
        razorpaySubscriptionId: { type: 'string' },
        plan: { type: 'object' },
        status: { type: 'string' },
        isTrialActive: { type: 'boolean' },
        trialEnd: { type: 'string', format: 'date-time' },
      },
    },
  })
  async createSubscription(@Body() createDto: CreateSubscriptionDto) {
    const subscription = await this.subscriptionsService.createSubscription(
      createDto
    );
    return {
      message: 'Subscription created successfully',
      subscription,
    };
  }

  @Put(':subscriptionId')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Update subscription (upgrade/downgrade plan)' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
  })
  async updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() updateDto: UpdateSubscriptionDto
  ) {
    const subscription = await this.subscriptionsService.updateSubscription(
      subscriptionId,
      updateDto
    );
    return {
      message: 'Subscription updated successfully',
      subscription,
    };
  }

  @Post(':subscriptionId/pause')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Pause subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription paused successfully',
  })
  async pauseSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = await this.subscriptionsService.pauseSubscription(
      subscriptionId
    );
    return {
      message: 'Subscription paused successfully',
      subscription,
    };
  }

  @Post(':subscriptionId/resume')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Resume paused subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription resumed successfully',
  })
  async resumeSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = await this.subscriptionsService.resumeSubscription(
      subscriptionId
    );
    return {
      message: 'Subscription resumed successfully',
      subscription,
    };
  }

  @Delete(':subscriptionId')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiQuery({
    name: 'cancelAtCycleEnd',
    required: false,
    type: 'boolean',
    description: 'Cancel at cycle end (default: true)',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Query('cancelAtCycleEnd') cancelAtCycleEnd?: boolean
  ) {
    const subscription = await this.subscriptionsService.cancelSubscription(
      subscriptionId,
      cancelAtCycleEnd !== false
    );
    return {
      message: 'Subscription cancelled successfully',
      subscription,
    };
  }

  @Get('restaurant/:restaurantId/payment-history')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Get payment history for restaurant subscription' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
  })
  async getPaymentHistory(@Param('restaurantId') restaurantId: string) {
    return this.subscriptionsService.getPaymentHistory(restaurantId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Razorpay subscription webhooks' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleWebhook(
    @Body() payload: any
    // In production, you'd verify webhook signature here
  ) {
    const event = payload.event;
    const entityPayload = payload.payload;

    await this.subscriptionsService.handleSubscriptionWebhook(
      event,
      entityPayload
    );

    return { status: 'ok' };
  }
}

@ApiTags('Admin - Subscriptions')
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('analytics')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Get subscription analytics' })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalSubscriptions: { type: 'number' },
        activeSubscriptions: { type: 'number' },
        trialSubscriptions: { type: 'number' },
        monthlyRecurringRevenue: { type: 'number' },
        planDistribution: { type: 'object' },
        statusDistribution: { type: 'array' },
        churnRate: { type: 'string' },
      },
    },
  })
  async getAnalytics() {
    return this.subscriptionsService.getSubscriptionAnalytics();
  }

  @Post('restaurant/:restaurantId/grandfathered')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Create grandfathered subscription for early customers',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  async createGrandfatheredSubscription(
    @Param('restaurantId') restaurantId: string,
    @Body()
    body: {
      planType:
        | SubscriptionPlan.FOUNDING_MEMBER
        | SubscriptionPlan.EARLY_ADOPTER;
      reason: string;
    }
  ) {
    const subscription =
      await this.subscriptionsService.createGrandfatheredSubscription(
        restaurantId,
        body.planType,
        body.reason
      );
    return {
      message: 'Grandfathered subscription created successfully',
      subscription,
    };
  }

  @Post('restaurant/:restaurantId/migrate')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Migrate legacy subscription to new system' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  async migrateLegacySubscription(@Param('restaurantId') restaurantId: string) {
    const subscription =
      await this.subscriptionsService.migrateLegacySubscription(restaurantId);
    return {
      message: subscription
        ? 'Subscription migrated successfully'
        : 'No legacy subscription found',
      subscription,
    };
  }
}
