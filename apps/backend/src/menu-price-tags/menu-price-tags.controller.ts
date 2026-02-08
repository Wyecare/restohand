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
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BranchPermissionsService } from '../users/branch-permissions.service';
import { CreateMenuPriceTagDto } from './dtos/create-menu-price-tag.dto';
import { UpdateMenuPriceTagDto } from './dtos/update-menu-price-tag.dto';
import { QueryMenuPriceTagsDto } from './dtos/query-menu-price-tags.dto';
import { ActivatePriceTagDto } from './dtos/activate-price-tag.dto';
import { MenuPriceTagResponseDto } from './dtos/menu-price-tag-response.dto';
import { MenuPriceTagListResponseDto } from './dtos/menu-price-tag-list-response.dto';
import { MenuPriceTagsService } from './menu-price-tags.service';

@ApiTags('menu-price-tags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('restaurants/:restaurantId/menu/price-tags')
export class MenuPriceTagsController {
  constructor(
    private readonly menuPriceTagsService: MenuPriceTagsService,
    private readonly branchPermissions: BranchPermissionsService,
  ) {}

  @Get('branch/:branchId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiOkResponse({ type: MenuPriceTagListResponseDto })
  async findByBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Query() query: QueryMenuPriceTagsDto,
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch price tags');
    }

    return this.menuPriceTagsService.findByBranch(restaurantId, branchId, query);
  }

  @Post('branch/:branchId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiCreatedResponse({ type: MenuPriceTagResponseDto })
  async createForBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Body() dto: CreateMenuPriceTagDto
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to manage this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to create price tags for this branch');
    }

    return this.menuPriceTagsService.createForBranch(restaurantId, branchId, dto);
  }

  @Get(':priceTagId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'priceTagId' })
  @ApiOkResponse({ type: MenuPriceTagResponseDto })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('priceTagId') priceTagId: string
  ) {
    return this.menuPriceTagsService.findOne(restaurantId, priceTagId);
  }

  @Patch(':priceTagId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'priceTagId' })
  @ApiOkResponse({ type: MenuPriceTagResponseDto })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('priceTagId') priceTagId: string,
    @Body() dto: UpdateMenuPriceTagDto
  ) {
    return this.menuPriceTagsService.update(restaurantId, priceTagId, dto);
  }

  @Delete(':priceTagId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'priceTagId' })
  @ApiOkResponse({ description: 'Price tag deleted successfully' })
  async remove(
    @Param('restaurantId') restaurantId: string,
    @Param('priceTagId') priceTagId: string
  ) {
    await this.menuPriceTagsService.remove(restaurantId, priceTagId);
    return { success: true };
  }

  @Post('branch/:branchId/:priceTagId/activate')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiParam({ name: 'priceTagId' })
  @ApiOkResponse({ type: MenuPriceTagResponseDto })
  async activatePriceTag(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Param('priceTagId') priceTagId: string,
    @Body() dto: ActivatePriceTagDto
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to manage this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to activate price tags for this branch');
    }

    return this.menuPriceTagsService.activatePriceTag(
      restaurantId,
      branchId,
      priceTagId,
      dto,
      user.id
    );
  }

  @Get('branch/:branchId/active')
  @Roles(UserRole.Manager, UserRole.Waiter) // Waiters need to see active pricing
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiOkResponse({ type: MenuPriceTagResponseDto })
  async getActivePriceTag(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch pricing');
    }

    const activeTag = await this.menuPriceTagsService.getActivePriceTag(restaurantId, branchId);
    if (!activeTag) {
      return { message: 'No active price tag found for this branch' };
    }

    return activeTag;
  }

  @Get('menu-item/:menuItemId/price')
  @Roles(UserRole.Manager, UserRole.Waiter) // Waiters need pricing for orders
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'menuItemId' })
  @ApiQuery({ name: 'priceTagId', required: false })
  @ApiOkResponse({
    description: 'Item pricing information',
    schema: {
      type: 'object',
      properties: {
        originalPrice: { type: 'number' },
        currentPrice: { type: 'number' },
        discountAmount: { type: 'number' },
        priceTag: { $ref: '#/components/schemas/MenuPriceTagResponseDto' },
      },
    },
  })
  async getItemPrice(
    @Param('menuItemId') menuItemId: string,
    @Query('priceTagId') priceTagId?: string
  ) {
    return this.menuPriceTagsService.getItemPrice(menuItemId, priceTagId);
  }
}