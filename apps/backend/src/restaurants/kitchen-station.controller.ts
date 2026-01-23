import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { KitchenStationService } from './kitchen-station.service';
import {
  CreateKitchenStationDto,
  UpdateKitchenStationDto,
  AssignOrderToStationDto,
} from './dtos/kitchen-station.dto';
import { KitchenStation } from './schemas/kitchen-station.schema';
import { OrderStationAssignment, AssignmentStatus } from '../orders/schemas/order-station-assignment.schema';

@ApiTags('Kitchen Stations')
@Controller('restaurants/:restaurantId/kitchen/stations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('admin', 'manager', 'chef')
export class KitchenStationController {
  constructor(private readonly stationService: KitchenStationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create kitchen station',
    description: 'Create a new kitchen station for order management'
  })
  @ApiResponse({
    status: 201,
    description: 'Kitchen station created successfully',
    type: KitchenStation
  })
  async createStation(
    @Param('restaurantId') restaurantId: string,
    @Body() createStationDto: CreateKitchenStationDto
  ): Promise<KitchenStation> {
    return await this.stationService.createStation(restaurantId, createStationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get kitchen stations',
    description: 'Retrieve all kitchen stations for a restaurant'
  })
  @ApiResponse({
    status: 200,
    description: 'Kitchen stations retrieved successfully',
    type: [KitchenStation]
  })
  async getStations(
    @Param('restaurantId') restaurantId: string,
    @Query('includeInactive') includeInactive?: string
  ): Promise<KitchenStation[]> {
    return await this.stationService.getStations(
      restaurantId,
      includeInactive === 'true'
    );
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get station performance metrics',
    description: 'Retrieve performance metrics for all kitchen stations'
  })
  async getStationMetrics(@Param('restaurantId') restaurantId: string) {
    return await this.stationService.getStationMetrics(restaurantId);
  }

  @Get(':stationId')
  @ApiOperation({
    summary: 'Get kitchen station',
    description: 'Retrieve a specific kitchen station'
  })
  @ApiResponse({
    status: 200,
    description: 'Kitchen station retrieved successfully',
    type: KitchenStation
  })
  async getStation(
    @Param('restaurantId') restaurantId: string,
    @Param('stationId') stationId: string
  ): Promise<KitchenStation> {
    return await this.stationService.getStation(restaurantId, stationId);
  }

  @Put(':stationId')
  @ApiOperation({
    summary: 'Update kitchen station',
    description: 'Update a kitchen station configuration'
  })
  @ApiResponse({
    status: 200,
    description: 'Kitchen station updated successfully',
    type: KitchenStation
  })
  async updateStation(
    @Param('restaurantId') restaurantId: string,
    @Param('stationId') stationId: string,
    @Body() updateStationDto: UpdateKitchenStationDto
  ): Promise<KitchenStation> {
    return await this.stationService.updateStation(restaurantId, stationId, updateStationDto);
  }

  @Delete(':stationId')
  @ApiOperation({
    summary: 'Delete kitchen station',
    description: 'Delete a kitchen station (only if no active assignments)'
  })
  @ApiResponse({
    status: 200,
    description: 'Kitchen station deleted successfully'
  })
  async deleteStation(
    @Param('restaurantId') restaurantId: string,
    @Param('stationId') stationId: string
  ): Promise<{ message: string }> {
    await this.stationService.deleteStation(restaurantId, stationId);
    return { message: 'Station deleted successfully' };
  }

  @Post('assign/:orderId')
  @ApiOperation({
    summary: 'Assign order to station',
    description: 'Assign an order to a specific kitchen station'
  })
  @ApiResponse({
    status: 201,
    description: 'Order assigned to station successfully',
    type: OrderStationAssignment
  })
  async assignOrderToStation(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() assignDto: AssignOrderToStationDto
  ): Promise<OrderStationAssignment> {
    return await this.stationService.assignOrderToStation(restaurantId, orderId, assignDto);
  }

  @Get('assignments')
  @ApiOperation({
    summary: 'Get station assignments',
    description: 'Retrieve order assignments for stations'
  })
  @ApiResponse({
    status: 200,
    description: 'Station assignments retrieved successfully',
    type: [OrderStationAssignment]
  })
  async getStationAssignments(
    @Param('restaurantId') restaurantId: string,
    @Query('stationId') stationId?: string,
    @Query('status') status?: AssignmentStatus
  ): Promise<OrderStationAssignment[]> {
    return await this.stationService.getStationAssignments(restaurantId, stationId, status);
  }

  @Patch('assignments/:assignmentId/status')
  @ApiOperation({
    summary: 'Update assignment status',
    description: 'Update the status of a station assignment'
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment status updated successfully',
    type: OrderStationAssignment
  })
  async updateAssignmentStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('assignmentId') assignmentId: string,
    @Body('status') status: AssignmentStatus
  ): Promise<OrderStationAssignment> {
    return await this.stationService.updateAssignmentStatus(restaurantId, assignmentId, status);
  }
}