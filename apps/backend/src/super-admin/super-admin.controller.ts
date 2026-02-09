import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';
import { CreateSuperAdminDto } from './dtos/create-super-admin.dto';
import { CreateCashfreePlanDto } from './dtos/create-cashfree-plan.dto';
import { UpdateCashfreePlanDto } from './dtos/update-cashfree-plan.dto';

@ApiTags('super-admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth()
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get company dashboard overview' })
  async getDashboard() {
    return this.superAdminService.getDashboardOverview();
  }

  @Get('restaurants')
  @ApiOperation({ summary: 'Get all restaurants' })
  async getAllRestaurants(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.superAdminService.getAllRestaurants(+page, +limit);
  }

  @Get('restaurants/:id')
  @ApiOperation({ summary: 'Get restaurant details' })
  async getRestaurantDetails(@Param('id') restaurantId: string) {
    return this.superAdminService.getRestaurantDetails(restaurantId);
  }

  @Get('settlements/pending')
  @ApiOperation({ summary: 'Get pending settlements' })
  async getPendingSettlements() {
    return this.superAdminService.getPendingSettlements();
  }

  @Get('settlements/history')
  @ApiOperation({ summary: 'Get settlement history' })
  async getSettlementHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 50
  ) {
    return this.superAdminService.getSettlementHistory(+page, +limit);
  }

  @Post('settlements/:restaurantId/calculate')
  @ApiOperation({ summary: 'Calculate settlement for restaurant' })
  async calculateSettlement(@Param('restaurantId') restaurantId: string) {
    return this.superAdminService.calculateSettlement(restaurantId);
  }

  @Post('settlements/:restaurantId/execute')
  @ApiOperation({ summary: 'Execute settlement for restaurant' })
  async executeSettlement(
    @Param('restaurantId') restaurantId: string,
    @Body() settlementData: any,
    @Request() req: any
  ) {
    return this.superAdminService.executeSettlement(
      restaurantId,
      settlementData,
      req.user.id
    );
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get company-wide analytics' })
  async getAnalyticsOverview() {
    return this.superAdminService.getAnalyticsOverview();
  }

  @Get('super-admins')
  @ApiOperation({ summary: 'Get all super admins' })
  async getSuperAdmins() {
    return this.superAdminService.getSuperAdmins();
  }

  @Post('super-admins')
  @ApiOperation({ summary: 'Create new super admin' })
  async createSuperAdmin(
    @Body() createSuperAdminDto: CreateSuperAdminDto,
    @Request() req: any
  ) {
    return this.superAdminService.createSuperAdmin(
      createSuperAdminDto,
      req.user.id
    );
  }

  // ============= CASHFREE SUBSCRIPTION PLAN MANAGEMENT =============

  @Get('cashfree/plans/templates/recommended')
  @ApiOperation({ summary: 'Get recommended Cashfree plan templates' })
  @ApiResponse({
    status: 200,
    description: 'Recommended plan templates retrieved successfully',
  })
  async getRecommendedPlanTemplates() {
    return this.superAdminService.getRecommendedCashfreePlanTemplates();
  }

  @Post('cashfree/plans/import/:cashfreePlanId')
  @ApiOperation({ summary: 'Import existing Cashfree plan to database' })
  @ApiResponse({
    status: 201,
    description: 'Cashfree plan imported successfully',
  })
  async importCashfreePlan(
    @Param('cashfreePlanId') cashfreePlanId: string,
    @Request() req: any
  ) {
    const adminId =
      req.user?.id || req.user?._id || req.user?.userId || 'system';
    console.log(
      'Importing Cashfree plan:',
      cashfreePlanId,
      'by admin:',
      adminId
    );
    return this.superAdminService.importCashfreePlan(cashfreePlanId, adminId);
  }

  @Get('cashfree/plans')
  @ApiOperation({ summary: 'Get all Cashfree subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'Cashfree plans retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          plan_id: { type: 'string' },
          plan_name: { type: 'string' },
          plan_type: { type: 'string' },
          plan_amount: { type: 'number' },
          plan_currency: { type: 'string' },
          plan_interval_type: { type: 'string' },
          plan_intervals: { type: 'number' },
          plan_max_cycles: { type: 'number' },
          plan_status: { type: 'string' },
          created_at: { type: 'string' },
        },
      },
    },
  })
  async getCashfreePlans() {
    return this.superAdminService.getCashfreeSubscriptionPlans();
  }

  @Get('cashfree/plans/:planId')
  @ApiOperation({ summary: 'Get specific Cashfree subscription plan' })
  @ApiResponse({
    status: 200,
    description: 'Cashfree plan retrieved successfully',
  })
  async getCashfreePlan(@Param('planId') planId: string) {
    return this.superAdminService.getCashfreeSubscriptionPlan(planId);
  }

  @Post('cashfree/plans')
  @ApiOperation({ summary: 'Create new Cashfree subscription plan' })
  @ApiResponse({
    status: 201,
    description: 'Cashfree plan created successfully',
    schema: {
      type: 'object',
      properties: {
        plan_id: { type: 'string' },
        plan_name: { type: 'string' },
        plan_type: { type: 'string' },
        plan_amount: { type: 'number' },
        plan_currency: { type: 'string' },
        plan_status: { type: 'string' },
        created_at: { type: 'string' },
      },
    },
  })
  async createCashfreePlan(@Body() createPlanDto: CreateCashfreePlanDto, @Request() req: any) {
    const adminId =
      req.user?.id || req.user?._id || req.user?.userId || 'system';
    return this.superAdminService.createCashfreeSubscriptionPlan(
      createPlanDto,
      adminId
    );
  }

  @Put('cashfree/plans/:planId')
  @ApiOperation({ summary: 'Update Cashfree subscription plan' })
  @ApiResponse({
    status: 200,
    description: 'Cashfree plan updated successfully',
  })
  async updateCashfreePlan(
    @Param('planId') planId: string,
    @Body() updatePlanDto: UpdateCashfreePlanDto,
    @Request() req: any
  ) {
    return this.superAdminService.updateCashfreeSubscriptionPlan(
      planId,
      updatePlanDto,
      req.user.id
    );
  }

  @Delete('cashfree/plans/:planId')
  @ApiOperation({ summary: 'Delete Cashfree subscription plan' })
  @ApiResponse({
    status: 200,
    description: 'Cashfree plan deleted successfully',
  })
  async deleteCashfreePlan(
    @Param('planId') planId: string,
    @Request() req: any
  ) {
    return this.superAdminService.deleteCashfreeSubscriptionPlan(
      planId,
      req.user.id
    );
  }
}
