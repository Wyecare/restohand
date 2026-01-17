import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { EnhancedMenuCategoriesService } from './enhanced-menu-categories.service';
import { EnhancedCreateCategoryDto } from './dtos/enhanced-create-category.dto';

@ApiTags('Enhanced Menu Categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/enhanced-menu-categories')
export class EnhancedMenuCategoriesController {
  constructor(private readonly categoriesService: EnhancedMenuCategoriesService) {}

  @Post()
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOperation({ summary: 'Create a new menu category' })
  @ApiCreatedResponse({ description: 'Category created successfully' })
  async createCategory(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: EnhancedCreateCategoryDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    return this.categoriesService.create(restaurantId, dto);
  }

  @Post('upload-image')
  @Roles(UserRole.Manager)
  @UseInterceptors(FileInterceptor('file'))
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOperation({ summary: 'Upload category image' })
  @ApiConsumes('multipart/form-data')
  async uploadCategoryImage(
    @Param('restaurantId') restaurantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.categoriesService.uploadImage(restaurantId, file);
  }

  @Get()
  @Roles(UserRole.Manager, UserRole.Cashier, UserRole.Waiter, UserRole.Chef)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOperation({ summary: 'Get all menu categories for a restaurant' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'source', required: false, description: 'Filter by data source' })
  @ApiOkResponse({ description: 'Categories retrieved successfully' })
  async getCategories(
    @Param('restaurantId') restaurantId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    return this.categoriesService.findAll(restaurantId, {
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      source,
    });
  }

  @Get(':id')
  @Roles(UserRole.Manager, UserRole.Cashier, UserRole.Waiter, UserRole.Chef)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiOperation({ summary: 'Get a specific category' })
  @ApiOkResponse({ description: 'Category retrieved successfully' })
  async getCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    return this.categoriesService.findById(id, restaurantId);
  }

  @Patch(':id')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ description: 'Category updated successfully' })
  async updateCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<EnhancedCreateCategoryDto>,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    return this.categoriesService.update(id, restaurantId, dto);
  }

  @Patch(':id/toggle-availability')
  @Roles(UserRole.Manager, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiOperation({ summary: 'Toggle category availability' })
  @ApiOkResponse({ description: 'Category availability toggled successfully' })
  async toggleAvailability(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    return this.categoriesService.toggleAvailability(id, restaurantId);
  }

  @Patch(':id/toggle-block')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiOperation({ summary: 'Toggle category block status' })
  @ApiOkResponse({ description: 'Category block status toggled successfully' })
  async toggleBlock(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    return this.categoriesService.toggleBlock(id, restaurantId);
  }

  @Post('reorder')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOperation({ summary: 'Reorder categories' })
  @ApiOkResponse({ description: 'Categories reordered successfully' })
  async reorderCategories(
    @Param('restaurantId') restaurantId: string,
    @Body() body: { categoryIds: string[] },
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    return this.categoriesService.reorderCategories(restaurantId, body.categoryIds);
  }

  @Delete(':id')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiOperation({ summary: 'Delete a category' })
  @ApiOkResponse({ description: 'Category deleted successfully' })
  async deleteCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    return this.categoriesService.delete(id, restaurantId);
  }

  // Bulk operations for PDF extraction and import
  @Post('bulk-create')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOperation({ summary: 'Bulk create categories (for PDF extraction/import)' })
  @ApiOkResponse({ description: 'Categories created in bulk successfully' })
  async bulkCreateCategories(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: { categories: EnhancedCreateCategoryDto[] },
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new BadRequestException('Unauthorized access to restaurant categories');
    }

    return this.categoriesService.bulkCreate(restaurantId, dto.categories);
  }
}