import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import puppeteer from 'puppeteer';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import {
  MenuCategory,
  MenuCategoryDocument,
} from '../menu-categories/schemas/menu-category.schema';
import {
  MenuItem,
  MenuItemDocument,
} from '../menu-items/schemas/menu-item.schema';
import {
  MenuModifier,
  MenuModifierDocument,
} from '../menu-modifiers/schemas/menu-modifier.schema';
import {
  MenuPriceTag,
  MenuPriceTagDocument,
} from '../menu-price-tags/schemas/menu-price-tag.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import {
  RestaurantTable,
  RestaurantTableDocument,
} from '../restaurant-tables/schemas/restaurant-table.schema';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { RazorpayService } from '../payments/razorpay.service';
import { CashfreePaymentService } from '../payments/cashfree-payment.service';
import { RestaurantOnboardingService } from '../restaurants/restaurant-onboarding.service';
import { CustomerSessionsService } from '../customer-sessions/customer-sessions.service';
import { SmartGstService } from '../gst/smart-gst.service';

@Injectable()
export class PublicService {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(MenuCategory.name)
    private readonly categoryModel: Model<MenuCategoryDocument>,
    @InjectModel(MenuItem.name)
    private readonly itemModel: Model<MenuItemDocument>,
    @InjectModel(MenuModifier.name)
    private readonly modifierModel: Model<MenuModifierDocument>,
    @InjectModel(MenuPriceTag.name)
    private readonly priceTagModel: Model<MenuPriceTagDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(RestaurantTable.name)
    private readonly tableModel: Model<RestaurantTableDocument>,
    private readonly ordersService: OrdersService,
    private readonly razorpayService: RazorpayService,
    private readonly cashfreePaymentService: CashfreePaymentService,
    private readonly restaurantOnboardingService: RestaurantOnboardingService,
    private readonly customerSessionsService: CustomerSessionsService,
    private readonly smartGstService: SmartGstService
  ) {}

  async getRestaurantBySlug(slug: string) {
    const restaurant = await this.restaurantModel
      .findOne({ slug, isActive: true })
      .lean();

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${slug} not found`);
    }

    return {
      id: restaurant._id.toString(),
      name: restaurant.name,
      slug: restaurant.slug,
      contactEmail: restaurant.contactEmail,
      contactPhone: restaurant.contactPhone,
      timezone: restaurant.timezone,
      upi: restaurant.upi,
      languages: restaurant.languages,
      settings: restaurant.settings,
    };
  }

  // CRITICAL FIX: Get branch ID from table number for proper branch isolation
  async getBranchIdFromTable(
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

  async getBranchIdFromTableId(tableId: string): Promise<string | undefined> {
    const table = await this.tableModel
      .findOne({
        _id: new Types.ObjectId(tableId),
        isActive: true,
      })
      .lean();

    return table?.branchId?.toString();
  }

  async getMenuForRestaurant(restaurantId: string, branchId?: string, includeUnavailable: boolean = false) {
    // CRITICAL FIX: Add branch filtering to prevent cross-branch menu contamination
    const categoryQuery: any = {
      restaurantId: new Types.ObjectId(restaurantId),
      isActive: true,
    };
    const itemQuery: any = {
      restaurantId: new Types.ObjectId(restaurantId),
    };

    // Only filter by availability if includeUnavailable is false
    if (!includeUnavailable) {
      itemQuery.isAvailable = true;
    }

    // If branchId is provided, only show items/categories from that branch
    if (branchId) {
      categoryQuery.branchId = new Types.ObjectId(branchId);
      itemQuery.branchId = new Types.ObjectId(branchId);
    }

    const [categories, items, modifiers, priceTags] = await Promise.all([
      this.categoryModel
        .find(categoryQuery)
        .sort({ displayOrder: 1, createdAt: 1 })
        .lean(),
      this.itemModel.find(itemQuery).sort({ displayOrder: 1, name: 1 }).lean(),
      // Fetch active modifiers for this restaurant/branch
      this.modifierModel.find({
        restaurantId: new Types.ObjectId(restaurantId),
        ...(branchId ? { branchId: new Types.ObjectId(branchId) } : {}),
        isActive: true,
      }).sort({ displayOrder: 1 }).lean(),
      // Fetch active price tags for this restaurant/branch
      this.priceTagModel.find({
        restaurantId: new Types.ObjectId(restaurantId),
        ...(branchId ? { branchId: new Types.ObjectId(branchId) } : {}),
        isActive: true,
      }).sort({ displayOrder: 1 }).lean(),
    ]);

    // Helper function to get modifiers and active price tag for an item
    const getItemEnhancements = (itemId: string, menuItem: any) => {
      // Find applicable modifiers for this item
      const applicableModifiers = modifiers.filter(modifier =>
        (modifier.applicableMenuItems && modifier.applicableMenuItems.some(id => id.toString() === itemId)) ||
        (!modifier.applicableMenuItems || modifier.applicableMenuItems.length === 0) // If no specific items, applies to all
      ).map(modifier => ({
        id: modifier._id.toString(),
        name: modifier.name,
        description: modifier.description,
        selectionType: modifier.selectionType,
        minSelections: modifier.minSelections,
        maxSelections: modifier.maxSelections,
        isRequired: modifier.isRequired,
        displayOrder: modifier.displayOrder,
        options: (modifier.options || []).map(option => ({
          id: option.id || option._id?.toString(),
          name: option.name,
          description: option.description,
          priceAdjustment: option.priceAdjustment,
          currency: option.currency,
          isAvailable: option.isAvailable,
          displayOrder: option.displayOrder,
          imageUrl: option.imageUrl,
          calories: option.calories,
          allergens: option.allergens,
        })),
      }));

      // Find active price tag for this item - ONLY use the admin's explicit choice
      let activePriceTag = null;

      // Only use the activePriceTagId set by admin - no priority logic, no fallbacks
      if (menuItem.activePriceTagId) {
        activePriceTag = priceTags.find(priceTag =>
          priceTag._id.toString() === menuItem.activePriceTagId.toString() && priceTag.isActive
        );
      }

      // No fallback - if no activePriceTagId is explicitly set, then no price tag is active

      return {
        modifiers: applicableModifiers,
        activePriceTag: activePriceTag ? (() => {
          // Find the specific pricing for this item
          const itemPricing = activePriceTag.itemPrices.find(itemPrice =>
            itemPrice.menuItemId.toString() === itemId && itemPrice.isActive
          );

          const effectivePrice = itemPricing?.price || 0;
          const originalPrice = menuItem.pricing.amount;
          const actualDiscountValue = originalPrice - effectivePrice;

          return {
            id: activePriceTag._id.toString(),
            name: activePriceTag.name,
            discountType: itemPricing?.discountType || 'fixed',
            discountValue: actualDiscountValue, // Actual discount amount
            effectivePrice: effectivePrice, // The final price after discount
            validUntil: activePriceTag.validUntil,
          };
        })() : null,
      };
    };

    const grouped = categories.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      items: items
        .filter(
          (item) => item.categoryId?.toString() === category._id.toString()
        )
        .map((item) => {
          const enhancements = getItemEnhancements(item._id.toString(), item);
          return {
            id: item._id.toString(),
            name: item.name,
            description: item.description,
            pricing: item.pricing,
            tags: item.tags,
            imageUrls: item.imageUrls,
            isAvailable: item.isAvailable,
            modifiers: enhancements.modifiers,
            activePriceTag: enhancements.activePriceTag,
          };
        }),
    }));

    const uncategorisedItems = items
      .filter((item) => !item.categoryId)
      .map((item) => {
        const enhancements = getItemEnhancements(item._id.toString(), item);
        return {
          id: item._id.toString(),
          name: item.name,
          description: item.description,
          pricing: item.pricing,
          tags: item.tags,
          imageUrls: item.imageUrls,
          isAvailable: item.isAvailable,
          modifiers: enhancements.modifiers,
          activePriceTag: enhancements.activePriceTag,
        };
      });

    return {
      categories: grouped,
      uncategorised: uncategorisedItems,
    };
  }

  // CRITICAL FIX: Validate that ordered items belong to the correct branch
  async validateItemsBelongToBranch(
    restaurantId: string,
    itemIds: string[],
    branchId: string
  ): Promise<boolean> {
    if (!branchId || itemIds.length === 0) return true;

    const items = await this.itemModel
      .find({
        _id: { $in: itemIds },
        restaurantId,
        branchId,
        isAvailable: true,
      })
      .lean();

    // All items must belong to the specified branch
    return items.length === itemIds.length;
  }

  async getOrderById(slug: string, orderId: string) {
    const restaurant = await this.restaurantModel.findOne({ slug }).lean();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${slug} not found`);
    }

    const order = await this.orderModel
      .findOne({ _id: orderId, restaurantId: restaurant._id })
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order._id.toString(),
      restaurantSlug: slug,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      progress: order.progress,
      tableId: order.tableId?.toString(),
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      subTotalAmount: order.subTotalAmount ?? order.totalAmount,
      grossAmount: order.grossAmount ?? order.totalAmount,
      taxAmount: order.taxAmount ?? 0,
      cgstAmount: order.cgstAmount ?? 0,
      sgstAmount: order.sgstAmount ?? 0,
      igstAmount: order.igstAmount ?? 0,
      discountAmount: order.discountAmount ?? 0,
      roundOffAmount: order.roundOffAmount ?? 0,
      totalAmount: order.totalAmount,
      taxType: order.taxType,
      createdAt: order.createdAt,
      readyAt: order.readyAt,
      paidAt: order.paidAt,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        pricing: item.pricing,
        gst: item.gst,
        activePriceTagId: item.activePriceTagId,
        selectedModifiers: item.selectedModifiers,
        notes: item.notes,
      })),
    };
  }

  async getActiveOrderForTableId(
    restaurantId: string,
    tableId: string,
    restaurantSlug: string
  ) {
    // Find the most recent order for this table that is still active (using tableId)
    const activeStatuses = [
      OrderStatus.Pending,
      OrderStatus.Accepted,
      OrderStatus.InProgress,
      OrderStatus.Ready,
    ];

    const order = await this.orderModel
      .findOne({
        restaurantId: new Types.ObjectId(restaurantId),
        tableId: new Types.ObjectId(tableId),
        status: { $in: activeStatuses },
      })
      .sort({ createdAt: -1 }) // Get the most recent order
      .lean();

    if (!order || order.paymentStatus === PaymentStatus.Paid) {
      return null;
    }

    return {
      id: order._id.toString(),
      restaurantSlug,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      progress: order.progress,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      subTotalAmount: order.subTotalAmount ?? order.totalAmount,
      grossAmount: order.grossAmount ?? order.totalAmount,
      taxAmount: order.taxAmount ?? 0,
      cgstAmount: order.cgstAmount ?? 0,
      sgstAmount: order.sgstAmount ?? 0,
      igstAmount: order.igstAmount ?? 0,
      discountAmount: order.discountAmount ?? 0,
      roundOffAmount: order.roundOffAmount ?? 0,
      totalAmount: order.totalAmount,
      taxType: order.taxType,
      createdAt: order.createdAt,
      readyAt: order.readyAt,
      paidAt: order.paidAt,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        pricing: item.pricing,
        gst: item.gst,
        activePriceTagId: item.activePriceTagId,
        selectedModifiers: item.selectedModifiers,
        notes: item.notes,
      })),
    };
  }

  async getInvoice(slug: string, orderId: string) {
    const restaurant = await this.restaurantModel.findOne({ slug }).lean();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${slug} not found`);
    }
    return this.ordersService.generateInvoiceHtml(
      restaurant._id.toString(),
      orderId
    );
  }

  async cancelOrder(slug: string, orderId: string) {
    const restaurant = await this.restaurantModel.findOne({ slug }).lean();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${slug} not found`);
    }

    const order = await this.orderModel
      .findOne({ _id: orderId, restaurantId: restaurant._id })
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const currentStatus = order.status as OrderStatus;
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.Pending,
      OrderStatus.Accepted,
      OrderStatus.InProgress,
    ];

    if (!cancellableStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        'Order can no longer be cancelled. Please contact the staff for assistance.'
      );
    }

    return this.ordersService.updateStatus(restaurant._id.toString(), orderId, {
      status: OrderStatus.Cancelled,
      statusNote: 'Cancelled by customer',
    });
  }

  async getActiveOrderForTable(
    restaurantId: string,
    tableNumber: string,
    restaurantSlug: string
  ) {
    // Find the most recent order for this table that is still active
    const activeStatuses = [
      OrderStatus.Pending,
      OrderStatus.Accepted,
      OrderStatus.InProgress,
      OrderStatus.Ready,
    ];

    // CRITICAL FIX: Get branchId from table to filter orders correctly
    const branchId = await this.getBranchIdFromTable(restaurantId, tableNumber);

    const order = await this.orderModel
      .findOne({
        restaurantId: new Types.ObjectId(restaurantId),
        branchId: branchId ? new Types.ObjectId(branchId) : { $exists: false },
        tableNumber,
        status: { $in: activeStatuses },
      })
      .sort({ createdAt: -1 }) // Get the most recent order
      .lean();

    if (!order || order.paymentStatus === PaymentStatus.Paid) {
      return null;
    }

    return {
      id: order._id.toString(),
      restaurantSlug,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      progress: order.progress,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      subTotalAmount: order.subTotalAmount ?? order.totalAmount,
      grossAmount: order.grossAmount ?? order.totalAmount,
      taxAmount: order.taxAmount ?? 0,
      cgstAmount: order.cgstAmount ?? 0,
      sgstAmount: order.sgstAmount ?? 0,
      igstAmount: order.igstAmount ?? 0,
      discountAmount: order.discountAmount ?? 0,
      roundOffAmount: order.roundOffAmount ?? 0,
      totalAmount: order.totalAmount,
      taxType: order.taxType,
      createdAt: order.createdAt,
      readyAt: order.readyAt,
      paidAt: order.paidAt,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        pricing: item.pricing,
        gst: item.gst,
        activePriceTagId: item.activePriceTagId,
        selectedModifiers: item.selectedModifiers,
        notes: item.notes,
      })),
    };
  }

  async getTableSessionData(
    restaurantId: string,
    tableId: string,
    restaurantSlug: string
  ) {
    // First check if session is closed
    const sessionClosedOrder = await this.orderModel
      .findOne({
        restaurantId: new Types.ObjectId(restaurantId),
        tableId: new Types.ObjectId(tableId),
        sessionClosed: true,
      })
      .lean();

    const sessionClosed = !!sessionClosedOrder;

    if (sessionClosed) {
      // Session is closed - return all orders (including completed) for receipt view
      const orders = await this.orderModel
        .find({
          restaurantId: new Types.ObjectId(restaurantId),
          tableId: new Types.ObjectId(tableId),
          status: { $ne: OrderStatus.Cancelled }, // Exclude only cancelled orders
        })
        .sort({ createdAt: 1 });
        // Removed .lean() to fix selectedModifiers serialization issue

      if (!orders.length) {
        return null;
      }

      // Return with session closed flag
      return await this.formatTableSession(orders, restaurantSlug, true);
    }

    // Session is active - find only active orders (including paid orders which should be visible in session)
    const activeStatuses = [
      OrderStatus.Pending,
      OrderStatus.Accepted,
      OrderStatus.InProgress,
      OrderStatus.Ready,
      OrderStatus.Completed,
      'paid', // Include paid orders in active sessions for customer visibility
    ];

    const orders = await this.orderModel
      .find({
        restaurantId: new Types.ObjectId(restaurantId),
        tableId: new Types.ObjectId(tableId),
        status: { $in: activeStatuses },
        // Include both paid and unpaid orders as they're part of the session
      })
      .sort({ createdAt: 1 }); // Oldest first to show order sequence
      // Removed .lean() to fix selectedModifiers serialization issue

    if (!orders.length) {
      return null;
    }

    return await this.formatTableSession(orders, restaurantSlug, false);
  }

  private async formatTableSession(
    orders: any[],
    restaurantSlug: string,
    sessionClosed: boolean = false
  ) {
    // Transform orders into public format
    const sessionOrders = await Promise.all(orders.map(async (order) => ({
      id: order._id.toString(),
      restaurantSlug,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      progress: order.progress,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      subTotalAmount: order.subTotalAmount ?? order.totalAmount,
      grossAmount: order.grossAmount ?? order.totalAmount,
      taxAmount: order.taxAmount ?? 0,
      cgstAmount: order.cgstAmount ?? 0,
      sgstAmount: order.sgstAmount ?? 0,
      igstAmount: order.igstAmount ?? 0,
      discountAmount: order.discountAmount ?? 0,
      roundOffAmount: order.roundOffAmount ?? 0,
      totalAmount: order.totalAmount,
      taxType: order.taxType,
      createdAt: order.createdAt,
      readyAt: order.readyAt,
      paidAt: order.paidAt,
      items: await Promise.all(order.items.map(async (item) => {
        // Get original menu item price if there's an active price tag
        let originalPrice = item.pricing.unitAmount;
        if (item.activePriceTagId) {
          const menuItem = await this.itemModel.findById(item.menuItemId).lean();
          if (menuItem) {
            originalPrice = menuItem.pricing.amount;
          }
        }

        return {
          name: item.name,
          quantity: item.quantity,
          pricing: item.pricing,
          originalPrice: originalPrice,
          gst: item.gst,
          activePriceTagId: item.activePriceTagId,
          selectedModifiers: item.selectedModifiers,
          notes: item.notes,
        };
      })),
    })));

    // Calculate proper session-level tax using Smart GST
    let sessionTotals = {
      subTotalAmount: 0,
      taxAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      discountAmount: 0,
      roundOffAmount: 0,
      totalAmount: 0,
    };

    try {
      // Prepare items for tax calculation
      const consolidatedItems = [];
      for (const order of orders) {
        for (const item of order.items) {
          consolidatedItems.push({
            menuItemId: item.menuItemId.toString(),
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.pricing.unitAmount,
            discountAmount: item.pricing.discountAmount || 0,
          });
        }
      }

      if (consolidatedItems.length > 0) {
        // Calculate tax using Smart GST service
        const taxCalculation = await this.smartGstService.calculateOrderGst(
          orders[0].restaurantId.toString(),
          consolidatedItems,
          orders[0].customerState
        );

        sessionTotals = {
          subTotalAmount: taxCalculation.summary.subtotal,
          taxAmount: taxCalculation.summary.totalTaxAmount,
          cgstAmount: taxCalculation.summary.cgstAmount,
          sgstAmount: taxCalculation.summary.sgstAmount,
          igstAmount: taxCalculation.summary.igstAmount,
          discountAmount: 0,
          roundOffAmount: 0,
          totalAmount: taxCalculation.summary.totalAmount,
        };
      }
    } catch (error) {
      console.warn('Failed to calculate session tax, falling back to recalculation:', error);
      // Fallback: If Smart GST fails, try recalculating taxes from scratch
      try {
        const consolidatedItems = [];
        let hasValidItems = false;

        for (const order of orders) {
          for (const item of order.items) {
            if (item.menuItemId && item.pricing?.unitAmount) {
              consolidatedItems.push({
                menuItemId: item.menuItemId.toString(),
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.pricing.unitAmount,
                discountAmount: item.pricing.discountAmount || 0,
              });
              hasValidItems = true;
            }
          }
        }

        if (hasValidItems) {
          // Retry with more robust error handling
          const taxCalculation = await this.smartGstService.calculateOrderGst(
            orders[0].restaurantId.toString(),
            consolidatedItems,
            orders[0].customerState
          );

          sessionTotals = {
            subTotalAmount: taxCalculation.summary.subtotal,
            taxAmount: taxCalculation.summary.totalTaxAmount,
            cgstAmount: taxCalculation.summary.cgstAmount,
            sgstAmount: taxCalculation.summary.sgstAmount,
            igstAmount: taxCalculation.summary.igstAmount,
            discountAmount: 0,
            roundOffAmount: 0,
            totalAmount: taxCalculation.summary.totalAmount,
          };
        } else {
          // Final fallback to order totals
          orders.forEach((order) => {
            sessionTotals.subTotalAmount += order.subTotalAmount ?? order.totalAmount;
            sessionTotals.taxAmount += order.taxAmount ?? 0;
            sessionTotals.cgstAmount += order.cgstAmount ?? 0;
            sessionTotals.sgstAmount += order.sgstAmount ?? 0;
            sessionTotals.igstAmount += order.igstAmount ?? 0;
            sessionTotals.discountAmount += order.discountAmount ?? 0;
            sessionTotals.roundOffAmount += order.roundOffAmount ?? 0;
            sessionTotals.totalAmount += order.totalAmount;
          });
        }
      } catch (fallbackError) {
        console.error('Complete tax calculation failure, using order totals:', fallbackError);
        // Final fallback to order totals
        orders.forEach((order) => {
          sessionTotals.subTotalAmount += order.subTotalAmount ?? order.totalAmount;
          sessionTotals.taxAmount += order.taxAmount ?? 0;
          sessionTotals.cgstAmount += order.cgstAmount ?? 0;
          sessionTotals.sgstAmount += order.sgstAmount ?? 0;
          sessionTotals.igstAmount += order.igstAmount ?? 0;
          sessionTotals.discountAmount += order.discountAmount ?? 0;
          sessionTotals.roundOffAmount += order.roundOffAmount ?? 0;
          sessionTotals.totalAmount += order.totalAmount;
        });
      }
    }

    return {
      tableId: orders[0].tableId?.toString(),
      tableNumber: orders[0].tableNumber,
      restaurantSlug,
      orders: sessionOrders,
      totals: sessionTotals,
      orderCount: sessionOrders.length,
      hasUnpaidOrders: sessionOrders.some(
        (order) => order.paymentStatus !== PaymentStatus.Paid
      ),
      allOrdersPaid: sessionOrders.every(
        (order) => order.paymentStatus === PaymentStatus.Paid
      ),
      sessionClosed,
    };
  }


  async createOrder(slug: string, orderData: any) {
    const restaurant = await this.getRestaurantBySlug(slug);

    // Extract branchId from table and ensure tableId is properly set
    let branchId: string | undefined;
    let table = null;

    if (orderData.tableId) {
      table = await this.tableModel.findOne({
        _id: new Types.ObjectId(orderData.tableId),
        isActive: true
      }).lean();
      if (table) {
        branchId = table.branchId?.toString();
        // Ensure tableId is properly converted to ObjectId string format
        orderData.tableId = table._id.toString();
        orderData.tableNumber = table.tableNumber;
      }
    } else if (orderData.tableNumber) {
      branchId = await this.getBranchIdFromTable(
        restaurant.id,
        orderData.tableNumber
      );
    }

    // Create order using OrdersService
    return this.ordersService.create(
      restaurant.id,
      {
        ...orderData,
        restaurantId: restaurant.id,
        paymentMethod: orderData.paymentMethod || 'pending',
      },
      branchId
    );
  }

  async createPaymentIntent(slug: string, orderId: string) {
    const restaurant = await this.getRestaurantBySlug(slug);

    if (!this.razorpayService.isEnabled() || !this.razorpayService.publicKey) {
      throw new BadRequestException('Online payments are not configured');
    }

    const order = await this.ordersService.findOne(restaurant.id, orderId);

    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Order already paid');
    }

    const amountInPaise = Math.round(order.totalAmount * 100);
    if (amountInPaise <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    // Check if restaurant has linked account for direct settlement
    const canReceivePayments =
      await this.restaurantOnboardingService.canReceivePayments(restaurant.id);
    const linkedAccountId =
      await this.restaurantOnboardingService.getLinkedAccountId(restaurant.id);

    let razorpayOrder: any;

    if (canReceivePayments && linkedAccountId) {
      // Direct settlement - 100% to restaurant (Pure SaaS model)
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_${order.orderNumber}`,
        notes: {
          restaurantId: restaurant.id,
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
    } else {
      // Fallback: Traditional payment (money comes to our account first)
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_${order.orderNumber}`,
        notes: {
          restaurantId: restaurant.id,
          orderId,
          settlementType: 'traditional',
        },
      });
    }

    await this.ordersService.registerPaymentIntent(
      restaurant.id,
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
        id: restaurant.id,
      },
      settlementType: canReceivePayments ? 'direct' : 'traditional',
    };
  }

  async addItemsToOrder(slug: string, orderId: string, itemsData: any) {
    const restaurant = await this.getRestaurantBySlug(slug);

    // Use OrdersService add items method
    return this.ordersService.addItemsToOrder(
      restaurant.id,
      orderId,
      itemsData
    );
  }

  /**
   * Create customer session when QR code is scanned
   * This is the entry point for customer ordering
   */
  async createCustomerSession(
    slug: string,
    tableId: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    // Get restaurant and validate
    const restaurant = await this.getRestaurantBySlug(slug);

    // Get table info
    const table = await this.tableModel
      .findOne({
        _id: new Types.ObjectId(tableId),
        restaurantId: restaurant.id,
        isActive: true
      })
      .lean();

    if (!table) {
      throw new NotFoundException(`Table not found or inactive`);
    }

    // Create customer session
    const session = await this.customerSessionsService.createSession(
      restaurant.id,
      tableId,
      table.tableNumber,
      userAgent,
      ipAddress
    );

    return {
      sessionId: session.sessionId,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
      table: {
        id: table._id.toString(),
        tableNumber: table.tableNumber,
        displayName: table.displayName,
      },
      expiresAt: session.expiresAt,
      message: 'Session created successfully. You can now browse the menu and place orders.',
    };
  }

  async createSessionPaymentIntent(slug: string, tableId: string) {
    const restaurant = await this.getRestaurantBySlug(slug);

    if (!this.razorpayService.isEnabled() || !this.razorpayService.publicKey) {
      throw new BadRequestException('Online payments are not configured');
    }

    // Get all unpaid orders for this table
    const unpaidOrders = await this.orderModel
      .find({
        restaurantId: restaurant.id,
        tableId: new Types.ObjectId(tableId),
        paymentStatus: PaymentStatus.Pending,
        status: { $ne: OrderStatus.Cancelled },
      })
      .lean();

    if (!unpaidOrders.length) {
      throw new BadRequestException('No unpaid orders found for this table');
    }

    // Prepare items from all unpaid orders for tax calculation
    const allOrderItems = [];
    for (const order of unpaidOrders) {
      for (const item of order.items) {
        allOrderItems.push({
          menuItemId: item.menuItemId.toString(), // Convert ObjectId to string
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.pricing.unitAmount,
          discountAmount: item.pricing.discountAmount || 0,
        });
      }
    }

    // Calculate tax on the combined session total
    const taxCalculation = await this.smartGstService.calculateOrderGst(
      restaurant.id,
      allOrderItems,
      unpaidOrders[0]?.customerState // Use customer state from first order
    );

    const finalAmountWithTax = taxCalculation.summary.totalAmount;
    const amountInPaise = Math.round(finalAmountWithTax * 100);

    if (amountInPaise <= 0) {
      throw new BadRequestException('Total amount must be greater than zero');
    }

    // Check if restaurant has linked account for direct settlement
    const canReceivePayments =
      await this.restaurantOnboardingService.canReceivePayments(restaurant.id);
    const linkedAccountId =
      await this.restaurantOnboardingService.getLinkedAccountId(restaurant.id);

    // Create combined receipt number for all orders
    const orderNumbers = unpaidOrders
      .map((order) => order.orderNumber)
      .join(',');

    let razorpayOrder: any;

    if (canReceivePayments && linkedAccountId) {
      // Direct settlement - 100% to restaurant (Pure SaaS model)
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `sess_${tableId.slice(-8)}_${Date.now().toString().slice(-6)}`,
        notes: {
          restaurantId: restaurant.id,
          tableId,
          orderIds: unpaidOrders.map((order) => order._id.toString()).join(','),
          settlementType: 'direct',
          type: 'session_payment',
        },
        transfers: [
          {
            account: linkedAccountId,
            amount: amountInPaise, // 100% to restaurant
            currency: 'INR',
            notes: {
              tableId,
              orderNumbers,
            },
          },
        ],
      });
    } else {
      // Fallback: Traditional payment (money comes to our account first)
      razorpayOrder = await this.razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `sess_${tableId.slice(-8)}_${Date.now().toString().slice(-6)}`,
        notes: {
          restaurantId: restaurant.id,
          tableId,
          orderIds: unpaidOrders.map((order) => order._id.toString()).join(','),
          settlementType: 'traditional',
          type: 'session_payment',
        },
      });
    }

    // Register payment intent for all orders
    for (const order of unpaidOrders) {
      await this.ordersService.registerPaymentIntent(
        restaurant.id,
        order._id.toString(),
        'razorpay',
        razorpayOrder.id,
        {
          orderNumber: order.orderNumber,
          amount: order.totalAmount * 100,
          currency: razorpayOrder.currency,
          settlementType: canReceivePayments ? 'direct' : 'traditional',
          linkedAccountId,
          sessionPayment: true,
          totalSessionAmount: amountInPaise,
          createdAt: new Date().toISOString(),
        }
      );
    }

    return {
      razorpayKey: this.razorpayService.publicKey,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      restaurant: {
        id: restaurant.id,
      },
      settlementType: canReceivePayments ? 'direct' : 'traditional',
      orderIds: unpaidOrders.map((order) => order._id.toString()),
      orderCount: unpaidOrders.length,
      totalAmount: finalAmountWithTax,
    };
  }

  async getConsolidatedBill(slug: string, tableId: string) {
    const restaurant = await this.restaurantModel.findOne({ slug }).lean();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${slug} not found`);
    }

    // Get table session data
    const tableSession = await this.getTableSessionData(
      restaurant._id.toString(),
      tableId,
      slug
    );

    if (!tableSession || tableSession.orders.length === 0) {
      throw new NotFoundException(`No orders found for table`);
    }

    // Get full order documents
    const orderIds = tableSession.orders.map((order) => order.id);
    const fullOrders = await this.orderModel.find({
      _id: { $in: orderIds.map(id => new Types.ObjectId(id)) },
    }).lean();

    // Prepare items for tax calculation
    const consolidatedItems = [];
    for (const order of fullOrders) {
      for (const item of order.items) {
        consolidatedItems.push({
          menuItemId: item.menuItemId.toString(),
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.pricing.unitAmount,
          discountAmount: item.pricing.discountAmount || 0,
        });
      }
    }

    // Calculate tax on the consolidated session total using Smart GST
    const taxCalculation = await this.smartGstService.calculateOrderGst(
      restaurant._id.toString(),
      consolidatedItems,
      fullOrders[0]?.customerState
    );

    // Format bill data
    const orders = fullOrders.map((order) => ({
      orderNumber: order.orderNumber,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.pricing.unitAmount,
        lineTotal: item.pricing.unitAmount * item.quantity,
        activePriceTagId: item.activePriceTagId,
        selectedModifiers: item.selectedModifiers?.map((modifier) => ({
          modifierName: modifier.modifierName,
          selectedOptions: modifier.selectedOptions.map((option) => ({
            optionName: option.optionName,
            priceAdjustment: option.priceAdjustment,
          })),
        })),
        notes: item.notes,
      })),
      orderTotal: order.items.reduce((sum, item) =>
        sum + (item.pricing.unitAmount * item.quantity), 0),
    }));

    return {
      restaurant: {
        id: restaurant._id.toString(),
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.contactPhone,
        email: restaurant.contactEmail,
        gstin: restaurant.businessDetails?.gst?.gstin,
      },
      bill: {
        tableNumber: tableSession.tableNumber,
        orders,
        subtotal: taxCalculation.summary.subtotal,
        taxAmount: taxCalculation.summary.totalTaxAmount,
        cgstAmount: taxCalculation.summary.cgstAmount,
        sgstAmount: taxCalculation.summary.sgstAmount,
        igstAmount: taxCalculation.summary.igstAmount,
        roundOffAmount: 0, // Round off will be calculated in frontend or later
        totalAmount: taxCalculation.summary.totalAmount,
        billGeneratedAt: new Date().toISOString(),
      },
    };
  }

  async getCombinedTableInvoice(slug: string, tableId: string) {
    // Get consolidated bill data with proper tax calculation
    const consolidatedBillData = await this.getConsolidatedBill(slug, tableId);
    const { restaurant, bill } = consolidatedBillData;

    // Generate thermal receipt-style HTML
    const receiptHtml = this.generateThermalReceiptHtml(restaurant, bill);

    // Generate PDF from HTML using Puppeteer
    const pdfBuffer = await this.generatePdfFromHtml(receiptHtml);

    return {
      pdf: pdfBuffer,
      filename: `table-${bill.tableNumber}-bill-${new Date().toISOString().slice(0, 10)}.pdf`,
    };
  }

  private generateThermalReceiptHtml(restaurant: any, bill: any): string {
    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
    const formatDate = (date: string) => new Date(date).toLocaleString('en-IN');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bill - Table ${bill.tableNumber}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }

        body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            font-size: 11px;
            line-height: 1.2;
            background: white;
            color: black;
        }

        .receipt {
            max-width: 70mm;
        }

        .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
            margin-bottom: 8px;
        }

        .restaurant-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 2px;
            text-transform: uppercase;
        }

        .restaurant-details {
            font-size: 9px;
            line-height: 1.1;
        }

        .bill-info {
            text-align: center;
            margin-bottom: 8px;
            font-size: 10px;
        }

        .section-divider {
            border-bottom: 1px dashed #000;
            margin: 5px 0;
        }

        .items {
            margin-bottom: 8px;
        }

        .item {
            margin-bottom: 3px;
        }

        .item-line1 {
            display: flex;
            justify-content: space-between;
        }

        .item-name {
            flex: 1;
            font-weight: bold;
            text-transform: uppercase;
        }

        .item-line2 {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-top: 1px;
        }

        .qty-rate {
            color: #666;
        }

        .amount {
            font-weight: bold;
        }

        .order-separator {
            text-align: center;
            margin: 8px 0;
            font-size: 9px;
            color: #666;
            border-top: 1px dotted #666;
            border-bottom: 1px dotted #666;
            padding: 2px 0;
        }

        .totals {
            border-top: 1px dashed #000;
            padding-top: 5px;
            margin-top: 8px;
        }

        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }

        .total-line.grand {
            font-weight: bold;
            font-size: 12px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 0;
            margin-top: 5px;
        }

        .footer {
            text-align: center;
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 5px;
            font-size: 9px;
        }

        .thank-you {
            font-weight: bold;
            margin-bottom: 3px;
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <div class="restaurant-name">${restaurant.name}</div>
            <div class="restaurant-details">
                ${restaurant.address ? `${restaurant.address.line1}` : ''}${restaurant.address ? `<br>${restaurant.address.city}, ${restaurant.address.state}` : ''}
                ${restaurant.phone ? `<br>Ph: ${restaurant.phone}` : ''}
                ${restaurant.gstin ? `<br>GSTIN: ${restaurant.gstin}` : ''}
            </div>
        </div>

        <div class="bill-info">
            <div>TABLE: ${bill.tableNumber}</div>
            <div>${formatDate(bill.billGeneratedAt)}</div>
        </div>

        <div class="section-divider"></div>

        <div class="items">
            ${bill.orders.map((order: any, orderIndex: number) => `
                ${orderIndex > 0 ? `<div class="order-separator">ORDER #${order.orderNumber}</div>` : ''}
                ${order.items.map((item: any) => `
                    <div class="item">
                        <div class="item-line1">
                            <span class="item-name">${item.name}</span>
                        </div>
                        <div class="item-line2">
                            <span class="qty-rate">${item.quantity} x ${formatCurrency(item.unitPrice)}</span>
                            <span class="amount">${formatCurrency(item.lineTotal)}</span>
                        </div>
                    </div>
                `).join('')}
            `).join('')}
        </div>

        <div class="totals">
            <div class="total-line">
                <span>Subtotal:</span>
                <span>${formatCurrency(bill.subtotal)}</span>
            </div>

            ${bill.cgstAmount > 0 ? `
                <div class="total-line">
                    <span>CGST:</span>
                    <span>${formatCurrency(bill.cgstAmount)}</span>
                </div>
            ` : ''}

            ${bill.sgstAmount > 0 ? `
                <div class="total-line">
                    <span>SGST:</span>
                    <span>${formatCurrency(bill.sgstAmount)}</span>
                </div>
            ` : ''}

            ${bill.igstAmount > 0 ? `
                <div class="total-line">
                    <span>IGST:</span>
                    <span>${formatCurrency(bill.igstAmount)}</span>
                </div>
            ` : ''}

            ${bill.taxAmount > 0 ? `
                <div class="total-line">
                    <span>Total Tax:</span>
                    <span>${formatCurrency(bill.taxAmount)}</span>
                </div>
            ` : ''}

            ${bill.roundOffAmount !== 0 ? `
                <div class="total-line">
                    <span>Round Off:</span>
                    <span>${formatCurrency(bill.roundOffAmount)}</span>
                </div>
            ` : ''}

            <div class="total-line grand">
                <span>TOTAL:</span>
                <span>${formatCurrency(bill.totalAmount)}</span>
            </div>
        </div>

        <div class="footer">
            <div class="thank-you">THANK YOU FOR VISITING!</div>
            <div>Powered by RestoHand</div>
        </div>
    </div>
</body>
</html>`;
  }

  private async generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      width: '80mm',
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm',
      },
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  }

  // MIGRATED TO CASHFREE: Session payment intent using Cashfree instead of Razorpay
  async createCashfreeSessionPaymentIntent(slug: string, tableId: string, sessionData?: any) {
    const dto = {
      restaurantSlug: slug,
      tableId: tableId,
      customerSessionId: sessionData?.customerSessionId,
      customerDetails: sessionData?.customerDetails,
    };
    return this.cashfreePaymentService.createSessionPaymentIntent(dto);
  }

}
