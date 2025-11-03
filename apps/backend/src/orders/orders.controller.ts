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

    // Create simple Razorpay order for hosted checkout
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

    // Create hosted checkout URL
    const hostedCheckoutUrl = `https://checkout.razorpay.com/v1/checkout?key_id=${process.env.RAZORPAY_KEY_ID}&amount=${amountInPaise}&currency=INR&order_id=${razorpayOrder.id}&name=${encodeURIComponent(restaurant?.name || 'Restaurant')}&description=${encodeURIComponent(`Order #${order.orderNumber}`)}&prefill[name]=${encodeURIComponent(order.customerName || 'Customer')}&prefill[contact]=${encodeURIComponent(order.customerPhone || '')}&theme[color]=%2316a34a&callback_url=${encodeURIComponent(`${process.env.FRONTEND_BASE_URL}/c/${restaurant?.slug}/order/${orderId}?payment=success`)}`;

    // Register payment intent for tracking
    await this.ordersService.registerPaymentIntent(restaurantId, orderId, 'razorpay_hosted', razorpayOrder.id, {
      orderNumber: order.orderNumber,
      amount: amountInPaise,
      currency: 'INR',
      hostedCheckoutUrl,
    });

    return {
      paymentLinkUrl: hostedCheckoutUrl,
      paymentLinkId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
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

    const upiIntent = `upi://pay?pa=${merchantVPA}&pn=${encodeURIComponent(merchantName)}&am=${(amountInPaise/100).toFixed(2)}&tr=${razorpayOrder.id}&cu=INR&mode=02`;

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

  @Get(':orderId/events')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
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
}
