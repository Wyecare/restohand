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
import { CreateMenuModifierDto } from './dtos/create-menu-modifier.dto';
import { UpdateMenuModifierDto } from './dtos/update-menu-modifier.dto';
import { QueryMenuModifiersDto } from './dtos/query-menu-modifiers.dto';
import { MenuModifierResponseDto } from './dtos/menu-modifier-response.dto';
import { MenuModifierListResponseDto } from './dtos/menu-modifier-list-response.dto';
import { MenuModifiersService } from './menu-modifiers.service';

@ApiTags('menu-modifiers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('restaurants/:restaurantId/menu/modifiers')
export class MenuModifiersController {
  constructor(
    private readonly menuModifiersService: MenuModifiersService,
    private readonly branchPermissions: BranchPermissionsService,
  ) {}

  @Get('branch/:branchId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiOkResponse({ type: MenuModifierListResponseDto })
  async findByBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Query() query: QueryMenuModifiersDto,
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch modifiers');
    }

    return this.menuModifiersService.findByBranch(restaurantId, branchId, query);
  }

  @Post('branch/:branchId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiCreatedResponse({ type: MenuModifierResponseDto })
  async createForBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Body() dto: CreateMenuModifierDto
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to manage this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to create modifiers for this branch');
    }

    return this.menuModifiersService.createForBranch(restaurantId, branchId, dto);
  }

  @Get(':modifierId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'modifierId' })
  @ApiOkResponse({ type: MenuModifierResponseDto })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('modifierId') modifierId: string
  ) {
    return this.menuModifiersService.findOne(restaurantId, modifierId);
  }

  @Patch(':modifierId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'modifierId' })
  @ApiOkResponse({ type: MenuModifierResponseDto })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('modifierId') modifierId: string,
    @Body() dto: UpdateMenuModifierDto
  ) {
    return this.menuModifiersService.update(restaurantId, modifierId, dto);
  }

  @Delete(':modifierId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'modifierId' })
  @ApiOkResponse({ description: 'Modifier deleted successfully' })
  async remove(
    @Param('restaurantId') restaurantId: string,
    @Param('modifierId') modifierId: string
  ) {
    await this.menuModifiersService.remove(restaurantId, modifierId);
    return { success: true };
  }

  @Get('menu-item/:menuItemId')
  @Roles(UserRole.Manager, UserRole.Waiter) // Waiters can view modifiers
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'menuItemId' })
  @ApiOkResponse({ type: [MenuModifierResponseDto] })
  async getModifiersForMenuItem(
    @Param('restaurantId') restaurantId: string,
    @Param('menuItemId') menuItemId: string
  ) {
    return this.menuModifiersService.getModifiersForMenuItem(restaurantId, menuItemId);
  }

  @Post(':modifierId/validate-selections')
  @Roles(UserRole.Manager, UserRole.Waiter) // Waiters need this for order taking
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'modifierId' })
  @ApiOkResponse({
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        error: { type: 'string' },
        totalPriceAdjustment: { type: 'number' },
      },
    },
  })
  async validateModifierSelections(
    @Param('modifierId') modifierId: string,
    @Body() body: { selectedOptions: string[] }
  ) {
    return this.menuModifiersService.validateModifierSelections(
      modifierId,
      body.selectedOptions
    );
  }
}