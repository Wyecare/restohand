import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateOrderDto } from './dtos/create-order.dto';
import { CreateOrderWithPaymentDto } from './dtos/create-order-with-payment.dto';
import { AddItemsToOrderDto } from './dtos/add-items-to-order.dto';
import { CalculateCartTotalDto } from './dtos/calculate-cart-total.dto';
import { VerifyPaymentDto } from './dtos/verify-payment.dto';
import { OrderListResponseDto } from './dtos/order-list-response.dto';
import { OrderResponseDto } from './dtos/order-response.dto';
import { OrderEventResponseDto } from './dtos/order-event-response.dto';
import { QueryOrdersDto } from './dtos/query-orders.dto';
import { UpdateOrderPaymentDto } from './dtos/update-order-payment.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { OrdersService } from './orders.service';
import { RazorpayService } from '../payments/razorpay.service';
import { RestaurantOnboardingService } from '../restaurants/restaurant-onboarding.service';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { InjectModel } from '@nestjs/mongoose';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import {
  RestaurantTable,
  RestaurantTableDocument,
} from '../restaurant-tables/schemas/restaurant-table.schema';
import {
  MenuItem,
  MenuItemDocument,
} from '../menu-items/schemas/menu-item.schema';
import { Model } from 'mongoose';
import { CustomerSessionsService } from '../customer-sessions/customer-sessions.service';

