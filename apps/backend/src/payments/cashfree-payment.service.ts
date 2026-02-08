import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CashfreeService } from './cashfree.service';
import { CashfreeVendorService } from './cashfree-vendor.service';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { ConfigService } from '@nestjs/config';

export interface CreatePaymentIntentDto {
  orderId: string;
  restaurantId?: string; // For admin endpoints
  customerDetails?: {
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
}

export interface CreateSessionPaymentIntentDto {
  restaurantSlug: string;
  tableId: string;
  customerSessionId?: string;
  customerDetails?: {
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
}

export interface PaymentIntentResponse {
  paymentSessionId: string;
  cashfreeOrderId: string;
  orderId: string;
  amount: number;
  currency: string;
  restaurantInfo: {
    name: string;
    vendorId?: string;
    canReceiveSettlements: boolean;
  };
  settlementType: 'split_payment' | 'manual_settlement';
  checkoutUrl?: string;
}

export interface SessionPaymentIntentResponse extends PaymentIntentResponse {
  orderIds: string[];
  orderCount: number;
  totalAmount: number;
}

@Injectable()
export class CashfreePaymentService {
  private readonly logger = new Logger(CashfreePaymentService.name);

  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly cashfreeService: CashfreeService,
    private readonly cashfreeVendorService: CashfreeVendorService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Create payment intent for individual order (replaces Razorpay payment-intent)
   */
  async createOrderPaymentIntent(
    dto: CreatePaymentIntentDto
  ): Promise<PaymentIntentResponse> {
    try {
      this.logger.log(
        `Creating Cashfree payment intent for order: ${dto.orderId}`
      );

      // Get order details
      const order = await this.orderModel
        .findById(dto.orderId)
        .populate('restaurantId');
      if (!order) {
        throw new NotFoundException(`Order ${dto.orderId} not found`);
      }

      const restaurant = order.restaurantId as RestaurantDocument;
      if (!restaurant) {
        throw new NotFoundException('Restaurant not found for order');
      }

      // Check if order is already paid
      if (order.status === 'paid' || order.paymentStatus === 'paid') {
        throw new BadRequestException('Order is already paid');
      }

      // Check if restaurant is onboarded to Cashfree
      const vendorId = await this.cashfreeVendorService.getRestaurantVendorId(
        restaurant.id
      );
      const canReceiveSettlements =
        await this.cashfreeVendorService.canReceiveSettlements(restaurant.id);

      if (!vendorId) {
        this.logger.warn(
          `Restaurant ${restaurant.name} not onboarded to Cashfree. Creating manual settlement intent.`
        );
      }

      // Create Cashfree order
      const customerDetails = {
        customerId:
          dto.customerDetails?.customerId ||
          `customer_${order.customerSessionId || Date.now()}`,
        customerName: dto.customerDetails?.customerName || 'Customer',
        customerEmail:
          dto.customerDetails?.customerEmail || 'customer@restohand.com',
        customerPhone: dto.customerDetails?.customerPhone || '9999999999',
      };

      const frontendUrl = process.env.USER_FRONTENT_URL;
      const cashfreeOrder = await this.cashfreeService.createOrder({
        orderId: dto.orderId,
        amount: order.total, // Amount in paise
        currency: 'INR',
        customerDetails,
        orderMeta: {
          returnUrl: `${frontendUrl}/payment/success?orderId=${dto.orderId}`,
          notifyUrl: `${this.configService.get(
            'BACKEND_URL'
          )}/webhooks/cashfree/payments`,
        },
        orderNote: `RestoHand Order - ${restaurant.name} - Order #${order.orderNumber}`,
      });

      // Update order with Cashfree payment metadata
      await this.orderModel.findByIdAndUpdate(dto.orderId, {
        'paymentMeta.cashfree': {
          cfOrderId: cashfreeOrder.cfOrderId,
          paymentSessionId: cashfreeOrder.paymentSessionId,
          createdAt: new Date(),
          vendorId: vendorId,
          canReceiveSettlements: canReceiveSettlements,
          settlementType:
            vendorId && canReceiveSettlements
              ? 'split_payment'
              : 'manual_settlement',
        },
      });

      this.logger.log(
        `Cashfree payment intent created: ${cashfreeOrder.paymentSessionId} for order ${dto.orderId}`
      );

      const environment = this.configService.get('NODE_ENV');
      const cashfreeBaseUrl = environment === 'production'
        ? 'https://cashfree.com/pg/view/sessions'
        : 'https://sandbox.cashfree.com/pg/view/sessions';

      return {
        paymentSessionId: cashfreeOrder.paymentSessionId,
        cashfreeOrderId: cashfreeOrder.orderId,
        orderId: dto.orderId,
        amount: order.total,
        currency: 'INR',
        restaurantInfo: {
          name: restaurant.name,
          vendorId: vendorId || undefined,
          canReceiveSettlements: canReceiveSettlements,
        },
        settlementType:
          vendorId && canReceiveSettlements
            ? 'split_payment'
            : 'manual_settlement',
        checkoutUrl: `${cashfreeBaseUrl}/${cashfreeOrder.paymentSessionId}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create payment intent for order ${dto.orderId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create payment intent for public order (customer-facing)
   */
  async createPublicOrderPaymentIntent(
    restaurantSlug: string,
    orderId: string,
    customerDetails?: CreatePaymentIntentDto['customerDetails']
  ): Promise<PaymentIntentResponse> {
    try {
      // Get restaurant by slug
      const restaurant = await this.restaurantModel.findOne({
        slug: restaurantSlug,
      });
      if (!restaurant) {
        throw new NotFoundException(
          `Restaurant with slug "${restaurantSlug}" not found`
        );
      }

      return this.createOrderPaymentIntent({
        orderId,
        restaurantId: restaurant.id,
        customerDetails,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create public payment intent for restaurant ${restaurantSlug}, order ${orderId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create payment intent for session (multiple orders)
   */
  async createSessionPaymentIntent(
    dto: CreateSessionPaymentIntentDto
  ): Promise<SessionPaymentIntentResponse> {
    try {
      this.logger.log(
        `Creating session payment intent for restaurant: ${dto.restaurantSlug}, table: ${dto.tableId}`
      );

      // Get restaurant
      const restaurant = await this.restaurantModel.findOne({
        slug: dto.restaurantSlug,
      });
      if (!restaurant) {
        throw new NotFoundException(
          `Restaurant with slug "${dto.restaurantSlug}" not found`
        );
      }

      // Get all unpaid orders for the table session
      const unpaidOrders = await this.orderModel.find({
        restaurantId: restaurant.id,
        tableId: dto.tableId,
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }, // Orders ready for payment
        paymentStatus: { $ne: 'paid' },
      });

      if (unpaidOrders.length === 0) {
        throw new BadRequestException(
          'No unpaid orders found for this table session'
        );
      }

      // Calculate total amount
      const totalAmount = unpaidOrders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      );

      // Debug log to see what we're working with
      this.logger.log(
        `Found ${unpaidOrders.length} orders with total: ${totalAmount}`
      );
      unpaidOrders.forEach((order) => {
        this.logger.log(
          `Order ${order.id}: totalAmount=${order.totalAmount}, paymentStatus=${order.paymentStatus}`
        );
      });
      const orderIds = unpaidOrders.map((order) => order.id);

      // Check vendor status
      const vendorId = await this.cashfreeVendorService.getRestaurantVendorId(
        restaurant.id
      );
      const canReceiveSettlements =
        await this.cashfreeVendorService.canReceiveSettlements(restaurant.id);

      // Create session order ID
      const sessionOrderId = `session_${dto.restaurantSlug}_${
        dto.tableId
      }_${Date.now()}`;

      // Create Cashfree order for consolidated payment
      const customerDetails = {
        customerId:
          dto.customerDetails?.customerId ||
          dto.customerSessionId ||
          `session_${Date.now()}`,
        customerName: dto.customerDetails?.customerName || 'Customer',
        customerEmail:
          dto.customerDetails?.customerEmail || 'customer@restohand.com',
        customerPhone: dto.customerDetails?.customerPhone || '9999999999',
      };

      const frontendUrl = process.env.USER_FRONTENT_URL;
      const cashfreeOrder = await this.cashfreeService.createOrder({
        orderId: sessionOrderId,
        amount: totalAmount, // Total amount in paise
        currency: 'INR',
        customerDetails,
        orderMeta: {
          returnUrl: `${frontendUrl}/c/${dto.restaurantSlug}/table/${dto.tableId}/receipt`,
          notifyUrl: `${this.configService.get(
            'BACKEND_URL'
          )}/webhooks/cashfree/payments`,
        },
        orderNote: `RestoHand Session Payment - ${restaurant.name} - Table ${dto.tableId} (${unpaidOrders.length} orders)`,
      });

      // Update all orders with session payment metadata
      await Promise.all(
        unpaidOrders.map((order) =>
          this.orderModel.findByIdAndUpdate(order.id, {
            'paymentMeta.cashfree': {
              cfOrderId: cashfreeOrder.cfOrderId,
              paymentSessionId: cashfreeOrder.paymentSessionId,
              sessionOrderId: sessionOrderId,
              isSessionPayment: true,
              sessionOrderIds: orderIds,
              sessionTotalAmount: totalAmount,
              createdAt: new Date(),
              vendorId: vendorId,
              canReceiveSettlements: canReceiveSettlements,
              settlementType:
                vendorId && canReceiveSettlements
                  ? 'split_payment'
                  : 'manual_settlement',
            },
          })
        )
      );

      this.logger.log(
        `Session payment intent created: ${
          cashfreeOrder.paymentSessionId
        } for ${unpaidOrders.length} orders, total: ₹${totalAmount}`
      );

      const environment = this.configService.get('NODE_ENV');
      const cashfreeBaseUrl = environment === 'production'
        ? 'https://cashfree.com/pg/view/sessions'
        : 'https://sandbox.cashfree.com/pg/view/sessions';

      return {
        paymentSessionId: cashfreeOrder.paymentSessionId,
        cashfreeOrderId: cashfreeOrder.orderId,
        orderId: sessionOrderId,
        amount: totalAmount,
        currency: 'INR',
        orderIds,
        orderCount: unpaidOrders.length,
        totalAmount,
        restaurantInfo: {
          name: restaurant.name,
          vendorId: vendorId || undefined,
          canReceiveSettlements: canReceiveSettlements,
        },
        settlementType:
          vendorId && canReceiveSettlements
            ? 'split_payment'
            : 'manual_settlement',
        checkoutUrl: `${cashfreeBaseUrl}/${cashfreeOrder.paymentSessionId}`,
      };
    } catch (error) {
      this.logger.error(`Failed to create session payment intent:`, error);
      throw error;
    }
  }

  /**
   * Process payment split after successful payment
   */
  async processPaymentSplit(
    cashfreeOrderId: string,
    commissionRate = 0.1
  ): Promise<{
    success: boolean;
    splitId?: string;
    restaurantAmount?: number;
    platformCommission?: number;
    error?: string;
  }> {
    try {
      this.logger.log(
        `Processing payment split for Cashfree order: ${cashfreeOrderId}`
      );

      // Find order(s) by Cashfree order ID
      const orders = await this.orderModel
        .find({
          'paymentMeta.cashfree.cfOrderId': cashfreeOrderId,
        })
        .populate('restaurantId');

      if (orders.length === 0) {
        throw new NotFoundException(
          `No orders found for Cashfree order ID: ${cashfreeOrderId}`
        );
      }

      const firstOrder = orders[0];
      const restaurant = firstOrder.restaurantId as RestaurantDocument;
      const vendorId = await this.cashfreeVendorService.getRestaurantVendorId(
        restaurant.id
      );

      if (!vendorId) {
        this.logger.warn(
          `Restaurant ${restaurant.name} not onboarded to Cashfree. Skipping split.`
        );
        return {
          success: false,
          error: 'Restaurant not onboarded for split payments',
        };
      }

      // Calculate split amounts
      const totalAmount = orders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      );
      const platformCommission = Math.round(totalAmount * commissionRate);
      const restaurantAmount = totalAmount - platformCommission;
      const restaurantPercentage = Math.round(
        ((totalAmount - platformCommission) / totalAmount) * 100
      );

      // Create split
      const splitResponse = await this.cashfreeService.createSplit(
        cashfreeOrderId,
        {
          orderId: firstOrder.id,
          splits: [
            {
              vendorId: vendorId,
              percentage: restaurantPercentage,
              tags: {
                restaurant_id: restaurant.id,
                restaurant_name: restaurant.name,
                order_count: orders.length.toString(),
                commission_rate: (commissionRate * 100).toString() + '%',
                split_type: 'marketplace_commission',
              },
            },
          ],
        }
      );

      // Update orders with split information
      await Promise.all(
        orders.map((order) =>
          this.orderModel.findByIdAndUpdate(order.id, {
            'paymentMeta.cashfree.splitId': splitResponse.split_id || 'created',
            'paymentMeta.cashfree.splitStatus': 'completed',
            'paymentMeta.cashfree.restaurantAmount': Math.round(
              order.total * (1 - commissionRate)
            ),
            'paymentMeta.cashfree.platformCommission': Math.round(
              order.total * commissionRate
            ),
            'paymentMeta.cashfree.splitProcessedAt': new Date(),
          })
        )
      );

      this.logger.log(
        `Payment split completed for ${orders.length} orders. Restaurant: ₹${restaurantAmount}, Platform: ₹${platformCommission}`
      );

      return {
        success: true,
        splitId: splitResponse.split_id,
        restaurantAmount,
        platformCommission,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process payment split for order ${cashfreeOrderId}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get payment status and details
   */
  async getPaymentStatus(orderId: string): Promise<any> {
    try {
      const order = await this.orderModel.findById(orderId);
      if (!order || !order.paymentMeta?.cashfree?.cfOrderId) {
        throw new NotFoundException(
          'Order not found or no Cashfree payment initiated'
        );
      }

      const cashfreeOrder = await this.cashfreeService.getOrder(
        order.paymentMeta.cashfree.cfOrderId
      );

      return {
        orderId,
        cashfreeOrderId: order.paymentMeta.cashfree.cfOrderId,
        paymentSessionId: order.paymentMeta.cashfree.paymentSessionId,
        orderStatus: cashfreeOrder.order_status,
        paymentStatus: order.paymentStatus,
        amount: order.total,
        splitStatus: order.paymentMeta.cashfree.splitStatus,
        settlementType: order.paymentMeta.cashfree.settlementType,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get payment status for order ${orderId}:`,
        error
      );
      throw error;
    }
  }
}
