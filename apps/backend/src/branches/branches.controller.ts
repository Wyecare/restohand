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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(UserRole.Owner, UserRole.Manager)
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Branch slug already exists' })
  async create(@Request() req: any, @Body() createBranchDto: CreateBranchDto) {
    const restaurantId = req.user.restaurantId;
    return this.branchesService.create(restaurantId, createBranchDto);
  }

  @Get()
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen, UserRole.Cashier)
  @ApiOperation({ summary: 'Get all branches for the restaurant' })
  @ApiResponse({ status: 200, description: 'Branches retrieved successfully' })
  async findAll(@Request() req: any) {
    const restaurantId = req.user.restaurantId;
    return this.branchesService.findAllByRestaurant(restaurantId);
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
  @ApiResponse({ status: 404, description: 'Branch not found' })
  @ApiResponse({ status: 409, description: 'Branch slug already exists' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.branchesService.update(restaurantId, id, updateBranchDto);
  }

  @Delete(':id')
  @Roles(UserRole.Owner, UserRole.Manager)
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({ status: 200, description: 'Branch deleted successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete main branch' })
  async remove(@Request() req: any, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId;
    await this.branchesService.remove(restaurantId, id);
    return { message: 'Branch deleted successfully' };
  }
}