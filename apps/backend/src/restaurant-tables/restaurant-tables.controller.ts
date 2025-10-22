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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RestaurantTablesService } from './restaurant-tables.service';
import { CreateRestaurantTableDto } from './dtos/create-restaurant-table.dto';
import { UpdateRestaurantTableDto } from './dtos/update-restaurant-table.dto';
import { RestaurantTableResponseDto } from './dtos/restaurant-table-response.dto';

@ApiTags('restaurant-tables')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('restaurants/:restaurantId/tables')
export class RestaurantTablesController {
  constructor(private readonly tablesService: RestaurantTablesService) {}

  @Get()
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'Include archived tables in the response',
  })
  @ApiOkResponse({ type: [RestaurantTableResponseDto] })
  async list(
    @Param('restaurantId') restaurantId: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    const include = includeInactive === 'true';
    return this.tablesService.list(restaurantId, include);
  }

  @Post()
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiCreatedResponse({ type: RestaurantTableResponseDto })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateRestaurantTableDto
  ) {
    return this.tablesService.create(restaurantId, dto);
  }

  @Patch(':tableId')
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
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  async generateQr(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string
  ) {
    return this.tablesService.generateQrCode(restaurantId, tableId);
  }
}
