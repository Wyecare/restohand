import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RestaurantSessionsService } from './restaurant-sessions.service';
import { ListActiveSessionsDto } from './dtos/list-active-sessions.dto';
import { UpdateSessionStatusDto } from './dtos/update-session-status.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { PrintReceiptDto } from './dtos/print-receipt.dto';
import { MarkSessionCompleteDto } from './dtos/mark-session-complete.dto';
import { BulkUpdateOrderStatusDto } from './dtos/bulk-update-order-status.dto';

@ApiTags('restaurant-sessions')
@Controller('restaurants/:restaurantId/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
@ApiBearerAuth()
export class RestaurantSessionsController {
  constructor(
    private readonly restaurantSessionsService: RestaurantSessionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active table sessions with filtering and search' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Session status filter' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by table number or customer' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Branch filter' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
  })
  async listActiveSessions(
    @Param('restaurantId') restaurantId: string,
    @Query() query: ListActiveSessionsDto,
  ) {
    return this.restaurantSessionsService.listActiveSessions(restaurantId, query);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get detailed session information including all orders and items' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session details retrieved successfully',
  })
  async getSessionDetails(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.restaurantSessionsService.getSessionDetails(restaurantId, sessionId);
  }

  @Patch(':sessionId/status')
  @ApiOperation({ summary: 'Update session status (active, ready, completed)' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session status updated successfully',
  })
  async updateSessionStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
    @Body() updateStatusDto: UpdateSessionStatusDto,
  ) {
    return this.restaurantSessionsService.updateSessionStatus(
      restaurantId,
      sessionId,
      updateStatusDto.status,
    );
  }

  @Post(':sessionId/print-receipt')
  @ApiOperation({ summary: 'Print session receipt (customer bill)' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 201,
    description: 'Receipt printed successfully',
  })
  async printSessionReceipt(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
    @Body() printDto: PrintReceiptDto,
  ) {
    return this.restaurantSessionsService.printSessionReceipt(
      restaurantId,
      sessionId,
      printDto,
    );
  }

  @Post(':sessionId/print-kitchen-ticket')
  @ApiOperation({ summary: 'Print kitchen ticket for order preparation' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 201,
    description: 'Kitchen ticket printed successfully',
  })
  async printKitchenTicket(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
    @Body() printDto: PrintReceiptDto,
  ) {
    return this.restaurantSessionsService.printKitchenTicket(
      restaurantId,
      sessionId,
      printDto,
    );
  }

  @Post(':sessionId/complete')
  @ApiOperation({ summary: 'Mark session as complete and close table' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 201,
    description: 'Session marked as complete successfully',
  })
  async markSessionComplete(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
    @Body() completeDto: MarkSessionCompleteDto,
  ) {
    return this.restaurantSessionsService.markSessionComplete(
      restaurantId,
      sessionId,
      completeDto.notes,
    );
  }

  @Get(':sessionId/bill')
  @ApiOperation({ summary: 'Get session bill/receipt data for printing' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session bill retrieved successfully',
  })
  async getSessionBill(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.restaurantSessionsService.getSessionBill(restaurantId, sessionId);
  }

  @Get(':sessionId/receipt')
  @ApiOperation({ summary: 'Download session receipt as PDF' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Receipt type', enum: ['customer', 'kitchen', 'summary'] })
  @ApiResponse({
    status: 200,
    description: 'Receipt PDF generated successfully',
  })
  async downloadSessionReceipt(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
    @Query('type') type: string = 'customer',
  ) {
    return this.restaurantSessionsService.downloadSessionReceipt(
      restaurantId,
      sessionId,
      type,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get session statistics for dashboard' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Date filter (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Session statistics retrieved successfully',
  })
  async getSessionStats(
    @Param('restaurantId') restaurantId: string,
    @Query('date') date?: string,
  ) {
    return this.restaurantSessionsService.getSessionStats(restaurantId, date);
  }

  @Get(':sessionId/orders')
  @ApiOperation({ summary: 'Get orders by session ID' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session orders retrieved successfully',
  })
  async getSessionOrders(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.restaurantSessionsService.getSessionOrders(restaurantId, sessionId);
  }
}

// Order management endpoints (separate from sessions but related)
@ApiTags('restaurant-orders')
@Controller('restaurants/:restaurantId/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
@ApiBearerAuth()
export class RestaurantOrdersController {
  constructor(
    private readonly restaurantSessionsService: RestaurantSessionsService,
  ) {}

  @Patch(':orderId/status')
  @ApiOperation({ summary: 'Update individual order status within a session' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  async updateOrderStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.restaurantSessionsService.updateOrderStatus(
      restaurantId,
      orderId,
      updateDto,
    );
  }

  @Post('bulk-update-status')
  @ApiOperation({ summary: 'Bulk update multiple order statuses' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({
    status: 201,
    description: 'Orders updated successfully',
  })
  async bulkUpdateOrderStatus(
    @Param('restaurantId') restaurantId: string,
    @Body() bulkUpdateDto: BulkUpdateOrderStatusDto,
  ) {
    return this.restaurantSessionsService.bulkUpdateOrderStatus(
      restaurantId,
      bulkUpdateDto,
    );
  }
}