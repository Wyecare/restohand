import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import {
  CustomerSession,
  CustomerSessionDocument,
} from '../../customer-sessions/schemas/customer-session.schema';
import {
  Restaurant,
  RestaurantDocument,
} from '../../restaurants/schemas/restaurant.schema';
import { Branch, BranchDocument } from '../../branches/schemas/branch.schema';
import { MenuItem, MenuItemDocument } from '../../menu-items/schemas/menu-item.schema';
import { MenuCategory, MenuCategoryDocument } from '../../menu-categories/schemas/menu-category.schema';
import {
  RestaurantBillingService,
  CartItem,
  RestaurantGstConfig,
  BranchCharge,
} from '../../common/services/restaurant-billing.service';

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

  // Branch charges
  branchCharges: Array<{
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
    includedInGst: boolean;
  }>;
  totalBranchCharges: number;

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

  // Mixed tax support (optional fields for mixed GST/VAT bills)
  categoryCalculations?: Array<{
    category: 'cooked_food' | 'fresh_items' | 'packaged_items' | 'beverages' | 'alcohol' | 'sweets' | 'ice_cream';
    subtotal: number;
    taxType: 'gst' | 'vat' | 'exempt';
    gstRate?: number;
    vatRate?: number;
    gstAmount?: number;
    vatAmount?: number;
    totalTaxAmount: number;
    totalWithTax: number;
  }>;
  totalGstAmount?: number;
  totalVatAmount?: number;
  gstSubtotal?: number;
  vatSubtotal?: number;
  exemptSubtotal?: number;
  stateVatAmount?: number;
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
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>,
    @InjectModel(MenuCategory.name)
    private readonly menuCategoryModel: Model<MenuCategoryDocument>,
    private readonly restaurantBillingService: RestaurantBillingService
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
    const {
      sessionId,
      orderIds,
      orderId,
      includeUnpaid = true,
      includeCancelled = false,
    } = params;

    let orders: OrderDocument[] = [];

    // Determine which orders to include in calculation
    if (sessionId) {
      orders = await this.getOrdersBySession(
        sessionId,
        includeUnpaid,
        includeCancelled
      );
    } else if (orderIds) {
      orders = await this.getOrdersByIds(
        orderIds,
        includeUnpaid,
        includeCancelled
      );
    } else if (orderId) {
      orders = await this.getOrdersByIds(
        [orderId],
        includeUnpaid,
        includeCancelled
      );
    } else {
      throw new Error('Must provide sessionId, orderIds, or orderId');
    }

    if (orders.length === 0) {
      return this.createEmptyBillCalculation();
    }

    // Get restaurant for tax configuration
    const restaurant = await this.restaurantModel.findById(
      orders[0].restaurantId
    );
    if (!restaurant) {
      throw new Error('Restaurant not found for bill calculation');
    }

    // Get restaurant GST configuration from restaurant object
    const gstSchema = restaurant.businessDetails?.gst;
    if (!gstSchema) {
      throw new Error('Restaurant GST configuration not found');
    }

    // Convert schema to interface format for RestaurantBillingService
    const gstConfig: RestaurantGstConfig = {
      establishmentType:
        gstSchema.establishmentType as RestaurantGstConfig['establishmentType'],
      defaultGstRate:
        gstSchema.defaultGstRate as RestaurantGstConfig['defaultGstRate'],
      canClaimITC: gstSchema.canClaimITC,
      businessState: gstSchema.businessState,
      gstin: gstSchema.gstin,
      enableServiceCharge: (gstSchema as any).enableServiceCharge || false,
      serviceChargeRate: (gstSchema as any).serviceChargeRate || 0,
      integratedWithDeliveryPlatforms:
        (gstSchema as any).integratedWithDeliveryPlatforms || false,
      isGstEnabled: (gstSchema as any).isGstEnabled !== false,
    };

    // Get branch charges (if branchId is available in orders)
    let branchCharges: BranchCharge[] = [];
    let orderType: 'dine_in' | 'takeout' | 'delivery' = 'dine_in';

    const firstOrderBranchId = orders[0].branchId;
    if (firstOrderBranchId) {
      const branch = await this.branchModel.findById(firstOrderBranchId);
      if (branch && branch.settings?.charges) {
        branchCharges = branch.settings.charges as BranchCharge[];
      }

      // Determine order type from first order
      orderType = orders[0].orderType || 'dine_in';
    }

    // Extract all items from all orders for bill-level GST calculation
    const allOrderItems: CartItem[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        allOrderItems.push({
          id: item.menuItemId.toString(),
          name: item.name,
          quantity: item.quantity,
          price: item.pricing.unitAmount,
        });
      }
    }

    // Use RestaurantBillingService for correct bill-level GST calculation
    const billCalculation = this.restaurantBillingService.calculateBill(
      allOrderItems,
      gstConfig,
      orders[0]?.customerState, // Use customer state from first order if available
      branchCharges,
      orderType
    );

    // Create order breakdown first to get accurate payment tracking
    const orderBreakdown = await this.createOrderBreakdown(
      orders,
      gstConfig,
      branchCharges,
      orderType
    );

    // Calculate payment tracking from order breakdown and adjust for rounding discrepancies
    const orderBreakdownPaidAmount = orderBreakdown.reduce((sum, orderBill) => {
      return sum + orderBill.paidAmount;
    }, 0);

    // If there's a small rounding discrepancy, adjust the last paid order to match session total
    const sessionTotal = billCalculation.grandTotal;
    const discrepancy = this.roundToTwo(
      sessionTotal - orderBreakdownPaidAmount
    );

    let paidAmount = orderBreakdownPaidAmount;

    if (Math.abs(discrepancy) > 0 && Math.abs(discrepancy) <= 0.05) {
      // Find the last paid order and adjust its paid amount to eliminate the discrepancy
      const lastPaidOrderIndex = orderBreakdown
        .map((order, index) => ({ ...order, index }))
        .filter((order) => order.paymentStatus === 'paid')
        .pop()?.index;

      if (lastPaidOrderIndex !== undefined) {
        orderBreakdown[lastPaidOrderIndex].paidAmount = this.roundToTwo(
          orderBreakdown[lastPaidOrderIndex].paidAmount + discrepancy
        );
        paidAmount = sessionTotal; // Now they match exactly
      }
    }

    const pendingAmount = this.roundToTwo(sessionTotal - paidAmount);

    return {
      // Use RestaurantBillingService calculated amounts
      subTotalAmount: billCalculation.subtotal,
      taxAmount: (billCalculation as any).totalTaxAmount || billCalculation.totalGstAmount,
      cgstAmount: billCalculation.cgstAmount,
      sgstAmount: billCalculation.sgstAmount,
      igstAmount: billCalculation.igstAmount,
      discountAmount: 0, // No discounts in current implementation
      grossAmount: billCalculation.subtotalWithCharges, // Subtotal + service charge + branch charges
      totalAmount: billCalculation.grandTotal,
      roundOffAmount: 0, // No rounding in current implementation

      // Branch charges
      branchCharges: billCalculation.branchCharges,
      totalBranchCharges: billCalculation.totalBranchCharges,

      // Payment tracking
      paidAmount,
      pendingAmount,

      // Metadata
      taxType: billCalculation.taxType,
      orderCount: orders.length,
      itemCount: allOrderItems.length,
      orderBreakdown,
      calculatedAt: new Date(),
      currency: 'INR',

      // Mixed tax support - include if available
      ...((billCalculation as any).categoryCalculations && {
        categoryCalculations: (billCalculation as any).categoryCalculations,
        totalGstAmount: (billCalculation as any).totalGstAmount,
        totalVatAmount: (billCalculation as any).totalVatAmount,
        gstSubtotal: (billCalculation as any).gstSubtotal,
        vatSubtotal: (billCalculation as any).vatSubtotal,
        exemptSubtotal: (billCalculation as any).exemptSubtotal,
        stateVatAmount: (billCalculation as any).stateVatAmount,
      }),
    };
  }

  /**
   * Calculate bill for a customer session
   */
  async calculateSessionBill(
    sessionId: string,
    includeUnpaid = true
  ): Promise<BillCalculation> {
    return this.calculateBill({ sessionId, includeUnpaid });
  }

  /**
   * Calculate bill for specific orders
   */
  async calculateOrdersBill(
    orderIds: string[],
    includeUnpaid = true
  ): Promise<BillCalculation> {
    return this.calculateBill({ orderIds, includeUnpaid });
  }

  /**
   * Calculate bill for a single order
   */
  async calculateSingleOrderBill(orderId: string): Promise<BillCalculation> {
    return this.calculateBill({ orderId });
  }

  /**
   * Calculate cart total BEFORE creating an order - for preview/cart calculations
   * This method takes cart items and restaurant info to calculate what the bill would be
   */
  async calculateCartTotal(
    restaurantId: string,
    cartItems: CartItem[],
    customerState?: string,
    orderType: 'dine_in' | 'takeout' | 'delivery' = 'dine_in',
    branchId?: string
  ): Promise<{
    subtotal: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    grossAmount: number;
    totalAmount: number;
    roundOffAmount: number;
    branchCharges: Array<{
      name: string;
      type: 'percentage' | 'fixed';
      value: number;
      amount: number;
      includedInGst: boolean;
    }>;
    totalBranchCharges: number;
    taxType: 'intra-state' | 'inter-state' | null;
  }> {
    // Get restaurant for tax configuration
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found for cart calculation');
    }

    // Get restaurant GST configuration from restaurant object
    const gstSchema = restaurant.businessDetails?.gst;
    if (!gstSchema) {
      throw new Error('Restaurant GST configuration not found');
    }

    // Convert schema to interface format for RestaurantBillingService
    const gstConfig: RestaurantGstConfig = {
      establishmentType:
        gstSchema.establishmentType as RestaurantGstConfig['establishmentType'],
      defaultGstRate:
        gstSchema.defaultGstRate as RestaurantGstConfig['defaultGstRate'],
      canClaimITC: gstSchema.canClaimITC,
      businessState: gstSchema.businessState,
      gstin: gstSchema.gstin,
      enableServiceCharge: (gstSchema as any).enableServiceCharge || false,
      serviceChargeRate: (gstSchema as any).serviceChargeRate || 0,
      integratedWithDeliveryPlatforms:
        (gstSchema as any).integratedWithDeliveryPlatforms || false,
      isGstEnabled: (gstSchema as any).isGstEnabled !== false,
    };

    // Get branch charges (if branchId is provided)
    let branchCharges: BranchCharge[] = [];
    if (branchId) {
      const branch = await this.branchModel.findById(branchId);
      if (branch && branch.settings?.charges) {
        branchCharges = branch.settings.charges as BranchCharge[];
      }
    }

    // Use RestaurantBillingService for calculation
    const billCalculation = this.restaurantBillingService.calculateBill(
      cartItems,
      gstConfig,
      customerState,
      branchCharges,
      orderType
    );

    return {
      subtotal: billCalculation.subtotal,
      taxAmount: billCalculation.totalGstAmount,
      cgstAmount: billCalculation.cgstAmount,
      sgstAmount: billCalculation.sgstAmount,
      igstAmount: billCalculation.igstAmount,
      grossAmount: billCalculation.subtotalWithCharges,
      totalAmount: billCalculation.grandTotal,
      roundOffAmount: 0, // No rounding in current implementation
      branchCharges: billCalculation.branchCharges,
      totalBranchCharges: billCalculation.totalBranchCharges,
      taxType: billCalculation.taxType,
    };
  }

  /**
   * Calculate detailed bill with item-level breakdown for a customer session
   */
  async calculateDetailedSessionBill(
    sessionId: string,
    includeUnpaid = true
  ): Promise<DetailedBillCalculation> {
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
    const orders = await this.getOrdersBySession(
      sessionId,
      includeUnpaid,
      false
    );

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

    // Get restaurant GST configuration from restaurant object
    const gstSchema = restaurant.businessDetails?.gst;
    if (!gstSchema) {
      throw new Error('Restaurant GST configuration not found');
    }

    // Convert schema to interface format for RestaurantBillingService
    const gstConfig: RestaurantGstConfig = {
      establishmentType:
        gstSchema.establishmentType as RestaurantGstConfig['establishmentType'],
      defaultGstRate:
        gstSchema.defaultGstRate as RestaurantGstConfig['defaultGstRate'],
      canClaimITC: gstSchema.canClaimITC,
      businessState: gstSchema.businessState,
      gstin: gstSchema.gstin,
      enableServiceCharge: (gstSchema as any).enableServiceCharge || false,
      serviceChargeRate: (gstSchema as any).serviceChargeRate || 0,
      integratedWithDeliveryPlatforms:
        (gstSchema as any).integratedWithDeliveryPlatforms || false,
      isGstEnabled: (gstSchema as any).isGstEnabled !== false,
    };

    // Get branch charges (if branchId is available in orders)
    let branchCharges: BranchCharge[] = [];
    let orderType: 'dine_in' | 'takeout' | 'delivery' = 'dine_in';

    const firstOrderBranchId = orders[0].branchId;
    if (firstOrderBranchId) {
      const branch = await this.branchModel.findById(firstOrderBranchId);
      if (branch && branch.settings?.charges) {
        branchCharges = branch.settings.charges as BranchCharge[];
      }

      // Determine order type from first order
      orderType = orders[0].orderType || 'dine_in';
    }

    // Extract all items from all orders for bill-level GST calculation
    // Include category information for mixed tax calculations
    const allOrderItems: CartItem[] = [];

    for (const order of orders) {
      for (const item of order.items) {
        // Get category information from menu item
        let foodCategory = 'cooked_food'; // default

        if (item.menuItemId) {
          try {
            const menuItem = await this.menuItemModel.findById(item.menuItemId);
            console.log(`🍺 Debug - Menu item ${item.name}:`, {
              itemId: item.menuItemId,
              categoryId: menuItem?.categoryId,
              hasMenuItem: !!menuItem,
            });

            if (menuItem && menuItem.categoryId) {
              const category = await this.menuCategoryModel.findById(
                menuItem.categoryId
              );
              console.log(`🍺 Debug - Category for ${item.name}:`, {
                categoryId: menuItem.categoryId,
                categoryName: category?.name,
                foodCategory: (category as any)?.foodCategory,
                hasCategory: !!category,
              });

              if (category && (category as any).foodCategory) {
                foodCategory = (category as any).foodCategory;
              }
            }
          } catch (error) {
            console.log(error, 'error');
            // If we can't find category info, default to cooked_food
            console.log(
              'Could not fetch category info for item:',
              item.menuItemId
            );
          }
        }

        allOrderItems.push({
          id: item.menuItemId.toString(),
          name: item.name,
          quantity: item.quantity,
          price: item.pricing.unitAmount,
          foodCategory: foodCategory as any,
        });
      }
    }

    // Check if we have mixed food categories that require different tax treatments
    const uniqueCategories = Array.from(
      new Set(allOrderItems.map((item) => item.foodCategory))
    );
    const hasMixedTaxCategories =
      uniqueCategories.some((cat) => cat === 'alcohol') ||
      uniqueCategories.some((cat) => cat === 'fresh_items');

    console.log('🍺 Debug - Final billing decision:', {
      uniqueCategories,
      hasMixedTaxCategories,
      willUseMixedBill: hasMixedTaxCategories,
      allItems: allOrderItems.map((item) => ({
        name: item.name,
        foodCategory: item.foodCategory,
      })),
    });

    // Use appropriate billing method based on item categories
    const billCalculation = hasMixedTaxCategories
      ? this.restaurantBillingService.calculateMixedBill(
          allOrderItems,
          gstConfig,
          orders[0]?.customerState,
          branchCharges,
          orderType
        )
      : this.restaurantBillingService.calculateBill(
          allOrderItems,
          gstConfig,
          orders[0]?.customerState, // Use customer state from first order if available
          branchCharges,
          orderType
        );

    // Create simplified item breakdown (no per-item GST breakdown in new system)
    const allItems: BillItemDetail[] = allOrderItems.map((item) => ({
      menuItemId: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      discountAmount: 0,
      taxableAmount: item.price * item.quantity,
      gstRate: gstConfig.defaultGstRate,
      cgstAmount: 0, // GST calculated at bill level, not per item
      sgstAmount: 0,
      igstAmount: 0,
      totalTaxAmount: 0,
      totalWithTax: item.price * item.quantity,
      hsnCode: undefined,
    }));

    // Create detailed order breakdown first to get accurate payment tracking
    const orderBreakdown = await this.createOrderBreakdown(
      orders,
      gstConfig,
      branchCharges,
      orderType
    );

    // Calculate payment tracking from order breakdown and adjust for rounding discrepancies
    const orderBreakdownPaidAmount = orderBreakdown.reduce((sum, orderBill) => {
      return sum + orderBill.paidAmount;
    }, 0);

    // If there's a small rounding discrepancy, adjust the last paid order to match session total
    const sessionTotal = billCalculation.grandTotal;
    const discrepancy = this.roundToTwo(
      sessionTotal - orderBreakdownPaidAmount
    );

    let paidAmount = orderBreakdownPaidAmount;

    if (Math.abs(discrepancy) > 0 && Math.abs(discrepancy) <= 0.05) {
      // Find the last paid order and adjust its paid amount to eliminate the discrepancy
      const lastPaidOrderIndex = orderBreakdown
        .map((order, index) => ({ ...order, index }))
        .filter((order) => order.paymentStatus === 'paid')
        .pop()?.index;

      if (lastPaidOrderIndex !== undefined) {
        orderBreakdown[lastPaidOrderIndex].paidAmount = this.roundToTwo(
          orderBreakdown[lastPaidOrderIndex].paidAmount + discrepancy
        );
        paidAmount = sessionTotal; // Now they match exactly
      }
    }

    const pendingAmount = this.roundToTwo(sessionTotal - paidAmount);

    return {
      // Use RestaurantBillingService calculated amounts
      subTotalAmount: billCalculation.subtotal,
      taxAmount: (billCalculation as any).totalTaxAmount || billCalculation.totalGstAmount,
      cgstAmount: billCalculation.cgstAmount,
      sgstAmount: billCalculation.sgstAmount,
      igstAmount: billCalculation.igstAmount,
      discountAmount: 0, // No discounts in current implementation
      grossAmount: billCalculation.subtotalWithCharges, // Subtotal + service charge + branch charges
      totalAmount: billCalculation.grandTotal,
      roundOffAmount: 0, // No rounding in current implementation

      // Branch charges
      branchCharges: billCalculation.branchCharges,
      totalBranchCharges: billCalculation.totalBranchCharges,

      // Payment tracking
      paidAmount,
      pendingAmount,

      // Metadata
      taxType: billCalculation.taxType,
      orderCount: orders.length,
      itemCount: allOrderItems.length,
      orderBreakdown,
      calculatedAt: new Date(),
      currency: 'INR',

      // Mixed tax support - include if available
      ...((billCalculation as any).categoryCalculations && {
        categoryCalculations: (billCalculation as any).categoryCalculations,
        totalGstAmount: (billCalculation as any).totalGstAmount,
        totalVatAmount: (billCalculation as any).totalVatAmount,
        gstSubtotal: (billCalculation as any).gstSubtotal,
        vatSubtotal: (billCalculation as any).vatSubtotal,
        exemptSubtotal: (billCalculation as any).exemptSubtotal,
        stateVatAmount: (billCalculation as any).stateVatAmount,
      }),

      // Additional detailed data
      restaurant: {
        id: restaurant._id.toString(),
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.contactPhone,
        email: restaurant.contactEmail,
        gstin: restaurant.businessDetails?.gst?.gstin,
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
    // Use the detailed session bill calculation which includes proper mixed tax calculations
    const detailedBillCalculation = await this.calculateDetailedSessionBill(sessionId, true);

    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          totalOrders: detailedBillCalculation.orderBreakdown?.length || 0,
          totalAmount: detailedBillCalculation.totalAmount, // This will include all taxes, VAT, GST, and branch charges
          subTotalAmount: detailedBillCalculation.subTotalAmount,
          taxAmount: detailedBillCalculation.taxAmount,
          cgstAmount: detailedBillCalculation.cgstAmount,
          sgstAmount: detailedBillCalculation.sgstAmount,
          igstAmount: detailedBillCalculation.igstAmount,
          discountAmount: detailedBillCalculation.discountAmount,
          roundOffAmount: detailedBillCalculation.roundOffAmount,
          paidAmount: detailedBillCalculation.paidAmount,
          pendingAmount: detailedBillCalculation.pendingAmount,
          allOrdersPaid: detailedBillCalculation.pendingAmount === 0,
          taxType: detailedBillCalculation.taxType,
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

  private determineTaxType(
    orders: OrderDocument[]
  ): 'intra-state' | 'inter-state' | null {
    const taxTypes = [
      ...new Set(orders.map((order) => order.taxType).filter(Boolean)),
    ];

    if (taxTypes.length === 0) return null;
    if (taxTypes.length === 1)
      return taxTypes[0] as 'intra-state' | 'inter-state';

    // Mixed tax types - default to intra-state
    return 'intra-state';
  }

  /**
   * Create order breakdown with proportional GST distribution from combined bill calculation
   */
  private async createOrderBreakdown(
    orders: OrderDocument[],
    gstConfig: any,
    branchCharges?: BranchCharge[],
    orderType: 'dine_in' | 'takeout' | 'delivery' = 'dine_in'
  ): Promise<OrderBillBreakdown[]> {
    const breakdown: OrderBillBreakdown[] = [];

    // First, get the combined bill calculation for proper tax distribution
    // Include category information for mixed tax calculations
    const allOrderItems: CartItem[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        // Get category information from menu item
        let foodCategory = 'cooked_food'; // default

        if (item.menuItemId) {
          try {
            const menuItem = await this.menuItemModel.findById(item.menuItemId);
            if (menuItem && menuItem.categoryId) {
              const category = await this.menuCategoryModel.findById(menuItem.categoryId);
              if (category && (category as any).foodCategory) {
                foodCategory = (category as any).foodCategory;
              }
            }
          } catch (error) {
            // If we can't find category info, default to cooked_food
            console.log('Could not fetch category info for item in order breakdown:', item.menuItemId);
          }
        }

        allOrderItems.push({
          id: item.menuItemId.toString(),
          name: item.name,
          quantity: item.quantity,
          price: item.pricing.unitAmount,
          foodCategory: foodCategory as any,
        });
      }
    }

    // Check if we have mixed food categories that require different tax treatments
    const uniqueCategories = Array.from(
      new Set(allOrderItems.map((item) => item.foodCategory))
    );
    const hasMixedTaxCategories =
      uniqueCategories.some((cat) => cat === 'alcohol') ||
      uniqueCategories.some((cat) => cat === 'fresh_items');

    // Calculate combined bill for tax distribution - use appropriate method
    const combinedBillCalculation = hasMixedTaxCategories
      ? this.restaurantBillingService.calculateMixedBill(
          allOrderItems,
          gstConfig,
          orders[0]?.customerState,
          branchCharges,
          orderType
        )
      : this.restaurantBillingService.calculateBill(
          allOrderItems,
          gstConfig,
          orders[0]?.customerState,
          branchCharges,
          orderType
        );

    const combinedSubtotal = combinedBillCalculation.subtotal;
    const combinedServiceCharge = combinedBillCalculation.serviceChargeAmount;

    for (const order of orders) {
      // Extract items from this order
      const orderItems: CartItem[] = order.items.map((item) => ({
        id: item.menuItemId.toString(),
        name: item.name,
        quantity: item.quantity,
        price: item.pricing.unitAmount,
      }));

      // Calculate this order's subtotal
      const orderSubtotal = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Calculate proportional distribution based on this order's contribution
      const orderProportion =
        combinedSubtotal > 0 ? orderSubtotal / combinedSubtotal : 0;

      // Distribute service charge proportionally
      const orderServiceChargeAmount = this.roundToTwo(
        combinedServiceCharge * orderProportion
      );
      const orderTaxableAmount = orderSubtotal + orderServiceChargeAmount;

      // Distribute tax amounts proportionally - handle both GST and mixed tax
      const orderCgstAmount = this.roundToTwo(
        combinedBillCalculation.cgstAmount * orderProportion
      );
      const orderSgstAmount = this.roundToTwo(
        combinedBillCalculation.sgstAmount * orderProportion
      );
      const orderIgstAmount = this.roundToTwo(
        combinedBillCalculation.igstAmount * orderProportion
      );

      // For mixed tax calculations, use total tax amount instead of just GST
      const totalTaxAmount = (combinedBillCalculation as any).totalTaxAmount || combinedBillCalculation.totalGstAmount;
      const orderTotalTaxAmount = this.roundToTwo(
        totalTaxAmount * orderProportion
      );

      // Distribute branch charges proportionally
      const orderBranchChargeAmount = this.roundToTwo(
        combinedBillCalculation.totalBranchCharges * orderProportion
      );

      const orderGrandTotal =
        orderTaxableAmount + orderTotalTaxAmount + orderBranchChargeAmount;
      const paidAmount = order.paymentStatus === 'paid' ? orderGrandTotal : 0;

      breakdown.push({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        subTotalAmount: this.roundToTwo(orderSubtotal),
        taxAmount: orderTotalTaxAmount,
        cgstAmount: orderCgstAmount,
        sgstAmount: orderSgstAmount,
        igstAmount: orderIgstAmount,
        discountAmount: 0, // No discounts in current implementation
        totalAmount: this.roundToTwo(orderGrandTotal),
        roundOffAmount: 0, // No rounding in current implementation
        paidAmount: this.roundToTwo(paidAmount),
        pendingAmount: this.roundToTwo(orderGrandTotal - paidAmount),
        paymentStatus: order.paymentStatus,
        itemCount: orderItems.length,
        createdAt: (order as any).createdAt || new Date(),
        items: orderItems.map((item) => {
          const itemSubtotal = item.price * item.quantity;
          const itemProportion =
            orderSubtotal > 0 ? itemSubtotal / orderSubtotal : 0;
          const itemTaxAmount = this.roundToTwo(
            orderTotalTaxAmount * itemProportion
          );
          const itemCgstAmount = this.roundToTwo(
            orderCgstAmount * itemProportion
          );
          const itemSgstAmount = this.roundToTwo(
            orderSgstAmount * itemProportion
          );
          const itemIgstAmount = this.roundToTwo(
            orderIgstAmount * itemProportion
          );

          return {
            menuItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            discountAmount: 0,
            taxableAmount: this.roundToTwo(itemSubtotal),
            gstRate: gstConfig.defaultGstRate,
            cgstAmount: itemCgstAmount,
            sgstAmount: itemSgstAmount,
            igstAmount: itemIgstAmount,
            totalTaxAmount: itemTaxAmount,
            totalWithTax: this.roundToTwo(itemSubtotal + itemTaxAmount),
            hsnCode: undefined,
          };
        }),
      });
    }

    return breakdown;
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
