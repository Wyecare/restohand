import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import { CustomerSession, CustomerSessionDocument } from '../../customer-sessions/schemas/customer-session.schema';
import { Restaurant, RestaurantDocument } from '../../restaurants/schemas/restaurant.schema';
import { SmartGstService, OrderItemGstData, OrderItemWithGst } from '../../gst/smart-gst.service';

export interface BillCalculation {
  // Order-level totals
  subTotalAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountAmount: number;
  grossAmount: number;
  totalAmount: number;
  roundOffAmount: number;

  // Payment tracking
  paidAmount: number;
  pendingAmount: number;

  // Metadata
  taxType: 'intra-state' | 'inter-state' | null;
  orderCount: number;
  itemCount: number;

  // Breakdown by order (for multi-order sessions)
  orderBreakdown: OrderBillBreakdown[];

  // Calculation metadata
  calculatedAt: Date;
  currency: string;
}

export interface BillItemDetail {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalWithTax: number;
  hsnCode?: string;
}

export interface OrderBillBreakdown {
  orderId: string;
  orderNumber: string;
  subTotalAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountAmount: number;
  totalAmount: number;
  roundOffAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  itemCount: number;
  createdAt: Date;
  items: BillItemDetail[];
}

export interface DetailedBillCalculation extends BillCalculation {
  restaurant: {
    id: string;
    name: string;
    address: any;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  session: {
    sessionId: string;
    tableId: string;
    tableNumber: string;
    customerNumber: number;
    startedAt: Date;
    customerName?: string;
    customerPhone?: string;
  };
  allItems: BillItemDetail[];
}

@Injectable()
export class BillCalculatorService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(CustomerSession.name)
    private readonly sessionModel: Model<CustomerSessionDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    private readonly smartGstService: SmartGstService
  ) {}

  /**
   * Universal Bill Calculator - Works for single orders, multiple orders, or sessions
   * This is the ONLY place where bill calculations happen in the system
   */
  async calculateBill(params: {
    sessionId?: string;
    orderIds?: string[];
    orderId?: string;
    includeUnpaid?: boolean;
    includeCancelled?: boolean;
  }): Promise<BillCalculation> {
    const { sessionId, orderIds, orderId, includeUnpaid = true, includeCancelled = false } = params;

    let orders: OrderDocument[] = [];

    // Determine which orders to include in calculation
    if (sessionId) {
      orders = await this.getOrdersBySession(sessionId, includeUnpaid, includeCancelled);
    } else if (orderIds) {
      orders = await this.getOrdersByIds(orderIds, includeUnpaid, includeCancelled);
    } else if (orderId) {
      orders = await this.getOrdersByIds([orderId], includeUnpaid, includeCancelled);
    } else {
      throw new Error('Must provide sessionId, orderIds, or orderId');
    }

    if (orders.length === 0) {
      return this.createEmptyBillCalculation();
    }

    // Get restaurant for tax configuration
    const restaurant = await this.restaurantModel.findById(orders[0].restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found for bill calculation');
    }

    // Extract all items from all orders for Smart GST calculation
    const allOrderItems: OrderItemGstData[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        allOrderItems.push({
          menuItemId: item.menuItemId.toString(),
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.pricing.unitAmount,
          discountAmount: item.pricing.discountAmount || 0,
        });
      }
    }

    // Use Smart GST to calculate proper tax on all items
    const gstCalculation = await this.smartGstService.calculateOrderGst(
      restaurant._id.toString(),
      allOrderItems,
      orders[0]?.customerState // Use customer state from first order if available
    );

    // Calculate payment tracking
    const paidAmount = orders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
    const pendingAmount = gstCalculation.summary.totalAmount - paidAmount;

    // Create order breakdown with proper Smart GST calculation per order
    const orderBreakdown = await this.createSmartGstOrderBreakdown(orders, restaurant._id.toString());

    // Apply round-off to final total
    const finalTotal = this.roundToTwo(gstCalculation.summary.totalAmount);
    const roundOffAmount = finalTotal - gstCalculation.summary.totalAmount;

    return {
      // Use Smart GST calculated amounts
      subTotalAmount: gstCalculation.summary.subtotal,
      taxAmount: gstCalculation.summary.totalTaxAmount,
      cgstAmount: gstCalculation.summary.cgstAmount,
      sgstAmount: gstCalculation.summary.sgstAmount,
      igstAmount: gstCalculation.summary.igstAmount,
      discountAmount: gstCalculation.summary.discountAmount,
      grossAmount: gstCalculation.summary.taxableAmount, // Subtotal minus discount
      totalAmount: finalTotal,
      roundOffAmount: this.roundToTwo(roundOffAmount),

      // Payment tracking
      paidAmount,
      pendingAmount,

      // Metadata
      taxType: gstCalculation.summary.taxType,
      orderCount: orders.length,
      itemCount: allOrderItems.length,
      orderBreakdown,
      calculatedAt: new Date(),
      currency: restaurant.address?.country === 'IN' ? 'INR' : 'USD',
    };
  }

  /**
   * Calculate bill for a customer session
   */
  async calculateSessionBill(sessionId: string, includeUnpaid = true): Promise<BillCalculation> {
    return this.calculateBill({ sessionId, includeUnpaid });
  }

  /**
   * Calculate bill for specific orders
   */
  async calculateOrdersBill(orderIds: string[], includeUnpaid = true): Promise<BillCalculation> {
    return this.calculateBill({ orderIds, includeUnpaid });
  }

  /**
   * Calculate bill for a single order
   */
  async calculateSingleOrderBill(orderId: string): Promise<BillCalculation> {
    return this.calculateBill({ orderId });
  }

  /**
   * Calculate detailed bill with item-level breakdown for a customer session
   */
  async calculateDetailedSessionBill(sessionId: string, includeUnpaid = true): Promise<DetailedBillCalculation> {
    // Get session details first
    const session = await this.sessionModel
      .findOne({ sessionId })
      .populate('restaurantId')
      .lean();

    if (!session) {
      throw new Error('Session not found');
    }

    const restaurant = session.restaurantId as any;
    if (!restaurant) {
      throw new Error('Restaurant not found for session');
    }

    // Get all orders for this session
    const orders = await this.getOrdersBySession(sessionId, includeUnpaid, false);

    if (orders.length === 0) {
      return {
        ...this.createEmptyBillCalculation(),
        restaurant: {
          id: restaurant._id.toString(),
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone,
          email: restaurant.email,
          gstin: restaurant.gstin,
        },
        session: {
          sessionId: session.sessionId,
          tableId: session.tableId,
          tableNumber: session.tableNumber,
          customerNumber: session.customerNumber,
          startedAt: session.startedAt,
          customerName: session.customerName,
          customerPhone: session.customerPhone,
        },
        allItems: [],
        orderBreakdown: [],
      };
    }

    // Extract all items from all orders for Smart GST calculation
    const allOrderItems: OrderItemGstData[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        allOrderItems.push({
          menuItemId: item.menuItemId.toString(),
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.pricing.unitAmount,
          discountAmount: item.pricing.discountAmount || 0,
        });
      }
    }

    // Use Smart GST to calculate proper tax on all items
    const gstCalculation = await this.smartGstService.calculateOrderGst(
      restaurant._id.toString(),
      allOrderItems,
      orders[0]?.customerState
    );

    // Create detailed item breakdown
    const allItems: BillItemDetail[] = gstCalculation.items.map((item: OrderItemWithGst) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      taxableAmount: item.taxableAmount,
      gstRate: item.gstRate,
      cgstAmount: item.cgstAmount,
      sgstAmount: item.sgstAmount,
      igstAmount: item.igstAmount,
      totalTaxAmount: item.totalTaxAmount,
      totalWithTax: item.totalWithTax,
      hsnCode: item.hsnCode,
    }));

    // Calculate payment tracking
    const paidAmount = orders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
    const pendingAmount = gstCalculation.summary.totalAmount - paidAmount;

    // Create detailed order breakdown
    const orderBreakdown = await this.createDetailedOrderBreakdown(orders, restaurant._id.toString());

    // Apply round-off to final total
    const finalTotal = this.roundToTwo(gstCalculation.summary.totalAmount);
    const roundOffAmount = finalTotal - gstCalculation.summary.totalAmount;

    return {
      // Use Smart GST calculated amounts
      subTotalAmount: gstCalculation.summary.subtotal,
      taxAmount: gstCalculation.summary.totalTaxAmount,
      cgstAmount: gstCalculation.summary.cgstAmount,
      sgstAmount: gstCalculation.summary.sgstAmount,
      igstAmount: gstCalculation.summary.igstAmount,
      discountAmount: gstCalculation.summary.discountAmount,
      grossAmount: gstCalculation.summary.taxableAmount,
      totalAmount: finalTotal,
      roundOffAmount: this.roundToTwo(roundOffAmount),

      // Payment tracking
      paidAmount,
      pendingAmount,

      // Metadata
      taxType: gstCalculation.summary.taxType,
      orderCount: orders.length,
      itemCount: allOrderItems.length,
      orderBreakdown,
      calculatedAt: new Date(),
      currency: restaurant.address?.country === 'IN' ? 'INR' : 'USD',

      // Additional detailed data
      restaurant: {
        id: restaurant._id.toString(),
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        gstin: restaurant.gstin,
      },
      session: {
        sessionId: session.sessionId,
        tableId: session.tableId,
        tableNumber: session.tableNumber,
        customerNumber: session.customerNumber,
        startedAt: session.startedAt,
        customerName: session.customerName,
        customerPhone: session.customerPhone,
      },
      allItems,
    };
  }

  /**
   * Update session billing totals based on calculation
   */
  async updateSessionBillingTotals(sessionId: string): Promise<void> {
    const billCalculation = await this.calculateSessionBill(sessionId);

    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          totalOrders: billCalculation.orderCount,
          totalAmount: billCalculation.totalAmount,
          subTotalAmount: billCalculation.subTotalAmount,
          taxAmount: billCalculation.taxAmount,
          cgstAmount: billCalculation.cgstAmount,
          sgstAmount: billCalculation.sgstAmount,
          igstAmount: billCalculation.igstAmount,
          discountAmount: billCalculation.discountAmount,
          roundOffAmount: billCalculation.roundOffAmount,
          paidAmount: billCalculation.paidAmount,
          pendingAmount: billCalculation.pendingAmount,
          allOrdersPaid: billCalculation.pendingAmount === 0,
          taxType: billCalculation.taxType,
          lastActivityAt: new Date(),
        },
      },
      { new: true }
    );
  }

  private async getOrdersBySession(
    sessionId: string,
    includeUnpaid: boolean,
    includeCancelled: boolean
  ): Promise<OrderDocument[]> {
    const filter: any = { customerSessionId: sessionId };

    if (!includeCancelled) {
      filter.status = { $ne: 'cancelled' };
    }

    if (!includeUnpaid) {
      filter.paymentStatus = 'paid';
    }

    return this.orderModel.find(filter).exec();
  }

  private async getOrdersByIds(
    orderIds: string[],
    includeUnpaid: boolean,
    includeCancelled: boolean
  ): Promise<OrderDocument[]> {
    const filter: any = { _id: { $in: orderIds } };

    if (!includeCancelled) {
      filter.status = { $ne: 'cancelled' };
    }

    if (!includeUnpaid) {
      filter.paymentStatus = 'paid';
    }

    return this.orderModel.find(filter).exec();
  }

  private aggregateOrderTotals(orders: OrderDocument[]) {
    let subTotalAmount = 0;
    let taxAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let discountAmount = 0;
    let grossAmount = 0;
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    for (const order of orders) {
      subTotalAmount += order.subTotalAmount || 0;
      taxAmount += order.taxAmount || 0;
      cgstAmount += order.cgstAmount || 0;
      sgstAmount += order.sgstAmount || 0;
      igstAmount += order.igstAmount || 0;
      discountAmount += order.discountAmount || 0;
      grossAmount += order.grossAmount || 0;
      totalAmount += order.totalAmount || 0;

      // Track payments
      if (order.paymentStatus === 'paid') {
        paidAmount += order.totalAmount || 0;
      } else {
        pendingAmount += order.totalAmount || 0;
      }
    }

    return {
      subTotalAmount: this.roundToTwo(subTotalAmount),
      taxAmount: this.roundToTwo(taxAmount),
      cgstAmount: this.roundToTwo(cgstAmount),
      sgstAmount: this.roundToTwo(sgstAmount),
      igstAmount: this.roundToTwo(igstAmount),
      discountAmount: this.roundToTwo(discountAmount),
      grossAmount: this.roundToTwo(grossAmount),
      totalAmount: this.roundToTwo(totalAmount),
      paidAmount: this.roundToTwo(paidAmount),
      pendingAmount: this.roundToTwo(pendingAmount),
    };
  }

  private determineTaxType(orders: OrderDocument[]): 'intra-state' | 'inter-state' | null {
    const taxTypes = [...new Set(orders.map(order => order.taxType).filter(Boolean))];

    if (taxTypes.length === 0) return null;
    if (taxTypes.length === 1) return taxTypes[0] as 'intra-state' | 'inter-state';

    // Mixed tax types - default to intra-state
    return 'intra-state';
  }

  /**
   * Create order breakdown using Smart GST for each order
   */
  private async createSmartGstOrderBreakdown(orders: OrderDocument[], restaurantId: string): Promise<OrderBillBreakdown[]> {
    const breakdown: OrderBillBreakdown[] = [];

    for (const order of orders) {
      // Extract items from this order
      const orderItems: OrderItemGstData[] = order.items.map(item => ({
        menuItemId: item.menuItemId.toString(),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.pricing.unitAmount,
        discountAmount: item.pricing.discountAmount || 0,
      }));

      // Calculate Smart GST for this individual order
      const gstCalculation = await this.smartGstService.calculateOrderGst(
        restaurantId,
        orderItems,
        order.customerState
      );

      // Apply round-off
      const finalTotal = this.roundToTwo(gstCalculation.summary.totalAmount);
      const roundOffAmount = finalTotal - gstCalculation.summary.totalAmount;

      breakdown.push({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        subTotalAmount: gstCalculation.summary.subtotal,
        taxAmount: gstCalculation.summary.totalTaxAmount,
        cgstAmount: gstCalculation.summary.cgstAmount,
        sgstAmount: gstCalculation.summary.sgstAmount,
        igstAmount: gstCalculation.summary.igstAmount,
        discountAmount: gstCalculation.summary.discountAmount,
        totalAmount: finalTotal,
        roundOffAmount: this.roundToTwo(roundOffAmount),
        paidAmount: order.paidAmount || 0,
        pendingAmount: finalTotal - (order.paidAmount || 0),
        paymentStatus: order.paymentStatus,
        itemCount: orderItems.length,
        createdAt: order.createdAt,
      });
    }

    return breakdown;
  }

  /**
   * Create detailed order breakdown with item-level details using Smart GST
   */
  private async createDetailedOrderBreakdown(orders: OrderDocument[], restaurantId: string): Promise<OrderBillBreakdown[]> {
    const breakdown: OrderBillBreakdown[] = [];

    for (const order of orders) {
      // Extract items from this order
      const orderItems: OrderItemGstData[] = order.items.map(item => ({
        menuItemId: item.menuItemId.toString(),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.pricing.unitAmount,
        discountAmount: item.pricing.discountAmount || 0,
      }));

      // Calculate Smart GST for this individual order
      const gstCalculation = await this.smartGstService.calculateOrderGst(
        restaurantId,
        orderItems,
        order.customerState
      );

      // Apply round-off
      const finalTotal = this.roundToTwo(gstCalculation.summary.totalAmount);
      const roundOffAmount = finalTotal - gstCalculation.summary.totalAmount;

      // Create detailed item breakdown for this order
      const itemDetails: BillItemDetail[] = gstCalculation.items.map((item: OrderItemWithGst) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        taxableAmount: item.taxableAmount,
        gstRate: item.gstRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalTaxAmount: item.totalTaxAmount,
        totalWithTax: item.totalWithTax,
        hsnCode: item.hsnCode,
      }));

      breakdown.push({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        subTotalAmount: gstCalculation.summary.subtotal,
        taxAmount: gstCalculation.summary.totalTaxAmount,
        cgstAmount: gstCalculation.summary.cgstAmount,
        sgstAmount: gstCalculation.summary.sgstAmount,
        igstAmount: gstCalculation.summary.igstAmount,
        discountAmount: gstCalculation.summary.discountAmount,
        totalAmount: finalTotal,
        roundOffAmount: this.roundToTwo(roundOffAmount),
        paidAmount: order.paidAmount || 0,
        pendingAmount: finalTotal - (order.paidAmount || 0),
        paymentStatus: order.paymentStatus,
        itemCount: orderItems.length,
        createdAt: order.createdAt,
        items: itemDetails,
      });
    }

    return breakdown;
  }

  /**
   * DEPRECATED: Create order breakdown (old aggregation method)
   */
  private createOrderBreakdown(orders: OrderDocument[]): OrderBillBreakdown[] {
    return orders.map(order => ({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      subTotalAmount: this.roundToTwo(order.subTotalAmount || 0),
      taxAmount: this.roundToTwo(order.taxAmount || 0),
      cgstAmount: this.roundToTwo(order.cgstAmount || 0),
      sgstAmount: this.roundToTwo(order.sgstAmount || 0),
      igstAmount: this.roundToTwo(order.igstAmount || 0),
      discountAmount: this.roundToTwo(order.discountAmount || 0),
      totalAmount: this.roundToTwo(order.totalAmount || 0),
      roundOffAmount: this.roundToTwo(order.roundOffAmount || 0),
      paidAmount: order.paymentStatus === 'paid' ? this.roundToTwo(order.totalAmount || 0) : 0,
      pendingAmount: order.paymentStatus !== 'paid' ? this.roundToTwo(order.totalAmount || 0) : 0,
      paymentStatus: order.paymentStatus,
      itemCount: order.items.length,
      createdAt: order.createdAt,
    }));
  }

  private createEmptyBillCalculation(): BillCalculation {
    return {
      subTotalAmount: 0,
      taxAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      discountAmount: 0,
      grossAmount: 0,
      totalAmount: 0,
      roundOffAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      taxType: null,
      orderCount: 0,
      itemCount: 0,
      orderBreakdown: [],
      calculatedAt: new Date(),
      currency: 'INR',
    };
  }

  private roundToTwo(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}