import {
  Body,
  Controller,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderListResponseDto } from './dtos/order-list-response.dto';
import { OrderResponseDto } from './dtos/order-response.dto';
import { QueryOrdersDto } from './dtos/query-orders.dto';
import { UpdateOrderPaymentDto } from './dtos/update-order-payment.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('restaurants/:restaurantId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateOrderDto
  ) {
    return this.ordersService.create(restaurantId, dto);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ type: OrderListResponseDto })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  async findAll(
    @Param('restaurantId') restaurantId: string,
    @Query() query: QueryOrdersDto
  ) {
    return this.ordersService.findAll(restaurantId, query);
  }

  @Get(':orderId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ type: OrderResponseDto })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ) {
    return this.ordersService.findOne(restaurantId, orderId);
  }

  @Patch(':orderId/status')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ type: OrderResponseDto })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter)
  async updateStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.ordersService.updateStatus(restaurantId, orderId, dto);
  }

  @Patch(':orderId/payment')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ type: OrderResponseDto })
  @Roles(UserRole.Manager, UserRole.Cashier)
  async updatePayment(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderPaymentDto
  ) {
    return this.ordersService.updatePayment(restaurantId, orderId, dto);
  }
}
