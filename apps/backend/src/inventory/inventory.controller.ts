import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
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
import { InventoryService, CreateInventoryItemDto, UpdateStockDto } from './inventory.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BranchPermissionsService } from '../users/branch-permissions.service';

@ApiTags('inventory')
@Controller('restaurants/:restaurantId/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly branchPermissions: BranchPermissionsService,
  ) {}

  @Post('items')
  @ApiOperation({ summary: 'Create new inventory item' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 201, description: 'Inventory item created successfully' })
  @Roles(UserRole.Manager)
  async createItem(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: Omit<CreateInventoryItemDto, 'restaurantId' | 'branchId'>,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.inventoryService.createInventoryItem({
      ...dto,
      restaurantId,
      branchId: user.branchId,
    });
  }

  @Get('items')
  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'outOfStock', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Inventory items retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter)
  async getItems(
    @Param('restaurantId') restaurantId: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: boolean,
    @Query('outOfStock') outOfStock?: boolean,
    @Query('search') search?: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.inventoryService.getInventoryItems(restaurantId, {
      category,
      lowStock,
      outOfStock,
      search,
      branchId: user.branchId,
    });
  }

  @Put('items/:itemId/stock')
  @ApiOperation({ summary: 'Update stock levels' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async updateStock(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: Omit<UpdateStockDto, 'createdBy'>,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.inventoryService.updateStock(itemId, {
      ...dto,
      createdBy: user.uid,
    });
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get inventory analytics' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @Roles(UserRole.Manager)
  async getAnalytics(@Param('restaurantId') restaurantId: string) {
    return this.inventoryService.getInventoryAnalytics(restaurantId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active stock alerts' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getAlerts(@Param('restaurantId') restaurantId: string) {
    return this.inventoryService.getActiveAlerts(restaurantId);
  }

  @Put('alerts/:alertId/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'alertId' })
  @ApiResponse({ status: 200, description: 'Alert marked as read' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async markAlertAsRead(
    @Param('restaurantId') restaurantId: string,
    @Param('alertId') alertId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.inventoryService.markAlertAsRead(alertId, user.uid);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get inventory categories' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter)
  async getCategories(@Param('restaurantId') restaurantId: string) {
    // Get distinct categories for this restaurant
    const items = await this.inventoryService.getInventoryItems(restaurantId);
    const categories = [...new Set(items.map(item => item.category))];

    return {
      categories: categories.sort(),
      predefinedCategories: [
        'vegetables',
        'fruits',
        'meat',
        'seafood',
        'dairy',
        'grains',
        'spices',
        'beverages',
        'oils',
        'cleaning',
        'packaging',
        'other'
      ]
    };
  }

  @Get('units')
  @ApiOperation({ summary: 'Get common inventory units' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Units retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getUnits(@Param('restaurantId') restaurantId: string) {
    return {
      units: [
        'kg',
        'grams',
        'liters',
        'ml',
        'pieces',
        'boxes',
        'packets',
        'cans',
        'bottles',
        'sachets',
        'bunches',
        'dozens'
      ]
    };
  }

  // Branch-aware endpoints
  @Get('branches/:branchId/items')
  @ApiOperation({ summary: 'Get inventory items for specific branch' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'outOfStock', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Branch inventory items retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter)
  async getItemsByBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: boolean,
    @Query('outOfStock') outOfStock?: boolean,
    @Query('search') search?: string,
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch inventory');
    }

    return this.inventoryService.getInventoryItems(restaurantId, {
      category,
      lowStock,
      outOfStock,
      search,
      branchId,
    });
  }

  @Post('branches/:branchId/items')
  @ApiOperation({ summary: 'Create inventory item for specific branch' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiResponse({ status: 201, description: 'Branch inventory item created successfully' })
  @Roles(UserRole.Manager)
  async createItemForBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Body() dto: Omit<CreateInventoryItemDto, 'restaurantId' | 'branchId'>,
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to manage this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to create inventory items for this branch');
    }

    return this.inventoryService.createInventoryItem({
      ...dto,
      restaurantId,
      branchId,
    });
  }

  @Get('branches/:branchId/alerts')
  @ApiOperation({ summary: 'Get stock alerts for specific branch' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiResponse({ status: 200, description: 'Branch alerts retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getAlertsByBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch alerts');
    }

    return this.inventoryService.getActiveAlertsByBranch(restaurantId, branchId);
  }

  @Get('branches/:branchId/analytics')
  @ApiOperation({ summary: 'Get inventory analytics for specific branch' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiResponse({ status: 200, description: 'Branch analytics retrieved successfully' })
  @Roles(UserRole.Manager)
  async getAnalyticsByBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch analytics');
    }

    return this.inventoryService.getInventoryAnalyticsByBranch(restaurantId, branchId);
  }
}