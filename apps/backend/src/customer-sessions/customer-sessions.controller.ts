import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CustomerSessionsService } from './customer-sessions.service';
import { SessionClosureReason } from './schemas/customer-session.schema';
import {
  CreateCustomerSessionDto,
  CustomerSessionResponseDto,
  UpdateSessionStatusDto,
  FindSessionsQueryDto,
} from './dtos/customer-session.dto';

@ApiTags('customer-sessions')
@Controller('customer-sessions')
export class CustomerSessionsController {
  constructor(
    private readonly customerSessionsService: CustomerSessionsService
  ) {}

  // PUBLIC ENDPOINTS (No Auth Required - Customer facing)

  @Post('create')
  @ApiOperation({ summary: 'Create a new customer session' })
  @ApiResponse({ status: 201, type: CustomerSessionResponseDto })
  async createSession(
    @Body() createSessionDto: CreateCustomerSessionDto,
    @Req() req: Request
  ): Promise<CustomerSessionResponseDto> {
    return this.customerSessionsService.createSession({
      ...createSessionDto,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, type: CustomerSessionResponseDto })
  async getSession(
    @Param('sessionId') sessionId: string
  ): Promise<CustomerSessionResponseDto> {
    const session = await this.customerSessionsService.findBySessionId(
      sessionId
    );
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  @Post(':sessionId/activity')
  @ApiOperation({ summary: 'Update session activity (keep alive)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200 })
  async updateActivity(
    @Param('sessionId') sessionId: string
  ): Promise<{ success: boolean }> {
    await this.customerSessionsService.updateActivity(sessionId);
    return { success: true };
  }

  @Get(':sessionId/bill')
  @ApiOperation({ summary: 'Get session with complete bill calculation' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200 })
  async getSessionBill(@Param('sessionId') sessionId: string) {
    return this.customerSessionsService.getSessionWithBill(sessionId);
  }

  @Get('table/:tableId/active')
  @ApiOperation({ summary: 'Get active session for a table' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiResponse({ status: 200, type: CustomerSessionResponseDto })
  async getActiveSessionByTable(@Param('tableId') tableId: string) {
    return this.customerSessionsService.findActiveSessionByTable(tableId);
  }

  // STAFF ENDPOINTS (Authentication Required)

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Find sessions with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'restaurantId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'tableId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  async findSessions(@Query() query: any) {
    return this.customerSessionsService.findSessions({
      ...query,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
  }

  @Patch(':sessionId/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Close a session manually (staff only)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, type: CustomerSessionResponseDto })
  async closeSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { reason?: SessionClosureReason; notes?: string },
    @Req() req: Request
  ): Promise<CustomerSessionResponseDto> {
    const user = req.user as any;
    return this.customerSessionsService.closeSession(
      sessionId,
      body.reason || SessionClosureReason.STAFF_CLOSED,
      user.uid,
      body.notes
    );
  }

  @Delete(':sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Delete an empty session (staff only)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200 })
  async deleteSession(
    @Param('sessionId') sessionId: string
  ): Promise<{ success: boolean }> {
    await this.customerSessionsService.deleteSession(sessionId);
    return { success: true };
  }

  // ADMIN ENDPOINTS (Manager only)

  @Post('maintenance/close-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Close expired sessions (admin maintenance)' })
  @ApiResponse({ status: 200 })
  async closeExpiredSessions(): Promise<{ closedCount: number }> {
    const closedCount =
      await this.customerSessionsService.closeExpiredSessions();
    return { closedCount };
  }

  @Post('maintenance/mark-abandoned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager)
  @ApiOperation({
    summary: 'Mark inactive sessions as abandoned (admin maintenance)',
  })
  @ApiResponse({ status: 200 })
  async markAbandonedSessions(): Promise<{ markedCount: number }> {
    const markedCount =
      await this.customerSessionsService.markAbandonedSessions();
    return { markedCount };
  }

  // SESSION EVENT HANDLERS (Internal use - called by order service)

  @Post(':sessionId/events/order-placed')
  @ApiOperation({ summary: 'Handle order placed event in session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async onOrderPlaced(
    @Param('sessionId') sessionId: string,
    @Body() body: { orderId: string }
  ): Promise<{ success: boolean }> {
    await this.customerSessionsService.onOrderPlaced(sessionId, body.orderId);
    return { success: true };
  }

  @Post(':sessionId/events/order-paid')
  @ApiOperation({ summary: 'Handle order paid event in session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async onOrderPaid(
    @Param('sessionId') sessionId: string,
    @Body() body: { orderId: string }
  ): Promise<{ success: boolean }> {
    await this.customerSessionsService.onOrderPaid(sessionId, body.orderId);
    return { success: true };
  }

  @Post(':sessionId/events/order-cancelled')
  @ApiOperation({ summary: 'Handle order cancelled event in session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async onOrderCancelled(
    @Param('sessionId') sessionId: string,
    @Body() body: { orderId: string }
  ): Promise<{ success: boolean }> {
    await this.customerSessionsService.onOrderCancelled(sessionId, body.orderId);
    return { success: true };
  }
}
