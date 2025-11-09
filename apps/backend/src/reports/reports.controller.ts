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
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(FirebaseAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Get restaurant analytics data' })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved successfully',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analytics (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analytics (YYYY-MM-DD)',
  })
  async getAnalytics(
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

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
    const end = endDate ? new Date(endDate) : new Date(); // Default to today

    return this.reportsService.getAnalytics(user.restaurantId, start, end);
  }

  @Get('pdf')
  @ApiOperation({ summary: 'Download PDF report' })
  @ApiResponse({
    status: 200,
    description: 'PDF report generated successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for report (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for report (YYYY-MM-DD)',
  })
  async downloadPdfReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res: Response,
  ) {
    if (!user.restaurantId) {
      throw new HttpException(
        'User not associated with a restaurant',
        HttpStatus.FORBIDDEN,
      );
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    try {
      const pdfBuffer = await this.reportsService.generatePdfReport(
        user.restaurantId,
        start,
        end,
      );

      const filename = `restaurant-report-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      throw new HttpException(
        'Failed to generate PDF report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}