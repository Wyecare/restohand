import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  TransferOrdersService,
  CreateTransferOrderDto,
  ApproveTransferOrderDto,
  ProcessTransferOrderDto,
  TransferOrderQueryDto,
} from './transfer-orders.service';
import { BranchPermissionsService } from '../users/branch-permissions.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('transfer-orders')
@Controller('restaurants/:restaurantId/transfer-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransferOrdersController {
  constructor(
    private readonly transferOrdersService: TransferOrdersService,
    private readonly branchPermissions: BranchPermissionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new transfer order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 201, description: 'Transfer order created successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async createTransferOrder(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: Omit<CreateTransferOrderDto, 'restaurantId' | 'createdBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transferOrdersService.createTransferOrder({
      ...dto,
      restaurantId,
      createdBy: user.uid,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all transfer orders' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'sourceBranchId', required: false })
  @ApiQuery({ name: 'destinationBranchId', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transfer orders retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getTransferOrders(
    @Param('restaurantId') restaurantId: string,
    @Query() filters: TransferOrderQueryDto,
  ) {
    return this.transferOrdersService.getTransferOrders(restaurantId, filters);
  }

  @Get(':transferId')
  @ApiOperation({ summary: 'Get transfer order by ID' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'transferId' })
  @ApiResponse({ status: 200, description: 'Transfer order retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getTransferOrderById(@Param('transferId') transferId: string) {
    return this.transferOrdersService.getTransferOrderById(transferId);
  }

  @Put(':transferId/submit')
  @ApiOperation({ summary: 'Submit transfer order for approval' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'transferId' })
  @ApiResponse({ status: 200, description: 'Transfer order submitted successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async submitTransferOrder(
    @Param('transferId') transferId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transferOrdersService.submitTransferOrder(transferId, user.uid);
  }

  @Put(':transferId/approve')
  @ApiOperation({ summary: 'Approve transfer order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'transferId' })
  @ApiResponse({ status: 200, description: 'Transfer order approved successfully' })
  @Roles(UserRole.Manager)
  async approveTransferOrder(
    @Request() req: any,
    @Param('transferId') transferId: string,
    @Body() dto: Omit<ApproveTransferOrderDto, 'transferId' | 'approvedBy'>,
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to approve for source branch
    const transferOrder = await this.transferOrdersService.getTransferOrderById(transferId);
    const permissions = await this.branchPermissions.getBranchPermissions(user);

    if (!permissions.canManageBranch(transferOrder.sourceBranchId.toString())) {
      throw new ForbiddenException('Insufficient permissions to approve transfers from this branch');
    }

    return this.transferOrdersService.approveTransferOrder({
      ...dto,
      transferId,
      approvedBy: user.uid,
    });
  }

  @Put(':transferId/reject')
  @ApiOperation({ summary: 'Reject transfer order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'transferId' })
  @ApiResponse({ status: 200, description: 'Transfer order rejected successfully' })
  @Roles(UserRole.Manager)
  async rejectTransferOrder(
    @Param('transferId') transferId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transferOrdersService.rejectTransferOrder(
      transferId,
      reason,
      user.uid,
    );
  }

  @Put(':transferId/process')
  @ApiOperation({ summary: 'Process transfer order (execute transfer)' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'transferId' })
  @ApiResponse({ status: 200, description: 'Transfer order processed successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async processTransferOrder(
    @Param('transferId') transferId: string,
    @Body() dto: Omit<ProcessTransferOrderDto, 'transferId' | 'processedBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transferOrdersService.processTransferOrder({
      ...dto,
      transferId,
      processedBy: user.uid,
    });
  }

  @Put(':transferId/cancel')
  @ApiOperation({ summary: 'Cancel transfer order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'transferId' })
  @ApiResponse({ status: 200, description: 'Transfer order cancelled successfully' })
  @Roles(UserRole.Manager)
  async cancelTransferOrder(
    @Param('transferId') transferId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transferOrdersService.cancelTransferOrder(
      transferId,
      reason,
      user.uid,
    );
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get transfer orders analytics' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, description: 'Transfer orders analytics retrieved successfully' })
  @Roles(UserRole.Manager)
  async getTransferOrderAnalytics(
    @Param('restaurantId') restaurantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.transferOrdersService.getTransferOrderAnalytics(
      restaurantId,
      branchId,
    );
  }

  @Get('statuses/all')
  @ApiOperation({ summary: 'Get all available transfer order statuses' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Transfer order statuses retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getTransferOrderStatuses() {
    return {
      statuses: [
        'draft',
        'pending',
        'approved',
        'rejected',
        'in_transit',
        'partial',
        'completed',
        'cancelled',
      ],
    };
  }

  @Get('priorities/all')
  @ApiOperation({ summary: 'Get all available transfer order priorities' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Transfer order priorities retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getTransferOrderPriorities() {
    return {
      priorities: ['low', 'normal', 'high', 'urgent'],
    };
  }
}