import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { InventoryItem, InventoryItemDocument } from './schemas/inventory-item.schema';
import { StockMovement, StockMovementDocument } from './schemas/stock-movement.schema';
import { StockAlert, StockAlertDocument } from './schemas/stock-alert.schema';

export interface CreateInventoryItemDto {
  restaurantId: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  sku?: string;
  costPerUnit: number;
  minimumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  currentStock?: number;
  supplier?: string;
  tags?: string[];
  storageLocation?: string;
  shelfLifeDays?: number;
  usedInMenuItems?: string[];
}

export interface UpdateStockDto {
  quantity: number;
  type: 'purchase' | 'consumption' | 'waste' | 'adjustment';
  unitCost?: number;
  reason?: string;
  supplier?: string;
  batchNumber?: string;
  expiryDate?: Date;
  invoiceNumber?: string;
  orderId?: string;
  createdBy: string;
}

export interface InventoryAnalytics {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  monthlyConsumption: number;
  monthlyPurchases: number;
  wastePercentage: number;
  topConsumedItems: Array<{
    itemId: string;
    name: string;
    consumed: number;
    value: number;
  }>;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(InventoryItem.name)
    private readonly inventoryItemModel: Model<InventoryItemDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    @InjectModel(StockAlert.name)
    private readonly stockAlertModel: Model<StockAlertDocument>
  ) {}

  async createInventoryItem(dto: CreateInventoryItemDto): Promise<InventoryItem> {
    const item = new this.inventoryItemModel({
      restaurantId: dto.restaurantId,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      unit: dto.unit,
      sku: dto.sku,
      pricing: {
        costPerUnit: dto.costPerUnit,
        currency: 'INR',
        supplier: dto.supplier,
      },
      stockLevels: {
        currentStock: dto.currentStock || 0,
        minimumStock: dto.minimumStock,
        reorderPoint: dto.reorderPoint,
        reorderQuantity: dto.reorderQuantity,
      },
      tracking: {
        lastUpdated: new Date(),
        isLowStock: (dto.currentStock || 0) <= dto.minimumStock,
        isOutOfStock: (dto.currentStock || 0) === 0,
      },
      tags: dto.tags || [],
      storageLocation: dto.storageLocation,
      shelfLifeDays: dto.shelfLifeDays,
      usedInMenuItems: dto.usedInMenuItems || [],
    });

    const savedItem = await item.save();

    // Create initial stock movement if there's starting stock
    if (dto.currentStock && dto.currentStock > 0) {
      await this.createStockMovement(savedItem._id.toString(), {
        quantity: dto.currentStock,
        type: 'adjustment',
        unitCost: dto.costPerUnit,
        reason: 'Initial stock entry',
        createdBy: 'system',
      });
    }

    // Check for alerts
    await this.checkAndCreateAlerts(savedItem);

    this.logger.log(`Created inventory item ${savedItem.name} for restaurant ${dto.restaurantId}`);
    return savedItem;
  }

  async updateStock(itemId: string, dto: UpdateStockDto): Promise<InventoryItem> {
    const item = await this.inventoryItemModel.findById(itemId);
    if (!item) {
      throw new NotFoundException(`Inventory item ${itemId} not found`);
    }

    const direction = ['purchase', 'adjustment'].includes(dto.type) && dto.quantity > 0 ? 'in' : 'out';
    const actualQuantity = Math.abs(dto.quantity);
    const stockBefore = item.stockLevels.currentStock;
    let stockAfter: number;

    if (direction === 'in') {
      stockAfter = stockBefore + actualQuantity;
    } else {
      stockAfter = Math.max(0, stockBefore - actualQuantity);
    }

    // Update the item
    item.stockLevels.currentStock = stockAfter;
    item.tracking.lastUpdated = new Date();
    item.tracking.isLowStock = stockAfter <= item.stockLevels.minimumStock;
    item.tracking.isOutOfStock = stockAfter === 0;

    // Update monthly consumption/purchases
    if (dto.type === 'consumption' || dto.type === 'waste') {
      item.tracking.totalConsumed += actualQuantity;
    } else if (dto.type === 'purchase') {
      item.tracking.totalPurchased += actualQuantity;
    }

    await item.save();

    // Create stock movement record
    await this.createStockMovement(itemId, {
      ...dto,
      quantity: direction === 'out' ? -actualQuantity : actualQuantity,
    }, stockBefore, stockAfter);

    // Check for alerts
    await this.checkAndCreateAlerts(item);

    this.logger.log(`Updated stock for ${item.name}: ${stockBefore} → ${stockAfter}`);
    return item;
  }

  private async createStockMovement(
    itemId: string,
    dto: UpdateStockDto,
    stockBefore?: number,
    stockAfter?: number
  ): Promise<StockMovement> {
    const item = await this.inventoryItemModel.findById(itemId);
    if (!item) {
      throw new NotFoundException(`Inventory item ${itemId} not found`);
    }

    const direction = dto.quantity > 0 ? 'in' : 'out';
    const totalCost = Math.abs(dto.quantity) * (dto.unitCost || item.pricing.costPerUnit);

    const movement = new this.stockMovementModel({
      restaurantId: item.restaurantId,
      inventoryItemId: itemId,
      type: dto.type,
      direction,
      details: {
        quantity: Math.abs(dto.quantity),
        unitCost: dto.unitCost || item.pricing.costPerUnit,
        totalCost,
        batchNumber: dto.batchNumber,
        expiryDate: dto.expiryDate,
        supplier: dto.supplier,
        invoiceNumber: dto.invoiceNumber,
      },
      stockBefore: stockBefore ?? item.stockLevels.currentStock,
      stockAfter: stockAfter ?? item.stockLevels.currentStock,
      reason: dto.reason,
      createdBy: dto.createdBy,
      orderId: dto.orderId,
      isAutomated: dto.createdBy === 'system',
    });

    return movement.save();
  }

  private async checkAndCreateAlerts(item: InventoryItemDocument): Promise<void> {
    const alerts: Array<Partial<StockAlert>> = [];

    // Low stock alert
    if (item.tracking.isLowStock && !item.tracking.isOutOfStock) {
      alerts.push({
        restaurantId: item.restaurantId,
        inventoryItemId: item._id.toString(),
        type: 'low_stock',
        severity: 'warning',
        message: `${item.name} is running low (${item.stockLevels.currentStock} ${item.unit} remaining)`,
        currentStock: item.stockLevels.currentStock,
        minimumStock: item.stockLevels.minimumStock,
      });
    }

    // Out of stock alert
    if (item.tracking.isOutOfStock) {
      alerts.push({
        restaurantId: item.restaurantId,
        inventoryItemId: item._id.toString(),
        type: 'out_of_stock',
        severity: 'critical',
        message: `${item.name} is out of stock`,
        currentStock: item.stockLevels.currentStock,
        minimumStock: item.stockLevels.minimumStock,
      });
    }

    // Reorder point alert
    if (item.stockLevels.currentStock <= item.stockLevels.reorderPoint) {
      alerts.push({
        restaurantId: item.restaurantId,
        inventoryItemId: item._id.toString(),
        type: 'reorder_point',
        severity: 'info',
        message: `${item.name} has reached reorder point. Consider ordering ${item.stockLevels.reorderQuantity} ${item.unit}`,
        currentStock: item.stockLevels.currentStock,
      });
    }

    // Create alerts (only if they don't already exist)
    for (const alertData of alerts) {
      const existingAlert = await this.stockAlertModel.findOne({
        restaurantId: alertData.restaurantId,
        inventoryItemId: alertData.inventoryItemId,
        type: alertData.type,
        isActive: true,
      });

      if (!existingAlert) {
        await this.stockAlertModel.create(alertData);
      }
    }
  }

  async getInventoryAnalytics(restaurantId: string): Promise<InventoryAnalytics> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all items for the restaurant
    const items = await this.inventoryItemModel.find({ restaurantId, isActive: true });

    // Calculate basic metrics
    const totalItems = items.length;
    const lowStockItems = items.filter(item => item.tracking.isLowStock).length;
    const outOfStockItems = items.filter(item => item.tracking.isOutOfStock).length;
    const totalInventoryValue = items.reduce((total, item) =>
      total + (item.stockLevels.currentStock * item.pricing.costPerUnit), 0);

    // Get monthly movements
    const monthlyMovements = await this.stockMovementModel.find({
      restaurantId,
      createdAt: { $gte: startOfMonth },
    }).populate('inventoryItemId');

    const monthlyConsumption = monthlyMovements
      .filter(m => m.type === 'consumption')
      .reduce((total, m) => total + m.details.totalCost, 0);

    const monthlyPurchases = monthlyMovements
      .filter(m => m.type === 'purchase')
      .reduce((total, m) => total + m.details.totalCost, 0);

    const wasteValue = monthlyMovements
      .filter(m => m.type === 'waste')
      .reduce((total, m) => total + m.details.totalCost, 0);

    const wastePercentage = monthlyPurchases > 0 ? (wasteValue / monthlyPurchases) * 100 : 0;

    // Top consumed items
    const consumptionByItem = new Map<string, { name: string; consumed: number; value: number }>();

    monthlyMovements
      .filter(m => m.type === 'consumption')
      .forEach(movement => {
        const item = movement.inventoryItemId as any;
        const itemId = item._id.toString();
        const existing = consumptionByItem.get(itemId) || { name: item.name, consumed: 0, value: 0 };
        existing.consumed += movement.details.quantity;
        existing.value += movement.details.totalCost;
        consumptionByItem.set(itemId, existing);
      });

    const topConsumedItems = Array.from(consumptionByItem.entries())
      .map(([itemId, data]) => ({ itemId, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalInventoryValue,
      monthlyConsumption,
      monthlyPurchases,
      wastePercentage,
      topConsumedItems,
    };
  }

  async getInventoryItems(restaurantId: string, filters?: {
    category?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    search?: string;
  }): Promise<InventoryItem[]> {
    const query: FilterQuery<InventoryItemDocument> = {
      restaurantId,
      isActive: true,
    };

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.lowStock) {
      query['tracking.isLowStock'] = true;
    }

    if (filters?.outOfStock) {
      query['tracking.isOutOfStock'] = true;
    }

    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return this.inventoryItemModel.find(query).sort({ name: 1 });
  }

  async getActiveAlerts(restaurantId: string): Promise<StockAlert[]> {
    return this.stockAlertModel
      .find({ restaurantId, isActive: true, isRead: false })
      .populate('inventoryItemId')
      .sort({ severity: 1, createdAt: -1 });
  }

  async markAlertAsRead(alertId: string, userId: string): Promise<StockAlert> {
    const alert = await this.stockAlertModel.findByIdAndUpdate(
      alertId,
      {
        isRead: true,
        readAt: new Date(),
        readBy: userId,
      },
      { new: true }
    );

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    return alert;
  }
}