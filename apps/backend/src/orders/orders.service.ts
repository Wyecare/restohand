/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { OrderProgressStage } from '../common/enums/order-progress.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { CreateOrderDto } from './dtos/create-order.dto';
import { AddItemsToOrderDto } from './dtos/add-items-to-order.dto';
import { OrderListResponseDto } from './dtos/order-list-response.dto';
import { OrderResponseDto } from './dtos/order-response.dto';
import { QueryOrdersDto } from './dtos/query-orders.dto';
import { UpdateOrderPaymentDto } from './dtos/update-order-payment.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { Order, OrderDocument } from './schemas/order.schema';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import { OrderEvent, OrderEventDocument } from './schemas/order-event.schema';
import { OrderEventResponseDto } from './dtos/order-event-response.dto';
import { OrdersGateway } from './orders.gateway';
import { OrdersSSEService } from './orders-sse.service';
import {
  MenuItem,
  MenuItemDocument,
} from '../menu-items/schemas/menu-item.schema';
import {
  OrderCounter,
  OrderCounterDocument,
} from './schemas/order-counter.schema';
import {
  SmartGstService,
  OrderItemGstData,
  OrderItemWithGst,
  OrderGstSummary,
} from '../gst/smart-gst.service';
import { RestaurantBillingService, CartItem, RestaurantGstConfig } from '../common/services/restaurant-billing.service';
import { GstService as RestaurantGstService } from '../common/services/gst.service';
import { RazorpayService } from '../payments/razorpay.service';
import { TableStatusService } from '../restaurant-tables/table-status.service';
import { TableStatusType } from '../restaurant-tables/schemas/table-status.schema';
import {
  GstService,
  TaxCalculation,
  OrderItemWithTax,
} from '../gst/gst.service';
import { ReceiptDocumentService } from './receipt-document.service';
import { PaymentNotificationService } from './payment-notification.service';
import { MenuPriceTagsService } from '../menu-price-tags/menu-price-tags.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CustomerSessionsService } from '../customer-sessions/customer-sessions.service';
import {
  CustomerSession,
  CustomerSessionDocument,
  SessionStatus,
  SessionClosureReason
} from '../customer-sessions/schemas/customer-session.schema';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(OrderEvent.name)
    private readonly eventModel: Model<OrderEventDocument>,
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>,
    @InjectModel(OrderCounter.name)
    private readonly orderCounterModel: Model<OrderCounterDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(CustomerSession.name)
    private readonly customerSessionModel: Model<CustomerSessionDocument>,
    private readonly ordersGateway: OrdersGateway,
    private readonly ordersSSEService: OrdersSSEService,
    private readonly smartGstService: SmartGstService,
    private readonly gstService: GstService,
    private readonly restaurantBillingService: RestaurantBillingService,
    private readonly restaurantGstService: RestaurantGstService,
    private readonly razorpayService: RazorpayService,
    private readonly tableStatusService: TableStatusService,
    private readonly receiptDocumentService: ReceiptDocumentService,
    private readonly paymentNotificationService: PaymentNotificationService,
    private readonly menuPriceTagsService: MenuPriceTagsService,
    private readonly customerSessionsService: CustomerSessionsService
  ) {}

  async create(
    restaurantId: string,
    dto: CreateOrderDto,
    branchId?: string
  ): Promise<OrderResponseDto> {
    // Debug logging
    this.logger.log(`💾 DEBUG: Orders Service - create method called`, {
      restaurantId,
      customerSessionId: dto.customerSessionId,
      sessionId: dto.sessionId,
      hasCustomerSessionId: !!dto.customerSessionId,
      branchId,
    });

    const orderNumber = await this.generateOrderNumber(restaurantId);
    const paymentMethod = dto.paymentMethod ?? 'upi';

    const restaurant = await this.restaurantModel.findById(restaurantId).lean();

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    const customerState =
      dto.customerState?.trim() || restaurant.address?.state;

    // Auto-assign customer session ID if missing but table has active session
    let effectiveCustomerSessionId = dto.customerSessionId;
    if (!effectiveCustomerSessionId && dto.tableId) {
      const activeSession = await this.customerSessionsService.findActiveSessionByTable(dto.tableId);
      if (activeSession) {
        effectiveCustomerSessionId = activeSession.sessionId;
        this.logger.log('🔗 Auto-assigned customer session ID from active session:', {
          tableId: dto.tableId,
          sessionId: activeSession.sessionId,
          orderNumber,
        });
      }
    }

    // Validate menu item availability
    const menuItemIds = dto.items.map((item) => item.menuItemId);
    const availableMenuItems = await this.menuItemModel
      .find({ _id: { $in: menuItemIds }, restaurantId, isAvailable: true })
      .select('_id')
      .lean();

    const availableItemIds = new Set(
      availableMenuItems.map((item) => item._id.toString())
    );
    const unavailableItems = menuItemIds.filter(
      (id) => !availableItemIds.has(id)
    );

    if (unavailableItems.length > 0) {
      throw new BadRequestException(
        `The following menu items are not available: ${unavailableItems.join(
          ', '
        )}`
      );
    }

    // Calculate simple order subtotal (no tax calculation)
    const subtotal = dto.items.reduce((sum, item) => {
      const itemTotal = (item.pricing?.unitAmount || 0) * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);


    // Prepare order items (no tax calculation)
    const formattedOrderItems = dto.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name || '',
      quantity: item.quantity || 1,
      pricing: {
        unitAmount: item.pricing?.unitAmount || 0,
        currency: 'INR',
        discountAmount: item.pricing?.discountAmount || 0,
      }
    }));

    // Debug logging before order creation
    this.logger.log(`💾 DEBUG: About to create order with data:`, {
      restaurantId,
      branchId,
      orderNumber,
      sessionId: dto.sessionId,
      customerSessionId: effectiveCustomerSessionId,
      hasCustomerSessionId: !!effectiveCustomerSessionId,
      tableId: dto.tableId,
      tableNumber: dto.tableNumber,
    });

    const created = await this.orderModel.create({
      restaurantId,
      branchId,
      orderNumber,
      sessionId: dto.sessionId,
      customerSessionId: effectiveCustomerSessionId, // Store customer session ID
      tableNumber: dto.tableNumber,
      tableId: dto.tableId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail?.trim().toLowerCase(),
      customerGstin: dto.customerGstin?.trim().toUpperCase(),
      customerState,
      notes: dto.notes,
      items: formattedOrderItems,
      status: OrderStatus.Pending,
      paymentStatus: PaymentStatus.Pending,
      progress: OrderProgressStage.NotStarted,
      paymentMethod,
      // Simple amounts (no tax calculation)
      subtotalAmount: subtotal,
      totalAmount: subtotal, // Same as subtotal - no tax here
    });

    console.log('Created Order successfully:', created);

    // Debug logging after order creation
    this.logger.log(`🎉 DEBUG: Order created in database`, {
      orderId: created._id.toString(),
      orderNumber: created.orderNumber,
      customerSessionId: created.customerSessionId,
      sessionId: created.sessionId,
      hasCustomerSessionId: !!created.customerSessionId,
      tableId: created.tableId,
      tableNumber: created.tableNumber,
    });

    const response = this.toDto(created);

    await this.recordEvent(
      created._id.toString(),
      restaurantId,
      'order.created',
      {
        totalAmount: response.totalAmount,
        paymentMethod: response.paymentMethod,
      }
    );

    console.log('Recording order created event completed');

    console.log(created, 'created order');

    // DIRECT TABLE STATUS UPDATE: Update table status immediately upon order creation
    if (created.tableId) {
      try {
        await this.tableStatusService.updateTableStatusFromOrder(
          restaurantId,
          created.tableId.toString(),
          'order-created',
          {
            totalAmount: created.totalAmount,
            createdBy: created.createdBy?.toString(),
            createdByName: 'Order System',
          }
        );
        console.log(
          `Table status updated for table ${created.tableId} after order creation`
        );
      } catch (error) {
        console.error(
          `Failed to update table status for table ${created.tableId}:`,
          error
        );
        // Don't fail the order creation if table status update fails
      }
    }

    if (paymentMethod === 'upi' && !this.razorpayService.isEnabled()) {
      const upiConfig = restaurant.upi;
      if (!upiConfig) {
        throw new BadRequestException(
          'UPI configuration is missing for this restaurant'
        );
      }

      const amount = created.totalAmount.toFixed(2);
      const params = new URLSearchParams({
        pa: upiConfig.vpa,
        pn: upiConfig.displayName,
        am: amount,
        cu: 'INR',
        tn: `Order ${created.orderNumber}`,
      });
      response.paymentIntentUrl = `upi://pay?${params.toString()}`;
    }

    // Create or update receipt document for this table order
    // if (created.tableId) {
    //   try {
    //     await this.receiptDocumentService.createOrUpdateTableReceipt(
    //       restaurantId,
    //       created.tableId.toString(),
    //       created._id.toString()
    //     );
    //     console.log(
    //       `Receipt created/updated for table ${created.tableId} with order ${created._id}`
    //     );
    //   } catch (error) {
    //     console.error(
    //       `Failed to create receipt for order ${created._id}:`,
    //       error
    //     );
    //     // Don't fail the order creation if receipt fails
    //   }
    // }

    // Debug logging final response
    this.logger.log(`📤 DEBUG: Returning response to client`, {
      orderId: response.id,
      orderNumber: response.orderNumber,
      customerSessionId: response.customerSessionId,
      hasCustomerSessionId: !!response.customerSessionId,
    });

    this.ordersGateway.emitOrderCreated(response);
    this.ordersSSEService.emitOrderCreated(response);
    return response;
  }

  /**
   * Calculate order total without creating the order - used for cart total calculation
   */
  async calculateOrderTotal(
    restaurantId: string,
    dto: CreateOrderDto
  ): Promise<{
    subtotal: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    roundOffAmount: number;
    totalAmount: number;
    items?: any[];
  }> {
    // Get restaurant and validate
    const restaurant = await this.restaurantModel.findById(restaurantId).lean();

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const defaultGstRateId = restaurant.defaultGstRateId;

    // Use restaurant's state for customer state
    const customerState = restaurant.address?.state;

    // Prepare order items for GST calculation with modifiers and price tags
    const orderItems: OrderItemGstData[] = await Promise.all(
      dto.items.map(async (item) => {
        const effectivePrice = await this.calculateEffectiveItemPrice(
          restaurantId,
          item.menuItemId,
          item.activePriceTagId,
          item.selectedModifiers || []
        );

        return {
          menuItemId: item.menuItemId,
          name: '', // Will be filled from menu item
          quantity: item.quantity,
          unitPrice: effectivePrice,
          discountAmount: item.pricing?.discountAmount || 0,
        };
      })
    );

    // Use already fetched restaurant for GST configuration

    const gstConfig = restaurant.businessDetails?.gst;
    const gstValidation = this.restaurantBillingService.validateGstConfig(gstConfig);

    if (!gstValidation.isValid) {
      throw new BadRequestException(`GST configuration invalid: ${gstValidation.errors.join(', ')}`);
    }

    // Convert order items to cart format
    const cartItems: CartItem[] = orderItems.map(item => ({
      id: item.menuItemId,
      name: item.name,
      price: item.pricing.unitAmount,
      quantity: item.quantity
    }));

    // Calculate bill using new restaurant billing service
    const billCalculation = this.restaurantBillingService.calculateBill(
      cartItems,
      gstConfig,
      customerState
    );

    // Convert items back to order item format with proper pricing
    const processedItems = orderItems.map(item => ({
      ...item,
      pricing: {
        ...item.pricing,
        taxAmount: 0, // No per-item tax - GST calculated at bill level
      }
    }));

    return {
      subtotal: billCalculation.subtotal,
      serviceChargeRate: billCalculation.serviceChargeRate,
      serviceChargeAmount: billCalculation.serviceChargeAmount,
      taxableAmount: billCalculation.subtotalWithService,
      gstRate: billCalculation.gstRate,
      cgstAmount: billCalculation.cgstAmount,
      sgstAmount: billCalculation.sgstAmount,
      igstAmount: billCalculation.igstAmount,
      totalGstAmount: billCalculation.totalGstAmount,
      taxType: billCalculation.taxType,
      grandTotal: billCalculation.grandTotal,
      items: processedItems,
    };
  }

  async findAll(
    restaurantId: string,
    query: QueryOrdersDto,
    branchId?: string
  ): Promise<OrderListResponseDto> {
    const filter: FilterQuery<OrderDocument> = {
      restaurantId,
      isArchived: false,
    };

    if (branchId) {
      filter.branchId = branchId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    if (query.customerSessionId) {
      filter.customerSessionId = query.customerSessionId;
    }

    if (query.from || query.to) {
      filter.createdAt = {} as any;
      if (query.from) {
        filter.createdAt.$gte = new Date(query.from);
      }
      if (query.to) {
        filter.createdAt.$lte = new Date(query.to);
      }
    }

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [
        { orderNumber: regex },
        { customerName: regex },
        { customerPhone: regex },
      ];
    }

    const page = Number(query.page ?? '1');
    const limit = Math.min(Number(query.limit ?? '20'), 100);
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.orderModel.countDocuments(filter),
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    restaurantId: string,
    orderId: string
  ): Promise<OrderResponseDto> {
    const order = await this.orderModel.findOne({
      _id: orderId,
      restaurantId,
    });
    if (!order) {
      throw new NotFoundException(
        `Order ${orderId} not found for restaurant ${restaurantId}`
      );
    }
    return this.toDto(order);
  }

  async findOrdersByCustomerSession(
    restaurantId: string,
    customerSessionId: string
  ): Promise<OrderResponseDto[]> {
    const orders = await this.orderModel.find({
      restaurantId,
      customerSessionId,
      isArchived: false,
    }).sort({ createdAt: -1 });

    return orders.map((order) => this.toDto(order));
  }

  async getAdminConsolidatedBill(restaurantId: string, tableId: string) {
    const restaurant = await this.restaurantModel.findById(restaurantId).lean();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant not found`);
    }

    // Find all orders for this table in the current session
    const orders = await this.orderModel.find({
      restaurantId,
      tableNumber: tableId,
      isArchived: false,
      // Get orders from today or recent session
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: 1 }).lean();

    if (!orders || orders.length === 0) {
      throw new NotFoundException(`No orders found for table ${tableId}`);
    }

    // Calculate consolidated totals
    let subtotal = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    const consolidatedOrders = orders.map((order) => {
      subtotal += order.subTotalAmount || 0;
      cgstAmount += order.cgstAmount || 0;
      sgstAmount += order.sgstAmount || 0;
      igstAmount += order.igstAmount || 0;
      taxAmount += order.taxAmount || 0;
      totalAmount += order.totalAmount || 0;

      return {
        orderNumber: order.orderNumber,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.pricing?.unitAmount || 0,
          lineTotal: item.pricing?.unitAmount * item.quantity || 0,
        })),
        orderTotal: order.totalAmount || 0,
      };
    });

    return {
      restaurant: {
        name: restaurant.name,
        address: restaurant.address,
        gstin: restaurant.gstNumber,
        phone: restaurant.contactInfo?.phone,
        email: restaurant.contactInfo?.email,
      },
      bill: {
        tableNumber: tableId,
        orders: consolidatedOrders,
        subtotal,
        taxAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        roundOffAmount: 0,
        totalAmount,
        billGeneratedAt: new Date().toISOString(),
      }
    };
  }

  async registerPaymentIntent(
    restaurantId: string,
    orderId: string,
    provider: string,
    gatewayOrderId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const order = await this.orderModel.findOne({ _id: orderId, restaurantId });

    if (!order) {
      throw new NotFoundException(
        `Order ${orderId} not found for restaurant ${restaurantId}`
      );
    }

    order.paymentProvider = provider;
    order.razorpayOrderId = gatewayOrderId;

    if (metadata) {
      const existingMeta =
        (order.paymentMeta as Record<string, unknown> | undefined) ?? {};
      order.paymentMeta = {
        ...existingMeta,
        ...metadata,
      };
    }

    await order.save();
  }

  async updateStatus(
    restaurantId: string,
    orderId: string,
    dto: UpdateOrderStatusDto
  ): Promise<OrderResponseDto> {
    // Validate inputs
    if (!orderId || orderId === 'undefined') {
      throw new BadRequestException('Invalid order ID');
    }

    if (!restaurantId || restaurantId === 'undefined') {
      throw new BadRequestException('Invalid restaurant ID');
    }

    const updateDoc: Record<string, unknown> = {};

    if (dto.status) {
      updateDoc.status = dto.status;
    }

    if (dto.progress !== undefined) {
      updateDoc.progress = dto.progress;
      if (dto.progress === OrderProgressStage.Done) {
        updateDoc.readyAt = new Date();
      }
    }

    if (dto.statusNote !== undefined) {
      updateDoc.statusNote = dto.statusNote;
    }

    let updated = await this.orderModel.findOneAndUpdate(
      { _id: orderId, restaurantId },
      { $set: updateDoc },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(
        `Order ${orderId} not found for restaurant ${restaurantId}`
      );
    }

    const response = this.toDto(updated);
    await this.recordEvent(orderId, restaurantId, 'order.status.updated', {
      status: response.status,
      progress: response.progress,
      statusNote: response.statusNote,
    });

    // DIRECT TABLE STATUS UPDATE: Update table status when order is completed or cancelled
    if (
      updated.tableId &&
      (updated.status === OrderStatus.Completed ||
        updated.status === OrderStatus.Cancelled)
    ) {
      try {
        await this.tableStatusService.updateTableStatusFromOrder(
          restaurantId,
          updated.tableId.toString(),
          updated.status === OrderStatus.Completed
            ? 'order-completed'
            : 'order-cancelled',
          {
            createdBy: 'system',
            createdByName: 'Order System',
          }
        );
        console.log(
          `Table status updated for table ${updated.tableId} after order ${updated.status}`
        );
      } catch (error) {
        console.error(
          `Failed to update table status for order ${response.orderNumber}:`,
          error
        );
        // Don't fail the order update if table status update fails
      }
    }

    // Handle customer session events
    if (updated.customerSessionId) {
      try {
        if (updated.status === OrderStatus.Cancelled) {
          // Notify session service about order cancellation
          const response = await fetch(
            `http://localhost:3000/customer-sessions/${updated.customerSessionId}/events/order-cancelled`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: updated._id.toString() }),
            }
          );

          if (!response.ok) {
            console.error(`Failed to notify session of order cancellation: ${response.status}`);
          }
        }
      } catch (error) {
        console.error(
          `Failed to notify session ${updated.customerSessionId} of order cancellation:`,
          error
        );
        // Don't fail the order update if session update fails
      }
    }

    this.ordersGateway.emitOrderUpdated(response);
    this.ordersSSEService.emitOrderUpdated(response);
    return response;
  }

  async updatePayment(
    restaurantId: string,
    orderId: string,
    dto: UpdateOrderPaymentDto,
    updatedBy?: string,
    skipNotification: boolean = false
  ): Promise<OrderResponseDto> {
    console.log('=== PAYMENT UPDATE SERVICE ===');
    console.log('Restaurant ID:', restaurantId);
    console.log('Order ID:', orderId);
    console.log('Payment DTO:', JSON.stringify(dto, null, 2));
    console.log('Updated By (user ID):', updatedBy);
    console.log('Updated By type:', typeof updatedBy);
    console.log('Updated By is truthy:', !!updatedBy);

    this.logger.log(
      `Updating payment for order ${orderId} by user: ${updatedBy || 'unknown'}`
    );

    // Validate inputs
    if (!orderId || orderId === 'undefined') {
      throw new BadRequestException('Invalid order ID');
    }

    if (!restaurantId || restaurantId === 'undefined') {
      throw new BadRequestException('Invalid restaurant ID');
    }

    const updateDoc: Record<string, unknown> = {};

    if (dto.paymentStatus) {
      updateDoc.paymentStatus = dto.paymentStatus;
      if (dto.paymentStatus === PaymentStatus.Paid) {
        updateDoc.paidAt = new Date();
        updateDoc.status = OrderStatus.Completed; // Update order status to completed when payment is completed
      }
    }

    if (dto.provider !== undefined) {
      updateDoc.paymentProvider = dto.provider;
    }

    if (dto.transactionId !== undefined) {
      updateDoc.paymentTransactionId = dto.transactionId;
    }

    if (dto.paymentMethod !== undefined) {
      updateDoc.paymentMethod = dto.paymentMethod;
    }

    // Handle final amount and rounding
    if (dto.finalAmount !== undefined) {
      updateDoc.finalAmount = dto.finalAmount;

      // Calculate roundOffAmount as finalAmount - originalTotal
      // This ensures proper calculation for TaxInvoice generation
      const originalOrder = await this.orderModel.findById(orderId).lean();
      if (originalOrder) {
        updateDoc.roundOffAmount = dto.finalAmount - originalOrder.totalAmount;
      }
    } else if (dto.roundOffAmount !== undefined) {
      updateDoc.roundOffAmount = dto.roundOffAmount;
    }

    let updated = await this.orderModel.findOneAndUpdate(
      { _id: orderId, restaurantId },
      { $set: updateDoc },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(
        `Order ${orderId} not found for restaurant ${restaurantId}`
      );
    }

    if (dto.paymentStatus === PaymentStatus.Paid && !skipNotification) {
      // Skip automatic transfer for direct payments (not using Razorpay transfers)
      // await this.transferToRestaurant(updated);

      // Send payment confirmation notification to managers/owners
      try {
        // Get staff member name if payment was marked by staff
        let staffMemberName: string | undefined;
        if (updatedBy) {
          const staffMember = await this.userModel
            .findById(updatedBy)
            .select('name')
            .lean();
          staffMemberName = staffMember?.name;
        }

        await this.paymentNotificationService.sendPaymentConfirmationNotification(
          restaurantId,
          orderId,
          updated.orderNumber,
          updated.totalAmount,
          updated.paymentMethod || 'cash',
          {
            tableId: updated.tableId?.toString(),
            tableNumber: updated.tableNumber,
            staffMemberName,
            customerName: updated.customerName,
            branchId: updated.branchId?.toString(),
          }
        );

        this.logger.log(
          `Payment notification sent for order ${updated.orderNumber}`
        );
      } catch (notificationError) {
        this.logger.error(
          `Failed to send payment notification for order ${updated.orderNumber}:`,
          notificationError
        );
        // Don't fail the payment update if notification fails
      }

      // Check if session should be closed after this payment (for staff payments)
      if (updated.customerSessionId && updated.tableId) {
        try {
          // Create a temporary sessionOrderId for consistency with webhook flow
          const sessionOrderId = `manual_${updated.tableId.toString()}_${Date.now()}`;
          await this.handleSessionCompletion(updated, sessionOrderId);

          this.logger.log('✅ Session completion handled for staff payment:', {
            orderId: updated._id.toString(),
            orderNumber: updated.orderNumber,
            customerSessionId: updated.customerSessionId,
          });
        } catch (sessionError) {
          this.logger.error(
            `Failed to handle session completion for staff payment ${updated.orderNumber}:`,
            sessionError
          );
          // Don't fail the payment update if session completion fails
        }
      }

      // Only generate tax invoice after all payment details are set
      if (updated) {
        updated = await this.ensureTaxInvoice(updated);

        // Auto-create or update receipt document for paid orders
        try {
          console.log('=== AUTO-RECEIPT CREATION/UPDATE ===');
          console.log('Processing paid order:', updated._id.toString());
          console.log('Table ID:', updated.tableId);
          console.log('Session ID:', updated.sessionId);

          // Check if this order already has a receipt
          const existingOrderReceipt =
            await this.receiptDocumentService.findByOrderId(
              updated._id.toString()
            );

          if (existingOrderReceipt) {
            console.log(
              'Order already has receipt:',
              existingOrderReceipt.receiptNumber
            );
            return; // Skip if this order is already in a receipt
          }

          // Find existing receipt for the same table/session to group orders
          let targetReceipt = null;

          if (updated.tableId) {
            // Look for existing receipt from the same table that's still active
            console.log('Searching for existing table receipt...');
            targetReceipt =
              await this.receiptDocumentService.findActiveTableReceipt(
                restaurantId,
                updated.tableId.toString()
              );
            console.log('Found existing table receipt:', !!targetReceipt);
          }

          if (targetReceipt) {
            // Add this order to existing receipt
            console.log(
              'Adding order to existing receipt:',
              targetReceipt.receiptNumber
            );

            await this.receiptDocumentService.addOrderToReceipt(
              targetReceipt._id.toString(),
              updated._id.toString(),
              updatedBy
            );

            this.logger.log(
              `Added order ${updated._id} to existing receipt ${targetReceipt.receiptNumber}`
            );
          } else {
            // Create new receipt for this table/session
            console.log('Creating new receipt with params:');
            console.log('- Restaurant ID:', restaurantId);
            console.log('- Order IDs:', [updated._id.toString()]);
            console.log('- Payment Method:', updated.paymentMethod || 'cash');
            console.log('- Payment Provider:', updated.paymentProvider);
            console.log('- Transaction ID:', updated.paymentTransactionId);
            console.log('- Updated By (User ID):', updatedBy);

            this.logger.log(
              `Auto-creating receipt document for paid order ${
                updated._id
              } by user: ${updatedBy || 'unknown'}`
            );

            const createdReceipt =
              await this.receiptDocumentService.createReceiptDocument(
                restaurantId,
                [updated._id.toString()],
                updated.paymentMethod || 'cash',
                updated.paymentProvider,
                updated.paymentTransactionId,
                updatedBy
              );

            console.log(
              'Receipt creation result:',
              createdReceipt ? 'SUCCESS' : 'FAILED'
            );
            this.logger.log(
              `Receipt document created successfully for order ${updated._id}`
            );
          }

          console.log('=== END RECEIPT CREATION/UPDATE LOG ===');
        } catch (error) {
          console.log('=== RECEIPT CREATION ERROR ===');
          console.log('Error details:', error);
          console.log('Error message:', error.message);
          console.log('Error stack:', error.stack);
          console.log('=== END ERROR LOG ===');

          this.logger.error(
            `Failed to auto-create receipt document for order ${updated._id}:`,
            error
          );
          // Don't throw error - payment succeeded, receipt creation failure shouldn't block
        }
      }

      if (
        updated.status !== OrderStatus.Completed &&
        updated.status !== OrderStatus.Cancelled
      ) {
        const finalUpdate = await this.orderModel.findByIdAndUpdate(
          updated._id,
          {
            $set: {
              status: OrderStatus.Completed,
              progress: OrderProgressStage.Done,
              readyAt: updated.readyAt ?? new Date(),
            },
          },
          { new: true }
        );

        if (finalUpdate) {
          updated = finalUpdate;
        }
      }
    }

    const response = this.toDto(updated);
    await this.recordEvent(orderId, restaurantId, 'order.payment.updated', {
      paymentStatus: response.paymentStatus,
      paymentMethod: response.paymentMethod,
      paidAt: response.paidAt,
      taxInvoiceNumber: response.taxInvoiceNumber,
      updatedBy: updatedBy || null,
    });

    // CUSTOMER SESSION AUTO-CLOSE LOGIC - Skip if notification is disabled (e.g., during batch processing)
    if (updated.tableId && dto.paymentStatus === PaymentStatus.Paid && !skipNotification) {
      try {
        console.log('=== AUTO-CLOSE SESSION CHECK ===');
        console.log(
          'Checking if all table orders are paid for tableId:',
          updated.tableId.toString()
        );

        // Check if all orders for this table are now paid
        const tableOrders = await this.orderModel
          .find({
            restaurantId: updated.restaurantId,
            tableId: updated.tableId,
            status: { $ne: OrderStatus.Cancelled }, // Exclude cancelled orders
          })
          .lean();

        console.log('Found table orders:', tableOrders.length);

        const unpaidOrders = tableOrders.filter(
          (order) => order.paymentStatus !== PaymentStatus.Paid
        );

        console.log('Unpaid orders remaining:', unpaidOrders.length);

        if (unpaidOrders.length === 0 && tableOrders.length > 0) {
          // All orders are paid - archive customer session
          console.log(
            '🎯 All orders paid! Archiving customer session for table:',
            updated.tableId.toString()
          );

          try {
            // Find the customer session for this table/order
            let sessionId = null;

            // Check if any order has sessionId (from customer orders)
            const sessionOrder = tableOrders.find(order => order.sessionId);
            if (sessionOrder) {
              sessionId = sessionOrder.sessionId;
            }

            if (sessionId) {
              // Calculate total amount for all paid orders
              const totalAmount = tableOrders.reduce((sum, order) => sum + order.totalAmount, 0);
              const orderIds = tableOrders.map(order => order._id.toString());

              // Archive the session
              await this.customerSessionsService.archiveSession(
                sessionId,
                orderIds,
                totalAmount,
                'paid'
              );

              console.log(`✅ Session ${sessionId} archived successfully with ${orderIds.length} orders`);
              this.logger.log(
                `Customer session ${sessionId} archived for table ${updated.tableId} - all orders paid (${orderIds.length} orders, total: ${totalAmount})`
              );
            } else {
              console.log('No session ID found in orders - likely staff order, skipping session archival');
            }

          } catch (sessionError) {
            console.log('Session archival failed:', sessionError);
            this.logger.error(
              `Failed to archive session for table ${updated.tableId}:`,
              sessionError
            );
            // Don't throw - payment already succeeded
          }
        } else {
          console.log('Session remains active - unpaid orders still exist');
        }

        console.log('=== END SESSION CHECK ===');
      } catch (error) {
        console.log('=== SESSION AUTO-CLOSE ERROR ===');
        console.log('Error:', error);
        this.logger.error(
          `Failed to auto-close session for table ${updated.tableId}:`,
          error
        );
        // Don't throw - this is a nice-to-have feature
      }
    }

    // DIRECT TABLE STATUS UPDATE: Update table status when payment is completed
    if (
      updated.tableId &&
      dto.paymentStatus === PaymentStatus.Paid &&
      updated.status === OrderStatus.Completed
    ) {
      try {
        await this.tableStatusService.updateTableStatusFromOrder(
          restaurantId,
          updated.tableId.toString(),
          'order-completed',
          {
            createdByName: 'Order System',
          }
        );
        console.log(
          `Table status updated for table ${updated.tableId} after payment completion`
        );
      } catch (error) {
        console.error(
          `Failed to update table status for table ${updated.tableId}:`,
          error
        );
        // Don't fail the payment update if table status update fails
      }
    }

    this.ordersGateway.emitOrderUpdated(response);
    this.ordersSSEService.emitOrderUpdated(response);
    return response;
  }

  /**
   * Create receipt document for multiple orders (combined receipt)
   */
  async createReceiptDocument(
    restaurantId: string,
    orderIds: string[],
    paymentMethod: 'cash' | 'upi' | 'card' = 'cash',
    paymentProvider?: string,
    transactionId?: string,
    createdBy?: string
  ): Promise<any> {
    try {
      const receiptDoc =
        await this.receiptDocumentService.createReceiptDocument(
          restaurantId,
          orderIds,
          paymentMethod,
          paymentProvider,
          transactionId,
          createdBy
        );

      this.logger.log(
        `Receipt document created: ${
          receiptDoc.receiptNumber
        } for orders: ${orderIds.join(', ')}`
      );

      return {
        receiptNumber: receiptDoc.receiptNumber,
        receiptId: receiptDoc._id,
        orderIds: receiptDoc.orderIds,
        totalAmount: receiptDoc.totalAmount,
        issuedAt: receiptDoc.issuedAt,
      };
    } catch (error) {
      this.logger.error('Error creating receipt document:', error);
      throw error;
    }
  }

  /**
   * Get receipt details for admin users
   */
  async getReceiptDetails(
    restaurantId: string,
    receiptNumber: string
  ): Promise<any> {
    try {
      const receipt = await this.receiptDocumentService.findByReceiptNumber(
        receiptNumber
      );

      if (!receipt) {
        throw new NotFoundException(`Receipt ${receiptNumber} not found`);
      }

      // Check if receipt belongs to this restaurant
      if (receipt.restaurantId._id.toString() !== restaurantId) {
        throw new NotFoundException(
          `Receipt ${receiptNumber} not found for this restaurant`
        );
      }

      // Get the orders associated with this receipt
      const orders = await this.orderModel
        .find({
          _id: { $in: receipt.orderIds },
          restaurantId: restaurantId,
        })
        .populate('createdBy', 'name email role')
        .lean();

      // Get payment update events to find who marked as paid
      const paymentEvents = await this.eventModel
        .find({
          orderId: { $in: receipt.orderIds },
          type: 'order.payment.updated',
          'payload.paymentStatus': 'paid',
        })
        .populate('payload.updatedBy', 'name email role')
        .sort({ createdAt: -1 })
        .lean();

      // Get staff info from receipt or events
      let staffInfo = null;
      if (receipt.createdBy) {
        const staff = await this.orderModel.db
          .collection('users')
          .findOne(
            { _id: receipt.createdBy },
            { projection: { name: 1, email: 1, role: 1 } }
          );
        staffInfo = staff;
      } else if (
        paymentEvents.length > 0 &&
        paymentEvents[0].payload?.updatedBy
      ) {
        staffInfo = paymentEvents[0].payload.updatedBy;
      }

      return {
        receipt: {
          receiptNumber: receipt.receiptNumber,
          restaurantId: receipt.restaurantId,
          orderIds: receipt.orderIds,
          tableNumber: receipt.tableNumber,
          customerName: receipt.customerName,
          customerPhone: receipt.customerPhone,
          items: receipt.items,
          subtotal: receipt.subtotal,
          taxAmount: receipt.taxAmount,
          totalAmount: receipt.totalAmount,
          paymentMethod: receipt.paymentMethod,
          paymentStatus: receipt.paymentStatus,
          issuedAt: receipt.issuedAt,
          createdAt: receipt.createdAt,
        },
        orders: orders.map((order) => ({
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdBy: order.createdBy,
          createdAt: order.createdAt,
          items: order.items,
          totalAmount: order.totalAmount,
        })),
        staffInfo: staffInfo
          ? {
              id: staffInfo._id,
              name: staffInfo.name,
              email: staffInfo.email,
              role: staffInfo.role,
              action: 'Marked payment as paid',
            }
          : {
              action: 'Customer self-payment or system payment',
            },
        paymentHistory: paymentEvents.map((event) => ({
          timestamp: event.createdAt,
          paymentStatus: event.payload?.paymentStatus,
          paymentMethod: event.payload?.paymentMethod,
          updatedBy: event.payload?.updatedBy || null,
        })),
      };
    } catch (error) {
      this.logger.error('Error getting receipt details:', error);
      throw error;
    }
  }

  /**
   * Get receipt details by order ID for admin users
   */
  async getReceiptDetailsByOrderId(
    restaurantId: string,
    orderId: string
  ): Promise<any> {
    try {
      // First find the receipt that contains this order
      const receipt = await this.receiptDocumentService.findByOrderId(orderId);
      if (!receipt) {
        throw new NotFoundException(`No receipt found for order ${orderId}`);
      }

      // Check if receipt belongs to this restaurant
      if (receipt.restaurantId._id.toString() !== restaurantId) {
        throw new NotFoundException(`Receipt not found for this restaurant`);
      }

      // Use the existing method to get full receipt details
      return this.getReceiptDetails(restaurantId, receipt.receiptNumber);
    } catch (error) {
      this.logger.error('Error getting receipt details by order ID:', error);
      throw error;
    }
  }

  async handleRazorpayWebhook(event: any): Promise<void> {
    const eventName = event?.event;
    if (!eventName) {
      this.logger.warn('Razorpay webhook received without event name');
      return;
    }

    // Handle order.paid events for customer session payments
    if (eventName === 'order.paid') {
      const orderData = event.payload?.order?.entity;
      const paymentData = event.payload?.payment?.entity;

      if (!orderData || !paymentData) {
        this.logger.warn('Missing order or payment data in order.paid webhook');
        return;
      }

      const notes = orderData.notes || {};

      // Check if this is a session payment
      if (notes.type === 'session_payment') {
        await this.handleSessionPayment(orderData, paymentData);

        // Send customer payment notifications to managers, owners, and assigned waiters
        await this.sendCustomerPaymentNotifications(orderData, paymentData);
      } else {
        // Regular order payment
        const orderId = notes.orderId;
        if (orderId) {
          await this.handleOrderFullyPaid(orderId, orderData);
        } else {
          this.logger.warn('No orderId found in order.paid webhook notes');
        }
      }
      return;
    }

    if (
      eventName !== 'payment.captured' &&
      eventName !== 'payment.authorized'
    ) {
      return;
    }

    const paymentEntity = event?.payload?.payment?.entity;
    if (!paymentEntity) {
      this.logger.warn(`Razorpay event ${eventName} missing payment entity`);
      return;
    }

    const razorpayOrderId: string | undefined = paymentEntity.order_id;
    const paymentId: string | undefined = paymentEntity.id;
    const notes: Record<string, string> = paymentEntity.notes ?? {};
    const restaurantId = notes.restaurantId;
    const orderId = notes.orderId;

    let orderDoc: OrderDocument | null = null;
    if (restaurantId && orderId) {
      orderDoc = await this.orderModel.findOne({ _id: orderId, restaurantId });
    }

    if (!orderDoc && razorpayOrderId) {
      orderDoc = await this.orderModel.findOne({ razorpayOrderId });
    }

    if (!orderDoc) {
      this.logger.warn(
        `Unable to locate order for Razorpay payment ${paymentId ?? 'unknown'}`
      );
      return;
    }

    const existingMeta =
      (orderDoc.paymentMeta as Record<string, unknown> | undefined) ?? {};
    const paymentMeta = {
      ...existingMeta,
      razorpay: {
        id: paymentId,
        orderId: razorpayOrderId,
        method: paymentEntity.method,
        status: paymentEntity.status,
        vpa: paymentEntity.vpa,
        wallet: paymentEntity.wallet,
        bank: paymentEntity.bank,
        upiTransactionId:
          paymentEntity.acquirer_data?.rrn ??
          paymentEntity.upi_transaction_id ??
          null,
        captured: paymentEntity.captured ?? false,
      },
    };

    await this.orderModel.updateOne(
      { _id: orderDoc._id },
      {
        $set: {
          razorpayOrderId,
          paymentMeta,
        },
      }
    );

    if (orderDoc.paymentStatus !== PaymentStatus.Paid) {
      this.logger.log(
        `Updating payment status to PAID for order ${orderDoc._id}`
      );
      await this.updatePayment(
        orderDoc.restaurantId.toString(),
        orderDoc._id.toString(),
        {
          paymentStatus: PaymentStatus.Paid,
          transactionId: paymentId,
          provider: 'razorpay',
        }
      );
      this.logger.log(
        `Payment status updated and WebSocket event emitted for order ${orderDoc._id}`
      );
    } else {
      this.logger.log(
        `Order ${orderDoc._id} already marked as PAID, skipping update`
      );
    }
  }

  async handleCashfreeWebhook(event: any): Promise<void> {
    const webhookHandleId = `HANDLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log('🔄 ORDERS SERVICE WEBHOOK HANDLER STARTED:', {
      webhookHandleId,
      eventType: event?.type,
      orderId: event?.data?.order?.order_id,
      paymentId: event?.data?.payment?.cf_payment_id,
      amount: event?.data?.order?.order_amount,
      fullEvent: event,
      timestamp: new Date().toISOString()
    });

    const eventType = event?.type;
    if (!eventType) {
      this.logger.warn('Cashfree webhook received without event type');
      return;
    }

    this.logger.log(`Processing Cashfree webhook: ${eventType}`);

    // Handle different Cashfree webhook events
    switch (eventType) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
      case 'PAYMENT_CHARGES_WEBHOOK':
        await this.handleCashfreePaymentSuccess(event);
        break;

      case 'PAYMENT_FAILED_WEBHOOK':
        await this.handleCashfreePaymentFailed(event);
        break;

      case 'PAYMENT_USER_DROPPED_WEBHOOK':
        await this.handleCashfreePaymentDropped(event);
        break;

      default:
        this.logger.warn(`Unknown Cashfree webhook event type: ${eventType}`);
    }
  }

  async handleCashfreeSettlementWebhook(event: any): Promise<void> {
    const eventType = event?.type;
    if (!eventType) {
      this.logger.warn(
        'Cashfree settlement webhook received without event type'
      );
      return;
    }

    this.logger.log(`Processing Cashfree settlement webhook: ${eventType}`);

    // Handle settlement events (for future use)
    switch (eventType) {
      case 'SETTLEMENT_SUCCESS_WEBHOOK':
        this.logger.log('Settlement success event received');
        break;
      case 'SETTLEMENT_FAILED_WEBHOOK':
        this.logger.log('Settlement failed event received');
        break;
      default:
        this.logger.warn(
          `Unknown Cashfree settlement webhook event type: ${eventType}`
        );
    }
  }

  private async handleCashfreePaymentSuccess(event: any): Promise<void> {
    const paymentSuccessId = `PAY_SUCCESS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log('💰 PAYMENT SUCCESS HANDLER STARTED:', {
      paymentSuccessId,
      eventType: event?.type,
      orderData: event.data?.order,
      paymentData: event.data?.payment,
      timestamp: new Date().toISOString()
    });

    const orderData = event.data?.order;
    const paymentData = event.data?.payment;

    if (!orderData || !paymentData) {
      this.logger.warn(
        'Missing order or payment data in Cashfree payment success webhook'
      );
      return;
    }

    const cashfreeOrderId = orderData.order_id;
    this.logger.log(
      `Processing Cashfree payment success for order: ${cashfreeOrderId}`
    );

    // Check if this is a session payment
    const isSessionPayment = cashfreeOrderId.includes('session_');

    if (isSessionPayment) {
      this.logger.log('🏓 SESSION PAYMENT DETECTED:', {
        paymentSuccessId,
        cashfreeOrderId,
        orderAmount: orderData.order_amount,
        timestamp: new Date().toISOString()
      });

      await this.handleCashfreeSessionPayment(orderData, paymentData);

      this.logger.log('📧 SENDING SESSION PAYMENT NOTIFICATIONS:', {
        paymentSuccessId,
        cashfreeOrderId,
        timestamp: new Date().toISOString()
      });

      await this.sendCashfreeCustomerPaymentNotifications(
        orderData,
        paymentData
      );
    } else {
      this.logger.log('📋 REGULAR ORDER PAYMENT DETECTED:', {
        paymentSuccessId,
        cashfreeOrderId,
        orderAmount: orderData.order_amount,
        timestamp: new Date().toISOString()
      });

      // Regular order payment - extract orderId from cashfreeOrderId
      const orderId = cashfreeOrderId.replace('restohand_', '');

      this.logger.log('🔄 CALLING handleOrderFullyPaid:', {
        paymentSuccessId,
        orderId,
        cashfreeOrderId,
        timestamp: new Date().toISOString()
      });

      await this.handleOrderFullyPaid(orderId, {
        order_id: cashfreeOrderId,
        payment: paymentData,
      });
    }
  }

  private async handleCashfreePaymentFailed(event: any): Promise<void> {
    const orderData = event.data?.order;
    const paymentData = event.data?.payment;

    if (!orderData) {
      this.logger.warn('Missing order data in Cashfree payment failed webhook');
      return;
    }

    this.logger.log(`Cashfree payment failed for order: ${orderData.order_id}`);
    // Handle payment failure - update order status, send notifications, etc.
    // TODO: Implement based on business requirements
  }

  private async handleCashfreePaymentDropped(event: any): Promise<void> {
    const orderData = event.data?.order;

    if (!orderData) {
      this.logger.warn(
        'Missing order data in Cashfree payment dropped webhook'
      );
      return;
    }

    this.logger.log(
      `Cashfree payment dropped for order: ${orderData.order_id}`
    );
    // Handle payment drop - update order status, clean up, etc.
    // TODO: Implement based on business requirements
  }

  private async handleCashfreeSessionPayment(
    orderData: any,
    paymentData: any
  ): Promise<void> {
    try {
      const cashfreeOrderId = orderData.order_id;
      // Extract the session order ID (remove 'restohand_' prefix)
      const sessionOrderId = cashfreeOrderId.replace('restohand_', '');

      this.logger.log(
        `Looking for orders with Cashfree sessionOrderId: ${sessionOrderId}`
      );

      // Find all orders in this session
      const orders = await this.orderModel.find({
        'paymentMeta.cashfree.sessionOrderId': sessionOrderId,
      });

      if (orders.length === 0) {
        this.logger.error(
          `No orders found for Cashfree session payment: ${cashfreeOrderId}`
        );
        return;
      }

      this.logger.log(
        `Found ${orders.length} orders for Cashfree session: ${sessionOrderId}`
      );

      // Check if orders are already paid (idempotency check)
      const unpaidOrders = orders.filter(order => order.paymentStatus !== PaymentStatus.Paid);

      if (unpaidOrders.length === 0) {
        this.logger.log(`All orders for session ${sessionOrderId} are already paid - skipping duplicate processing`);
        return;
      }

      this.logger.log(`Processing ${unpaidOrders.length} unpaid orders out of ${orders.length} total orders`);

      let processedCount = 0;
      for (const order of orders) {
        // Skip if already paid
        if (order.paymentStatus === PaymentStatus.Paid) {
          this.logger.log(`Order ${order._id} already paid - skipping`);
          continue;
        }
        // Extract payment method string from Cashfree's complex object
        let paymentMethodString = 'upi'; // default
        if (paymentData.payment_method) {
          if (typeof paymentData.payment_method === 'string') {
            paymentMethodString = paymentData.payment_method;
          } else if (paymentData.payment_method.upi) {
            paymentMethodString = 'upi';
          } else if (paymentData.payment_method.card) {
            paymentMethodString = 'card';
          } else if (paymentData.payment_method.netbanking) {
            paymentMethodString = 'netbanking';
          } else if (paymentData.payment_method.wallet) {
            paymentMethodString = 'wallet';
          }
        }

        // Mark each order as paid
        await this.updatePayment(
          order.restaurantId.toString(),
          order._id.toString(),
          {
            paymentStatus: PaymentStatus.Paid,
            transactionId: paymentData.cf_payment_id?.toString(),
            provider: 'cashfree',
            paymentMethod: paymentMethodString,
          },
          null, // no updatedBy for customer payments
          true // skip notification to prevent duplicates
        );
        processedCount++;
      }

      this.logger.log(
        `Cashfree session payment processed: ${processedCount} orders marked as paid`
      );

      // Handle session completion after all orders are processed
      if (processedCount > 0 && orders.length > 0) {
        const firstOrder = orders[0];
        await this.handleSessionCompletion(firstOrder, sessionOrderId);
      }
    } catch (error) {
      this.logger.error('Failed to handle Cashfree session payment:', error);
    }
  }

  private async handleSessionCompletion(order: any, sessionOrderId: string): Promise<void> {
    const sessionCompletionId = `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log('🏁 SESSION COMPLETION HANDLER STARTED:', {
      sessionCompletionId,
      tableId: order.tableId?.toString(),
      restaurantId: order.restaurantId?.toString(),
      sessionOrderId,
      timestamp: new Date().toISOString()
    });

    try {
      // Check if all orders for this customer session are paid
      const tableOrders = await this.orderModel
        .find({
          restaurantId: order.restaurantId,
          customerSessionId: order.customerSessionId,
          status: { $nin: [OrderStatus.Cancelled] }  // Include completed orders, exclude only cancelled
        })
        .lean();

      const unpaidOrders = tableOrders.filter(
        (tableOrder) => tableOrder.paymentStatus !== PaymentStatus.Paid
      );

      this.logger.log('📊 SESSION COMPLETION CHECK:', {
        sessionCompletionId,
        tableId: order.tableId?.toString(),
        totalOrders: tableOrders.length,
        unpaidOrders: unpaidOrders.length,
        sessionComplete: unpaidOrders.length === 0
      });

      if (unpaidOrders.length === 0 && tableOrders.length > 0) {
        this.logger.log('🎯 All orders paid! Auto-closing customer session for table:', order.tableId?.toString());

        // Mark session as closed
        await this.orderModel.updateMany(
          {
            restaurantId: order.restaurantId,
            tableId: order.tableId,
          },
          {
            $set: { sessionClosed: true, sessionClosedAt: new Date() },
          }
        );

        // Close the customer session to prevent reuse in new orders
        if (order.customerSessionId) {
          // Calculate payment totals from all orders in the session
          const totalPaidAmount = tableOrders
            .filter(tableOrder => tableOrder.paymentStatus === PaymentStatus.Paid)
            .reduce((sum, tableOrder) => sum + tableOrder.totalAmount, 0);

          const totalPendingAmount = tableOrders
            .filter(tableOrder => tableOrder.paymentStatus !== PaymentStatus.Paid)
            .reduce((sum, tableOrder) => sum + tableOrder.totalAmount, 0);

          const allOrdersPaid = unpaidOrders.length === 0 && tableOrders.length > 0;

          await this.customerSessionModel.findOneAndUpdate(
            { sessionId: order.customerSessionId },
            {
              $set: {
                status: SessionStatus.CLOSED,
                closedAt: new Date(),
                closureReason: SessionClosureReason.PAYMENT_COMPLETED,
                closureDescription: 'Session automatically closed after payment completion',
                paidAmount: totalPaidAmount,
                pendingAmount: totalPendingAmount,
                allOrdersPaid: allOrdersPaid,
              },
            }
          );

          this.logger.log('✅ Customer session closed after payment:', {
            sessionCompletionId,
            customerSessionId: order.customerSessionId,
            closureReason: SessionClosureReason.PAYMENT_COMPLETED,
            totalPaidAmount,
            totalPendingAmount,
            allOrdersPaid,
          });
        }

        // Update table status
        if (order.tableId) {
          await this.tableStatusService.updateTableStatusFromOrder(
            order.restaurantId.toString(),
            order.tableId.toString(),
            'order-completed',
            {
              createdByName: 'Order System',
            }
          );
        }

        this.logger.log(`Customer session auto-closed for table ${order.tableId} - all orders paid`);
      }
    } catch (error) {
      this.logger.error('Failed to handle session completion:', {
        sessionCompletionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  private async sendCashfreeCustomerPaymentNotifications(
    orderData: any,
    paymentData: any
  ): Promise<void> {
    const notificationSendId = `NOTIFY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log('📬 CUSTOMER PAYMENT NOTIFICATIONS STARTED:', {
      notificationSendId,
      cashfreeOrderId: orderData.order_id,
      paymentAmount: orderData.order_amount,
      paymentId: paymentData.cf_payment_id,
      timestamp: new Date().toISOString()
    });

    try {
      const cashfreeOrderId = orderData.order_id;
      const sessionOrderId = cashfreeOrderId.replace('restohand_', '');

      this.logger.log('🔍 SEARCHING FOR SESSION ORDERS:', {
        notificationSendId,
        sessionOrderId,
        searchCriteria: { 'paymentMeta.cashfree.sessionOrderId': sessionOrderId }
      });

      // Find all orders in this session
      const orders = await this.orderModel
        .find({
          'paymentMeta.cashfree.sessionOrderId': sessionOrderId,
        })
        .lean();

      if (orders.length === 0) {
        this.logger.warn(
          `No orders found for Cashfree payment notification: ${cashfreeOrderId}`
        );
        return;
      }

      const firstOrder = orders[0];
      const amount = paymentData.payment_amount; // Already in rupees for Cashfree

      // Extract payment method string from Cashfree's complex object
      let paymentMethod = 'upi'; // default
      if (paymentData.payment_method) {
        if (typeof paymentData.payment_method === 'string') {
          paymentMethod = paymentData.payment_method;
        } else if (paymentData.payment_method.upi) {
          paymentMethod = 'upi';
        } else if (paymentData.payment_method.card) {
          paymentMethod = 'card';
        } else if (paymentData.payment_method.netbanking) {
          paymentMethod = 'netbanking';
        } else if (paymentData.payment_method.wallet) {
          paymentMethod = 'wallet';
        }
      }
      const restaurantId = firstOrder.restaurantId.toString();
      const orderIds = orders.map((o) => o._id.toString());

      // Get table details
      let tableNumber = firstOrder.tableNumber;
      let branchId = firstOrder.branchId?.toString();
      let tableId = firstOrder.tableId?.toString();

      // Send notification to managers, owners, and assigned waiters
      this.logger.log('🚀 CALLING PAYMENT CONFIRMATION NOTIFICATION (Cashfree Customer):', {
        notificationSendId,
        restaurantId,
        orderId: firstOrder._id.toString(),
        orderNumber: firstOrder.orderNumber,
        amount,
        paymentMethod,
        tableId,
        tableNumber,
        branchId,
        orderCount: orders.length,
        timestamp: new Date().toISOString()
      });

      await this.paymentNotificationService.sendPaymentConfirmationNotification(
        restaurantId,
        firstOrder._id.toString(), // Use first order ID as primary
        firstOrder.orderNumber,
        amount,
        paymentMethod,
        {
          tableId,
          tableNumber,
          branchId,
          isCustomerPayment: true,
          customerName: firstOrder.customerName || 'Guest Customer',
        }
      );

      this.logger.log(
        `Cashfree customer payment notification sent for order ${firstOrder.orderNumber} ` +
          `(${orders.length} orders, ₹${amount}, Table ${tableNumber})`
      );
    } catch (error) {
      this.logger.error(
        'Failed to send Cashfree customer payment notifications:',
        error
      );
    }
  }

  async listEvents(
    restaurantId: string,
    orderId: string
  ): Promise<OrderEventResponseDto[]> {
    const events = await this.eventModel
      .find({ orderId, restaurantId })
      .sort({ createdAt: -1 })
      .lean();

    return events.map((event) => ({
      id: event._id.toString(),
      type: event.type,
      payload: event.payload ?? undefined,
      createdAt: event.createdAt
        ? event.createdAt.toISOString()
        : new Date().toISOString(),
    }));
  }

  async addItemsToOrder(
    restaurantId: string,
    orderId: string,
    dto: { items: any[]; notes?: string }
  ): Promise<OrderResponseDto> {
    const order = await this.findOne(restaurantId, orderId);

    if (
      order.status === OrderStatus.Completed ||
      order.status === OrderStatus.Cancelled
    ) {
      throw new BadRequestException(
        'Cannot add items to completed or cancelled orders'
      );
    }

    // Get restaurant info for GST calculation
    const restaurant = await this.restaurantModel.findById(restaurantId).lean();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    const customerState =
      order.customerState || restaurant.address?.state || 'Kerala';

    let defaultGstRateId: string | undefined;
    if (restaurant.applyDefaultGstToMenuItems) {
      const defaultRate = await this.gstService.getDefaultGstRate(restaurantId);
      if (!defaultRate) {
        throw new BadRequestException(
          'Default GST rate is required when automatic GST is enabled'
        );
      }
      defaultGstRateId = defaultRate.id;
    }

    // Process new items
    const { items: newItems, summary: newItemsSummary } =
      await this.prepareOrderPricing(
        restaurantId,
        { items: dto.items } as any,
        customerState,
        restaurant.applyDefaultGstToMenuItems ?? false,
        defaultGstRateId
      );

    // Get existing order document
    const orderDoc = await this.orderModel.findById(orderId);
    if (!orderDoc) {
      throw new NotFoundException('Order not found');
    }

    // Combine existing and new items
    const allItems = [...orderDoc.items, ...newItems];

    // Recalculate totals (handle both existing and new item structures)
    const subtotal = allItems.reduce((sum, item) => {
      // For new items, use lineTotal; for existing items, calculate from pricing
      const lineTotal =
        'lineTotal' in item
          ? item.lineTotal
          : item.pricing.unitAmount * item.quantity;
      return sum + lineTotal;
    }, 0);

    const taxAmount = allItems.reduce((sum, item) => {
      // For new items, use taxAmount; for existing items, use gst.totalTaxAmount
      const tax =
        'taxAmount' in item ? item.taxAmount : item.gst?.totalTaxAmount || 0;
      return sum + tax;
    }, 0);

    const cgstAmount = allItems.reduce((sum, item) => {
      const cgst =
        'cgstAmount' in item ? item.cgstAmount : item.gst?.cgstAmount || 0;
      return sum + cgst;
    }, 0);

    const sgstAmount = allItems.reduce((sum, item) => {
      const sgst =
        'sgstAmount' in item ? item.sgstAmount : item.gst?.sgstAmount || 0;
      return sum + sgst;
    }, 0);

    const igstAmount = allItems.reduce((sum, item) => {
      const igst =
        'igstAmount' in item ? item.igstAmount : item.gst?.igstAmount || 0;
      return sum + igst;
    }, 0);

    const totalBeforeRoundOff = subtotal + taxAmount;
    const roundOffAmount = this.calculateRoundOff(totalBeforeRoundOff);
    const totalAmount = this.roundToTwo(totalBeforeRoundOff + roundOffAmount);

    // Update order
    await this.orderModel.findByIdAndUpdate(orderId, {
      items: allItems,
      subTotalAmount: subtotal,
      taxAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      roundOffAmount,
      totalAmount,
      notes: dto.notes
        ? [orderDoc.notes, dto.notes].filter(Boolean).join(' | ')
        : orderDoc.notes,
    });

    // Create event
    await this.recordEvent(orderId, restaurantId, 'items_added', {
      newItems: newItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
      })),
      addedAmount: newItemsSummary.totalAmount,
    });

    // Emit real-time update
    const updatedOrder = await this.findOne(restaurantId, orderId);
    this.ordersGateway.emitOrderUpdated(updatedOrder);
    this.ordersSSEService.emitOrderUpdated(updatedOrder);

    this.logger.log(
      `Added ${newItems.length} items to order ${orderId}. New total: ₹${totalAmount}`
    );

    return updatedOrder;
  }

  async generateBill(restaurantId: string, orderId: string) {
    const order = await this.findOne(restaurantId, orderId);
    const restaurant = await this.restaurantModel.findById(restaurantId).lean();

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Mark bill as generated if not already
    if (!order.billGeneratedAt) {
      await this.orderModel.findByIdAndUpdate(orderId, {
        billGeneratedAt: new Date(),
      });

      await this.recordEvent(orderId, restaurantId, 'bill_generated', {
        totalAmount: order.totalAmount,
        generatedAt: new Date().toISOString(),
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurant: {
        name: restaurant.name,
        address: restaurant.address,
        gstin: restaurant.gstNumber,
        phone: restaurant.contactInfo?.phone,
        email: restaurant.contactInfo?.email,
      },
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
        gstin: order.customerGstin,
        state: order.customerState,
      },
      tableNumber: order.tableNumber,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.pricing.unitAmount,
        lineTotal: item.lineTotal,
        taxAmount: item.taxAmount,
        cgstAmount: item.cgstAmount || 0,
        sgstAmount: item.sgstAmount || 0,
        igstAmount: item.igstAmount || 0,
      })),
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      cgstAmount: order.cgstAmount,
      sgstAmount: order.sgstAmount,
      igstAmount: order.igstAmount,
      roundOffAmount: order.roundOffAmount,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      billGeneratedAt:
        order.billGeneratedAt?.toISOString() || new Date().toISOString(),
      notes: order.notes,
    };
  }

  private async prepareOrderPricing(
    restaurantId: string,
    dto: CreateOrderDto,
    customerState: string,
    useDefaultGst: boolean,
    defaultGstRateId?: string
  ): Promise<{
    items: Order['items'];
    summary: TaxCalculation;
  }> {
    const menuItemIds = dto.items.map((item) => item.menuItemId);

    const menuItems = await this.menuItemModel
      .find({ _id: { $in: menuItemIds }, restaurantId, isAvailable: true })
      .lean();

    const menuMap = new Map<string, (typeof menuItems)[number]>(
      menuItems.map((item) => [item._id.toString(), item])
    );

    const missing = menuItemIds.find((id) => !menuMap.has(id));
    if (missing) {
      throw new NotFoundException(
        `Menu item ${missing} not found for restaurant ${restaurantId}`
      );
    }

    const calculationInput = dto.items.map((item) => {
      const menuItem = menuMap.get(item.menuItemId)!;

      if (!menuItem.pricing) {
        throw new BadRequestException(
          'Menu item pricing configuration is missing'
        );
      }

      const quantity = item.quantity;
      if (quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
      }

      const requestedUnitAmount =
        item.pricing?.unitAmount ?? menuItem.pricing.amount;
      const unitPrice = this.roundToTwo(requestedUnitAmount);
      if (unitPrice < 0) {
        throw new BadRequestException('Unit amount cannot be negative');
      }

      const rawDiscount = item.pricing?.discountAmount ?? 0;
      if (rawDiscount < 0) {
        throw new BadRequestException('Discount amount cannot be negative');
      }

      const maxDiscount = this.roundToTwo(unitPrice * quantity);
      const discountAmount = this.roundToTwo(
        Math.min(rawDiscount, maxDiscount)
      );

      let gstRateId = menuItem.gstRateId;
      let gstRateOverride = menuItem.gstRate;

      if (useDefaultGst) {
        gstRateId = defaultGstRateId;
        gstRateOverride = undefined;
      }

      return {
        menuItemId: item.menuItemId,
        name: menuItem.name,
        quantity,
        unitPrice,
        hsnCode: menuItem.hsnCode,
        gstRateId,
        gstRateOverride,
        discountAmount,
        isTaxInclusive: menuItem.pricing?.isTaxInclusive ?? false,
      };
    });

    // Transform to Smart GST service format
    const smartGstItems: OrderItemGstData[] = calculationInput.map(item => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount
    }));

    const { items: computedItems, summary } = await this.smartGstService.calculateOrderGst(
      restaurantId,
      smartGstItems,
      customerState
    );

    const orderItems = computedItems.map((computed, index) => {
      const requestItem = dto.items[index];
      const menuItem = menuMap.get(requestItem.menuItemId)!;
      const currency = menuItem.pricing?.currency ?? 'INR';
      const grossAmount = computed.unitPrice * computed.quantity;

      return {
        menuItemId: menuItem._id.toString(),
        name: computed.name,
        quantity: computed.quantity,
        pricing: {
          unitAmount: computed.unitPrice,
          currency,
          taxAmount: computed.totalTaxAmount,
          discountAmount: computed.discountAmount,
        },
        gst: {
          hsnCode: computed.hsnCode,
          gstRateId: undefined, // Smart GST doesn't use gstRateId
          gstRate: computed.gstRate,
          cgstAmount: computed.cgstAmount,
          sgstAmount: computed.sgstAmount,
          igstAmount: computed.igstAmount,
          totalTaxAmount: computed.totalTaxAmount,
          taxableAmount: computed.taxableAmount,
          totalWithTax: computed.totalWithTax,
          grossAmount: grossAmount,
          isTaxInclusive: false, // Smart GST always calculates exclusive
        },
        selectedModifiers: (requestItem.selectedModifiers || []).map(mod => ({
          modifierId: mod.modifierId,
          modifierName: mod.modifierName,
          selectedOptions: mod.selectedOptions.map(opt => ({
            optionId: opt.optionId,
            optionName: opt.optionName,
            priceAdjustment: opt.priceAdjustment,
            quantity: opt.quantity || 1
          }))
        })),
        activePriceTagId: requestItem.activePriceTagId,
        notes: requestItem.notes,
      };
    });

    // Transform Smart GST summary to expected TaxCalculation format
    const transformedSummary: TaxCalculation = {
      grossAmount: summary.subtotal + summary.discountAmount,
      discountAmount: summary.discountAmount,
      subtotal: summary.taxableAmount,
      cgstAmount: summary.cgstAmount,
      sgstAmount: summary.sgstAmount,
      igstAmount: summary.igstAmount,
      totalTaxAmount: summary.totalTaxAmount,
      totalAmount: summary.totalAmount,
      taxType: summary.taxType,
    };

    return {
      items: orderItems,
      summary: transformedSummary,
    };
  }

  private roundToTwo(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private calculateRoundOff(amount: number): number {
    const rounded = Math.round(amount);
    return this.roundToTwo(rounded - amount);
  }

  async generateInvoiceHtml(
    restaurantId: string,
    orderId: string
  ): Promise<{ filename: string; html: string }> {
    const [order, restaurant] = await Promise.all([
      this.orderModel.findOne({ _id: orderId, restaurantId }).lean(),
      this.restaurantModel.findById(restaurantId).lean(),
    ]);

    if (!order) {
      throw new NotFoundException(
        `Order ${orderId} not found for restaurant ${restaurantId}`
      );
    }

    const restaurantName = restaurant?.name ?? 'Restohand Restaurant';
    const restaurantGstin = restaurant?.gstin ?? 'NA';
    const restaurantAddress = restaurant
      ? `${restaurant.address?.line1 ?? ''}${
          restaurant.address?.line2 ? ', ' + restaurant.address.line2 : ''
        }, ${restaurant.address?.city ?? ''}, ${
          restaurant.address?.state ?? ''
        } ${restaurant.address?.postalCode ?? ''}`
      : '';

    const formatAmount = (value: number) => this.roundToTwo(value).toFixed(2);

    const itemsRows = order.items
      .map((item) => {
        const taxable =
          item.gst?.taxableAmount ??
          this.roundToTwo(
            item.pricing.unitAmount * item.quantity -
              (item.pricing.discountAmount ?? 0)
          );
        const tax =
          item.gst?.totalTaxAmount ??
          this.roundToTwo(item.pricing.taxAmount ?? 0);
        const total = item.gst?.totalWithTax ?? this.roundToTwo(taxable + tax);
        return `<tr>
          <td>${item.name}</td>
          <td style="text-align:right;">${item.quantity}</td>
          <td style="text-align:right;">₹${formatAmount(taxable)}</td>
          <td style="text-align:right;">₹${formatAmount(tax)}</td>
          <td style="text-align:right;">₹${formatAmount(total)}</td>
        </tr>`;
      })
      .join('');

    const cgstAmount = this.roundToTwo(order.cgstAmount ?? 0);
    const sgstAmount = this.roundToTwo(order.sgstAmount ?? 0);
    const igstAmount = this.roundToTwo(order.igstAmount ?? 0);

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Invoice #${order.taxInvoiceNumber ?? order.orderNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #111827; }
      h1 { margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th, td { padding: 8px 4px; border-bottom: 1px solid #E5E7EB; }
      th { text-align: left; background-color: #F3F4F6; }
      .totals { margin-top: 24px; }
      .meta { margin-top: 16px; }
    </style>
  </head>
  <body>
    <h1>${restaurantName}</h1>
    <p class="meta">GSTIN: ${restaurantGstin}</p>
    <p class="meta">${restaurantAddress}</p>
    <p><strong>Invoice:</strong> ${
      order.taxInvoiceNumber ?? order.orderNumber
    }</p>
    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString(
      'en-IN'
    )}</p>
    <p><strong>Customer:</strong> ${order.customerName ?? 'Guest'}${
      order.customerGstin ? ` (GSTIN: ${order.customerGstin})` : ''
    }</p>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:right;">Qty</th>
          <th style="text-align:right;">Taxable Value</th>
          <th style="text-align:right;">GST</th>
          <th style="text-align:right;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>
    <div class="totals">
      <p><strong>Gross Amount:</strong> ₹${formatAmount(
        order.grossAmount ?? order.subTotalAmount
      )}</p>
      <p><strong>Discount:</strong> ₹${formatAmount(
        order.discountAmount ?? 0
      )}</p>
      <p><strong>Taxable Amount:</strong> ₹${formatAmount(
        order.subTotalAmount
      )}</p>
      <p><strong>CGST:</strong> ₹${formatAmount(cgstAmount)}</p>
      <p><strong>SGST:</strong> ₹${formatAmount(sgstAmount)}</p>
      ${
        igstAmount > 0
          ? `<p><strong>IGST:</strong> ₹${formatAmount(igstAmount)}</p>`
          : ''
      }
      <p><strong>Tax Type:</strong> ${order.taxType ?? 'intra-state'}</p>
      <p><strong>Round Off:</strong> ₹${formatAmount(
        order.roundOffAmount ?? 0
      )}</p>
      <p><strong>Total Payable:</strong> ₹${formatAmount(order.totalAmount)}</p>
      <p><strong>Payment method:</strong> ${order.paymentMethod}</p>
      <p><strong>Status:</strong> ${order.paymentStatus}</p>
    </div>
  </body>
</html>`;

    return {
      filename: `invoice-${order.taxInvoiceNumber ?? order.orderNumber}.html`,
      html,
    };
  }

  private async recordEvent(
    orderId: string,
    restaurantId: string,
    type: string,
    payload?: Record<string, unknown>
  ) {
    await this.eventModel.create({
      orderId,
      restaurantId,
      type,
      payload,
    });
  }

  private async ensureTaxInvoice(order: OrderDocument): Promise<OrderDocument> {
    if (order.taxInvoiceNumber) {
      return order;
    }

    // Skip tax invoice generation if there's a customer discount (negative roundOff)
    // This prevents TaxInvoice schema validation error with negative roundOffAmount
    if (order.roundOffAmount && order.roundOffAmount < 0) {
      this.logger.warn(
        `Skipping TaxInvoice generation for order ${order._id} due to customer discount (roundOff: ${order.roundOffAmount})`
      );
      return order;
    }

    const restaurantId = order.restaurantId.toString();
    const orderId = order._id.toString();

    const preRoundTotal = this.roundToTwo(
      order.subTotalAmount + order.taxAmount
    );

    // Use finalAmount if available, otherwise use calculated total
    // For TaxInvoice generation, we need to handle rounding correctly
    const finalInvoiceAmount = order.finalAmount ?? preRoundTotal;
    const calculatedRoundOff = order.finalAmount
      ? order.finalAmount - preRoundTotal
      : 0;

    // Ensure roundOffAmount is non-negative for TaxInvoice schema
    // If the customer got a discount (negative roundOff), we'll handle it differently
    const finalRoundOffAmount = Math.max(0, calculatedRoundOff);

    const items: OrderItemWithTax[] = order.items.map((item) => {
      const grossAmount =
        item.gst?.grossAmount ??
        this.roundToTwo(item.pricing.unitAmount * item.quantity);
      const taxableAmount =
        item.gst?.taxableAmount ??
        this.roundToTwo(grossAmount - (item.pricing.discountAmount ?? 0));
      const discountAmount = this.roundToTwo(item.pricing.discountAmount ?? 0);
      const totalTaxAmount =
        item.gst?.totalTaxAmount ??
        this.roundToTwo(item.pricing.taxAmount ?? 0);
      const totalWithTax =
        item.gst?.totalWithTax ??
        this.roundToTwo(taxableAmount + totalTaxAmount);
      const unitPrice =
        item.quantity > 0
          ? this.roundToTwo(taxableAmount / item.quantity)
          : item.pricing.unitAmount;

      return {
        menuItemId: item.menuItemId?.toString() ?? '',
        name: item.name,
        quantity: item.quantity,
        unitPrice,
        hsnCode: item.gst?.hsnCode,
        gstRateId: item.gst?.gstRateId,
        gstRate: item.gst?.gstRate ?? 0,
        cgstAmount: this.roundToTwo(item.gst?.cgstAmount ?? 0),
        sgstAmount: this.roundToTwo(item.gst?.sgstAmount ?? 0),
        igstAmount: this.roundToTwo(item.gst?.igstAmount ?? 0),
        totalTaxAmount,
        discountAmount,
        taxableAmount,
        totalWithTax,
        grossAmount,
        isTaxInclusive: item.gst?.isTaxInclusive ?? false,
      };
    });

    const summary: TaxCalculation = {
      grossAmount:
        order.grossAmount ??
        this.roundToTwo(order.subTotalAmount + (order.discountAmount ?? 0)),
      discountAmount: order.discountAmount ?? 0,
      subtotal: order.subTotalAmount,
      cgstAmount: order.cgstAmount ?? 0,
      sgstAmount: order.sgstAmount ?? 0,
      igstAmount: order.igstAmount ?? 0,
      totalTaxAmount: order.taxAmount ?? 0,
      totalAmount: finalInvoiceAmount, // Use final amount collected
      taxType:
        (order.taxType as 'intra-state' | 'inter-state') ?? 'intra-state',
    };

    const invoiceNumber = await this.gstService.generateTaxInvoice(
      restaurantId,
      orderId,
      {
        customerName: order.customerName ?? 'Guest Customer',
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        customerGstin: order.customerGstin,
        tableNumber: order.tableNumber,
        items,
        summary,
        discountAmount: order.discountAmount,
      }
    );

    const updated = await this.orderModel.findByIdAndUpdate(
      order._id,
      {
        $set: {
          taxInvoiceNumber: invoiceNumber,
          taxInvoiceGeneratedAt: new Date(),
        },
      },
      { new: true }
    );

    if (updated) {
      await this.recordEvent(
        order._id.toString(),
        restaurantId,
        'order.invoice.generated',
        {
          taxInvoiceNumber: invoiceNumber,
        }
      );
      return updated;
    }

    return order;
  }

  private async generateOrderNumber(restaurantId: string): Promise<string> {
    // Get restaurant to fetch its slug
    const restaurant = await this.restaurantModel.findById(restaurantId).lean();
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Atomically increment the counter for this restaurant
    const counter = await this.orderCounterModel.findOneAndUpdate(
      { restaurantId },
      { $inc: { lastOrderNumber: 1 } },
      {
        upsert: true, // Create if doesn't exist
        new: true, // Return the updated document
        setDefaultsOnInsert: true,
      }
    );

    const orderNumber = counter.lastOrderNumber.toString().padStart(4, '0');

    // Format: {restaurant-slug}-{order-number}
    return `${restaurant.slug}-${orderNumber}`;
  }

  private async transferToRestaurant(order: OrderDocument): Promise<void> {
    try {
      // Get restaurant payment configuration
      const restaurant = await this.restaurantModel.findById(
        order.restaurantId
      );

      if (!restaurant?.paymentConfig?.razorpayFundAccountId) {
        this.logger.warn(
          `Restaurant ${order.restaurantId} doesn't have fund account configured. Skipping transfer.`
        );
        return;
      }

      if (restaurant.paymentConfig.settlementType !== 'transfers') {
        this.logger.warn(
          `Restaurant ${order.restaurantId} doesn't use transfers settlement. Skipping transfer.`
        );
        return;
      }

      // Calculate transfer amount (total order amount minus platform fee)
      const platformFeePercent = 3; // 3% platform fee
      const platformFee = Math.round(
        (order.totalAmount * platformFeePercent) / 100
      );
      const transferAmount = order.totalAmount - platformFee;

      if (transferAmount <= 0) {
        this.logger.warn(
          `Transfer amount is ≤ 0 for order ${order._id}. Skipping transfer.`
        );
        return;
      }

      // Create transfer
      const transfer = await this.razorpayService.createTransfer({
        account: restaurant.paymentConfig.razorpayFundAccountId,
        amount: transferAmount,
        currency: 'INR',
        notes: {
          order_id: order._id.toString(),
          restaurant_id: order.restaurantId.toString(),
          order_number: order.orderNumber,
          platform_fee: platformFee.toString(),
          transfer_amount: transferAmount.toString(),
        },
      });

      this.logger.log(
        `Transfer created: ₹${transferAmount / 100} sent to restaurant ${
          restaurant.name
        } for order ${order.orderNumber} (Transfer ID: ${transfer.id})`
      );

      // Record the transfer in order events
      await this.recordEvent(
        order._id.toString(),
        order.restaurantId,
        'order.transfer.created',
        {
          transferId: transfer.id,
          transferAmount: transferAmount,
          platformFee: platformFee,
          fundAccountId: restaurant.paymentConfig.razorpayFundAccountId,
        }
      );
    } catch (error) {
      this.logger.error(
        `Failed to transfer money for order ${order._id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );

      // Record the failure but don't block the payment process
      await this.recordEvent(
        order._id.toString(),
        order.restaurantId,
        'order.transfer.failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
    }
  }

  async findById(orderId: string): Promise<OrderDocument | null> {
    return this.orderModel.findById(orderId).lean();
  }

  toDto(doc: OrderDocument): OrderResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
      sessionId: doc.sessionId?.toString(),
      customerSessionId: doc.customerSessionId, // Add missing customerSessionId field
      createdBy: doc.createdBy?.toString(),
      orderNumber: doc.orderNumber,
      tableNumber: doc.tableNumber,
      tableId: doc.tableId?.toString(),
      customerName: doc.customerName,
      customerPhone: doc.customerPhone,
      customerEmail: doc.customerEmail,
      customerGstin: doc.customerGstin,
      customerState: doc.customerState,
      status: doc.status,
      paymentStatus: doc.paymentStatus,
      paymentMethod: doc.paymentMethod,
      progress: doc.progress,
      items: doc.items.map((item) => ({
        menuItemId: item.menuItemId?.toString(),
        name: item.name,
        quantity: item.quantity,
        pricing: {
          unitAmount: item.pricing.unitAmount,
          currency: item.pricing.currency,
          taxAmount: item.pricing.taxAmount,
          discountAmount: item.pricing.discountAmount,
        },
        gst: item.gst
          ? {
              hsnCode: item.gst.hsnCode,
              gstRateId: item.gst.gstRateId,
              gstRate: item.gst.gstRate,
              cgstAmount: item.gst.cgstAmount,
              sgstAmount: item.gst.sgstAmount,
              igstAmount: item.gst.igstAmount,
              totalTaxAmount: item.gst.totalTaxAmount,
              taxableAmount: item.gst.taxableAmount,
              totalWithTax: item.gst.totalWithTax,
              grossAmount:
                item.gst.grossAmount ??
                this.roundToTwo(item.pricing.unitAmount * item.quantity),
              isTaxInclusive: item.gst.isTaxInclusive ?? false,
            }
          : undefined,
        notes: item.notes,
      })),
      subTotalAmount: doc.subTotalAmount,
      taxAmount: doc.taxAmount,
      cgstAmount: doc.cgstAmount,
      sgstAmount: doc.sgstAmount,
      igstAmount: doc.igstAmount,
      discountAmount: doc.discountAmount,
      grossAmount:
        doc.grossAmount ??
        this.roundToTwo(doc.subTotalAmount + (doc.discountAmount ?? 0)),
      totalAmount: doc.totalAmount,
      roundOffAmount: doc.roundOffAmount,
      taxType: doc.taxType
        ? (doc.taxType as 'intra-state' | 'inter-state')
        : undefined,
      notes: doc.notes,
      statusNote: doc.statusNote,
      paidAt: doc.paidAt?.toISOString(),
      paymentProvider: doc.paymentProvider,
      paymentTransactionId: doc.paymentTransactionId,
      razorpayOrderId: doc.razorpayOrderId,
      paymentMeta: doc.paymentMeta ?? undefined,
      readyAt: doc.readyAt?.toISOString(),
      taxInvoiceNumber: doc.taxInvoiceNumber,
      taxInvoiceGeneratedAt: doc.taxInvoiceGeneratedAt?.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  // Webhook handler methods for Razorpay payment events
  async handlePaymentCaptured(
    orderId: string,
    paymentId: string,
    paymentData: any
  ) {
    this.logger.log(
      `Handling payment captured for order ${orderId}: ${paymentId}`
    );

    try {
      // Find the order by our internal order ID
      const order = await this.orderModel.findById(orderId);

      if (!order) {
        this.logger.warn(`Order ${orderId} not found for payment ${paymentId}`);
        return;
      }

      // Update order payment status (skip notification to avoid duplicate)
      await this.updatePayment(
        order.restaurantId.toString(),
        orderId,
        {
          paymentStatus: PaymentStatus.Paid,
          transactionId: paymentId,
          provider: 'razorpay',
        },
        null,
        true
      ); // skipNotification = true

      // Record payment captured event
      await this.recordEvent(
        orderId,
        order.restaurantId.toString(),
        'payment.captured',
        {
          paymentId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          method: paymentData.method,
          capturedAt: paymentData.captured_at,
        }
      );

      this.logger.log(
        `Payment ${paymentId} processed successfully for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment captured for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  async handlePaymentFailed(
    orderId: string,
    paymentId: string,
    failureData: any
  ) {
    this.logger.log(
      `Handling payment failure for order ${orderId}: ${paymentId}`
    );

    try {
      // Find the order by our internal order ID
      const order = await this.orderModel.findById(orderId);

      if (!order) {
        this.logger.warn(
          `Order ${orderId} not found for failed payment ${paymentId}`
        );
        return;
      }

      // Record payment failure event
      await this.recordEvent(
        orderId,
        order.restaurantId.toString(),
        'payment.failed',
        {
          paymentId,
          errorCode: failureData.error_code,
          errorDescription: failureData.error_description,
          amount: failureData.amount,
          currency: failureData.currency,
          method: failureData.method,
          failedAt: failureData.failed_at,
        }
      );

      this.logger.log(
        `Payment failure ${paymentId} recorded for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment failure for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  async handleOrderFullyPaid(orderId: string, orderData: any) {
    this.logger.log(`Handling order fully paid: ${orderId}`);

    try {
      // Find the order by our internal order ID
      const order = await this.orderModel.findById(orderId);

      if (!order) {
        this.logger.warn(`Order ${orderId} not found for fully paid event`);
        return;
      }

      // Ensure order is marked as fully paid (skip notification to avoid duplicate)
      if (order.paymentStatus !== PaymentStatus.Paid) {
        await this.updatePayment(
          order.restaurantId.toString(),
          orderId,
          {
            paymentStatus: PaymentStatus.Paid,
            provider: 'razorpay',
          },
          null,
          true
        ); // skipNotification = true
      }

      // Record order fully paid event
      await this.recordEvent(
        orderId,
        order.restaurantId.toString(),
        'order.fully_paid',
        {
          razorpayOrderId: orderData.razorpay_order_id,
          totalAmountPaid: orderData.total_amount_paid,
          amountDue: orderData.amount_due,
          paidAt: orderData.paid_at,
        }
      );

      this.logger.log(`Order ${orderId} marked as fully paid`);
    } catch (error) {
      this.logger.error(
        `Failed to handle order fully paid for ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  // Refund webhook handlers
  async handleRefundCreated(orderId: string, refundData: any) {
    this.logger.log(
      `Handling refund created for order ${orderId}: ${refundData.refund_id}`
    );

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() ||
          '',
        'refund.created',
        refundData
      );

      this.logger.log(
        `Refund created ${refundData.refund_id} recorded for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle refund created for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  async handleRefundProcessed(orderId: string, refundData: any) {
    this.logger.log(
      `Handling refund processed for order ${orderId}: ${refundData.refund_id}`
    );

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() ||
          '',
        'refund.processed',
        refundData
      );

      this.logger.log(
        `Refund processed ${refundData.refund_id} recorded for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle refund processed for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  async handleRefundFailed(orderId: string, refundData: any) {
    this.logger.log(
      `Handling refund failed for order ${orderId}: ${refundData.refund_id}`
    );

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() ||
          '',
        'refund.failed',
        refundData
      );

      this.logger.log(
        `Refund failed ${refundData.refund_id} recorded for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle refund failed for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  // Transfer webhook handlers
  async handleTransferProcessed(orderId: string, transferData: any) {
    this.logger.log(
      `Handling transfer processed for order ${orderId}: ${transferData.transfer_id}`
    );

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() ||
          '',
        'transfer.processed',
        transferData
      );

      this.logger.log(
        `Transfer processed ${transferData.transfer_id} recorded for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle transfer processed for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  async handleTransferFailed(orderId: string, transferData: any) {
    this.logger.log(
      `Handling transfer failed for order ${orderId}: ${transferData.transfer_id}`
    );

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() ||
          '',
        'transfer.failed',
        transferData
      );

      this.logger.log(
        `Transfer failed ${transferData.transfer_id} recorded for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle transfer failed for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  // Invoice webhook handlers
  async handleInvoicePaid(orderId: string, invoiceData: any) {
    this.logger.log(
      `Handling invoice paid for order ${orderId}: ${invoiceData.invoice_id}`
    );

    try {
      // Mark order as paid if it's not already (skip notification to avoid duplicate)
      const order = await this.orderModel.findById(orderId);
      if (order && order.paymentStatus !== PaymentStatus.Paid) {
        await this.updatePayment(
          order.restaurantId.toString(),
          orderId,
          {
            paymentStatus: PaymentStatus.Paid,
            transactionId: invoiceData.payment_id,
            provider: 'razorpay',
          },
          null,
          true
        ); // skipNotification = true
      }

      await this.recordEvent(
        orderId,
        order?.restaurantId?.toString() || '',
        'invoice.paid',
        invoiceData
      );

      this.logger.log(
        `Invoice paid ${invoiceData.invoice_id} processed for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle invoice paid for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  async handleInvoicePartiallyPaid(orderId: string, invoiceData: any) {
    this.logger.log(
      `Handling invoice partially paid for order ${orderId}: ${invoiceData.invoice_id}`
    );

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() ||
          '',
        'invoice.partially_paid',
        invoiceData
      );

      this.logger.log(
        `Invoice partially paid ${invoiceData.invoice_id} recorded for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle invoice partially paid for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  async handleInvoiceExpired(orderId: string, invoiceData: any) {
    this.logger.log(
      `Handling invoice expired for order ${orderId}: ${invoiceData.invoice_id}`
    );

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() ||
          '',
        'invoice.expired',
        invoiceData
      );

      this.logger.log(
        `Invoice expired ${invoiceData.invoice_id} recorded for order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle invoice expired for order ${orderId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  private async handleSessionPayment(
    orderData: any,
    paymentData: any
  ): Promise<void> {
    try {
      const notes = orderData.notes || {};
      const orderIds = notes.orderIds ? notes.orderIds.split(',') : [];
      const paymentId = paymentData.id;

      for (const orderId of orderIds) {
        // Mark each order as paid
        await this.updatePayment(
          notes.restaurantId,
          orderId,
          {
            paymentStatus: PaymentStatus.Paid,
            transactionId: paymentId,
            provider: 'razorpay',
            paymentMethod: paymentData.method || 'upi',
          },
          null, // no updatedBy for customer payments
          true // skip notification to prevent duplicates
        );
      }

      this.logger.log(
        `Session payment processed: ${orderIds.length} orders marked as paid`
      );
    } catch (error) {
      this.logger.error('Failed to handle session payment:', error);
    }
  }

  private async sendCustomerPaymentNotifications(
    orderData: any,
    paymentData: any
  ): Promise<void> {
    try {
      const notes = orderData.notes || {};
      const restaurantId = notes.restaurantId;
      const orderIds = notes.orderIds ? notes.orderIds.split(',') : [];
      const tableId = notes.tableId;
      const amount = paymentData.amount / 100; // Convert from paise to rupees
      const paymentMethod = paymentData.method || 'upi';

      if (!restaurantId || orderIds.length === 0) {
        this.logger.warn(
          'Missing restaurantId or orderIds in customer payment webhook'
        );
        return;
      }

      // Get order details for the first order (for order number and table info)
      const firstOrder = await this.orderModel.findById(orderIds[0]).lean();
      if (!firstOrder) {
        this.logger.warn(
          `Order ${orderIds[0]} not found for customer payment notification`
        );
        return;
      }

      // Get table details for table number
      let tableNumber = firstOrder.tableNumber;
      let branchId = firstOrder.branchId;

      if (tableId && !tableNumber) {
        try {
          const tableModel = this.orderModel.db.collection('restauranttables');
          const table = await tableModel.findOne({
            _id: new require('mongoose').Types.ObjectId(tableId),
            restaurantId: new require('mongoose').Types.ObjectId(restaurantId),
          });

          if (table) {
            tableNumber = table.tableNumber;
            branchId = branchId || table.branchId?.toString();
          }
        } catch (error) {
          this.logger.error(
            'Error fetching table details for notification:',
            error
          );
        }
      }

      // Send notification to managers, owners, and assigned waiters
      await this.paymentNotificationService.sendPaymentConfirmationNotification(
        restaurantId,
        orderIds[0], // Use first order ID as primary
        firstOrder.orderNumber,
        amount,
        paymentMethod,
        {
          tableId,
          tableNumber,
          branchId,
          isCustomerPayment: true,
          customerName: firstOrder.customerName || 'Guest Customer',
        }
      );

      this.logger.log(
        `Customer payment notification sent for order ${firstOrder.orderNumber} ` +
          `(${orderIds.length} orders, ₹${amount}, Table ${tableNumber})`
      );
    } catch (error) {
      this.logger.error(
        'Failed to send customer payment notifications:',
        error
      );
    }
  }

  private async calculateEffectiveItemPrice(
    restaurantId: string,
    menuItemId: string,
    activePriceTagId?: string,
    selectedModifiers: any[] = []
  ): Promise<number> {
    // Get base menu item price
    const menuItem = await this.menuItemModel
      .findById(menuItemId)
      .select('pricing')
      .lean();
    if (!menuItem) {
      throw new NotFoundException(`Menu item ${menuItemId} not found`);
    }

    let basePrice = menuItem.pricing.amount;

    // Apply price tag pricing if available
    if (activePriceTagId) {
      const priceTag = await this.menuPriceTagsService.findOne(
        restaurantId,
        activePriceTagId
      );
      if (priceTag && priceTag.isActive) {
        const itemPrice = priceTag.itemPrices?.find(
          (ip) => ip.menuItemId === menuItemId
        );
        if (itemPrice && itemPrice.isActive) {
          switch (itemPrice.discountType) {
            case 'fixed':
              basePrice = itemPrice.price;
              break;
            case 'percentage_off':
              basePrice =
                menuItem.pricing.amount *
                (1 - (itemPrice.discountValue || 0) / 100);
              break;
            case 'amount_off':
              basePrice = Math.max(
                0,
                menuItem.pricing.amount - (itemPrice.discountValue || 0)
              );
              break;
          }
        }
      }
    }

    // Add modifier adjustments
    let modifierTotal = 0;
    for (const modifier of selectedModifiers) {
      for (const option of modifier.selectedOptions) {
        modifierTotal += option.priceAdjustment * (option.quantity || 1);
      }
    }

    return basePrice + modifierTotal;
  }

  /**
   * Get order history with session information for waiter interface
   */
  async getOrderHistory(
    restaurantId: string,
    query: {
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
      search?: string;
      tableNumber?: string;
    },
    branchId?: string
  ) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    // Build query filters
    const filters: any = {
      restaurantId: new Types.ObjectId(restaurantId),
      paymentStatus: 'paid', // Only show completed orders in history
    };

    // Add branch filter if provided
    if (branchId) {
      filters.branchId = new Types.ObjectId(branchId);
    }

    // Date range filter
    if (query.from || query.to) {
      filters.paidAt = {};
      if (query.from) {
        filters.paidAt.$gte = new Date(query.from);
      }
      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setHours(23, 59, 59, 999); // End of day
        filters.paidAt.$lte = toDate;
      }
    }

    // Table number filter
    if (query.tableNumber) {
      filters.tableNumber = new RegExp(query.tableNumber, 'i');
    }

    // Search filter
    let searchFilters = [];
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      searchFilters = [
        { orderNumber: searchRegex },
        { customerName: searchRegex },
        { tableNumber: searchRegex },
      ];
    }

    if (searchFilters.length > 0) {
      filters.$or = searchFilters;
    }

    try {
      // Get orders with pagination
      const [orders, totalCount] = await Promise.all([
        this.orderModel
          .find(filters)
          .sort({ paidAt: -1 }) // Most recent paid orders first
          .skip(skip)
          .limit(limit)
          .lean(),
        this.orderModel.countDocuments(filters)
      ]);

      // Enhance orders with session information
      const enhancedOrders = await Promise.all(
        orders.map(async (order) => {
          let sessionInfo = null;

          if (order.sessionId) {
            try {
              // Check if session is still active or archived
              const { session, isHistory } = await this.customerSessionsService.findSessionAnywhere(order.sessionId);

              if (session) {
                if (isHistory) {
                  // Session is in history - get full session data
                  const historySession = session as any; // SessionHistoryDocument
                  sessionInfo = {
                    sessionId: order.sessionId,
                    isArchived: true,
                    sessionStarted: historySession.sessionStartedAt,
                    sessionCompleted: historySession.sessionCompletedAt,
                    totalSessionAmount: historySession.totalAmount || 0,
                    orderCount: historySession.orderIds?.length || 0,
                  };
                } else {
                  // Session is still active - get session data
                  const activeSession = session as any; // CustomerSessionDocument
                  sessionInfo = {
                    sessionId: order.sessionId,
                    isArchived: false,
                    sessionStarted: activeSession.createdAt,
                    sessionCompleted: null,
                    totalSessionAmount: 0, // Calculate from orders
                    orderCount: 0, // Calculate from orders
                  };

                  // Calculate totals for active session
                  try {
                    const sessionOrders = await this.orderModel.find({
                      sessionId: order.sessionId,
                      paymentStatus: 'paid'
                    }).lean();

                    sessionInfo.totalSessionAmount = sessionOrders.reduce(
                      (sum, sessionOrder) => sum + sessionOrder.totalAmount, 0
                    );
                    sessionInfo.orderCount = sessionOrders.length;
                  } catch (error) {
                    this.logger.warn(`Failed to calculate session totals for ${order.sessionId}:`, error);
                  }
                }
              }
            } catch (error) {
              this.logger.warn(`Failed to fetch session info for order ${order._id}:`, error);
            }
          }

          return {
            id: order._id.toString(),
            orderNumber: order.orderNumber,
            tableNumber: order.tableNumber,
            customerName: order.customerName,
            totalAmount: order.totalAmount,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
            paidAt: order.paidAt,
            itemCount: order.items?.length || 0,
            sessionInfo,
          };
        })
      );

      const totalPages = Math.ceil(totalCount / limit);

      return {
        orders: enhancedOrders,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch order history:', error);
      throw error;
    }
  }


  async getRestaurantById(restaurantId: string) {
    return this.restaurantModel.findById(restaurantId).select('name slug').lean();
  }
}
