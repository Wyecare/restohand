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
  FindSessionsQueryDto,
  GhostSessionResponseDto,
} from './dtos/customer-session.dto';

@ApiTags('customer-sessions')
@Controller('customer-sessions')
export class CustomerSessionsController {
  constructor(
    private readonly customerSessionsService: CustomerSessionsService
  ) {}

  // ─── Public endpoints (customer-facing, no auth) ──────────────────────────

  @Post('create')
  @ApiOperation({ summary: 'Create or resume a customer session (QR flow)' })
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
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, type: CustomerSessionResponseDto })
  async getSession(
    @Param('sessionId') sessionId: string
  ): Promise<CustomerSessionResponseDto> {
    const session = await this.customerSessionsService.findBySessionId(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  @Post(':sessionId/activity')
  @ApiOperation({ summary: 'Update session activity (keep-alive)' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async updateActivity(
    @Param('sessionId') sessionId: string
  ): Promise<{ success: boolean }> {
    await this.customerSessionsService.updateActivity(sessionId);
    return { success: true };
  }

  @Get(':sessionId/bill')
  @ApiOperation({ summary: 'Get session with full bill calculation' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
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

  // ─── Staff endpoints (auth required) ─────────────────────────────────────

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
  async findSessions(@Query() query: FindSessionsQueryDto) {
    return this.customerSessionsService.findSessions({
      ...query,
      page: query.page ? parseInt(query.page as string, 10) : undefined,
      limit: query.limit ? parseInt(query.limit as string, 10) : undefined,
    });
  }

  @Patch(':sessionId/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Close a session manually' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, type: CustomerSessionResponseDto })
  async closeSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { reason?: SessionClosureReason; notes?: string },
    @Req() req: Request
  ): Promise<CustomerSessionResponseDto> {
    const user = req.user as any;
    return this.customerSessionsService.closeSession(
      sessionId,
      body.reason ?? SessionClosureReason.STAFF_CLOSED,
      user.uid,
      body.notes
    );
  }

  @Delete(':sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Delete an empty session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async deleteSession(
    @Param('sessionId') sessionId: string
  ): Promise<{ success: boolean }> {
    await this.customerSessionsService.deleteSession(sessionId);
    return { success: true };
  }

  // ─── Ghost session endpoints ──────────────────────────────────────────────

  @Get('ghost/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Cashier)
  @ApiOperation({ summary: 'List ghost sessions (active with no orders)' })
  @ApiQuery({ name: 'restaurantId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, type: [GhostSessionResponseDto] })
  async listGhostSessions(
    @Query('restaurantId') restaurantId: string,
    @Query('branchId') branchId?: string
  ): Promise<GhostSessionResponseDto[]> {
    return this.customerSessionsService.listGhostSessions(restaurantId, branchId);
  }

  @Delete('ghost/cleanup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Delete all ghost sessions for a restaurant/branch' })
  @ApiQuery({ name: 'restaurantId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  async cleanupGhostSessions(
    @Query('restaurantId') restaurantId: string,
    @Query('branchId') branchId?: string
  ): Promise<{ deletedCount: number }> {
    const deletedCount = await this.customerSessionsService.cleanupGhostSessions(
      restaurantId,
      branchId
    );
    return { deletedCount };
  }

  // ─── Maintenance endpoints (manager only) ────────────────────────────────

  @Post('maintenance/close-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Close expired sessions' })
  async closeExpiredSessions(): Promise<{ closedCount: number }> {
    const closedCount = await this.customerSessionsService.closeExpiredSessions();
    return { closedCount };
  }

  @Post('maintenance/mark-abandoned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Mark inactive sessions as abandoned' })
  async markAbandonedSessions(): Promise<{ markedCount: number }> {
    const markedCount = await this.customerSessionsService.markAbandonedSessions();
    return { markedCount };
  }
}
