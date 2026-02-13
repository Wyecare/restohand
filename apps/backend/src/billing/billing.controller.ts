import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { BillCalculatorService, BillCalculation, DetailedBillCalculation } from './services/bill-calculator.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billCalculatorService: BillCalculatorService) {}

  // PUBLIC ENDPOINTS (No Auth Required - Customer facing)

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Calculate bill for a customer session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiQuery({ name: 'includeUnpaid', required: false, description: 'Include unpaid orders' })
  @ApiResponse({ status: 200 })
  async calculateSessionBill(
    @Param('sessionId') sessionId: string,
    @Query('includeUnpaid') includeUnpaid?: string
  ): Promise<BillCalculation> {
    const includeUnpaidBool = includeUnpaid === 'true' || includeUnpaid === undefined; // Default true
    return this.billCalculatorService.calculateSessionBill(sessionId, includeUnpaidBool);
  }

  @Get('session/:sessionId/detailed')
  @ApiOperation({ summary: 'Get detailed session bill with item-level breakdown and restaurant details' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiQuery({ name: 'includeUnpaid', required: false, description: 'Include unpaid orders' })
  @ApiResponse({
    status: 200,
    description: 'Detailed bill calculation with restaurant info, session details, and item-level breakdown'
  })
  async getDetailedSessionBill(
    @Param('sessionId') sessionId: string,
    @Query('includeUnpaid') includeUnpaid?: string
  ): Promise<DetailedBillCalculation> {
    const includeUnpaidBool = includeUnpaid === 'true' || includeUnpaid === undefined; // Default true
    return this.billCalculatorService.calculateDetailedSessionBill(sessionId, includeUnpaidBool);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Calculate bill for a single order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200 })
  async calculateOrderBill(@Param('orderId') orderId: string): Promise<BillCalculation> {
    return this.billCalculatorService.calculateSingleOrderBill(orderId);
  }

  @Post('orders/calculate')
  @ApiOperation({ summary: 'Calculate bill for specific orders' })
  @ApiResponse({ status: 200 })
  async calculateOrdersBill(
    @Body() body: { orderIds: string[]; includeUnpaid?: boolean }
  ): Promise<BillCalculation> {
    return this.billCalculatorService.calculateOrdersBill(
      body.orderIds,
      body.includeUnpaid !== false // Default true
    );
  }

  // STAFF ENDPOINTS (Authentication Required)

  @Post('session/:sessionId/update-totals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Update session billing totals (staff maintenance)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200 })
  async updateSessionBillingTotals(
    @Param('sessionId') sessionId: string
  ): Promise<{ success: boolean }> {
    await this.billCalculatorService.updateSessionBillingTotals(sessionId);
    return { success: true };
  }

  // ADVANCED BILLING OPERATIONS

  @Post('calculate/custom')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Cashier)
  @ApiOperation({ summary: 'Calculate bill with custom parameters' })
  @ApiResponse({ status: 200 })
  async calculateCustomBill(
    @Body()
    body: {
      sessionId?: string;
      orderIds?: string[];
      orderId?: string;
      includeUnpaid?: boolean;
      includeCancelled?: boolean;
    }
  ): Promise<BillCalculation> {
    return this.billCalculatorService.calculateBill({
      sessionId: body.sessionId,
      orderIds: body.orderIds,
      orderId: body.orderId,
      includeUnpaid: body.includeUnpaid !== false, // Default true
      includeCancelled: body.includeCancelled === true, // Default false
    });
  }

  @Get('validate/session/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Cashier)
  @ApiOperation({ summary: 'Validate session billing consistency' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200 })
  async validateSessionBilling(@Param('sessionId') sessionId: string): Promise<{
    isValid: boolean;
    calculatedBill: BillCalculation;
    discrepancies?: any[];
  }> {
    // Calculate fresh bill
    const calculatedBill = await this.billCalculatorService.calculateSessionBill(sessionId);

    // This would typically compare against stored session totals
    // For now, return the calculated bill as validation
    return {
      isValid: true,
      calculatedBill,
      discrepancies: [],
    };
  }
}