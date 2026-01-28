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
import { RazorpayService } from '../payments/razorpay.service';
import { TableStatusService } from '../restaurant-tables/table-status.service';
import { TableStatusType } from '../restaurant-tables/schemas/table-status.schema';
import { GstService, TaxCalculation, OrderItemWithTax } from '../gst/gst.service';

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
    private readonly ordersGateway: OrdersGateway,
    private readonly smartGstService: SmartGstService,
    private readonly gstService: GstService,
    private readonly razorpayService: RazorpayService,
    private readonly tableStatusService: TableStatusService
  ) {}

  async create(
    restaurantId: string,
    dto: CreateOrderDto,
    branchId?: string
  ): Promise<OrderResponseDto> {
    const orderNumber = await this.generateOrderNumber(restaurantId);
    const paymentMethod = dto.paymentMethod ?? 'upi';

    const restaurant = await this.restaurantModel.findById(restaurantId).lean();

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    const customerState = dto.customerState?.trim() || restaurant.address?.state;

    // Prepare order items for GST calculation
    const orderItems: OrderItemGstData[] = dto.items.map(item => ({
      menuItemId: item.menuItemId,
      name: item.name || '', // Use provided name, fallback to empty
      quantity: item.quantity || 1,
      unitPrice: item.pricing?.unitAmount || 0,
      discountAmount: item.pricing?.discountAmount || 0
    }));

    // Calculate GST using our smart service
    const { items, summary } = await this.smartGstService.calculateOrderGst(
      restaurantId,
      orderItems,
      customerState
    );

    const roundOffAmount = this.calculateRoundOff(summary.totalAmount);
    const finalTotalAmount = this.roundToTwo(
      summary.totalAmount + roundOffAmount
    );

    // Map GST calculation results to order schema format
    const formattedOrderItems = items.map(item => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      pricing: {
        unitAmount: item.unitPrice,
        currency: 'INR',
        taxAmount: item.totalTaxAmount,
        discountAmount: item.discountAmount,
      },
      gst: {
        hsnCode: item.hsnCode,
        gstRate: item.gstRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalTaxAmount: item.totalTaxAmount,
        exemptFromGst: item.exemptFromGst,
      },
    }));

    const created = await this.orderModel.create({
      restaurantId,
      branchId,
      orderNumber,
      sessionId: dto.sessionId,
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
      subTotalAmount: summary.subtotal,
      grossAmount: summary.subtotal, // In new system, subtotal = gross amount
      discountAmount: summary.discountAmount,
      taxAmount: summary.totalTaxAmount,
      cgstAmount: summary.cgstAmount,
      sgstAmount: summary.sgstAmount,
      igstAmount: summary.igstAmount,
      totalAmount: finalTotalAmount,
      roundOffAmount,
      taxType: summary.taxType,
    });

    console.log('Created Order successfully:', created);
    const response = this.toDto(created);

    await this.recordEvent(
      created._id.toString(),
      restaurantId,
      'order.created',
      {
        totalAmount: response.totalAmount,
        paymentMethod: response.paymentMethod,
        taxType: response.taxType,
      }
    );

    console.log('Recording order created event completed');

    // DIRECT TABLE STATUS UPDATE: Update table status immediately upon order creation
    if (created.tableId) {
      try {
        await this.tableStatusService.updateTableStatusFromOrder(
          restaurantId,
          created.tableId.toString(),
          'order-created',
          {
            totalAmount: finalTotalAmount,
            createdBy: created.createdBy?.toString(),
            createdByName: 'Order System'
          }
        );
        console.log(`Table status updated for table ${created.tableId} after order creation`);
      } catch (error) {
        console.error(`Failed to update table status for table ${created.tableId}:`, error);
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

      const amount = finalTotalAmount.toFixed(2);
      const params = new URLSearchParams({
        pa: upiConfig.vpa,
        pn: upiConfig.displayName,
        am: amount,
        cu: 'INR',
        tn: `Order ${response.orderNumber}`,
      });
      response.paymentIntentUrl = `upi://pay?${params.toString()}`;
    }
    this.ordersGateway.emitOrderCreated(response);
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
    const restaurant = await this.restaurantModel
      .findById(restaurantId)
      .select('defaultGstRateId applyDefaultGstToMenuItems')
      .lean();

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const defaultGstRateId = restaurant.defaultGstRateId;

    // Use restaurant's state for customer state
    const customerState = restaurant.address?.state;

    // Prepare order items for GST calculation
    const orderItems: OrderItemGstData[] = dto.items.map(item => ({
      menuItemId: item.menuItemId,
      name: '', // Will be filled from menu item
      quantity: item.quantity,
      unitPrice: item.pricing?.unitAmount || 0,
      discountAmount: item.pricing?.discountAmount || 0
    }));

    // Calculate GST using smart service
    const { items, summary } = await this.smartGstService.calculateOrderGst(
      restaurantId,
      orderItems,
      customerState
    );

    const roundOffAmount = this.calculateRoundOff(summary.totalAmount);
    const finalTotalAmount = this.roundToTwo(
      summary.totalAmount + roundOffAmount
    );

    return {
      subtotal: summary.subtotal,
      taxAmount: summary.totalTaxAmount,
      cgstAmount: summary.cgstAmount,
      sgstAmount: summary.sgstAmount,
      igstAmount: summary.igstAmount,
      roundOffAmount,
      totalAmount: finalTotalAmount,
      items,
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
          updated.status === OrderStatus.Completed ? 'order-completed' : 'order-cancelled',
          {
            createdBy: 'system',
            createdByName: 'Order System'
          }
        );
        console.log(`Table status updated for table ${updated.tableId} after order ${updated.status}`);
      } catch (error) {
        console.error(
          `Failed to update table status for order ${response.orderNumber}:`,
          error
        );
        // Don't fail the order update if table status update fails
      }
    }

    this.ordersGateway.emitOrderUpdated(response);
    return response;
  }

  async updatePayment(
    restaurantId: string,
    orderId: string,
    dto: UpdateOrderPaymentDto
  ): Promise<OrderResponseDto> {
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

    if (dto.paymentStatus === PaymentStatus.Paid) {
      // Skip automatic transfer for direct payments (not using Razorpay transfers)
      // await this.transferToRestaurant(updated);

      // Only generate tax invoice after all payment details are set
      if (updated) {
        updated = await this.ensureTaxInvoice(updated);
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
    });

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
            createdByName: 'Order System'
          }
        );
        console.log(`Table status updated for table ${updated.tableId} after payment completion`);
      } catch (error) {
        console.error(`Failed to update table status for table ${updated.tableId}:`, error);
        // Don't fail the payment update if table status update fails
      }
    }

    this.ordersGateway.emitOrderUpdated(response);
    return response;
  }

  async handleRazorpayWebhook(event: any): Promise<void> {
    const eventName = event?.event;
    if (!eventName) {
      this.logger.warn('Razorpay webhook received without event name');
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
      .find({ _id: { $in: menuItemIds }, restaurantId })
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

    const { items: computedItems, summary } =
      await this.gstService.calculateOrderTax(
        restaurantId,
        calculationInput,
        customerState
      );

    const orderItems = computedItems.map((computed, index) => {
      const requestItem = dto.items[index];
      const menuItem = menuMap.get(requestItem.menuItemId)!;
      const currency = menuItem.pricing?.currency ?? 'INR';

      return {
        menuItemId: menuItem._id,
        name: computed.name,
        quantity: computed.quantity,
        pricing: {
          unitAmount: this.roundToTwo(computed.unitPrice),
          currency,
          taxAmount: this.roundToTwo(computed.totalTaxAmount),
          discountAmount: this.roundToTwo(computed.discountAmount),
        },
        gst: {
          hsnCode: computed.hsnCode,
          gstRateId: computed.gstRateId,
          gstRate: computed.gstRate,
          cgstAmount: this.roundToTwo(computed.cgstAmount),
          sgstAmount: this.roundToTwo(computed.sgstAmount),
          igstAmount: this.roundToTwo(computed.igstAmount),
          totalTaxAmount: this.roundToTwo(computed.totalTaxAmount),
          taxableAmount: this.roundToTwo(computed.taxableAmount),
          totalWithTax: this.roundToTwo(computed.totalWithTax),
          grossAmount: this.roundToTwo(computed.grossAmount),
          isTaxInclusive: computed.isTaxInclusive,
        },
        notes: requestItem.notes,
      };
    });

    return {
      items: orderItems,
      summary,
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
    const calculatedRoundOff = order.finalAmount ? (order.finalAmount - preRoundTotal) : 0;

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
        (order.taxType as 'intra-state' | 'inter-state') ?? 'intra-state'
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
      createdBy: doc.createdBy?.toString(),
      orderNumber: doc.orderNumber,
      tableNumber: doc.tableNumber,
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
  async handlePaymentCaptured(orderId: string, paymentId: string, paymentData: any) {
    this.logger.log(`Handling payment captured for order ${orderId}: ${paymentId}`);

    try {
      // Find the order by our internal order ID
      const order = await this.orderModel.findById(orderId);

      if (!order) {
        this.logger.warn(`Order ${orderId} not found for payment ${paymentId}`);
        return;
      }

      // Update order payment status
      await this.updatePayment(
        order.restaurantId.toString(),
        orderId,
        {
          paymentStatus: PaymentStatus.Paid,
          transactionId: paymentId,
          provider: 'razorpay',
        }
      );

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

      this.logger.log(`Payment ${paymentId} processed successfully for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle payment captured for order ${orderId}: ${error.message}`, error);
      throw error;
    }
  }

  async handlePaymentFailed(orderId: string, paymentId: string, failureData: any) {
    this.logger.log(`Handling payment failure for order ${orderId}: ${paymentId}`);

    try {
      // Find the order by our internal order ID
      const order = await this.orderModel.findById(orderId);

      if (!order) {
        this.logger.warn(`Order ${orderId} not found for failed payment ${paymentId}`);
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

      this.logger.log(`Payment failure ${paymentId} recorded for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle payment failure for order ${orderId}: ${error.message}`, error);
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

      // Ensure order is marked as fully paid
      if (order.paymentStatus !== PaymentStatus.Paid) {
        await this.updatePayment(
          order.restaurantId.toString(),
          orderId,
          {
            paymentStatus: PaymentStatus.Paid,
            provider: 'razorpay',
          }
        );
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
      this.logger.error(`Failed to handle order fully paid for ${orderId}: ${error.message}`, error);
      throw error;
    }
  }

  // Refund webhook handlers
  async handleRefundCreated(orderId: string, refundData: any) {
    this.logger.log(`Handling refund created for order ${orderId}: ${refundData.refund_id}`);

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() || '',
        'refund.created',
        refundData
      );

      this.logger.log(`Refund created ${refundData.refund_id} recorded for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle refund created for order ${orderId}: ${error.message}`, error);
      throw error;
    }
  }

  async handleRefundProcessed(orderId: string, refundData: any) {
    this.logger.log(`Handling refund processed for order ${orderId}: ${refundData.refund_id}`);

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() || '',
        'refund.processed',
        refundData
      );

      this.logger.log(`Refund processed ${refundData.refund_id} recorded for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle refund processed for order ${orderId}: ${error.message}`, error);
      throw error;
    }
  }

  async handleRefundFailed(orderId: string, refundData: any) {
    this.logger.log(`Handling refund failed for order ${orderId}: ${refundData.refund_id}`);

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() || '',
        'refund.failed',
        refundData
      );

      this.logger.log(`Refund failed ${refundData.refund_id} recorded for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle refund failed for order ${orderId}: ${error.message}`, error);
      throw error;
    }
  }

  // Transfer webhook handlers
  async handleTransferProcessed(orderId: string, transferData: any) {
    this.logger.log(`Handling transfer processed for order ${orderId}: ${transferData.transfer_id}`);

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() || '',
        'transfer.processed',
        transferData
      );

      this.logger.log(`Transfer processed ${transferData.transfer_id} recorded for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle transfer processed for order ${orderId}: ${error.message}`, error);
      throw error;
    }
  }

  async handleTransferFailed(orderId: string, transferData: any) {
    this.logger.log(`Handling transfer failed for order ${orderId}: ${transferData.transfer_id}`);

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() || '',
        'transfer.failed',
        transferData
      );

      this.logger.log(`Transfer failed ${transferData.transfer_id} recorded for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle transfer failed for order ${orderId}: ${error.message}`, error);
      throw error;
    }
  }

  // Invoice webhook handlers
  async handleInvoicePaid(orderId: string, invoiceData: any) {
    this.logger.log(`Handling invoice paid for order ${orderId}: ${invoiceData.invoice_id}`);

    try {
      // Mark order as paid if it's not already
      const order = await this.orderModel.findById(orderId);
      if (order && order.paymentStatus !== PaymentStatus.Paid) {
        await this.updatePayment(
          order.restaurantId.toString(),
          orderId,
          {
            paymentStatus: PaymentStatus.Paid,
            transactionId: invoiceData.payment_id,
            provider: 'razorpay',
          }
        );
      }

      await this.recordEvent(
        orderId,
        order?.restaurantId?.toString() || '',
        'invoice.paid',
        invoiceData
      );

      this.logger.log(`Invoice paid ${invoiceData.invoice_id} processed for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle invoice paid for order ${orderId}: ${error.message}`, error);
      throw error;
    }
  }

  async handleInvoicePartiallyPaid(orderId: string, invoiceData: any) {
    this.logger.log(`Handling invoice partially paid for order ${orderId}: ${invoiceData.invoice_id}`);

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() || '',
        'invoice.partially_paid',
        invoiceData
      );

      this.logger.log(`Invoice partially paid ${invoiceData.invoice_id} recorded for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle invoice partially paid for order ${orderId}: ${error.message}`, error);
      throw error;
    }
  }

  async handleInvoiceExpired(orderId: string, invoiceData: any) {
    this.logger.log(`Handling invoice expired for order ${orderId}: ${invoiceData.invoice_id}`);

    try {
      await this.recordEvent(
        orderId,
        (await this.orderModel.findById(orderId))?.restaurantId?.toString() || '',
        'invoice.expired',
        invoiceData
      );

      this.logger.log(`Invoice expired ${invoiceData.invoice_id} recorded for order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to handle invoice expired for order ${orderId}: ${error.message}`, error);
      throw error;
    }
  }
}