@ApiTags('orders')
@Controller('restaurants/:restaurantId/orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly razorpayService: RazorpayService,
    private readonly restaurantOnboardingService: RestaurantOnboardingService,
    private readonly customerSessionsService: CustomerSessionsService,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(RestaurantTable.name)
    private readonly tableModel: Model<RestaurantTableDocument>,
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>
  ) {}

  // CRITICAL FIX: Helper methods for branch isolation
  private async getBranchIdFromTable(
    restaurantId: string,
    tableNumber: string
  ): Promise<string | undefined> {
    const table = await this.tableModel
      .findOne({
        restaurantId,
        tableNumber: tableNumber.trim(),
        isActive: true,
      })
      .lean();

    return table?.branchId?.toString();
  }

  private async validateItemsBelongToBranch(
    restaurantId: string,
    itemIds: string[],
    branchId: string
  ): Promise<boolean> {
    if (!branchId || itemIds.length === 0) return true;

    const items = await this.menuItemModel
      .find({
        _id: { $in: itemIds },
        restaurantId,
        branchId,
        isAvailable: true,
      })
      .lean();

    return items.length === itemIds.length;
  }

  @Post()
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateOrderDto,
    @Req() req?: Request
  ) {
    // Debug logging
    this.logger.log(`🎯 DEBUG: Order creation request received`, {
      restaurantId,
      customerSessionId: dto.customerSessionId,
      sessionId: dto.sessionId,
      tableId: dto.tableId,
      tableNumber: dto.tableNumber,
      hasCustomerSessionId: !!dto.customerSessionId,
    });

    // Default to pending payment for new order-first flow
    const orderDto = {
      ...dto,
      paymentMethod: dto.paymentMethod || 'pending',
    };

    this.logger.log(`📋 DEBUG: Processed order DTO`, {
      customerSessionId: orderDto.customerSessionId,
      sessionId: orderDto.sessionId,
      hasCustomerSessionId: !!orderDto.customerSessionId,
    });

    // Extract branchId if user is authenticated, otherwise get it from table
    const user = req?.user as AuthenticatedUser | undefined;
    let branchId = user?.branchId;

    // CRITICAL FIX: Get branchId from table using tableId (preferred) or tableNumber (fallback)
    if (!branchId) {
      let table = null;

      // Prefer tableId lookup (globally unique)
      if (orderDto.tableId) {
        table = await this.tableModel
          .findOne({
            _id: orderDto.tableId,
            isActive: true,
          })
          .lean();
      }
      // Fallback to tableNumber lookup (needs restaurant scope)
      else if (orderDto.tableNumber) {
        table = await this.tableModel
          .findOne({
            restaurantId,
            tableNumber: orderDto.tableNumber.trim(),
            isActive: true,
          })
          .lean();
      }

      if (table) {
        branchId = table.branchId?.toString();
        // Ensure both tableId and tableNumber are set
        orderDto.tableId = table._id.toString();
        orderDto.tableNumber = table.tableNumber;
      }
    }

    const createdOrder = await this.ordersService.create(restaurantId, orderDto, branchId);

    this.logger.log(`🎉 DEBUG: Order created successfully`, {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      customerSessionId: createdOrder.customerSessionId,
      hasCustomerSessionId: !!createdOrder.customerSessionId,
      tableId: createdOrder.tableId,
    });

    return createdOrder;
  }

  @Post(':orderId/add-items')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  async addItemsToOrder(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: AddItemsToOrderDto
  ) {
    return this.ordersService.addItemsToOrder(restaurantId, orderId, dto);
  }

  @Get('branch/:branchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @ApiQuery({ name: 'tableNumber', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ type: OrderListResponseDto })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  async findByBranch(
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Query() query: QueryOrdersDto
  ) {
    return this.ordersService.findAll(restaurantId, query, branchId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
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
    @Query() query: QueryOrdersDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.ordersService.findAll(restaurantId, query, user.branchId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by order number, customer name, or table number' })
  @ApiQuery({ name: 'tableNumber', required: false, description: 'Filter by table number' })
  @ApiOkResponse({
    description: 'Order history with session information',
    schema: {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              orderNumber: { type: 'string' },
              tableNumber: { type: 'string' },
              customerName: { type: 'string' },
              totalAmount: { type: 'number' },
              paymentStatus: { type: 'string' },
              paymentMethod: { type: 'string' },
              createdAt: { type: 'string' },
              paidAt: { type: 'string' },
              sessionInfo: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string' },
                  isArchived: { type: 'boolean' },
                  sessionStarted: { type: 'string' },
                  sessionCompleted: { type: 'string' },
                  totalSessionAmount: { type: 'number' },
                  orderCount: { type: 'number' }
                }
              }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' }
          }
        }
      }
    }
  })
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  async getOrderHistory(
    @Param('restaurantId') restaurantId: string,
    @Query() query: {
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
      search?: string;
      tableNumber?: string;
    },
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.ordersService.getOrderHistory(restaurantId, query, user.branchId);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
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

  @Post(':orderId/payment-link')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  async createPaymentLink(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ) {
    if (!this.razorpayService.isEnabled()) {
      throw new BadRequestException('Online payments are not configured');
    }

    const order = await this.ordersService.findOne(restaurantId, orderId);
    const restaurant = await this.restaurantModel.findById(restaurantId);

    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Order already paid');
    }

    const amountInPaise = Math.round(order.totalAmount * 100);
    if (amountInPaise <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    // Create proper Razorpay order for standard checkout
    const razorpayOrder = await this.razorpayService.createOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `order_${order.orderNumber}`,
      notes: {
        restaurantId,
        orderId,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber || '',
      },
    });

    // Register payment intent for tracking
    await this.ordersService.registerPaymentIntent(
      restaurantId,
      orderId,
      'razorpay',
      razorpayOrder.id,
      {
        orderNumber: order.orderNumber,
        amount: amountInPaise,
        currency: 'INR',
        razorpayOrderId: razorpayOrder.id,
      }
    );

    return {
      razorpayKey: this.razorpayService.publicKey,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      restaurant: {
        name: restaurant?.name || 'Restaurant',
        id: restaurantId,
      },
    };
  }

  @Post(':orderId/payment-intent')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  async createPaymentIntent(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ) {
    if (!this.razorpayService.isEnabled() || !this.razorpayService.publicKey) {
      throw new BadRequestException('Online payments are not configured');
    }

    const order = await this.ordersService.findOne(restaurantId, orderId);

    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Order already paid');
    }

    const amountInPaise = Math.round(order.totalAmount * 100);
    if (amountInPaise <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    // Check if restaurant has linked account for direct settlement
    const canReceivePayments =
      await this.restaurantOnboardingService.canReceivePayments(restaurantId);
    const linkedAccountId =
      await this.restaurantOnboardingService.getLinkedAccountId(restaurantId);

    let razorpayOrder: any;

    if (canReceivePayments && linkedAccountId) {
      // Direct settlement - 100% to restaurant (Pure SaaS model)
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_${order.orderNumber}`,
        notes: {
          restaurantId,
          orderId,
          settlementType: 'direct',
        },
        transfers: [
          {
            account: linkedAccountId,
            amount: amountInPaise, // 100% to restaurant
            currency: 'INR',
            notes: {
              orderId,
              orderNumber: order.orderNumber,
            },
          },
        ],
      });

      this.logger.log(
        `Created payment intent with direct settlement for order ${orderId}. Restaurant gets ₹${
          amountInPaise / 100
        } (100%)`
      );
    } else {
      // Fallback: Traditional payment (money comes to our account first)
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_${order.orderNumber}`,
        notes: {
          restaurantId,
          orderId,
          settlementType: 'traditional',
        },
      });

      this.logger.warn(
        `Restaurant ${restaurantId} doesn't have direct settlement enabled. Using traditional payment flow.`
      );
    }

    await this.ordersService.registerPaymentIntent(
      restaurantId,
      orderId,
      'razorpay',
      razorpayOrder.id,
      {
        orderNumber: order.orderNumber,
        amount: amountInPaise,
        currency: razorpayOrder.currency,
        settlementType: canReceivePayments ? 'direct' : 'traditional',
        linkedAccountId,
        createdAt: new Date().toISOString(),
      }
    );

    return {
      razorpayKey: this.razorpayService.publicKey,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      restaurant: {
        id: restaurantId,
      },
      settlementType: canReceivePayments ? 'direct' : 'traditional',
    };
  }

  @Post(':orderId/upi-intent')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiCreatedResponse({
    description: 'UPI intent created successfully',
    schema: {
      properties: {
        upiIntent: { type: 'string' },
        razorpayOrderId: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        settlementType: { type: 'string' },
      },
    },
  })
  async createUpiIntent(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ) {
    if (!this.razorpayService.isEnabled() || !this.razorpayService.publicKey) {
      throw new BadRequestException('Online payments are not configured');
    }

    const order = await this.ordersService.findOne(restaurantId, orderId);

    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Order already paid');
    }

    const amountInPaise = Math.round(order.totalAmount * 100);
    if (amountInPaise <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    // Check if restaurant has linked account for direct settlement
    const canReceivePayments =
      await this.restaurantOnboardingService.canReceivePayments(restaurantId);
    const linkedAccountId =
      await this.restaurantOnboardingService.getLinkedAccountId(restaurantId);

    let razorpayOrder: any;

    if (canReceivePayments && linkedAccountId) {
      // Direct settlement - 100% to restaurant (Pure SaaS model)
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_${order.orderNumber}`,
        notes: {
          restaurantId,
          orderId,
          settlementType: 'direct',
        },
        transfers: [
          {
            account: linkedAccountId,
            amount: amountInPaise, // 100% to restaurant
            currency: 'INR',
            notes: {
              orderId,
              orderNumber: order.orderNumber,
            },
          },
        ],
      });

      this.logger.log(
        `Created UPI intent with direct settlement for order ${orderId}. Restaurant gets ₹${
          amountInPaise / 100
        } (100%)`
      );
    } else {
      // Traditional payment flow
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_${order.orderNumber}`,
        notes: {
          restaurantId,
          orderId,
          settlementType: 'traditional',
        },
      });

      this.logger.warn(
        `Restaurant ${restaurantId} doesn't have direct settlement enabled. Using traditional payment flow for UPI intent.`
      );
    }

    // Generate UPI intent URL
    const restaurant = await this.restaurantModel.findById(restaurantId);
    const merchantVPA = restaurant?.upi?.vpa || 'restohand@paytm'; // Fallback VPA
    const merchantName =
      restaurant?.upi?.displayName || restaurant?.name || 'RestoHand';

    const upiIntent = `upi://pay?pa=${merchantVPA}&pn=${encodeURIComponent(
      merchantName
    )}&am=${(amountInPaise / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(
      `Order ${order.orderNumber}`
    )}&tr=${razorpayOrder.id}`;

    await this.ordersService.registerPaymentIntent(
      restaurantId,
      orderId,
      'razorpay_upi',
      razorpayOrder.id,
      {
        orderNumber: order.orderNumber,
        amount: amountInPaise,
        currency: razorpayOrder.currency,
        settlementType: canReceivePayments ? 'direct' : 'traditional',
        linkedAccountId,
        upiIntent,
        createdAt: new Date().toISOString(),
      }
    );

    return {
      upiIntent,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      settlementType: canReceivePayments ? 'direct' : 'traditional',
    };
  }

  @Patch(':orderId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ type: OrderResponseDto })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter)
  async updateStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    if (!restaurantId || !orderId) {
      throw new BadRequestException('Restaurant ID and Order ID are required');
    }
    return this.ordersService.updateStatus(restaurantId, orderId, dto);
  }

  @Patch(':orderId/payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ type: OrderResponseDto })
  @Roles(UserRole.Manager, UserRole.Cashier, UserRole.Waiter)
  async updatePayment(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderPaymentDto,
    @Req() req: any
  ) {
    if (!restaurantId || !orderId) {
      throw new BadRequestException('Restaurant ID and Order ID are required');
    }

    console.log('=== PAYMENT UPDATE REQUEST ===');
    console.log('Restaurant ID:', restaurantId);
    console.log('Order ID:', orderId);
    console.log('Payment DTO:', JSON.stringify(dto, null, 2));
    console.log('Request user object:', JSON.stringify(req.user, null, 2));

    const userId = req.user?.uid;
    console.log('Extracted user ID:', userId);
    console.log('=== END PAYMENT REQUEST LOG ===');

    return this.ordersService.updatePayment(restaurantId, orderId, dto, userId);
  }

  @Post('create-receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({ description: 'Receipt document created successfully' })
  @Roles(UserRole.Manager, UserRole.Cashier, UserRole.Waiter)
  async createReceiptDocument(
    @Param('restaurantId') restaurantId: string,
    @Body()
    dto: {
      orderIds: string[];
      paymentMethod?: 'cash' | 'upi' | 'card';
      paymentProvider?: string;
      transactionId?: string;
    }
  ) {
    return this.ordersService.createReceiptDocument(
      restaurantId,
      dto.orderIds,
      dto.paymentMethod || 'cash',
      dto.paymentProvider,
      dto.transactionId
    );
  }

  @Get('receipt/:receiptNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'receiptNumber' })
  @ApiOkResponse({ description: 'Receipt document details' })
  @Roles(UserRole.Manager, UserRole.Cashier, UserRole.Waiter)
  async getReceiptDetails(
    @Param('restaurantId') restaurantId: string,
    @Param('receiptNumber') receiptNumber: string
  ) {
    return this.ordersService.getReceiptDetails(restaurantId, receiptNumber);
  }

  @Get(':orderId/receipt-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ description: 'Receipt details by order ID' })
  @Roles(UserRole.Manager, UserRole.Cashier, UserRole.Waiter)
  async getReceiptDetailsByOrderId(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ) {
    return this.ordersService.getReceiptDetailsByOrderId(restaurantId, orderId);
  }

  @Get(':orderId/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ type: [OrderEventResponseDto] })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  async listEvents(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ) {
    return this.ordersService.listEvents(restaurantId, orderId);
  }

  @Get(':orderId/bill')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({
    description: 'Generate final bill for the order',
    schema: {
      properties: {
        orderId: { type: 'string' },
        orderNumber: { type: 'string' },
        items: { type: 'array' },
        subtotal: { type: 'number' },
        taxAmount: { type: 'number' },
        cgstAmount: { type: 'number' },
        sgstAmount: { type: 'number' },
        igstAmount: { type: 'number' },
        totalAmount: { type: 'number' },
        billGeneratedAt: { type: 'string' },
        paymentStatus: { type: 'string' },
      },
    },
  })
  async generateBill(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ) {
    return this.ordersService.generateBill(restaurantId, orderId);
  }

  // ============= CUSTOMER CART & PAYMENT ENDPOINTS =============

  @Post('calculate-cart-total')
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({
    description: 'Calculate cart total with exact backend pricing',
    schema: {
      properties: {
        subtotal: { type: 'number' },
        taxAmount: { type: 'number' },
        cgstAmount: { type: 'number' },
        sgstAmount: { type: 'number' },
        igstAmount: { type: 'number' },
        roundOffAmount: { type: 'number' },
        totalAmount: { type: 'number' },
        itemDetails: { type: 'array' },
      },
    },
  })
  async calculateCartTotal(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CalculateCartTotalDto
  ) {
    this.logger.log(
      `Calculating cart total for restaurant ${restaurantId}. Items: ${dto.items.length}`
    );

    // CRITICAL FIX: Get branch ID from table to prevent cross-branch pricing
    let branchId: string | undefined;
    let tableNumber: string | undefined;

    if (dto.tableId?.trim()) {
      // Use tableId to get table info (preferred method)
      const table = await this.tableModel
        .findOne({
          _id: dto.tableId.trim(),
          restaurantId,
          isActive: true,
        })
        .lean();

      if (!table) {
        throw new BadRequestException(
          `Table with ID ${dto.tableId} not found or inactive`
        );
      }

      branchId = table.branchId?.toString();
      tableNumber = table.tableNumber;
    }

    // CRITICAL FIX: Validate all items belong to the correct branch
    if (branchId) {
      const itemIds = dto.items.map((item) => item.menuItemId);
      const isValid = await this.validateItemsBelongToBranch(
        restaurantId,
        [...new Set(itemIds)], // Unique item IDs for efficient query
        branchId
      );
      if (!isValid) {
        throw new BadRequestException(
          'Some items are not available in this branch'
        );
      }
    }

    // Reuse the same logic as order creation for exact calculation
    const createOrderDto: CreateOrderDto = {
      tableId: dto.tableId,
      tableNumber: tableNumber,
      items: dto.items,
      notes: dto.notes,
      customerName: dto.customerInfo?.name,
      customerPhone: dto.customerInfo?.phone,
      customerEmail: dto.customerInfo?.email,
      paymentMethod: 'upi', // Doesn't affect pricing calculation
    };

    // Get the exact calculation without creating order
    const calculation = await this.ordersService.calculateOrderTotal(
      restaurantId,
      createOrderDto
    );

    return {
      subtotal: calculation.subtotal,
      taxAmount: calculation.taxAmount,
      cgstAmount: calculation.cgstAmount,
      sgstAmount: calculation.sgstAmount,
      igstAmount: calculation.igstAmount,
      roundOffAmount: calculation.roundOffAmount,
      totalAmount: calculation.totalAmount,
      itemDetails:
        calculation.items?.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          taxAmount: item.taxAmount,
        })) || [],
    };
  }

  @Post('create-with-payment')
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({
    description: 'Order created with payment intent',
    schema: {
      properties: {
        orderId: { type: 'string' },
        orderNumber: { type: 'string' },
        razorpayOrderId: { type: 'string' },
        razorpayKey: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
      },
    },
  })
  async createOrderWithPayment(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateOrderWithPaymentDto
  ) {
    if (!this.razorpayService.isEnabled()) {
      throw new BadRequestException('Online payments are not configured');
    }

    this.logger.log(
      `Creating order with payment for restaurant ${restaurantId}. Items: ${
        dto.items.length
      }, Amount: ₹${dto.totalAmount / 100}`
    );

    // CRITICAL FIX: Get branch ID from table to prevent cross-branch contamination
    let branchId: string | undefined;
    if (dto.tableNumber?.trim()) {
      branchId = await this.getBranchIdFromTable(
        restaurantId,
        dto.tableNumber.trim()
      );
      if (!branchId) {
        throw new BadRequestException(
          `Table ${dto.tableNumber} not found or inactive`
        );
      }
    }

    // CRITICAL FIX: Validate all items belong to the correct branch
    if (branchId) {
      const itemIds = dto.items.map((item) => item.menuItemId);
      const isValid = await this.validateItemsBelongToBranch(
        restaurantId,
        itemIds,
        branchId
      );
      if (!isValid) {
        throw new BadRequestException(
          'Some items are not available in this branch'
        );
      }
    }

    // Create order first
    const createOrderDto: CreateOrderDto = {
      tableNumber: dto.tableNumber,
      items: dto.items,
      notes: dto.notes,
      customerName: dto.customerInfo?.name,
      customerPhone: dto.customerInfo?.phone,
      customerEmail: dto.customerInfo?.email,
      paymentMethod: 'upi',
    };

    // CRITICAL FIX: Pass branchId to ensure order is created in the correct branch
    const order = await this.ordersService.create(
      restaurantId,
      createOrderDto,
      branchId
    );

    // Verify amount matches calculated total
    const calculatedAmount = Math.round(order.totalAmount * 100);
    if (Math.abs(calculatedAmount - dto.totalAmount) > 100) {
      // Allow ₹1 difference for rounding
      throw new BadRequestException(
        `Amount mismatch. Expected: ₹${calculatedAmount / 100}, Received: ₹${
          dto.totalAmount / 100
        }`
      );
    }

    // Check if restaurant has direct settlement enabled
    const canReceivePayments =
      await this.restaurantOnboardingService.canReceivePayments(restaurantId);
    const linkedAccountId =
      await this.restaurantOnboardingService.getLinkedAccountId(restaurantId);

    let razorpayOrder: any;
    const amountInPaise = calculatedAmount;

    if (canReceivePayments && linkedAccountId) {
      // Direct settlement to restaurant
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_${order.orderNumber}`,
        notes: {
          restaurantId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableNumber: dto.tableNumber || '',
          customerName: dto.customerInfo?.name || 'Guest',
          settlementType: 'direct',
        },
        transfers: [
          {
            account: linkedAccountId,
            amount: amountInPaise,
            currency: 'INR',
            notes: {
              orderId: order.id,
              orderNumber: order.orderNumber,
            },
          },
        ],
      });

      this.logger.log(
        `Created payment with direct settlement for order ${
          order.id
        }. Restaurant gets ₹${amountInPaise / 100} (100%)`
      );
    } else {
      // Traditional payment (money comes to platform first)
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_${order.orderNumber}`,
        notes: {
          restaurantId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableNumber: dto.tableNumber || '',
          customerName: dto.customerInfo?.name || 'Guest',
          settlementType: 'traditional',
        },
      });

      this.logger.warn(
        `Restaurant ${restaurantId} doesn't have direct settlement enabled. Using traditional payment flow.`
      );
    }

    // Register payment intent
    await this.ordersService.registerPaymentIntent(
      restaurantId,
      order.id,
      'razorpay',
      razorpayOrder.id,
      {
        orderNumber: order.orderNumber,
        amount: amountInPaise,
        currency: 'INR',
        settlementType: canReceivePayments ? 'direct' : 'traditional',
        linkedAccountId,
        customerInfo: dto.customerInfo,
      }
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      razorpayKey: this.razorpayService.publicKey,
      amount: amountInPaise,
      currency: 'INR',
    };
  }

  @Post(':orderId/verify-payment')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({
    description: 'Payment verified successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        order: { $ref: '#/components/schemas/OrderResponseDto' },
      },
    },
  })
  async verifyPayment(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: VerifyPaymentDto
  ) {
    this.logger.log(
      `Verifying payment for order ${orderId}. Payment ID: ${dto.razorpay_payment_id}`
    );

    // Get order to verify
    const order = await this.ordersService.findOne(restaurantId, orderId);

    if (!order.razorpayOrderId) {
      throw new BadRequestException('No payment intent found for this order');
    }

    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Payment already verified for this order');
    }

    // Verify payment signature using crypto
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayService['razorpayConfig'].keySecret)
      .update(`${order.razorpayOrderId}|${dto.razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpay_signature) {
      this.logger.error(
        `Payment verification failed for order ${orderId}. Invalid signature.`
      );
      throw new BadRequestException(
        'Payment verification failed. Invalid signature.'
      );
    }

    // Payment signature is valid - update order status
    await this.ordersService.updatePayment(restaurantId, orderId, {
      paymentStatus: PaymentStatus.Paid,
      paymentMethod: 'upi',
      razorpayPaymentId: dto.razorpay_payment_id,
    });

    // Get updated order
    const updatedOrder = await this.ordersService.findOne(
      restaurantId,
      orderId
    );

    this.logger.log(
      `Payment verified successfully for order ${orderId}. Payment ID: ${dto.razorpay_payment_id}`
    );

    return {
      success: true,
      message: 'Payment verified successfully',
      order: updatedOrder,
    };
  }

  @Get(':orderId/receipt-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ description: 'Receipt QR code generated successfully' })
  async generateReceiptQr(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ) {
    const order = await this.ordersService.findOne(restaurantId, orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Generate JWT token for receipt access
    const jwt = require('jsonwebtoken');
    const QRCode = require('qrcode');

    const token = jwt.sign(
      {
        orderId,
        type: 'receipt',
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' } // Token valid for 30 days
    );

    // Use customer frontend domain for receipt URL - pass token as URL param
    const baseUrl =
      process.env.CUSTOMER_FRONTEND_URL ??
      process.env.USER_FRONTENT_URL ??
      'http://localhost:4200';
    const receiptUrl = `${baseUrl.replace(
      /\/$/,
      ''
    )}/receipt/${orderId}?t=${token}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(receiptUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      width: 300,
    });

    return {
      orderId,
      orderNumber: order.orderNumber,
      receiptUrl,
      qrCodeDataUrl,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
  }

  @Post('session-receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({
    description: 'Session receipt document created successfully',
  })
  async createSessionReceipt(
    @Param('restaurantId') restaurantId: string,
    @Body()
    dto: {
      customerSessionId: string;
      paymentMethod?: 'cash' | 'upi' | 'card';
      paymentProvider?: string;
      transactionId?: string;
    }
  ) {
    // Find all orders for this customer session
    const sessionOrders = await this.ordersService.findOrdersByCustomerSession(
      restaurantId,
      dto.customerSessionId
    );

    if (!sessionOrders || sessionOrders.length === 0) {
      throw new BadRequestException('No orders found for this session');
    }

    const orderIds = sessionOrders.map(order => order.id);

    // Use existing receipt creation functionality
    return this.ordersService.createReceiptDocument(
      restaurantId,
      orderIds,
      dto.paymentMethod || 'cash',
      dto.paymentProvider,
      dto.transactionId
    );
  }

  @Post('session-receipt-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({
    description: 'Session receipt QR code generated successfully',
  })
  async generateSessionReceiptQr(
    @Param('restaurantId') restaurantId: string,
    @Body()
    { customerSessionId, tableNumber }: { customerSessionId: string; tableNumber?: string }
  ) {
    console.log('DEBUG generateSessionReceiptQr:', {
      restaurantId,
      customerSessionId,
      tableNumber,
    });

    // Find all orders for this customer session
    const sessionOrders = await this.ordersService.findOrdersByCustomerSession(
      restaurantId,
      customerSessionId
    );

    console.log('DEBUG sessionOrders found:', {
      count: sessionOrders?.length,
      firstOrderId: sessionOrders?.[0]?.id,
      firstOrderTableId: sessionOrders?.[0]?.tableId,
      firstOrderTableNumber: sessionOrders?.[0]?.tableNumber,
    });

    if (!sessionOrders || sessionOrders.length === 0) {
      throw new BadRequestException('No orders found for this session');
    }

    // Get restaurant to obtain slug
    const restaurant = await this.ordersService.getRestaurantById(restaurantId);
    if (!restaurant) {
      throw new BadRequestException('Restaurant not found');
    }

    // Get table information to get tableId
    const firstOrder = sessionOrders[0];
    const tableId = firstOrder.tableId;

    if (!tableId) {
      console.error('DEBUG table lookup failed:', {
        orderTableId: firstOrder.tableId,
        orderTableNumber: firstOrder.tableNumber,
        passedTableNumber: tableNumber,
      });
      throw new BadRequestException('Table information not found');
    }

    const QRCode = require('qrcode');

    const baseUrl =
      process.env.CUSTOMER_FRONTEND_URL ??
      process.env.USER_FRONTENT_URL ??
      'http://localhost:4200';

    // Use session-based receipt URL with restaurant slug and session ID
    const receiptUrl = `${baseUrl.replace(
      /\/$/,
      ''
    )}/session-receipt/${restaurant.slug}/${customerSessionId}`;

    const qrCodeDataUrl = await QRCode.toDataURL(receiptUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      width: 300,
    });

    return {
      customerSessionId,
      orderIds: sessionOrders.map(order => order.id),
      orderNumbers: sessionOrders.map((o) => o.orderNumber),
      tableNumber: tableNumber || firstOrder?.tableNumber,
      tableId: tableId,
      restaurantSlug: restaurant.slug,
      receiptUrl,
      qrCodeDataUrl,
      // No token or expiration needed anymore
    };
  }

  @Post('get-or-create-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({
    description: 'Get or create session for table',
  })
  async getOrCreateSession(
    @Param('restaurantId') restaurantId: string,
    @Body() { tableId, tableNumber }: { tableId?: string; tableNumber?: string }
  ) {
    if (!tableId && !tableNumber) {
      throw new BadRequestException('Either tableId or tableNumber must be provided');
    }

    // Find the table first
    let table = null;

    if (tableId) {
      table = await this.tableModel.findOne({
        _id: tableId,
        isActive: true,
      }).lean();
    } else if (tableNumber) {
      table = await this.tableModel.findOne({
        restaurantId,
        tableNumber: tableNumber.trim(),
        isActive: true,
      }).lean();
    }

    if (!table) {
      throw new BadRequestException('Table not found');
    }

    // Check for existing active session for this table
    const existingSession = await this.customerSessionsService.findActiveSessionByTable(
      table._id.toString()
    );

    if (existingSession) {
      return {
        sessionId: existingSession.sessionId,
        isNewSession: false,
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
      };
    }

    // Create new session using restaurant ID
    const session = await this.customerSessionsService.createSessionByRestaurantId(
      restaurantId,
      table._id.toString(),
      'Staff App', // userAgent
      'internal' // ipAddress
    );

    return {
      sessionId: session.sessionId,
      isNewSession: true,
      tableId: table._id.toString(),
      tableNumber: table.tableNumber,
    };
  }

  @Get('table/:tableId/consolidated-bill')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'tableId' })
  @ApiOkResponse({
    description: 'Consolidated bill for table session (admin version)',
  })
  async getAdminConsolidatedBill(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string
  ) {
    return this.ordersService.getAdminConsolidatedBill(restaurantId, tableId);
  }

  @Post('combined-receipt-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({
    description: 'Combined receipt QR code generated successfully',
  })
  async generateCombinedReceiptQr(
    @Param('restaurantId') restaurantId: string,
    @Body()
    { orderIds, tableNumber }: { orderIds: string[]; tableNumber?: string }
  ) {
    // Validate all orders exist and belong to the restaurant
    const orders = [];
    for (const orderId of orderIds) {
      const order = await this.ordersService.findOne(restaurantId, orderId);
      if (!order) {
        throw new BadRequestException(`Order ${orderId} not found`);
      }
      orders.push(order);
    }

    // Generate JWT token for combined receipt access
    const jwt = require('jsonwebtoken');
    const QRCode = require('qrcode');

    const token = jwt.sign(
      {
        orderIds,
        tableNumber,
        type: 'combined-receipt',
        iat: Math.floor(Date.now() / 1000),
      },
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      process.env.JWT_SECRET!,
      { expiresIn: '30d' } // Token valid for 30 days
    );

    // Use customer frontend domain for combined receipt URL
    const baseUrl =
      process.env.CUSTOMER_FRONTEND_URL ??
      process.env.USER_FRONTENT_URL ??
      'http://localhost:4200';
    const receiptUrl = `${baseUrl.replace(
      /\/$/,
      ''
    )}/combined-receipt?t=${token}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(receiptUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      width: 300,
    });

    return {
      orderIds,
      orderNumbers: orders.map((o) => o.orderNumber),
      tableNumber,
      receiptUrl,
      qrCodeDataUrl,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
  }
}
