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
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { Model } from 'mongoose';

@ApiTags('orders')
@Controller('restaurants/:restaurantId/orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly razorpayService: RazorpayService,
    private readonly restaurantOnboardingService: RestaurantOnboardingService,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>
  ) {}

  @Post()
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateOrderDto,
    @Req() req?: Request
  ) {
    // Default to pending payment for new order-first flow
    const orderDto = {
      ...dto,
      paymentMethod: dto.paymentMethod || 'pending'
    };

    // Extract branchId if user is authenticated (optional for public orders)
    const user = req?.user as AuthenticatedUser | undefined;
    const branchId = user?.branchId;

    return this.ordersService.create(restaurantId, orderDto, branchId);
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
    await this.ordersService.registerPaymentIntent(restaurantId, orderId, 'razorpay', razorpayOrder.id, {
      orderNumber: order.orderNumber,
      amount: amountInPaise,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
    });

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
    const canReceivePayments = await this.restaurantOnboardingService.canReceivePayments(restaurantId);
    const linkedAccountId = await this.restaurantOnboardingService.getLinkedAccountId(restaurantId);

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
            }
          }
        ]
      });

      this.logger.log(`Created payment intent with direct settlement for order ${orderId}. Restaurant gets ₹${amountInPaise/100} (100%)`);
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

      this.logger.warn(`Restaurant ${restaurantId} doesn't have direct settlement enabled. Using traditional payment flow.`);
    }

    await this.ordersService.registerPaymentIntent(restaurantId, orderId, 'razorpay', razorpayOrder.id, {
      orderNumber: order.orderNumber,
      amount: amountInPaise,
      currency: razorpayOrder.currency,
      settlementType: canReceivePayments ? 'direct' : 'traditional',
      linkedAccountId,
      createdAt: new Date().toISOString(),
    });

    return {
      razorpayKey: this.razorpayService.publicKey,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      restaurant: {
        id: restaurantId,
      },
      settlementType: canReceivePayments ? 'direct' : 'traditional'
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
        settlementType: { type: 'string' }
      }
    }
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
    const canReceivePayments = await this.restaurantOnboardingService.canReceivePayments(restaurantId);
    const linkedAccountId = await this.restaurantOnboardingService.getLinkedAccountId(restaurantId);

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
            }
          }
        ]
      });

      this.logger.log(`Created UPI intent with direct settlement for order ${orderId}. Restaurant gets ₹${amountInPaise/100} (100%)`);
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

      this.logger.warn(`Restaurant ${restaurantId} doesn't have direct settlement enabled. Using traditional payment flow for UPI intent.`);
    }

    // Generate UPI intent URL
    const restaurant = await this.restaurantModel.findById(restaurantId);
    const merchantVPA = restaurant?.upi?.vpa || 'restohand@paytm'; // Fallback VPA
    const merchantName = restaurant?.upi?.displayName || restaurant?.name || 'RestoHand';

    const upiIntent = `upi://pay?pa=${merchantVPA}&pn=${encodeURIComponent(merchantName)}&am=${(amountInPaise/100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${order.orderNumber}`)}&tr=${razorpayOrder.id}`;

    await this.ordersService.registerPaymentIntent(restaurantId, orderId, 'razorpay_upi', razorpayOrder.id, {
      orderNumber: order.orderNumber,
      amount: amountInPaise,
      currency: razorpayOrder.currency,
      settlementType: canReceivePayments ? 'direct' : 'traditional',
      linkedAccountId,
      upiIntent,
      createdAt: new Date().toISOString(),
    });

    return {
      upiIntent,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      settlementType: canReceivePayments ? 'direct' : 'traditional'
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
    @Body() dto: UpdateOrderPaymentDto
  ) {
    return this.ordersService.updatePayment(restaurantId, orderId, dto);
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
        paymentStatus: { type: 'string' }
      }
    }
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
        itemDetails: { type: 'array' }
      }
    }
  })
  async calculateCartTotal(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CalculateCartTotalDto
  ) {
    this.logger.log(`Calculating cart total for restaurant ${restaurantId}. Items: ${dto.items.length}`);

    // Reuse the same logic as order creation for exact calculation
    const createOrderDto: CreateOrderDto = {
      tableNumber: dto.tableNumber,
      items: dto.items,
      notes: dto.notes,
      customerName: dto.customerInfo?.name,
      customerPhone: dto.customerInfo?.phone,
      customerEmail: dto.customerInfo?.email,
      paymentMethod: 'upi' // Doesn't affect pricing calculation
    };

    // Get the exact calculation without creating order
    const calculation = await this.ordersService.calculateOrderTotal(restaurantId, createOrderDto);

    return {
      subtotal: calculation.subtotal,
      taxAmount: calculation.taxAmount,
      cgstAmount: calculation.cgstAmount,
      sgstAmount: calculation.sgstAmount,
      igstAmount: calculation.igstAmount,
      roundOffAmount: calculation.roundOffAmount,
      totalAmount: calculation.totalAmount,
      itemDetails: calculation.items?.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.pricing.unitAmount,
        lineTotal: item.lineTotal,
        taxAmount: item.taxAmount
      })) || []
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
        currency: { type: 'string' }
      }
    }
  })
  async createOrderWithPayment(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateOrderWithPaymentDto
  ) {
    if (!this.razorpayService.isEnabled()) {
      throw new BadRequestException('Online payments are not configured');
    }

    this.logger.log(`Creating order with payment for restaurant ${restaurantId}. Items: ${dto.items.length}, Amount: ₹${dto.totalAmount/100}`);

    // Create order first
    const createOrderDto: CreateOrderDto = {
      tableNumber: dto.tableNumber,
      items: dto.items,
      notes: dto.notes,
      customerName: dto.customerInfo?.name,
      customerPhone: dto.customerInfo?.phone,
      customerEmail: dto.customerInfo?.email,
      paymentMethod: 'upi'
    };

    const order = await this.ordersService.create(restaurantId, createOrderDto);

    // Verify amount matches calculated total
    const calculatedAmount = Math.round(order.totalAmount * 100);
    if (Math.abs(calculatedAmount - dto.totalAmount) > 100) { // Allow ₹1 difference for rounding
      throw new BadRequestException(`Amount mismatch. Expected: ₹${calculatedAmount/100}, Received: ₹${dto.totalAmount/100}`);
    }

    // Check if restaurant has direct settlement enabled
    const canReceivePayments = await this.restaurantOnboardingService.canReceivePayments(restaurantId);
    const linkedAccountId = await this.restaurantOnboardingService.getLinkedAccountId(restaurantId);

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
        transfers: [{
          account: linkedAccountId,
          amount: amountInPaise,
          currency: 'INR',
          notes: {
            orderId: order.id,
            orderNumber: order.orderNumber,
          }
        }]
      });

      this.logger.log(`Created payment with direct settlement for order ${order.id}. Restaurant gets ₹${amountInPaise/100} (100%)`);
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

      this.logger.warn(`Restaurant ${restaurantId} doesn't have direct settlement enabled. Using traditional payment flow.`);
    }

    // Register payment intent
    await this.ordersService.registerPaymentIntent(restaurantId, order.id, 'razorpay', razorpayOrder.id, {
      orderNumber: order.orderNumber,
      amount: amountInPaise,
      currency: 'INR',
      settlementType: canReceivePayments ? 'direct' : 'traditional',
      linkedAccountId,
      customerInfo: dto.customerInfo,
    });

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
        order: { $ref: '#/components/schemas/OrderResponseDto' }
      }
    }
  })
  async verifyPayment(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: VerifyPaymentDto
  ) {
    this.logger.log(`Verifying payment for order ${orderId}. Payment ID: ${dto.razorpay_payment_id}`);

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
      this.logger.error(`Payment verification failed for order ${orderId}. Invalid signature.`);
      throw new BadRequestException('Payment verification failed. Invalid signature.');
    }

    // Payment signature is valid - update order status
    await this.ordersService.updatePayment(restaurantId, orderId, {
      paymentStatus: PaymentStatus.Paid,
      paymentMethod: 'upi',
      razorpayPaymentId: dto.razorpay_payment_id,
    });

    // Get updated order
    const updatedOrder = await this.ordersService.findOne(restaurantId, orderId);

    this.logger.log(`Payment verified successfully for order ${orderId}. Payment ID: ${dto.razorpay_payment_id}`);

    return {
      success: true,
      message: 'Payment verified successfully',
      order: updatedOrder,
    };
  }
}
