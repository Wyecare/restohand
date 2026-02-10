import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { DashboardService } from './dashboard.service';
import { DashboardMetricsDto } from './dto/dashboard-metrics.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@ApiTags('Dashboard')
@Controller('restaurants/:restaurantId/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'period', required: false, enum: ['today', '7d', '30d', '3m', '1y'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOkResponse({ type: DashboardMetricsDto })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  async getDashboardMetrics(
    @Param('restaurantId') restaurantId: string,
    @Query() query: DashboardQueryDto
  ): Promise<DashboardMetricsDto> {
    return this.dashboardService.getDashboardMetrics(restaurantId, query);
  }
}