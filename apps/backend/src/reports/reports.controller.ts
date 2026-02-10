import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { ReportsMetricsDto } from './dto/reports-metrics.dto';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Get comprehensive restaurant analytics and reports' })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive analytics data retrieved successfully',
    type: ReportsMetricsDto,
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Predefined period (today, 7d, 30d, 3m, 1y)',
    enum: ['today', '7d', '30d', '3m', '1y'],
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Custom start date (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Custom end date (ISO string)',
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'Specific branch ID for filtering',
  })
  async getComprehensiveAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportsQueryDto,
  ): Promise<ReportsMetricsDto> {
    if (!user.restaurantId) {
      throw new HttpException(
        'User not associated with a restaurant',
        HttpStatus.FORBIDDEN,
      );
    }

    // Use user's branch if not specified in query and user has a specific branch
    if (!query.branchId && user.branchId) {
      query.branchId = user.branchId;
    }

    // Default to 30 days if no period specified
    if (!query.period && !query.from && !query.to) {
      query.period = '30d' as any;
    }

    try {
      return await this.reportsService.getReportsMetrics(user.restaurantId, query);
    } catch (error) {
      throw new HttpException(
        'Failed to generate analytics report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('pdf')
  @ApiOperation({ summary: 'Download optimized PDF report' })
  @ApiResponse({
    status: 200,
    description: 'Enhanced PDF report generated successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Predefined period (today, 7d, 30d, 3m, 1y)',
    enum: ['today', '7d', '30d', '3m', '1y'],
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Custom start date (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Custom end date (ISO string)',
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'Specific branch ID for filtering',
  })
  async downloadOptimizedPdfReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportsQueryDto,
    @Res() res: Response,
  ) {
    if (!user.restaurantId) {
      throw new HttpException(
        'User not associated with a restaurant',
        HttpStatus.FORBIDDEN,
      );
    }

    // Use user's branch if not specified in query and user has a specific branch
    if (!query.branchId && user.branchId) {
      query.branchId = user.branchId;
    }

    // Default to 30 days if no period specified
    if (!query.period && !query.from && !query.to) {
      query.period = '30d' as any;
    }

    try {
      const pdfBuffer = await this.reportsService.generateOptimizedPdfReport(
        user.restaurantId,
        query,
      );

      const periodLabel = query.period || 'custom';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `comprehensive-restaurant-report-${periodLabel}-${timestamp}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new HttpException(
        `Failed to generate PDF report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Legacy endpoint for backward compatibility
  @Get('analytics/legacy')
  @ApiOperation({ summary: 'Legacy analytics endpoint for backward compatibility' })
  async getLegacyAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!user.restaurantId) {
      throw new HttpException(
        'User not associated with a restaurant',
        HttpStatus.FORBIDDEN,
      );
    }

    const query: ReportsQueryDto = {};

    if (startDate && endDate) {
      query.from = startDate;
      query.to = endDate;
    } else {
      query.period = '30d' as any;
    }

    if (user.branchId) {
      query.branchId = user.branchId;
    }

    const metrics = await this.reportsService.getReportsMetrics(user.restaurantId, query);

    // Transform to legacy format for compatibility
    return {
      summary: {
        totalRevenue: metrics.revenue.total.current,
        totalOrders: metrics.orders.total.current,
        avgOrderValue: metrics.revenue.averageTicket.current,
        successRate: metrics.orders.successRate.current,
        totalTax: metrics.revenue.taxAmount.current,
        totalDiscount: metrics.revenue.discountAmount.current,
      },
      trends: {
        revenueChange: metrics.revenue.total.change,
        ordersChange: metrics.orders.total.change,
        avgOrderValueChange: metrics.revenue.averageTicket.change,
      },
      paymentMethods: [
        {
          method: 'cash',
          count: metrics.payments.cashCount.current,
          percentage: metrics.payments.cashPercentage,
          amount: metrics.revenue.cash.current,
        },
        {
          method: 'upi',
          count: metrics.payments.upiCount.current,
          percentage: metrics.payments.upiPercentage,
          amount: metrics.revenue.upi.current,
        },
        {
          method: 'card',
          count: metrics.payments.cardCount.current,
          percentage: metrics.payments.cardPercentage,
          amount: metrics.revenue.card.current,
        },
      ],
      topItems: metrics.topMenuItems.slice(0, 10).map(item => ({
        name: item.name,
        quantity: item.orderCount,
        revenue: item.revenue,
        timesOrdered: item.orderCount,
      })),
      dailyPerformance: [], // Would need to generate this from chart data if needed
    };
  }
}