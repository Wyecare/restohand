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
  ForbiddenException,
  BadRequestException,
  Request,
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
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BranchPermissionsService } from '../users/branch-permissions.service';
import { CreateMenuCategoryDto } from './dtos/create-menu-category.dto';
import { MenuCategoryListResponseDto } from './dtos/menu-category-list-response.dto';
import { MenuCategoryResponseDto } from './dtos/menu-category-response.dto';
import { QueryMenuCategoriesDto } from './dtos/query-menu-categories.dto';
import { UpdateMenuCategoryDto } from './dtos/update-menu-category.dto';
import { MenuCategoriesService } from './menu-categories.service';

@ApiTags('menu-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('restaurants/:restaurantId/menu/categories')
export class MenuCategoriesController {
  constructor(
    private readonly menuCategoriesService: MenuCategoriesService,
    private readonly branchPermissions: BranchPermissionsService,
  ) {}

  @Post()
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({ type: MenuCategoryResponseDto })
  async create(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuCategoryDto
  ) {
    const user = req.user as AuthenticatedUser;

    // Get user's manageable branches to determine which branch to assign
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    const manageableBranchesData = await this.branchPermissions.getManageableBranches(user);
    const manageableBranches = manageableBranchesData.map(branch => branch._id.toString());

    // For both main managers and branch managers, use the first available branch
    let branchId: string;

    if (manageableBranches.length > 0) {
      // Use the first manageable branch
      branchId = manageableBranches[0];
    } else {
      throw new ForbiddenException('No manageable branches found');
    }

    return this.menuCategoriesService.createForBranch(restaurantId, branchId, dto);
  }

  @Get()
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({ type: MenuCategoryListResponseDto })
  async findAll(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Query() query: QueryMenuCategoriesDto,
  ) {
    const user = req.user as AuthenticatedUser;

    // Get user's manageable branches
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    const manageableBranchesData = await this.branchPermissions.getManageableBranches(user);
    const manageableBranches = manageableBranchesData.map(branch => branch._id.toString());

    if (permissions.canAccessAllBranches()) {
      // Main manager - return categories from all branches they can manage
      return this.menuCategoriesService.findAllByBranches(restaurantId, manageableBranches, query);
    } else if (manageableBranches.length > 0) {
      // Branch manager - return categories from their assigned branch
      return this.menuCategoriesService.findByBranch(restaurantId, manageableBranches[0], query);
    } else {
      throw new ForbiddenException('No manageable branches found');
    }
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

  // Branch-aware endpoints
  @Get('branch/:branchId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiOkResponse({ type: MenuCategoryListResponseDto })
  async findByBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Query() query: QueryMenuCategoriesDto,
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch categories');
    }

    return this.menuCategoriesService.findByBranch(restaurantId, branchId, query);
  }

  @Post('branch/:branchId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiCreatedResponse({ type: MenuCategoryResponseDto })
  async createForBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Body() dto: CreateMenuCategoryDto
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to manage this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to create categories for this branch');
    }

    return this.menuCategoriesService.createForBranch(restaurantId, branchId, dto);
  }
}
