import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { BranchPermissionsService } from '../users/branch-permissions.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
// Subscription enforcement imports
import { SubscriptionLimitGuard } from '../subscription-plans/guards/subscription-limit.guard';
import { RequireBranchLimit } from '../subscription-plans/decorators/subscription-limit.decorator';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly branchPermissions: BranchPermissionsService,
  ) {}

  @Post()
  @UseGuards(SubscriptionLimitGuard) // Add subscription limit guard
  @RequireBranchLimit() // Require branch limit check
  @Roles(UserRole.Owner, UserRole.Manager)
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create branches' })
  @ApiResponse({ status: 409, description: 'Branch slug already exists' })
  async create(@Request() req: any, @Body() createBranchDto: CreateBranchDto) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to create branches
    const permissions = await this.branchPermissions.getBranchPermissions(user);

    // Only primary owners and users with access to all branches can create new branches
    if (!permissions.canAccessAllBranches) {
      throw new ForbiddenException(
        'Only primary owners and main branch managers can create new branches'
      );
    }

    return this.branchesService.create(user.restaurantId!, createBranchDto);
  }

  @Get()
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen, UserRole.Cashier)
  @ApiOperation({ summary: 'Get all branches accessible to the user' })
  @ApiResponse({ status: 200, description: 'Branches retrieved successfully' })
  async findAll(@Request() req: any) {
    const user = req.user as AuthenticatedUser;

    // Use branch permissions service to get only accessible branches
    return this.branchPermissions.getManageableBranches(user);
  }

  @Get('main')
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen, UserRole.Cashier)
  @ApiOperation({ summary: 'Get the main branch for the restaurant' })
  @ApiResponse({ status: 200, description: 'Main branch retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Main branch not found' })
  async findMainBranch(@Request() req: any) {
    const restaurantId = req.user.restaurantId;
    return this.branchesService.findMainBranch(restaurantId);
  }

  @Get('slug/:slug')
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen, UserRole.Cashier)
  @ApiOperation({ summary: 'Get branch by slug' })
  @ApiResponse({ status: 200, description: 'Branch retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async findBySlug(@Request() req: any, @Param('slug') slug: string) {
    const restaurantId = req.user.restaurantId;
    return this.branchesService.findBySlug(restaurantId, slug);
  }

  @Get('count')
  @Roles(UserRole.Owner, UserRole.Manager)
  @ApiOperation({ summary: 'Get total branch count for the restaurant' })
  @ApiResponse({ status: 200, description: 'Branch count retrieved successfully' })
  async getBranchCount(@Request() req: any) {
    const restaurantId = req.user.restaurantId;
    const count = await this.branchesService.getBranchCount(restaurantId);
    return { count };
  }

  @Get(':id')
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen, UserRole.Cashier)
  @ApiOperation({ summary: 'Get branch by ID' })
  @ApiResponse({ status: 200, description: 'Branch retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId;
    return this.branchesService.findOne(restaurantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.Owner, UserRole.Manager)
  @ApiOperation({ summary: 'Update a branch' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update this branch' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  @ApiResponse({ status: 409, description: 'Branch slug already exists' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to manage this specific branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(id)) {
      throw new ForbiddenException(
        'Insufficient permissions to update this branch'
      );
    }

    return this.branchesService.update(user.restaurantId!, id, updateBranchDto);
  }

  @Delete(':id')
  @Roles(UserRole.Owner, UserRole.Manager)
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({ status: 200, description: 'Branch deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to delete this branch' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete main branch' })
  async remove(@Request() req: any, @Param('id') id: string) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to manage this specific branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(id)) {
      throw new ForbiddenException(
        'Insufficient permissions to delete this branch'
      );
    }

    await this.branchesService.remove(user.restaurantId!, id);
    return { message: 'Branch deleted successfully' };
  }
}