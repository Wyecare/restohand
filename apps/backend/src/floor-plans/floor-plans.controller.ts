import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FloorPlansService } from './floor-plans.service';
import { CreateFloorPlanDto } from './dtos/create-floor-plan.dto';
import { UpdateFloorPlanDto } from './dtos/update-floor-plan.dto';
import {
  UpdateTableStatusDto,
  CreateReservationDto,
  FloorPlanStatusOverviewDto,
  TableStatusResponseDto,
} from './dtos/table-status.dto';
import {
  FloorPlanResponseDto,
  FloorPlanListResponseDto,
} from './dtos/floor-plan-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('floor-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/floor-plans')
export class FloorPlansController {
  constructor(private readonly floorPlansService: FloorPlansService) {}

  @Post()
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Create a new floor plan' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: HttpStatus.CREATED, type: FloorPlanResponseDto })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() createFloorPlanDto: CreateFloorPlanDto,
    @Req() req: Request,
  ): Promise<FloorPlanResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.floorPlansService.create(restaurantId, createFloorPlanDto, user);
  }

  @Get()
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Get all floor plans for restaurant' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: FloorPlanListResponseDto })
  async findAll(
    @Param('restaurantId') restaurantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<FloorPlanListResponseDto> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const result = await this.floorPlansService.findAllByRestaurant(restaurantId, pageNum, limitNum);

    return {
      ...result,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('active')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Get active floor plan for restaurant' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: HttpStatus.OK, type: FloorPlanResponseDto })
  async findActive(
    @Param('restaurantId') restaurantId: string,
  ): Promise<FloorPlanResponseDto | null> {
    return this.floorPlansService.findActiveByRestaurant(restaurantId);
  }

  @Get('overview')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Get floor plan status overview' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: HttpStatus.OK, type: FloorPlanStatusOverviewDto })
  async getOverview(
    @Param('restaurantId') restaurantId: string,
  ): Promise<FloorPlanStatusOverviewDto> {
    return this.floorPlansService.getFloorPlanOverview(restaurantId);
  }

  @Get(':id')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Get floor plan by ID' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: FloorPlanResponseDto })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ): Promise<FloorPlanResponseDto> {
    return this.floorPlansService.findById(id, restaurantId);
  }

  @Patch(':id')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Update floor plan' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: FloorPlanResponseDto })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() updateFloorPlanDto: UpdateFloorPlanDto,
    @Req() req: Request,
  ): Promise<FloorPlanResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.floorPlansService.update(id, restaurantId, updateFloorPlanDto, user);
  }

  @Patch(':id/activate')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Set floor plan as active' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: FloorPlanResponseDto })
  async setActive(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ): Promise<FloorPlanResponseDto> {
    return this.floorPlansService.setActive(id, restaurantId);
  }

  @Delete(':id')
  @Roles(UserRole.Manager)
  @ApiOperation({ summary: 'Delete floor plan' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.floorPlansService.remove(id, restaurantId);
  }

  // Table Status endpoints
  @Get('tables/status')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Get all table statuses' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'date', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: [TableStatusResponseDto] })
  async getTableStatuses(
    @Param('restaurantId') restaurantId: string,
    @Query('date') date?: string,
  ): Promise<TableStatusResponseDto[]> {
    const queryDate = date ? new Date(date) : undefined;
    return this.floorPlansService.getTableStatuses(restaurantId, queryDate);
  }

  @Get('tables/:tableId/status')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Get specific table status' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'tableId' })
  @ApiResponse({ status: HttpStatus.OK, type: TableStatusResponseDto })
  async getTableStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
  ): Promise<TableStatusResponseDto | null> {
    return this.floorPlansService.getTableStatus(restaurantId, tableId);
  }

  @Patch('tables/:tableId/status')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiOperation({ summary: 'Update table status' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'tableId' })
  @ApiResponse({ status: HttpStatus.OK, type: TableStatusResponseDto })
  async updateTableStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body() updateTableStatusDto: UpdateTableStatusDto,
    @Req() req: Request,
  ): Promise<TableStatusResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.floorPlansService.updateTableStatus(restaurantId, tableId, updateTableStatusDto, user);
  }

  @Post('tables/:tableId/reservation')
  @Roles(UserRole.Manager, UserRole.Waiter)
  @ApiOperation({ summary: 'Create table reservation' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'tableId' })
  @ApiResponse({ status: HttpStatus.CREATED, type: TableStatusResponseDto })
  async createReservation(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body() createReservationDto: CreateReservationDto,
    @Req() req: Request,
  ): Promise<TableStatusResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.floorPlansService.createReservation(restaurantId, tableId, createReservationDto, user);
  }
}