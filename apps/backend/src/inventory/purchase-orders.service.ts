import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { PurchaseOrder, PurchaseOrderDocument } from './schemas/purchase-order.schema';
import { InventoryService } from './inventory.service';
import { SuppliersService } from './suppliers.service';

export interface CreatePurchaseOrderDto {
  restaurantId: string;
  branchId: string;
  supplierId: string;
  items: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }>;
  delivery?: {
    expectedDate?: Date;
    expectedTime?: string;
    deliveryInstructions?: string;
  };
  notes?: string;
  terms?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdBy: string;
}

export interface UpdatePurchaseOrderDto {
  items?: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }>;
  delivery?: {
    expectedDate?: Date;
    expectedTime?: string;
    deliveryInstructions?: string;
  };
  notes?: string;
  terms?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface PurchaseOrderQueryDto {
  status?: string;
  supplierId?: string;
  branchId?: string;
  priority?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReceivePurchaseOrderDto {
  poId: string;
  items: Array<{
    inventoryItemId: string;
    receivedQuantity: number;
    actualUnitCost?: number;
    notes?: string;
  }>;
  receivedBy: string;
  actualDeliveryDate?: Date;
  actualDeliveryTime?: string;
  notes?: string;
}

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrderDocument>,
    private readonly inventoryService: InventoryService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async createPurchaseOrder(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    // Validate supplier exists and is active
    const supplier = await this.suppliersService.getSupplierById(dto.supplierId);
    if (!supplier.isActive) {
      throw new BadRequestException('Supplier is not active');
    }

    // Generate PO number
    const poNumber = await this.generatePONumber(dto.restaurantId);

    // Calculate totals
    const { subtotal, totalAmount, items } = this.calculatePOTotals(dto.items);

    const purchaseOrder = new this.purchaseOrderModel({
      restaurantId: dto.restaurantId,
      branchId: dto.branchId,
      supplierId: dto.supplierId,
      poNumber,
      status: 'draft',
      items,
      subtotal,
      taxAmount: 0, // TODO: Calculate based on GST settings
      totalAmount,
      delivery: dto.delivery,
      notes: dto.notes,
      terms: dto.terms,
      priority: dto.priority || 'normal',
      createdBy: dto.createdBy,
      tracking: {},
    });

    const savedPO = await purchaseOrder.save();

    this.logger.log(
      `Created purchase order ${poNumber} for supplier ${supplier.name}`,
    );

    return savedPO;
  }

  async updatePurchaseOrder(
    poId: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    // Only allow updates for draft orders
    if (po.status !== 'draft') {
      throw new BadRequestException('Can only update draft purchase orders');
    }

    // Update items and recalculate totals if items changed
    if (dto.items) {
      const { subtotal, totalAmount, items } = this.calculatePOTotals(dto.items);
      po.items = items;
      po.subtotal = subtotal;
      po.totalAmount = totalAmount;
    }

    // Update other fields
    if (dto.delivery) {
      po.delivery = { ...po.delivery, ...dto.delivery };
    }
    if (dto.notes) po.notes = dto.notes;
    if (dto.terms) po.terms = dto.terms;
    if (dto.priority) po.priority = dto.priority;

    await po.save();

    this.logger.log(`Updated purchase order ${po.poNumber}`);
    return po;
  }

  async approvePurchaseOrder(
    poId: string,
    approvedBy: string,
  ): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    if (po.status !== 'pending') {
      throw new BadRequestException(
        'Can only approve pending purchase orders',
      );
    }

    po.status = 'sent';
    po.approvedBy = approvedBy;
    po.approvedAt = new Date();
    po.tracking.sentAt = new Date();
    po.tracking.sentBy = approvedBy;

    await po.save();

    this.logger.log(
      `Approved and sent purchase order ${po.poNumber} by user ${approvedBy}`,
    );

    return po;
  }

  async sendPurchaseOrder(poId: string, sentBy: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId).populate('supplierId');
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    const supplier = po.supplierId as any;
    if (!supplier.contact?.email) {
      throw new BadRequestException('Supplier does not have an email address');
    }

    po.status = 'sent';
    po.tracking.sentAt = new Date();
    po.tracking.sentBy = sentBy;

    await po.save();

    // TODO: Send email to supplier
    this.logger.log(
      `Sent purchase order ${po.poNumber} to ${supplier.contact.email}`,
    );

    return po;
  }

  async acknowledgePurchaseOrder(
    poId: string,
    acknowledgmentMethod?: string,
  ): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    po.status = 'acknowledged';
    po.tracking.acknowledgedAt = new Date();
    po.tracking.acknowledgmentMethod = acknowledgmentMethod;

    await po.save();

    this.logger.log(`Purchase order ${po.poNumber} acknowledged`);
    return po;
  }

  async receivePurchaseOrder(dto: ReceivePurchaseOrderDto): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(dto.poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${dto.poId} not found`);
    }

    if (!['sent', 'acknowledged', 'partial'].includes(po.status)) {
      throw new BadRequestException(
        'Purchase order must be sent/acknowledged to receive items',
      );
    }

    let allItemsReceived = true;

    // Process received items
    for (const receivedItem of dto.items) {
      const poItem = po.items.find(
        item => item.inventoryItemId.toString() === receivedItem.inventoryItemId,
      );

      if (!poItem) {
        throw new BadRequestException(
          `Item ${receivedItem.inventoryItemId} not found in purchase order`,
        );
      }

      // Update received quantity
      poItem.receivedQuantity += receivedItem.receivedQuantity;

      // Update status based on received vs ordered quantity
      if (poItem.receivedQuantity >= poItem.quantity) {
        poItem.status = 'received';
      } else if (poItem.receivedQuantity > 0) {
        poItem.status = 'partial';
        allItemsReceived = false;
      } else {
        allItemsReceived = false;
      }

      // Update inventory stock
      await this.inventoryService.updateStock(receivedItem.inventoryItemId, {
        quantity: receivedItem.receivedQuantity,
        type: 'purchase',
        unitCost: receivedItem.actualUnitCost || poItem.unitCost,
        reason: `Purchase order ${po.poNumber}`,
        supplier: po.supplierId.toString(),
        invoiceNumber: po.poNumber,
        createdBy: dto.receivedBy,
      });
    }

    // Update PO status
    if (allItemsReceived) {
      po.status = 'delivered';
      po.tracking.deliveredAt = new Date();
    } else {
      po.status = 'partial';
    }

    po.tracking.receivedBy = dto.receivedBy;

    if (dto.actualDeliveryDate) {
      po.delivery = po.delivery || {};
      po.delivery.actualDate = dto.actualDeliveryDate;
      po.delivery.actualTime = dto.actualDeliveryTime;
    }

    await po.save();

    // Update supplier performance
    const isOnTime = this.isDeliveryOnTime(po);
    await this.suppliersService.updateSupplierPerformance({
      supplierId: po.supplierId.toString(),
      onTimeDelivery: isOnTime,
      orderValue: po.totalAmount,
      evaluatedBy: dto.receivedBy,
    });

    this.logger.log(
      `Received items for purchase order ${po.poNumber} by ${dto.receivedBy}`,
    );

    return po;
  }

  async cancelPurchaseOrder(
    poId: string,
    reason: string,
    cancelledBy: string,
  ): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    if (['delivered', 'cancelled'].includes(po.status)) {
      throw new BadRequestException(
        'Cannot cancel delivered or already cancelled purchase order',
      );
    }

    po.status = 'cancelled';
    po.tracking.cancellationReason = reason;
    po.tracking.cancelledAt = new Date();
    po.tracking.cancelledBy = cancelledBy;

    await po.save();

    this.logger.log(
      `Cancelled purchase order ${po.poNumber} by ${cancelledBy}: ${reason}`,
    );

    return po;
  }

  async getPurchaseOrders(
    restaurantId: string,
    filters?: PurchaseOrderQueryDto,
  ): Promise<{
    purchaseOrders: PurchaseOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: FilterQuery<PurchaseOrderDocument> = {
      restaurantId,
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.supplierId) {
      query.supplierId = new Types.ObjectId(filters.supplierId);
    }

    if (filters?.branchId) {
      query.branchId = new Types.ObjectId(filters.branchId);
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
        { poNumber: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [purchaseOrders, total] = await Promise.all([
      this.purchaseOrderModel
        .find(query)
        .populate('supplierId', 'name supplierCode contact')
        .populate('branchId', 'name')
        .populate('items.inventoryItemId', 'name unit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.purchaseOrderModel.countDocuments(query),
    ]);

    return {
      purchaseOrders: purchaseOrders as PurchaseOrder[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPurchaseOrderById(poId: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel
      .findById(poId)
      .populate('supplierId')
      .populate('branchId', 'name')
      .populate('items.inventoryItemId', 'name unit category')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .lean();

    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    return po as PurchaseOrder;
  }

  async generatePurchaseOrderPdf(poId: string): Promise<Buffer> {
    const po = await this.getPurchaseOrderById(poId);

    // TODO: Implement PDF generation
    // For now, return empty buffer
    return Buffer.from('');
  }

  async getPurchaseOrderAnalytics(
    restaurantId: string,
    branchId?: string,
  ): Promise<{
    totalPOs: number;
    totalValue: number;
    statusBreakdown: Record<string, number>;
    supplierBreakdown: Array<{ name: string; count: number; value: number }>;
    avgDeliveryTime: number;
    onTimeDeliveryPercent: number;
  }> {
    const matchFilter: any = { restaurantId: new Types.ObjectId(restaurantId) };
    if (branchId) {
      matchFilter.branchId = new Types.ObjectId(branchId);
    }

    const [statusStats, supplierStats, deliveryStats] = await Promise.all([
      // Status breakdown
      this.purchaseOrderModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$totalAmount' } } },
      ]),

      // Supplier breakdown
      this.purchaseOrderModel.aggregate([
        { $match: matchFilter },
        {
          $lookup: {
            from: 'suppliers',
            localField: 'supplierId',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        { $unwind: '$supplier' },
        {
          $group: {
            _id: '$supplierId',
            name: { $first: '$supplier.name' },
            count: { $sum: 1 },
            value: { $sum: '$totalAmount' },
          },
        },
        { $sort: { value: -1 } },
        { $limit: 10 },
      ]),

      // Delivery performance
      this.purchaseOrderModel.aggregate([
        {
          $match: {
            ...matchFilter,
            status: { $in: ['delivered', 'partial'] },
            'tracking.deliveredAt': { $exists: true }
          }
        },
        {
          $project: {
            deliveryTime: {
              $subtract: ['$tracking.deliveredAt', '$createdAt']
            },
            isOnTime: {
              $cond: {
                if: { $and: ['$delivery.expectedDate', '$tracking.deliveredAt'] },
                then: { $lte: ['$tracking.deliveredAt', '$delivery.expectedDate'] },
                else: true
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDeliveryTime: { $avg: '$deliveryTime' },
            onTimeCount: { $sum: { $cond: ['$isOnTime', 1, 0] } },
            totalDelivered: { $sum: 1 }
          }
        }
      ])
    ]);

    const statusBreakdown: Record<string, number> = {};
    let totalPOs = 0;
    let totalValue = 0;

    statusStats.forEach(stat => {
      statusBreakdown[stat._id] = stat.count;
      totalPOs += stat.count;
      totalValue += stat.value;
    });

    const supplierBreakdown = supplierStats.map(stat => ({
      name: stat.name,
      count: stat.count,
      value: stat.value,
    }));

    const avgDeliveryTime = deliveryStats[0]?.avgDeliveryTime
      ? Math.round(deliveryStats[0].avgDeliveryTime / (1000 * 60 * 60 * 24)) // Convert to days
      : 0;

    const onTimeDeliveryPercent = deliveryStats[0]?.totalDelivered > 0
      ? Math.round((deliveryStats[0].onTimeCount / deliveryStats[0].totalDelivered) * 100)
      : 0;

    return {
      totalPOs,
      totalValue,
      statusBreakdown,
      supplierBreakdown,
      avgDeliveryTime,
      onTimeDeliveryPercent,
    };
  }

  private calculatePOTotals(items: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }>) {
    const processedItems = items.map(item => ({
      inventoryItemId: item.inventoryItemId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.quantity * item.unitCost,
      notes: item.notes,
      receivedQuantity: 0,
      status: 'pending' as const,
    }));

    const subtotal = processedItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalAmount = subtotal; // TODO: Add tax calculation

    return {
      items: processedItems,
      subtotal,
      totalAmount,
    };
  }

  private async generatePONumber(restaurantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the highest PO number for today
    const regex = new RegExp(`^PO-${datePrefix}-`);
    const existingPOs = await this.purchaseOrderModel
      .find({
        restaurantId,
        poNumber: { $regex: regex },
      })
      .sort({ poNumber: -1 })
      .limit(1)
      .lean();

    let nextNumber = 1;
    if (existingPOs.length > 0) {
      const lastPONumber = existingPOs[0].poNumber;
      const lastNumber = parseInt(lastPONumber.slice(-3), 10);
      nextNumber = lastNumber + 1;
    }

    return `PO-${datePrefix}-${nextNumber.toString().padStart(3, '0')}`;
  }

  private isDeliveryOnTime(po: PurchaseOrder): boolean {
    if (!po.delivery?.expectedDate || !po.tracking?.deliveredAt) {
      return true; // No expected date, consider on time
    }

    const expectedDate = new Date(po.delivery.expectedDate);
    const deliveredDate = new Date(po.tracking.deliveredAt);

    return deliveredDate <= expectedDate;
  }
}