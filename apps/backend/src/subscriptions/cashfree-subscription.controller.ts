import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CashfreeSubscriptionService } from './cashfree-subscription.service';
import {
  CreateCashfreeSubscriptionDto,
  UpdateCashfreeSubscriptionDto,
  CancelSubscriptionDto,
} from './dto/cashfree-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Cashfree Subscriptions')
@Controller('subscriptions/cashfree')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CashfreeSubscriptionController {
  constructor(
    private readonly cashfreeSubscriptionService: CashfreeSubscriptionService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all available Cashfree subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'Subscription plans retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        plans: { type: 'array' },
        total: { type: 'number' },
        featured_plans: { type: 'array' },
      },
    },
  })
  async getAvailablePlans() {
    return this.cashfreeSubscriptionService.getAvailablePlans();
  }

  @Get('restaurant/:restaurantId/status')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Get Cashfree subscription status for restaurant' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        restaurant_id: { type: 'string' },
        has_subscription: { type: 'boolean' },
        subscription: { type: 'object' },
        is_active: { type: 'boolean' },
        is_in_trial: { type: 'boolean' },
        trial_ends_at: { type: 'string', format: 'date-time' },
        next_billing_at: { type: 'string', format: 'date-time' },
        features: { type: 'array' },
        usage_limits: { type: 'object' },
      },
    },
  })
  async getSubscriptionStatus(@Param('restaurantId') restaurantId: string) {
    return this.cashfreeSubscriptionService.getSubscriptionStatus(restaurantId);
  }

  @Post()
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Create new Cashfree subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully with authorization URL',
    schema: {
      type: 'object',
      properties: {
        subscription: { type: 'object' },
        authorization_url: { type: 'string', nullable: true },
        requires_authorization: { type: 'boolean' },
      },
    },
  })
  async createSubscription(
    @Body() createDto: CreateCashfreeSubscriptionDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || req.user?._id || req.user?.userId || 'system';
    const subscription = await this.cashfreeSubscriptionService.createSubscription(
      createDto,
      adminId,
    );

    return subscription; // Return the full response with authorization_url
  }


  @Put(':subscriptionId')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Update Cashfree subscription plan' })
  @ApiParam({ name: 'subscriptionId', description: 'Cashfree Subscription ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        subscription: { type: 'object' },
      },
    },
  })
  async updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() updateDto: UpdateCashfreeSubscriptionDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || req.user?._id || req.user?.userId || 'system';
    const subscription = await this.cashfreeSubscriptionService.updateSubscription(
      subscriptionId,
      updateDto,
      adminId,
    );

    return {
      message: 'Cashfree subscription updated successfully',
      subscription,
    };
  }

  @Post(':subscriptionId/cancel')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Cancel Cashfree subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Cashfree Subscription ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        subscription: { type: 'object' },
      },
    },
  })
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() cancelDto: CancelSubscriptionDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || req.user?._id || req.user?.userId || 'system';
    const subscription = await this.cashfreeSubscriptionService.cancelSubscription(
      subscriptionId,
      cancelDto,
      adminId,
    );

    return {
      message: 'Cashfree subscription cancelled successfully',
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
    schema: {
      type: 'object',
      properties: {
        subscription_id: { type: 'string' },
        payments: { type: 'array' },
        cycles: { type: 'array' },
      },
    },
  })
  async getPaymentHistory(@Param('restaurantId') restaurantId: string) {
    return this.cashfreeSubscriptionService.getPaymentHistory(restaurantId);
  }

  @Post('retry-payment')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Retry failed payment for subscription' })
  @ApiResponse({
    status: 200,
    description: 'Payment retry initiated',
    schema: {
      type: 'object',
      properties: {
        payment_session_id: { type: 'string' },
        payment_link: { type: 'string' },
        authorization_amount: { type: 'number' },
      },
    },
  })
  async retryFailedPayment(@Body() retryDto: any) {
    return this.cashfreeSubscriptionService.retryFailedPayment(
      retryDto.subscription_id,
      retryDto.return_url
    );
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Cashfree subscription webhooks' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleWebhook(@Body() payload: any) {
    const eventType = payload.type || payload.event_type;

    await this.cashfreeSubscriptionService.handleSubscriptionWebhook(
      eventType,
      payload,
    );

    return { status: 'ok' };
  }
}