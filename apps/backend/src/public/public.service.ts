import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { MenuCategory, MenuCategoryDocument } from '../menu-categories/schemas/menu-category.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { RestaurantTable, RestaurantTableDocument } from '../restaurant-tables/schemas/restaurant-table.schema';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';

@Injectable()
export class PublicService {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(MenuCategory.name)
    private readonly categoryModel: Model<MenuCategoryDocument>,
    @InjectModel(MenuItem.name)
    private readonly itemModel: Model<MenuItemDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(RestaurantTable.name)
    private readonly tableModel: Model<RestaurantTableDocument>,
    private readonly ordersService: OrdersService
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
  async getBranchIdFromTable(restaurantId: string, tableNumber: string): Promise<string | undefined> {
    const table = await this.tableModel.findOne({
      restaurantId,
      tableNumber: tableNumber.trim(),
      isActive: true
    }).lean();

    return table?.branchId?.toString();
  }

  async getMenuForRestaurant(restaurantId: string, branchId?: string) {
    // CRITICAL FIX: Add branch filtering to prevent cross-branch menu contamination
    const categoryQuery: any = { restaurantId, isActive: true };
    const itemQuery: any = { restaurantId, isAvailable: true };

    // If branchId is provided, only show items/categories from that branch
    if (branchId) {
      categoryQuery.branchId = branchId;
      itemQuery.branchId = branchId;
    }

    const [categories, items] = await Promise.all([
      this.categoryModel
        .find(categoryQuery)
        .sort({ displayOrder: 1, createdAt: 1 })
        .lean(),
      this.itemModel
        .find(itemQuery)
        .sort({ displayOrder: 1, name: 1 })
        .lean(),
    ]);

    const grouped = categories.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      description: category.description,
      items: items
        .filter((item) => item.categoryId?.toString() === category._id.toString())
        .map((item) => ({
          id: item._id.toString(),
          name: item.name,
          description: item.description,
          pricing: item.pricing,
          tags: item.tags,
          imageUrls: item.imageUrls,
        })),
    }));

    const uncategorisedItems = items
      .filter((item) => !item.categoryId)
      .map((item) => ({
        id: item._id.toString(),
        name: item.name,
        description: item.description,
        pricing: item.pricing,
        tags: item.tags,
        imageUrls: item.imageUrls,
      }));

    return {
      categories: grouped,
      uncategorised: uncategorisedItems,
    };
  }

  // CRITICAL FIX: Validate that ordered items belong to the correct branch
  async validateItemsBelongToBranch(restaurantId: string, itemIds: string[], branchId: string): Promise<boolean> {
    if (!branchId || itemIds.length === 0) return true;

    const items = await this.itemModel.find({
      _id: { $in: itemIds },
      restaurantId,
      branchId,
      isAvailable: true
    }).lean();

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

    return this.ordersService.updateStatus(
      restaurant._id.toString(),
      orderId,
      {
        status: OrderStatus.Cancelled,
        statusNote: 'Cancelled by customer',
      }
    );
  }

  async getActiveOrderForTable(restaurantId: string, tableNumber: string, restaurantSlug: string) {
    // Find the most recent order for this table that is still active
    const activeStatuses = [
      OrderStatus.Pending,
      OrderStatus.Accepted,
      OrderStatus.InProgress,
      OrderStatus.Ready
    ];

    const order = await this.orderModel
      .findOne({
        restaurantId,
        tableNumber,
        status: { $in: activeStatuses }
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
      })),
    };
  }
}
