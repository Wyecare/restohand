import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';
import { CreateSuperAdminDto } from './dtos/create-super-admin.dto';

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
  async getSettlementHistory(@Query('page') page = 1, @Query('limit') limit = 50) {
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
}