import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { InventoryCount, InventoryCountDocument } from './schemas/inventory-count.schema';
import { InventoryService } from './inventory.service';

export interface CreateInventoryCountDto {
  restaurantId: string;
  branchId: string;
  name: string;
  countType: 'spot_check' | 'full_count' | 'cycle_count' | 'category_count';
  categories?: string[];
  scheduledDate?: Date;
  assignedTo?: string[];
  notes?: string;
  createdBy: string;
  accuracyThreshold?: number;
}

export interface UpdateCountItemDto {
  inventoryItemId: string;
  physicalCount: number;
  notes?: string;
  countedBy: string;
}

export interface InventoryCountQueryDto {
  status?: string;
  countType?: string;
  branchId?: string;
  assignedTo?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class InventoryCountsService {
  private readonly logger = new Logger(InventoryCountsService.name);

  constructor(
    @InjectModel(InventoryCount.name)
    private readonly inventoryCountModel: Model<InventoryCountDocument>,
    private readonly inventoryService: InventoryService,
  ) {}

  async createInventoryCount(dto: CreateInventoryCountDto): Promise<InventoryCount> {
    // Generate count number
    const countNumber = await this.generateCountNumber(dto.restaurantId);

    // Get inventory items to count based on type and categories
    const inventoryItems = await this.getInventoryItemsForCount(
      dto.restaurantId,
      dto.branchId,
      dto.countType,
      dto.categories,
    );

    // Create count items with current system stock
    const items = inventoryItems.map(item => ({
      inventoryItemId: item._id,
      systemCount: item.stockLevels.currentStock,
      physicalCount: 0,
      difference: 0,
      unitCost: item.pricing.costPerUnit,
      valueDifference: 0,
      notes: '',
    }));

    const inventoryCount = new this.inventoryCountModel({
      restaurantId: dto.restaurantId,
      branchId: dto.branchId,
      countNumber,
      name: dto.name,
      status: 'draft',
      countType: dto.countType,
      categories: dto.categories || [],
      items,
      summary: {
        totalItems: items.length,
        itemsWithVariance: 0,
        totalSystemValue: items.reduce(
          (sum, item) => sum + (item.systemCount * item.unitCost!),
          0,
        ),
        totalPhysicalValue: 0,
        totalVarianceValue: 0,
        variancePercentage: 0,
      },
      scheduledDate: dto.scheduledDate,
      assignedTo: dto.assignedTo || [],
      notes: dto.notes,
      createdBy: dto.createdBy,
      accuracyThreshold: dto.accuracyThreshold || 5, // 5% default
      updateSystemStock: false,
      systemStockUpdated: false,
    });

    const savedCount = await inventoryCount.save();

    this.logger.log(
      `Created inventory count ${countNumber} for branch ${dto.branchId} with ${items.length} items`,
    );

    return savedCount;
  }

  async startInventoryCount(
    countId: string,
    startedBy: string,
  ): Promise<InventoryCount> {
    const count = await this.inventoryCountModel.findById(countId);
    if (!count) {
      throw new NotFoundException(`Inventory count ${countId} not found`);
    }

    if (count.status !== 'draft') {
      throw new BadRequestException('Can only start draft inventory counts');
    }

    count.status = 'in_progress';
    count.startedAt = new Date();

    await count.save();

    this.logger.log(
      `Started inventory count ${count.countNumber} by ${startedBy}`,
    );

    return count;
  }

  async updateCountItem(
    countId: string,
    itemUpdate: UpdateCountItemDto,
  ): Promise<InventoryCount> {
    const count = await this.inventoryCountModel.findById(countId);
    if (!count) {
      throw new NotFoundException(`Inventory count ${countId} not found`);
    }

    if (count.status !== 'in_progress') {
      throw new BadRequestException(
        'Can only update items for in-progress inventory counts',
      );
    }

    const countItem = count.items.find(
      item => item.inventoryItemId.toString() === itemUpdate.inventoryItemId,
    );

    if (!countItem) {
      throw new NotFoundException(
        `Item ${itemUpdate.inventoryItemId} not found in count`,
      );
    }

    // Update count item
    countItem.physicalCount = itemUpdate.physicalCount;
    countItem.difference = itemUpdate.physicalCount - countItem.systemCount;
    countItem.valueDifference = countItem.difference * (countItem.unitCost || 0);
    countItem.notes = itemUpdate.notes || '';
    countItem.countedBy = itemUpdate.countedBy;
    countItem.countedAt = new Date();

    // Recalculate summary
    this.recalculateSummary(count);

    await count.save();

    this.logger.log(
      `Updated count item ${itemUpdate.inventoryItemId} in count ${count.countNumber}`,
    );

    return count;
  }

  async completeInventoryCount(
    countId: string,
    completedBy: string,
  ): Promise<InventoryCount> {
    const count = await this.inventoryCountModel.findById(countId);
    if (!count) {
      throw new NotFoundException(`Inventory count ${countId} not found`);
    }

    if (count.status !== 'in_progress') {
      throw new BadRequestException(
        'Can only complete in-progress inventory counts',
      );
    }

    // Check if all items have been counted
    const unCountedItems = count.items.filter(item => !item.countedAt);
    if (unCountedItems.length > 0) {
      throw new BadRequestException(
        `${unCountedItems.length} items have not been counted yet`,
      );
    }

    count.status = 'completed';
    count.completedAt = new Date();

    // Determine if approval is required based on variance
    const varianceExceedsThreshold = Math.abs(count.summary.variancePercentage) > count.accuracyThreshold!;
    count.requiresApproval = varianceExceedsThreshold;

    if (!varianceExceedsThreshold) {
      // Auto-approve if within threshold
      count.status = 'approved';
      count.approvedAt = new Date();
      count.approvedBy = completedBy;
    }

    await count.save();

    this.logger.log(
      `Completed inventory count ${count.countNumber} by ${completedBy}. Requires approval: ${count.requiresApproval}`,
    );

    return count;
  }

  async approveInventoryCount(
    countId: string,
    approvedBy: string,
    updateSystemStock: boolean = false,
  ): Promise<InventoryCount> {
    const count = await this.inventoryCountModel.findById(countId);
    if (!count) {
      throw new NotFoundException(`Inventory count ${countId} not found`);
    }

    if (count.status !== 'completed') {
      throw new BadRequestException(
        'Can only approve completed inventory counts',
      );
    }

    count.status = 'approved';
    count.approvedAt = new Date();
    count.approvedBy = approvedBy;
    count.updateSystemStock = updateSystemStock;

    // Update system stock if requested
    if (updateSystemStock && !count.systemStockUpdated) {
      const adjustmentMovements = await this.updateSystemStockFromCount(count, approvedBy);
      count.adjustmentMovements = adjustmentMovements;
      count.systemStockUpdated = true;
    }

    await count.save();

    this.logger.log(
      `Approved inventory count ${count.countNumber} by ${approvedBy}. System stock updated: ${updateSystemStock}`,
    );

    return count;
  }

  async cancelInventoryCount(
    countId: string,
    cancelledBy: string,
    reason?: string,
  ): Promise<InventoryCount> {
    const count = await this.inventoryCountModel.findById(countId);
    if (!count) {
      throw new NotFoundException(`Inventory count ${countId} not found`);
    }

    if (['approved', 'cancelled'].includes(count.status)) {
      throw new BadRequestException(
        'Cannot cancel approved or already cancelled inventory count',
      );
    }

    count.status = 'cancelled';
    if (reason) {
      count.notes = `${count.notes || ''}\n\nCancelled by ${cancelledBy}: ${reason}`.trim();
    }

    await count.save();

    this.logger.log(
      `Cancelled inventory count ${count.countNumber} by ${cancelledBy}`,
    );

    return count;
  }

  async getInventoryCounts(
    restaurantId: string,
    filters?: InventoryCountQueryDto,
  ): Promise<{
    inventoryCounts: InventoryCount[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: FilterQuery<InventoryCountDocument> = {
      restaurantId,
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.countType) {
      query.countType = filters.countType;
    }

    if (filters?.branchId) {
      query.branchId = new Types.ObjectId(filters.branchId);
    }

    if (filters?.assignedTo) {
      query.assignedTo = new Types.ObjectId(filters.assignedTo);
    }

    if (filters?.fromDate || filters?.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }

    if (filters?.search) {
      query.$or = [
        { countNumber: { $regex: filters.search, $options: 'i' } },
        { name: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [inventoryCounts, total] = await Promise.all([
      this.inventoryCountModel
        .find(query)
        .populate('branchId', 'name')
        .populate('assignedTo', 'name')
        .populate('createdBy', 'name')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.inventoryCountModel.countDocuments(query),
    ]);

    return {
      inventoryCounts: inventoryCounts as InventoryCount[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInventoryCountById(countId: string): Promise<InventoryCount> {
    const count = await this.inventoryCountModel
      .findById(countId)
      .populate('branchId', 'name')
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('items.inventoryItemId', 'name unit category')
      .populate('items.countedBy', 'name')
      .lean();

    if (!count) {
      throw new NotFoundException(`Inventory count ${countId} not found`);
    }

    return count as InventoryCount;
  }

  async getInventoryCountAnalytics(
    restaurantId: string,
    branchId?: string,
  ): Promise<{
    totalCounts: number;
    completedCounts: number;
    avgAccuracy: number;
    statusBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
    accuracyTrend: Array<{ date: string; accuracy: number }>;
    topVarianceItems: Array<{
      itemName: string;
      variance: number;
      frequency: number;
    }>;
  }> {
    const matchFilter: any = { restaurantId: new Types.ObjectId(restaurantId) };
    if (branchId) {
      matchFilter.branchId = new Types.ObjectId(branchId);
    }

    const [statusStats, typeStats, accuracyStats, varianceStats] = await Promise.all([
      // Status breakdown
      this.inventoryCountModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Type breakdown
      this.inventoryCountModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$countType', count: { $sum: 1 } } },
      ]),

      // Accuracy statistics
      this.inventoryCountModel.aggregate([
        {
          $match: {
            ...matchFilter,
            status: { $in: ['approved', 'completed'] },
            'summary.variancePercentage': { $exists: true },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            avgAccuracy: {
              $avg: {
                $subtract: [100, { $abs: '$summary.variancePercentage' }],
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 30 }, // Last 30 data points
      ]),

      // Top variance items
      this.inventoryCountModel.aggregate([
        {
          $match: {
            ...matchFilter,
            status: { $in: ['approved', 'completed'] },
          },
        },
        { $unwind: '$items' },
        {
          $match: {
            'items.difference': { $ne: 0 },
          },
        },
        {
          $lookup: {
            from: 'inventory_items',
            localField: 'items.inventoryItemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: '$item' },
        {
          $group: {
            _id: '$items.inventoryItemId',
            itemName: { $first: '$item.name' },
            totalVariance: { $sum: { $abs: '$items.difference' } },
            frequency: { $sum: 1 },
            avgVariance: { $avg: { $abs: '$items.difference' } },
          },
        },
        { $sort: { totalVariance: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Process status breakdown
    const statusBreakdown: Record<string, number> = {};
    let totalCounts = 0;
    let completedCounts = 0;

    statusStats.forEach(stat => {
      statusBreakdown[stat._id] = stat.count;
      totalCounts += stat.count;
      if (['completed', 'approved'].includes(stat._id)) {
        completedCounts += stat.count;
      }
    });

    // Process type breakdown
    const typeBreakdown: Record<string, number> = {};
    typeStats.forEach(stat => {
      typeBreakdown[stat._id] = stat.count;
    });

    // Calculate average accuracy
    const avgAccuracy = accuracyStats.length > 0
      ? accuracyStats.reduce((sum, stat) => sum + stat.avgAccuracy, 0) / accuracyStats.length
      : 0;

    // Process accuracy trend
    const accuracyTrend = accuracyStats.map(stat => ({
      date: `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}-${stat._id.day.toString().padStart(2, '0')}`,
      accuracy: Math.round(stat.avgAccuracy * 100) / 100,
    }));

    // Process top variance items
    const topVarianceItems = varianceStats.map(stat => ({
      itemName: stat.itemName,
      variance: Math.round(stat.avgVariance * 100) / 100,
      frequency: stat.frequency,
    }));

    return {
      totalCounts,
      completedCounts,
      avgAccuracy: Math.round(avgAccuracy * 100) / 100,
      statusBreakdown,
      typeBreakdown,
      accuracyTrend,
      topVarianceItems,
    };
  }

  private async getInventoryItemsForCount(
    restaurantId: string,
    branchId: string,
    countType: string,
    categories?: string[],
  ) {
    const filters: any = { branchId };

    if (countType === 'category_count' && categories?.length) {
      // For category count, include only specified categories
      return Promise.all(
        categories.map(category =>
          this.inventoryService.getInventoryItems(restaurantId, {
            ...filters,
            category,
          }),
        ),
      ).then(results => results.flat());
    } else if (countType === 'cycle_count') {
      // For cycle count, include items that haven't been counted recently
      // This is a simplified version - in reality you'd track last count dates
      return this.inventoryService.getInventoryItems(restaurantId, {
        ...filters,
        // Add logic to filter by last count date
      });
    }

    // For full_count and spot_check, include all active items
    return this.inventoryService.getInventoryItems(restaurantId, filters);
  }

  private recalculateSummary(count: InventoryCountDocument): void {
    const summary = count.summary;

    summary.totalItems = count.items.length;
    summary.itemsWithVariance = count.items.filter(
      item => item.difference !== 0,
    ).length;

    summary.totalSystemValue = count.items.reduce(
      (sum, item) => sum + (item.systemCount * (item.unitCost || 0)),
      0,
    );

    summary.totalPhysicalValue = count.items.reduce(
      (sum, item) => sum + (item.physicalCount * (item.unitCost || 0)),
      0,
    );

    summary.totalVarianceValue = summary.totalPhysicalValue - summary.totalSystemValue;

    summary.variancePercentage = summary.totalSystemValue > 0
      ? (summary.totalVarianceValue / summary.totalSystemValue) * 100
      : 0;
  }

  private async updateSystemStockFromCount(
    count: InventoryCountDocument,
    adjustedBy: string,
  ): Promise<string[]> {
    const adjustmentMovements: string[] = [];

    for (const item of count.items) {
      if (item.difference !== 0) {
        try {
          const movement = await this.inventoryService.updateStock(
            item.inventoryItemId.toString(),
            {
              quantity: item.difference,
              type: 'adjustment',
              reason: `Inventory count adjustment - ${count.countNumber}`,
              reference: count.countNumber,
              createdBy: adjustedBy,
            },
          );

          adjustmentMovements.push(movement._id.toString());
        } catch (error) {
          this.logger.error(
            `Failed to create adjustment for item ${item.inventoryItemId}: ${error.message}`,
          );
        }
      }
    }

    return adjustmentMovements;
  }

  private async generateCountNumber(restaurantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the highest count number for today
    const regex = new RegExp(`^IC-${datePrefix}-`);
    const existingCounts = await this.inventoryCountModel
      .find({
        restaurantId,
        countNumber: { $regex: regex },
      })
      .sort({ countNumber: -1 })
      .limit(1)
      .lean();

    let nextNumber = 1;
    if (existingCounts.length > 0) {
      const lastCountNumber = existingCounts[0].countNumber;
      const lastNumber = parseInt(lastCountNumber.slice(-3), 10);
      nextNumber = lastNumber + 1;
    }

    return `IC-${datePrefix}-${nextNumber.toString().padStart(3, '0')}`;
  }
}