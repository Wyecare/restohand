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
import { CreateMenuItemDto } from './dtos/create-menu-item.dto';
import { MenuItemListResponseDto } from './dtos/menu-item-list-response.dto';
import { MenuItemResponseDto } from './dtos/menu-item-response.dto';
import { QueryMenuItemsDto } from './dtos/query-menu-items.dto';
import { UpdateMenuItemDto } from './dtos/update-menu-item.dto';
import { MenuItemsService } from './menu-items.service';

@ApiTags('menu-items')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('restaurants/:restaurantId/menu/items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({ type: MenuItemResponseDto })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuItemDto
  ) {
    return this.menuItemsService.create(restaurantId, dto);
  }

  @Get()
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'isAvailable', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ type: MenuItemListResponseDto })
  async findAll(
    @Param('restaurantId') restaurantId: string,
    @Query() query: QueryMenuItemsDto
  ) {
    return this.menuItemsService.findAll(restaurantId, query);
  }

  @Get(':itemId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiOkResponse({ type: MenuItemResponseDto })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string
  ) {
    return this.menuItemsService.findOne(restaurantId, itemId);
  }

  @Patch(':itemId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiOkResponse({ type: MenuItemResponseDto })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMenuItemDto
  ) {
    return this.menuItemsService.update(restaurantId, itemId, dto);
  }

  @Delete(':itemId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiOkResponse({ description: 'Menu item deleted' })
  async remove(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string
  ) {
    await this.menuItemsService.remove(restaurantId, itemId);
    return { success: true };
  }
}
