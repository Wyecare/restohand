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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RestaurantTablesService } from './restaurant-tables.service';
import { CreateRestaurantTableDto } from './dtos/create-restaurant-table.dto';
import { RestaurantTableResponseDto } from './dtos/restaurant-table-response.dto';
import { UpdateRestaurantTableDto } from './dtos/update-restaurant-table.dto';
import { BulkCreateTablesDto } from './dtos/bulk-create-tables.dto';
import { ServiceTablesResponseDto } from './dtos/service-table-response.dto';

@ApiTags('restaurant-tables')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/tables')
export class RestaurantTablesController {
  constructor(private readonly tablesService: RestaurantTablesService) {}

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
}
