import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  SuppliersService,
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryDto,
  SupplierPerformanceDto,
} from './suppliers.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('suppliers')
@Controller('restaurants/:restaurantId/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new supplier' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  @Roles(UserRole.Manager)
  async createSupplier(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: Omit<CreateSupplierDto, 'restaurantId' | 'createdBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.createSupplier({
      ...dto,
      restaurantId,
      createdBy: user.uid,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'hasEmail', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getSuppliers(
    @Param('restaurantId') restaurantId: string,
    @Query() filters: SupplierQueryDto,
  ) {
    return this.suppliersService.getSuppliers(restaurantId, filters);
  }

  @Get(':supplierId')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'supplierId' })
  @ApiResponse({ status: 200, description: 'Supplier retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getSupplierById(@Param('supplierId') supplierId: string) {
    return this.suppliersService.getSupplierById(supplierId);
  }

  @Put(':supplierId')
  @ApiOperation({ summary: 'Update supplier' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'supplierId' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @Roles(UserRole.Manager)
  async updateSupplier(
    @Param('supplierId') supplierId: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.updateSupplier(supplierId, dto);
  }

  @Delete(':supplierId')
  @ApiOperation({ summary: 'Delete supplier' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'supplierId' })
  @ApiResponse({ status: 200, description: 'Supplier deleted successfully' })
  @Roles(UserRole.Manager)
  async deleteSupplier(@Param('supplierId') supplierId: string) {
    return this.suppliersService.deleteSupplier(supplierId);
  }

  @Put(':supplierId/performance')
  @ApiOperation({ summary: 'Update supplier performance' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'supplierId' })
  @ApiResponse({ status: 200, description: 'Supplier performance updated successfully' })
  @Roles(UserRole.Manager)
  async updateSupplierPerformance(
    @Param('supplierId') supplierId: string,
    @Body() dto: Omit<SupplierPerformanceDto, 'supplierId' | 'evaluatedBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.updateSupplierPerformance({
      ...dto,
      supplierId,
      evaluatedBy: user.uid,
    });
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get suppliers by category' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'category' })
  @ApiResponse({ status: 200, description: 'Suppliers by category retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getSuppliersByCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('category') category: string,
  ) {
    return this.suppliersService.getSuppliersByCategory(restaurantId, category);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get suppliers serving a specific branch' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiResponse({ status: 200, description: 'Suppliers for branch retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getSuppliersByBranch(
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.suppliersService.getSuppliersByBranch(restaurantId, branchId);
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get supplier analytics' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Supplier analytics retrieved successfully' })
  @Roles(UserRole.Manager)
  async getSupplierAnalytics(
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.suppliersService.getSupplierAnalytics(restaurantId);
  }
}