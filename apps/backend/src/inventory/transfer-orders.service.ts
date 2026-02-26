import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { TransferOrder, TransferOrderDocument } from './schemas/transfer-order.schema';
import { InventoryService } from './inventory.service';

export interface CreateTransferOrderDto {
  restaurantId: string;
  sourceBranchId: string;
  destinationBranchId: string;
  items: Array<{
    inventoryItemId: string;
    requestedQuantity: number;
    notes?: string;
  }>;
  reason: string;
  requestedDeliveryDate?: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  createdBy: string;
}

export interface ApproveTransferOrderDto {
  transferId: string;
  items: Array<{
    inventoryItemId: string;
    approvedQuantity: number;
  }>;
  approvedBy: string;
  notes?: string;
}

export interface ProcessTransferOrderDto {
  transferId: string;
  items: Array<{
    inventoryItemId: string;
    transferredQuantity: number;
    notes?: string;
  }>;
  processedBy: string;
  notes?: string;
}

export interface TransferOrderQueryDto {
  status?: string;
  sourceBranchId?: string;
  destinationBranchId?: string;
  priority?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class TransferOrdersService {
  private readonly logger = new Logger(TransferOrdersService.name);

  constructor(
    @InjectModel(TransferOrder.name)
    private readonly transferOrderModel: Model<TransferOrderDocument>,
    private readonly inventoryService: InventoryService,
  ) {}

  async createTransferOrder(dto: CreateTransferOrderDto): Promise<TransferOrder> {
    // Validate branches are different
    if (dto.sourceBranchId === dto.destinationBranchId) {
      throw new BadRequestException(
        'Source and destination branches must be different',
      );
    }

    // Generate transfer number
    const transferNumber = await this.generateTransferNumber(dto.restaurantId);

    // Calculate total value (estimated)
    const totalValue = await this.calculateTransferValue(
      dto.items,
      dto.restaurantId,
      dto.sourceBranchId,
    );

    const transferOrder = new this.transferOrderModel({
      restaurantId: dto.restaurantId,
      sourceBranchId: dto.sourceBranchId,
      destinationBranchId: dto.destinationBranchId,
      transferNumber,
      status: 'draft',
      items: dto.items.map(item => ({
        inventoryItemId: item.inventoryItemId,
        requestedQuantity: item.requestedQuantity,
        approvedQuantity: 0,
        transferredQuantity: 0,
        notes: item.notes,
        status: 'pending',
      })),
      totalValue,
      requestedDeliveryDate: dto.requestedDeliveryDate,
      reason: dto.reason,
      notes: dto.notes,
      priority: dto.priority || 'normal',
      createdBy: dto.createdBy,
      tracking: {
        requestedAt: new Date(),
        requestedBy: dto.createdBy,
      },
    });

    const savedTransfer = await transferOrder.save();

    this.logger.log(
      `Created transfer order ${transferNumber} from branch ${dto.sourceBranchId} to ${dto.destinationBranchId}`,
    );

    return savedTransfer;
  }

  async submitTransferOrder(
    transferId: string,
    submittedBy: string,
  ): Promise<TransferOrder> {
    const transfer = await this.transferOrderModel.findById(transferId);
    if (!transfer) {
      throw new NotFoundException(`Transfer order ${transferId} not found`);
    }

    if (transfer.status !== 'draft') {
      throw new BadRequestException('Can only submit draft transfer orders');
    }

    transfer.status = 'pending';
    transfer.tracking.requestedAt = new Date();
    transfer.tracking.requestedBy = submittedBy;

    await transfer.save();

    this.logger.log(
      `Submitted transfer order ${transfer.transferNumber} for approval`,
    );

    return transfer;
  }

  async approveTransferOrder(dto: ApproveTransferOrderDto): Promise<TransferOrder> {
    const transfer = await this.transferOrderModel.findById(dto.transferId);
    if (!transfer) {
      throw new NotFoundException(`Transfer order ${dto.transferId} not found`);
    }

    if (transfer.status !== 'pending') {
      throw new BadRequestException('Can only approve pending transfer orders');
    }

    // Validate inventory availability at source branch
    for (const item of dto.items) {
      const inventoryItems = await this.inventoryService.getInventoryItems(
        transfer.restaurantId,
        { branchId: transfer.sourceBranchId },
      );

      const inventoryItem = inventoryItems.find(
        inv => inv._id.toString() === item.inventoryItemId,
      );

      if (!inventoryItem || inventoryItem.stockLevels.currentStock < item.approvedQuantity) {
        throw new BadRequestException(
          `Insufficient stock for item ${item.inventoryItemId} at source branch`,
        );
      }
    }

    // Update approved quantities
    for (const approvedItem of dto.items) {
      const transferItem = transfer.items.find(
        item => item.inventoryItemId.toString() === approvedItem.inventoryItemId,
      );

      if (transferItem) {
        transferItem.approvedQuantity = approvedItem.approvedQuantity;
        transferItem.status = 'approved';
      }
    }

    transfer.status = 'approved';
    transfer.tracking.approvedAt = new Date();
    transfer.tracking.approvedBy = dto.approvedBy;

    await transfer.save();

    this.logger.log(
      `Approved transfer order ${transfer.transferNumber} by ${dto.approvedBy}`,
    );

    return transfer;
  }

  async rejectTransferOrder(
    transferId: string,
    reason: string,
    rejectedBy: string,
  ): Promise<TransferOrder> {
    const transfer = await this.transferOrderModel.findById(transferId);
    if (!transfer) {
      throw new NotFoundException(`Transfer order ${transferId} not found`);
    }

    if (transfer.status !== 'pending') {
      throw new BadRequestException('Can only reject pending transfer orders');
    }

    transfer.status = 'rejected';
    transfer.tracking.rejectionReason = reason;
    transfer.tracking.rejectedAt = new Date();
    transfer.tracking.rejectedBy = rejectedBy;

    await transfer.save();

    this.logger.log(
      `Rejected transfer order ${transfer.transferNumber} by ${rejectedBy}: ${reason}`,
    );

    return transfer;
  }

  async processTransferOrder(dto: ProcessTransferOrderDto): Promise<TransferOrder> {
    const transfer = await this.transferOrderModel.findById(dto.transferId);
    if (!transfer) {
      throw new NotFoundException(`Transfer order ${dto.transferId} not found`);
    }

    if (transfer.status !== 'approved') {
      throw new BadRequestException('Can only process approved transfer orders');
    }

    const stockMovementIds: string[] = [];

    // Process each item
    for (const processedItem of dto.items) {
      const transferItem = transfer.items.find(
        item => item.inventoryItemId.toString() === processedItem.inventoryItemId,
      );

      if (!transferItem) {
        throw new BadRequestException(
          `Item ${processedItem.inventoryItemId} not found in transfer order`,
        );
      }

      if (processedItem.transferredQuantity > transferItem.approvedQuantity) {
        throw new BadRequestException(
          `Cannot transfer more than approved quantity for item ${processedItem.inventoryItemId}`,
        );
      }

      // Create stock movements
      const [outMovement, inMovement] = await Promise.all([
        // Remove from source branch
        this.inventoryService.updateStock(processedItem.inventoryItemId, {
          quantity: -processedItem.transferredQuantity, // Negative for outgoing
          type: 'transfer',
          reason: `Transfer to branch ${transfer.destinationBranchId}`,
          reference: transfer.transferNumber,
          createdBy: dto.processedBy,
        }),

        // Add to destination branch
        this.inventoryService.updateStock(processedItem.inventoryItemId, {
          quantity: processedItem.transferredQuantity,
          type: 'transfer',
          reason: `Transfer from branch ${transfer.sourceBranchId}`,
          reference: transfer.transferNumber,
          createdBy: dto.processedBy,
        }),
      ]);

      // Update transfer item status
      transferItem.transferredQuantity = processedItem.transferredQuantity;
      transferItem.notes = processedItem.notes;

      if (transferItem.transferredQuantity >= transferItem.approvedQuantity) {
        transferItem.status = 'transferred';
      } else if (transferItem.transferredQuantity > 0) {
        transferItem.status = 'partial';
      }

      stockMovementIds.push(outMovement._id.toString());
    }

    // Update transfer status
    const allItemsTransferred = transfer.items.every(
      item => item.status === 'transferred',
    );

    if (allItemsTransferred) {
      transfer.status = 'completed';
    } else {
      transfer.status = 'partial';
    }

    transfer.tracking.sentAt = new Date();
    transfer.tracking.sentBy = dto.processedBy;
    transfer.tracking.receivedAt = new Date();
    transfer.tracking.receivedBy = dto.processedBy;
    transfer.stockMovementIds = stockMovementIds;

    if (dto.notes) {
      transfer.notes = dto.notes;
    }

    await transfer.save();

    this.logger.log(
      `Processed transfer order ${transfer.transferNumber} by ${dto.processedBy}`,
    );

    return transfer;
  }

  async cancelTransferOrder(
    transferId: string,
    reason: string,
    cancelledBy: string,
  ): Promise<TransferOrder> {
    const transfer = await this.transferOrderModel.findById(transferId);
    if (!transfer) {
      throw new NotFoundException(`Transfer order ${transferId} not found`);
    }

    if (['completed', 'cancelled'].includes(transfer.status)) {
      throw new BadRequestException(
        'Cannot cancel completed or already cancelled transfer order',
      );
    }

    transfer.status = 'cancelled';
    transfer.tracking.rejectionReason = reason;
    transfer.tracking.rejectedAt = new Date();
    transfer.tracking.rejectedBy = cancelledBy;

    await transfer.save();

    this.logger.log(
      `Cancelled transfer order ${transfer.transferNumber} by ${cancelledBy}: ${reason}`,
    );

    return transfer;
  }

  async getTransferOrders(
    restaurantId: string,
    filters?: TransferOrderQueryDto,
  ): Promise<{
    transferOrders: TransferOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: FilterQuery<TransferOrderDocument> = {
      restaurantId,
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.sourceBranchId) {
      query.sourceBranchId = new Types.ObjectId(filters.sourceBranchId);
    }

    if (filters?.destinationBranchId) {
      query.destinationBranchId = new Types.ObjectId(filters.destinationBranchId);
    }

    if (filters?.priority) {
      query.priority = filters.priority;
    }

    if (filters?.fromDate || filters?.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }

    if (filters?.search) {
      query.$or = [
        { transferNumber: { $regex: filters.search, $options: 'i' } },
        { reason: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [transferOrders, total] = await Promise.all([
      this.transferOrderModel
        .find(query)
        .populate('sourceBranchId', 'name')
        .populate('destinationBranchId', 'name')
        .populate('items.inventoryItemId', 'name unit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.transferOrderModel.countDocuments(query),
    ]);

    return {
      transferOrders: transferOrders as TransferOrder[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransferOrderById(transferId: string): Promise<TransferOrder> {
    const transfer = await this.transferOrderModel
      .findById(transferId)
      .populate('sourceBranchId', 'name')
      .populate('destinationBranchId', 'name')
      .populate('items.inventoryItemId', 'name unit category')
      .populate('createdBy', 'name')
      .populate('tracking.approvedBy', 'name')
      .populate('tracking.rejectedBy', 'name')
      .lean();

    if (!transfer) {
      throw new NotFoundException(`Transfer order ${transferId} not found`);
    }

    return transfer as TransferOrder;
  }

  async getTransferOrderAnalytics(
    restaurantId: string,
    branchId?: string,
  ): Promise<{
    totalTransfers: number;
    totalValue: number;
    statusBreakdown: Record<string, number>;
    branchTransferStats: Array<{
      branchId: string;
      branchName: string;
      sentCount: number;
      receivedCount: number;
      sentValue: number;
      receivedValue: number;
    }>;
    avgProcessingTime: number;
  }> {
    const matchFilter: any = { restaurantId: new Types.ObjectId(restaurantId) };
    if (branchId) {
      matchFilter.$or = [
        { sourceBranchId: new Types.ObjectId(branchId) },
        { destinationBranchId: new Types.ObjectId(branchId) },
      ];
    }

    const [statusStats, branchStats, timingStats] = await Promise.all([
      // Status breakdown
      this.transferOrderModel.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            value: { $sum: '$totalValue' },
          },
        },
      ]),

      // Branch transfer statistics
      this.transferOrderModel.aggregate([
        { $match: matchFilter },
        {
          $lookup: {
            from: 'branches',
            localField: 'sourceBranchId',
            foreignField: '_id',
            as: 'sourceBranch',
          },
        },
        {
          $lookup: {
            from: 'branches',
            localField: 'destinationBranchId',
            foreignField: '_id',
            as: 'destinationBranch',
          },
        },
        { $unwind: '$sourceBranch' },
        { $unwind: '$destinationBranch' },
        {
          $group: {
            _id: null,
            transfers: {
              $push: {
                sourceBranchId: '$sourceBranchId',
                sourceBranchName: '$sourceBranch.name',
                destinationBranchId: '$destinationBranchId',
                destinationBranchName: '$destinationBranch.name',
                value: '$totalValue',
              },
            },
          },
        },
      ]),

      // Processing time statistics
      this.transferOrderModel.aggregate([
        {
          $match: {
            ...matchFilter,
            status: { $in: ['completed', 'partial'] },
            'tracking.requestedAt': { $exists: true },
            'tracking.receivedAt': { $exists: true },
          },
        },
        {
          $project: {
            processingTime: {
              $subtract: ['$tracking.receivedAt', '$tracking.requestedAt'],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' },
          },
        },
      ]),
    ]);

    // Process status breakdown
    const statusBreakdown: Record<string, number> = {};
    let totalTransfers = 0;
    let totalValue = 0;

    statusStats.forEach(stat => {
      statusBreakdown[stat._id] = stat.count;
      totalTransfers += stat.count;
      totalValue += stat.value;
    });

    // Process branch statistics
    const branchMap = new Map();
    if (branchStats[0]?.transfers) {
      branchStats[0].transfers.forEach((transfer: any) => {
        // Source branch (sent)
        const sourceKey = transfer.sourceBranchId.toString();
        if (!branchMap.has(sourceKey)) {
          branchMap.set(sourceKey, {
            branchId: sourceKey,
            branchName: transfer.sourceBranchName,
            sentCount: 0,
            receivedCount: 0,
            sentValue: 0,
            receivedValue: 0,
          });
        }
        const sourceStats = branchMap.get(sourceKey);
        sourceStats.sentCount += 1;
        sourceStats.sentValue += transfer.value;

        // Destination branch (received)
        const destKey = transfer.destinationBranchId.toString();
        if (!branchMap.has(destKey)) {
          branchMap.set(destKey, {
            branchId: destKey,
            branchName: transfer.destinationBranchName,
            sentCount: 0,
            receivedCount: 0,
            sentValue: 0,
            receivedValue: 0,
          });
        }
        const destStats = branchMap.get(destKey);
        destStats.receivedCount += 1;
        destStats.receivedValue += transfer.value;
      });
    }

    const branchTransferStats = Array.from(branchMap.values());

    const avgProcessingTime = timingStats[0]?.avgProcessingTime
      ? Math.round(timingStats[0].avgProcessingTime / (1000 * 60 * 60)) // Convert to hours
      : 0;

    return {
      totalTransfers,
      totalValue,
      statusBreakdown,
      branchTransferStats,
      avgProcessingTime,
    };
  }

  private async calculateTransferValue(
    items: Array<{ inventoryItemId: string; requestedQuantity: number }>,
    restaurantId: string,
    sourceBranchId: string,
  ): Promise<number> {
    let totalValue = 0;

    for (const item of items) {
      const inventoryItems = await this.inventoryService.getInventoryItems(
        restaurantId,
        { branchId: sourceBranchId },
      );

      const inventoryItem = inventoryItems.find(
        inv => inv._id.toString() === item.inventoryItemId,
      );

      if (inventoryItem) {
        totalValue += item.requestedQuantity * inventoryItem.pricing.costPerUnit;
      }
    }

    return totalValue;
  }

  private async generateTransferNumber(restaurantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the highest transfer number for today
    const regex = new RegExp(`^TR-${datePrefix}-`);
    const existingTransfers = await this.transferOrderModel
      .find({
        restaurantId,
        transferNumber: { $regex: regex },
      })
      .sort({ transferNumber: -1 })
      .limit(1)
      .lean();

    let nextNumber = 1;
    if (existingTransfers.length > 0) {
      const lastTransferNumber = existingTransfers[0].transferNumber;
      const lastNumber = parseInt(lastTransferNumber.slice(-3), 10);
      nextNumber = lastNumber + 1;
    }

    return `TR-${datePrefix}-${nextNumber.toString().padStart(3, '0')}`;
  }
}