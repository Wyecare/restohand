import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProfitAlertsService } from './profit-alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('restaurants/:restaurantId/profit-analysis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfitAlertsController {
  constructor(private readonly profitAlertsService: ProfitAlertsService) {}

  @Get('report')
  @Roles(UserRole.Manager)
  async getFullReport(@Param('restaurantId') restaurantId: string) {
    return this.profitAlertsService.generateProfitAnalysisReport(restaurantId);
  }

  @Get('alerts')
  @Roles(UserRole.Manager)
  async getActiveAlerts(@Param('restaurantId') restaurantId: string) {
    return this.profitAlertsService.getActiveAlerts(restaurantId);
  }

  @Get('critical-alerts')
  @Roles(UserRole.Manager)
  async getCriticalAlerts(@Param('restaurantId') restaurantId: string) {
    return this.profitAlertsService.getCriticalMarginAlerts(restaurantId);
  }
}