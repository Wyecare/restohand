import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { OrderModification, OrderModificationDocument, ModificationType, ModificationStatus } from './schemas/order-modification.schema';
import { CreateOrderModificationDto, ProcessOrderModificationDto, OrderModificationQueryDto } from './dtos/order-modification.dto';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrderProgressStage } from '../common/enums/order-progress.enum';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { OrdersGateway } from './orders.gateway';

@Injectable()
export class OrderModificationService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(OrderModification.name) private modificationModel: Model<OrderModificationDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    private ordersGateway: OrdersGateway,
  ) {}

  // Check if order can be modified
  private canModifyOrder(order: OrderDocument): boolean {
    const allowedStatuses = [OrderStatus.Pending, OrderStatus.Accepted];
    const allowedProgress = [OrderProgressStage.NotStarted, OrderProgressStage.FortyPercent];

    return allowedStatuses.includes(order.status) && allowedProgress.includes(order.progress);
  }

  // Calculate amount difference for modifications
  private async calculateAmountDifference(
    type: ModificationType,
    itemData: any,
    order: OrderDocument
  ): Promise<number> {
    let amountDiff = 0;

    switch (type) {
      case ModificationType.ADD_ITEM:
        if (itemData.menuItemId && itemData.quantity && itemData.unitAmount) {
          amountDiff = itemData.unitAmount * itemData.quantity;
        }
        break;

      case ModificationType.REMOVE_ITEM:
        const itemToRemove = order.items.find(item =>
          item.menuItemId.toString() === itemData.menuItemId?.toString()
        );
        if (itemToRemove) {
          amountDiff = -(itemToRemove.pricing.unitAmount * itemToRemove.quantity);
        }
        break;

      case ModificationType.UPDATE_QUANTITY:
        const itemToUpdate = order.items.find(item =>
          item.menuItemId.toString() === itemData.menuItemId?.toString()
        );
        if (itemToUpdate && itemData.newQuantity !== undefined) {
          const quantityDiff = itemData.newQuantity - itemToUpdate.quantity;
          amountDiff = itemToUpdate.pricing.unitAmount * quantityDiff;
        }
        break;

      default:
        amountDiff = 0;
    }

    return amountDiff;
  }

  async createModification(
    restaurantId: string,
    dto: CreateOrderModificationDto,
    requestedBy?: string
  ): Promise<OrderModification> {
    // Get the order
    const order = await this.orderModel.findOne({
      _id: dto.orderId,
      restaurantId,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if order can be modified
    if (!this.canModifyOrder(order)) {
      throw new ForbiddenException(
        `Order cannot be modified. Current status: ${order.status}, progress: ${order.progress}%`
      );
    }

    // Validate item data for add/update operations
    if (dto.type === ModificationType.ADD_ITEM || dto.type === ModificationType.UPDATE_QUANTITY) {
      if (!dto.itemData?.menuItemId) {
        throw new BadRequestException('Menu item ID is required for add/update operations');
      }

      // Verify menu item exists and belongs to restaurant
      const menuItem = await this.menuItemModel.findOne({
        _id: dto.itemData.menuItemId,
        restaurantId,
        isActive: true,
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found or inactive');
      }

      // Auto-populate item data from menu
      if (!dto.itemData.name) {
        dto.itemData.name = menuItem.name;
      }
      if (!dto.itemData.unitAmount) {
        dto.itemData.unitAmount = menuItem.pricing.amount;
      }
    }

    // For remove/update operations, verify item exists in order
    if (dto.type === ModificationType.REMOVE_ITEM || dto.type === ModificationType.UPDATE_QUANTITY) {
      const itemExists = order.items.some(item =>
        item.menuItemId.toString() === dto.itemData?.menuItemId?.toString()
      );

      if (!itemExists) {
        throw new BadRequestException('Item not found in order');
      }
    }

    // Calculate amount difference
    const amountDifference = await this.calculateAmountDifference(dto.type, dto.itemData, order);

    // Create modification record
    const modification = new this.modificationModel({
      orderId: dto.orderId,
      restaurantId,
      orderNumber: order.orderNumber,
      type: dto.type,
      itemData: dto.itemData,
      reason: dto.reason,
      customerNotes: dto.customerNotes,
      amountDifference,
      requestedBy,
      notifyKitchen: dto.notifyKitchen || false,
    });

    const savedModification = await modification.save();

    // Notify kitchen/staff about the new modification request
    this.ordersGateway.emitOrderModificationRequested(restaurantId, savedModification);

    return savedModification;
  }

  async processModification(
    restaurantId: string,
    modificationId: string,
    dto: ProcessOrderModificationDto,
    processedBy?: string
  ): Promise<OrderModification> {
    const modification = await this.modificationModel.findOne({
      _id: modificationId,
      restaurantId,
      status: ModificationStatus.PENDING,
    });

    if (!modification) {
      throw new NotFoundException('Modification not found or already processed');
    }

    // Update modification status
    modification.status = dto.status;
    modification.processedBy = processedBy;
    modification.processedAt = new Date();

    if (dto.status === ModificationStatus.REJECTED) {
      modification.rejectionReason = dto.rejectionReason;
    }

    if (dto.amountDifference !== undefined) {
      modification.amountDifference = dto.amountDifference;
    }

    await modification.save();

    // Notify about the processed modification
    this.ordersGateway.emitOrderModificationProcessed(restaurantId, modification);

    // If approved, apply the modification to the order
    if (dto.status === ModificationStatus.APPROVED) {
      await this.applyModification(modification);
    }

    return modification;
  }

  private async applyModification(modification: OrderModificationDocument): Promise<void> {
    const order = await this.orderModel.findById(modification.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    switch (modification.type) {
      case ModificationType.ADD_ITEM:
        if (modification.itemData) {
          // Check if item already exists in order
          const existingItemIndex = order.items.findIndex(item =>
            item.menuItemId.toString() === modification.itemData?.menuItemId?.toString()
          );

          if (existingItemIndex >= 0) {
            // Update existing item quantity
            order.items[existingItemIndex].quantity += modification.itemData.quantity || 1;
          } else {
            // Add new item
            order.items.push({
              menuItemId: modification.itemData.menuItemId!,
              name: modification.itemData.name!,
              quantity: modification.itemData.quantity || 1,
              pricing: {
                unitAmount: modification.itemData.unitAmount || 0,
                currency: 'INR',
                taxAmount: 0,
                discountAmount: 0,
              },
              notes: modification.itemData.notes,
            } as any);
          }
        }
        break;

      case ModificationType.REMOVE_ITEM:
        if (modification.itemData?.menuItemId) {
          order.items = order.items.filter(item =>
            item.menuItemId.toString() !== modification.itemData?.menuItemId?.toString()
          );
        }
        break;

      case ModificationType.UPDATE_QUANTITY:
        if (modification.itemData?.menuItemId && modification.itemData.newQuantity !== undefined) {
          const itemIndex = order.items.findIndex(item =>
            item.menuItemId.toString() === modification.itemData?.menuItemId?.toString()
          );

          if (itemIndex >= 0) {
            if (modification.itemData.newQuantity === 0) {
              // Remove item if quantity is 0
              order.items.splice(itemIndex, 1);
            } else {
              order.items[itemIndex].quantity = modification.itemData.newQuantity;
            }
          }
        }
        break;

      case ModificationType.UPDATE_NOTES:
        order.notes = modification.customerNotes || order.notes;
        break;

      case ModificationType.CANCEL_ORDER:
        order.status = OrderStatus.Cancelled;
        break;
    }

    // Recalculate order totals
    let subTotal = 0;
    order.items.forEach(item => {
      subTotal += item.pricing.unitAmount * item.quantity;
    });

    order.subTotalAmount = subTotal;
    order.totalAmount = subTotal; // Simplified - should include taxes and discounts

    await order.save();

    // Update modification status to applied
    modification.status = ModificationStatus.APPLIED;
    modification.appliedAt = new Date();
    await modification.save();

    // Notify about the applied modification with updated order
    this.ordersGateway.emitOrderModificationApplied(
      order.restaurantId.toString(),
      modification,
      order.toObject() as any
    );
  }

  async getModifications(
    restaurantId: string,
    query: OrderModificationQueryDto
  ): Promise<OrderModification[]> {
    const filter: any = { restaurantId };

    if (query.status) {
      filter.status = query.status;
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.orderId) {
      filter.orderId = query.orderId;
    }
    if (query.orderNumber) {
      filter.orderNumber = query.orderNumber;
    }

    return await this.modificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('requestedBy', 'name email')
      .populate('processedBy', 'name email')
      .lean();
  }

  async getOrderModifications(restaurantId: string, orderId: string): Promise<OrderModification[]> {
    return await this.modificationModel
      .find({ restaurantId, orderId })
      .sort({ createdAt: -1 })
      .populate('requestedBy', 'name email')
      .populate('processedBy', 'name email')
      .lean();
  }

  // Check if order has pending modifications
  async hasPendingModifications(restaurantId: string, orderId: string): Promise<boolean> {
    const count = await this.modificationModel.countDocuments({
      restaurantId,
      orderId,
      status: ModificationStatus.PENDING,
    });
    return count > 0;
  }
}