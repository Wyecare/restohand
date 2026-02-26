import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
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
  InventoryCountsService,
  CreateInventoryCountDto,
  UpdateCountItemDto,
  InventoryCountQueryDto,
} from './inventory-counts.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('inventory-counts')
@Controller('restaurants/:restaurantId/inventory-counts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryCountsController {
  constructor(private readonly inventoryCountsService: InventoryCountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new inventory count' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 201, description: 'Inventory count created successfully' })
  @Roles(UserRole.Manager)
  async createInventoryCount(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: Omit<CreateInventoryCountDto, 'restaurantId' | 'createdBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryCountsService.createInventoryCount({
      ...dto,
      restaurantId,
      createdBy: user.uid,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventory counts' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'countType', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Inventory counts retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getInventoryCounts(
    @Param('restaurantId') restaurantId: string,
    @Query() filters: InventoryCountQueryDto,
  ) {
    return this.inventoryCountsService.getInventoryCounts(restaurantId, filters);
  }

  @Get(':countId')
  @ApiOperation({ summary: 'Get inventory count by ID' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'countId' })
  @ApiResponse({ status: 200, description: 'Inventory count retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getInventoryCountById(@Param('countId') countId: string) {
    return this.inventoryCountsService.getInventoryCountById(countId);
  }

  @Put(':countId/start')
  @ApiOperation({ summary: 'Start inventory count' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'countId' })
  @ApiResponse({ status: 200, description: 'Inventory count started successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async startInventoryCount(
    @Param('countId') countId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryCountsService.startInventoryCount(countId, user.uid);
  }

  @Put(':countId/items/:itemId')
  @ApiOperation({ summary: 'Update count item' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'countId' })
  @ApiParam({ name: 'itemId' })
  @ApiResponse({ status: 200, description: 'Count item updated successfully' })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter)
  async updateCountItem(
    @Param('countId') countId: string,
    @Param('itemId') itemId: string,
    @Body() dto: Omit<UpdateCountItemDto, 'inventoryItemId' | 'countedBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryCountsService.updateCountItem(countId, {
      ...dto,
      inventoryItemId: itemId,
      countedBy: user.uid,
    });
  }

  @Put(':countId/complete')
  @ApiOperation({ summary: 'Complete inventory count' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'countId' })
  @ApiResponse({ status: 200, description: 'Inventory count completed successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async completeInventoryCount(
    @Param('countId') countId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryCountsService.completeInventoryCount(countId, user.uid);
  }

  @Put(':countId/approve')
  @ApiOperation({ summary: 'Approve inventory count' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'countId' })
  @ApiResponse({ status: 200, description: 'Inventory count approved successfully' })
  @Roles(UserRole.Manager)
  async approveInventoryCount(
    @Param('countId') countId: string,
    @Body('updateSystemStock') updateSystemStock: boolean = false,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryCountsService.approveInventoryCount(
      countId,
      user.uid,
      updateSystemStock,
    );
  }

  @Put(':countId/cancel')
  @ApiOperation({ summary: 'Cancel inventory count' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'countId' })
  @ApiResponse({ status: 200, description: 'Inventory count cancelled successfully' })
  @Roles(UserRole.Manager)
  async cancelInventoryCount(
    @Param('countId') countId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryCountsService.cancelInventoryCount(
      countId,
      user.uid,
      reason,
    );
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get inventory counts analytics' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, description: 'Inventory counts analytics retrieved successfully' })
  @Roles(UserRole.Manager)
  async getInventoryCountAnalytics(
    @Param('restaurantId') restaurantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.inventoryCountsService.getInventoryCountAnalytics(
      restaurantId,
      branchId,
    );
  }

  @Get('types/all')
  @ApiOperation({ summary: 'Get all available inventory count types' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Inventory count types retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getInventoryCountTypes() {
    return {
      types: [
        {
          value: 'spot_check',
          label: 'Spot Check',
          description: 'Quick check of selected items for reference only',
        },
        {
          value: 'full_count',
          label: 'Full Count',
          description: 'Complete count of all inventory items',
        },
        {
          value: 'cycle_count',
          label: 'Cycle Count',
          description: 'Regular count of frequently moved items',
        },
        {
          value: 'category_count',
          label: 'Category Count',
          description: 'Count all items in specific categories',
        },
      ],
    };
  }

  @Get('statuses/all')
  @ApiOperation({ summary: 'Get all available inventory count statuses' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Inventory count statuses retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getInventoryCountStatuses() {
    return {
      statuses: [
        'draft',
        'in_progress',
        'completed',
        'approved',
        'cancelled',
      ],
    };
  }
}