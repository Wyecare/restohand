import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateBusinessModelPlanDto } from './dtos/create-business-model-plan.dto';

@ApiTags('Admin Subscription Plans')
@Controller('admin/cashfree/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.SuperAdmin)
@ApiBearerAuth()
export class AdminSubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all Cashfree subscription plans (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Subscription plans retrieved successfully',
  })
  async getAllPlans() {
    return this.subscriptionPlansService.getAllPlans();
  }

  @Get('templates/recommended')
  @ApiOperation({ summary: 'Get recommended business model subscription plan templates' })
  @ApiResponse({
    status: 200,
    description: 'Business model plan templates retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          tier: { type: 'string' },
          display_name: { type: 'string' },
          plan_recurring_amount: { type: 'number' },
          plan_max_amount: { type: 'number' },
          plan_intervals: { type: 'number' },
          plan_interval_type: { type: 'string' },
          plan_type: { type: 'string' },
          plan_currency: { type: 'string' },
          plan_max_cycles: { type: 'number' },
          plan_note: { type: 'string' },
          is_popular: { type: 'boolean' },
          features: { type: 'array', items: { type: 'string' } },
          usage_limits: {
            type: 'object',
            properties: {
              max_branches: { type: 'number' },
              max_tables: { type: 'number' },
              max_staff: { type: 'number' },
              max_menu_items: { type: 'number' },
            },
          },
          pricing: {
            type: 'object',
            properties: {
              base_subscription_fee: { type: 'number' },
              transaction_fee_percentage: { type: 'number' },
              currency: { type: 'string' },
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
          target_market: {
            type: 'object',
            properties: {
              segment: { type: 'string' },
              ideal_size: { type: 'string' },
              use_cases: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  async getRecommendedTemplates() {
    return this.subscriptionPlansService.getRecommendedTemplates();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Cashfree subscription plan' })
  @ApiResponse({
    status: 201,
    description: 'Subscription plan created successfully',
  })
  async createPlan(@Body() planData: CreateBusinessModelPlanDto) {
    return this.subscriptionPlansService.createPlan(planData);
  }

  @Post('import/:planId')
  @ApiOperation({ summary: 'Import existing Cashfree plan by ID' })
  @ApiResponse({
    status: 201,
    description: 'Plan imported successfully',
  })
  async importPlan(@Param('planId') planId: string) {
    return this.subscriptionPlansService.importPlan(planId);
  }

  @Delete(':planId')
  @ApiOperation({ summary: 'Delete a subscription plan' })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan deleted successfully',
  })
  async deletePlan(@Param('planId') planId: string) {
    return this.subscriptionPlansService.deletePlan(planId);
  }
}