import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrderModificationService } from './order-modification.service';
import {
  CreateOrderModificationDto,
  ProcessOrderModificationDto,
  OrderModificationQueryDto
} from './dtos/order-modification.dto';
import { OrderModification } from './schemas/order-modification.schema';

@ApiTags('Order Modifications')
@Controller('restaurants/:restaurantId/orders/modifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderModificationController {
  constructor(private readonly modificationService: OrderModificationService) {}

  @Post()
  @ApiOperation({
    summary: 'Request order modification',
    description: 'Create a new order modification request. Can be used by customers or staff.'
  })
  @ApiResponse({
    status: 201,
    description: 'Order modification request created successfully',
    type: OrderModification
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Order cannot be modified' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createModification(
    @Param('restaurantId') restaurantId: string,
    @Body() createModificationDto: CreateOrderModificationDto,
    @Request() req: any
  ): Promise<OrderModification> {
    return await this.modificationService.createModification(
      restaurantId,
      createModificationDto,
      req.user?.uid
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'waiter', 'chef')
  @ApiOperation({
    summary: 'Get order modifications',
    description: 'Retrieve order modifications for a restaurant with optional filtering'
  })
  @ApiResponse({
    status: 200,
    description: 'Order modifications retrieved successfully',
    type: [OrderModification]
  })
  async getModifications(
    @Param('restaurantId') restaurantId: string,
    @Query() query: OrderModificationQueryDto
  ): Promise<OrderModification[]> {
    return await this.modificationService.getModifications(restaurantId, query);
  }

  @Get('order/:orderId')
  @ApiOperation({
    summary: 'Get modifications for specific order',
    description: 'Retrieve all modifications for a specific order'
  })
  @ApiResponse({
    status: 200,
    description: 'Order modifications retrieved successfully',
    type: [OrderModification]
  })
  async getOrderModifications(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ): Promise<OrderModification[]> {
    return await this.modificationService.getOrderModifications(restaurantId, orderId);
  }

  @Get('order/:orderId/pending')
  @ApiOperation({
    summary: 'Check for pending modifications',
    description: 'Check if an order has any pending modifications'
  })
  @ApiResponse({
    status: 200,
    description: 'Pending status retrieved successfully'
  })
  async checkPendingModifications(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ): Promise<{ hasPending: boolean }> {
    const hasPending = await this.modificationService.hasPendingModifications(restaurantId, orderId);
    return { hasPending };
  }

  @Patch(':modificationId/process')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'chef')
  @ApiOperation({
    summary: 'Process order modification',
    description: 'Approve, reject, or mark modification as applied. Restricted to staff.'
  })
  @ApiResponse({
    status: 200,
    description: 'Order modification processed successfully',
    type: OrderModification
  })
  @ApiResponse({ status: 404, description: 'Modification not found' })
  async processModification(
    @Param('restaurantId') restaurantId: string,
    @Param('modificationId') modificationId: string,
    @Body() processDto: ProcessOrderModificationDto,
    @Request() req: any
  ): Promise<OrderModification> {
    return await this.modificationService.processModification(
      restaurantId,
      modificationId,
      processDto,
      req.user?.uid
    );
  }
}