import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RestaurantTablesService } from './restaurant-tables.service';
import { TableStatusService } from './table-status.service';
import { ZoneManagementService } from './zone-management.service';
import { CreateRestaurantTableDto } from './dtos/create-restaurant-table.dto';
import { RestaurantTableResponseDto } from './dtos/restaurant-table-response.dto';
import { UpdateRestaurantTableDto } from './dtos/update-restaurant-table.dto';
import { BulkCreateTablesDto } from './dtos/bulk-create-tables.dto';
import { ServiceTablesResponseDto } from './dtos/service-table-response.dto';
import {
  UpdateTableStatusDto,
  TableStatusResponseDto,
  TableStatusStatsDto,
  EnhancedRestaurantTableResponseDto,
} from './dtos/table-status.dto';
import {
  CreateZoneDto,
  UpdateZoneDto,
  ZoneResponseDto,
  ZonesListResponseDto,
  BulkUpdateZonesDto,
} from './dtos/zone-management.dto';

@ApiTags('restaurant-tables')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/tables')
export class RestaurantTablesController {
  constructor(
    private readonly tablesService: RestaurantTablesService,
    private readonly tableStatusService: TableStatusService,
    private readonly zoneManagementService: ZoneManagementService
  ) {}

  @Get()
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOkResponse({ type: [RestaurantTableResponseDto] })
  async list(@Param('restaurantId') restaurantId: string) {
    return this.tablesService.list(restaurantId);
  }

  @Get('service-view')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOkResponse({ type: ServiceTablesResponseDto })
  async listForService(@Param('restaurantId') restaurantId: string) {
    return this.tablesService.listForService(restaurantId);
  }

  @Post()
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiCreatedResponse({ type: RestaurantTableResponseDto })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateRestaurantTableDto
  ) {
    return this.tablesService.create(restaurantId, dto);
  }

  @Post('bulk')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiCreatedResponse({ type: [RestaurantTableResponseDto] })
  async bulkCreate(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: BulkCreateTablesDto
  ) {
    return this.tablesService.bulkCreate(restaurantId, dto);
  }

  @Patch(':tableId')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiOkResponse({ type: RestaurantTableResponseDto })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body() dto: UpdateRestaurantTableDto
  ) {
    return this.tablesService.update(restaurantId, tableId, dto);
  }

  @Delete(':tableId')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiOkResponse({ description: 'Table archived successfully' })
  async archive(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string
  ) {
    await this.tablesService.archive(restaurantId, tableId);
    return { success: true };
  }

  @Post(':tableId/reactivate')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiOkResponse({ type: RestaurantTableResponseDto })
  async reactivate(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string
  ) {
    return this.tablesService.reactivate(restaurantId, tableId);
  }

  @Get(':tableId/qrcode')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  async generateQr(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string
  ) {
    return this.tablesService.generateQrCode(restaurantId, tableId);
  }

  // Enhanced endpoints for Command Center functionality

  @Get('enhanced')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOkResponse({ type: [EnhancedRestaurantTableResponseDto] })
  async listEnhanced(@Param('restaurantId') restaurantId: string) {
    return this.tableStatusService.getEnhancedTablesList(restaurantId);
  }

  @Get('stats')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOkResponse({ type: TableStatusStatsDto })
  async getStats(@Param('restaurantId') restaurantId: string) {
    return this.tableStatusService.getRestaurantTableStatuses(restaurantId);
  }

  @Get(':tableId/status')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiOkResponse({ type: TableStatusResponseDto })
  async getTableStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string
  ) {
    const status = await this.tableStatusService.getTableStatus(
      restaurantId,
      tableId
    );
    if (!status) {
      return this.tableStatusService.initializeTableStatus(
        restaurantId,
        tableId
      );
    }
    return status;
  }

  @Patch(':tableId/status')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiOkResponse({ type: TableStatusResponseDto })
  async updateTableStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableStatusDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tableStatusService.updateTableStatus(
      restaurantId,
      tableId,
      dto,
      user
    );
  }

  @Post(':tableId/status/initialize')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiCreatedResponse({ type: TableStatusResponseDto })
  async initializeStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string
  ) {
    return this.tableStatusService.initializeTableStatus(restaurantId, tableId);
  }

  // Zone Management endpoints

  @Get('zones')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOkResponse({ type: ZonesListResponseDto })
  async getZones(@Param('restaurantId') restaurantId: string) {
    return this.zoneManagementService.getZones(restaurantId);
  }

  @Post('zones')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiCreatedResponse({ type: ZoneResponseDto })
  async createZone(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateZoneDto
  ) {
    return this.zoneManagementService.createZone(restaurantId, dto);
  }

  @Patch('zones/:zoneId')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'zoneId', description: 'Zone ID' })
  @ApiOkResponse({ type: ZoneResponseDto })
  async updateZone(
    @Param('restaurantId') restaurantId: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: UpdateZoneDto
  ) {
    return this.zoneManagementService.updateZone(restaurantId, zoneId, dto);
  }

  @Delete('zones/:zoneId')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'zoneId', description: 'Zone ID' })
  @ApiOkResponse({ description: 'Zone deleted successfully' })
  async deleteZone(
    @Param('restaurantId') restaurantId: string,
    @Param('zoneId') zoneId: string
  ) {
    await this.zoneManagementService.deleteZone(restaurantId, zoneId);
    return { success: true };
  }

  @Put('zones')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOkResponse({ type: ZonesListResponseDto })
  async bulkUpdateZones(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: BulkUpdateZonesDto
  ) {
    return this.zoneManagementService.bulkUpdateZones(restaurantId, dto);
  }
}
