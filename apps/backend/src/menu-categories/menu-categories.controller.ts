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
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateMenuCategoryDto } from './dtos/create-menu-category.dto';
import { MenuCategoryListResponseDto } from './dtos/menu-category-list-response.dto';
import { MenuCategoryResponseDto } from './dtos/menu-category-response.dto';
import { QueryMenuCategoriesDto } from './dtos/query-menu-categories.dto';
import { UpdateMenuCategoryDto } from './dtos/update-menu-category.dto';
import { MenuCategoriesService } from './menu-categories.service';

@ApiTags('menu-categories')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('restaurants/:restaurantId/menu/categories')
export class MenuCategoriesController {
  constructor(private readonly menuCategoriesService: MenuCategoriesService) {}

  @Post()
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({ type: MenuCategoryResponseDto })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuCategoryDto
  ) {
    return this.menuCategoriesService.create(restaurantId, dto);
  }

  @Get()
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({ type: MenuCategoryListResponseDto })
  async findAll(
    @Param('restaurantId') restaurantId: string,
    @Query() query: QueryMenuCategoriesDto,
  ) {
    return this.menuCategoriesService.findAll(restaurantId, query);
  }

  @Patch(':categoryId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'categoryId' })
  @ApiOkResponse({ type: MenuCategoryResponseDto })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateMenuCategoryDto
  ) {
    return this.menuCategoriesService.update(restaurantId, categoryId, dto);
  }

  @Delete(':categoryId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'categoryId' })
  @ApiOkResponse({ description: 'Category deleted' })
  async remove(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string
  ) {
    await this.menuCategoriesService.remove(restaurantId, categoryId);
    return { success: true };
  }
}
