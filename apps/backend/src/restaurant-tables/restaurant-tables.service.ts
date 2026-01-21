import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RestaurantTable, RestaurantTableDocument } from './schemas/restaurant-table.schema';
import { CreateRestaurantTableDto } from './dtos/create-restaurant-table.dto';
import { RestaurantTableResponseDto } from './dtos/restaurant-table-response.dto';
import { UpdateRestaurantTableDto } from './dtos/update-restaurant-table.dto';
import { BulkCreateTablesDto, BulkTableLayout } from './dtos/bulk-create-tables.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { OrderResponseDto } from '../orders/dtos/order-response.dto';
import { ServiceTablesResponseDto } from './dtos/service-table-response.dto';

@Injectable()
export class RestaurantTablesService {
  constructor(
    @InjectModel(RestaurantTable.name)
    private readonly tableModel: Model<RestaurantTableDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly restaurantsService: RestaurantsService
  ) {}

  async list(restaurantId: string, branchId?: string): Promise<RestaurantTableResponseDto[]> {
    const query: FilterQuery<RestaurantTableDocument> = {
      restaurantId,
      isActive: true,
    };

    if (branchId) {
      query.branchId = branchId;
    }

    const tables = await this.tableModel
      .find(query)
      .sort({ displayOrder: 1, tableNumber: 1 })
      .exec();

    return tables.map((table) => this.toDto(table));
  }

  async listForService(restaurantId: string, branchId?: string): Promise<ServiceTablesResponseDto> {
    await this.ensureRestaurantExists(restaurantId);

    const query: FilterQuery<RestaurantTableDocument> = {
      restaurantId,
      isActive: true,
    };

    if (branchId) {
      query.branchId = branchId;
    }

    const tables = await this.tableModel
      .find(query)
      .sort({ displayOrder: 1, tableNumber: 1 })
      .exec();

    const tableNumbers = tables
      .map((table) => table.tableNumber)
      .filter((tableNumber): tableNumber is string => !!tableNumber);

    const restaurantObjectId = new Types.ObjectId(restaurantId);

    const activeStatuses = [
      OrderStatus.Pending,
      OrderStatus.Accepted,
      OrderStatus.InProgress,
      OrderStatus.Ready,
    ];

    let activeOrders: OrderDocument[] = [];

    if (tableNumbers.length > 0) {
      activeOrders = await this.orderModel
        .find({
          restaurantId: restaurantObjectId,
          tableNumber: { $in: tableNumbers },
          status: { $in: activeStatuses },
          paymentStatus: { $ne: PaymentStatus.Paid },
        })
        .sort({ createdAt: -1 })
        .exec();
    }

    const activeOrderMap = new Map<string, OrderDocument>();
    activeOrders.forEach((order) => {
      const tableKey = order.tableNumber?.toLowerCase();
      if (!tableKey) {
        return;
      }
      if (!activeOrderMap.has(tableKey)) {
        activeOrderMap.set(tableKey, order);
      }
    });

    const tablesDto = tables.map((table) => {
      const key = table.tableNumber.toLowerCase();
      const activeOrder = activeOrderMap.get(key);
      return this.toDto(table, activeOrder);
    });

    const occupiedTables = tablesDto.filter((table) => !!table.activeOrder).length;
    const readyOrders = tablesDto.filter(
      (table) => table.activeOrder?.status === OrderStatus.Ready
    ).length;
    const unpaidOrders = tablesDto.filter(
      (table) =>
        table.activeOrder &&
        table.activeOrder.paymentStatus !== PaymentStatus.Paid &&
        table.activeOrder.status !== OrderStatus.Cancelled
    ).length;

    const todaysRevenue = await this.calculateTodaysRevenue(restaurantObjectId);

    return {
      tables: tablesDto,
      stats: {
        totalTables: tables.length,
        occupiedTables,
        activeOrders: activeOrderMap.size,
        readyOrders,
        unpaidOrders,
        todaysRevenue,
      },
    };
  }

  async create(
    restaurantId: string,
    dto: CreateRestaurantTableDto,
    branchId?: string
  ): Promise<RestaurantTableResponseDto> {
    await this.ensureRestaurantExists(restaurantId);

    const tableNumber = dto.tableNumber.trim();
    const existing = await this.tableModel.findOne({
      restaurantId,
      tableNumber,
      ...(branchId && { branchId }),
    });
    if (existing) {
      throw new ConflictException(
        `Table ${tableNumber} already exists for this ${branchId ? 'branch' : 'restaurant'}`
      );
    }

    const created = await this.tableModel.create({
      restaurantId,
      branchId,
      tableNumber,
      displayName: dto.displayName?.trim() || undefined,
      capacity: dto.capacity,
      zone: dto.zone?.trim() || undefined,
      displayOrder: dto.displayOrder ?? 0,
      layoutX: dto.layoutX,
      layoutY: dto.layoutY,
      layoutWidth: dto.layoutWidth,
      layoutHeight: dto.layoutHeight,
      layoutRotation: dto.layoutRotation,
    });
    return this.toDto(created);
  }

  async update(
    restaurantId: string,
    tableId: string,
    dto: UpdateRestaurantTableDto
  ): Promise<RestaurantTableResponseDto> {
    const table = await this.tableModel.findOne({
      _id: tableId,
      restaurantId,
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const nextTableNumber = dto.tableNumber?.trim();

    if (nextTableNumber && nextTableNumber.toLowerCase() !== table.tableNumber.toLowerCase()) {
      const existing = await this.tableModel.findOne({
        restaurantId,
        tableNumber: nextTableNumber,
      });
      if (existing) {
        throw new ConflictException(
          `Table ${nextTableNumber} already exists for this restaurant`
        );
      }
    }

    if (nextTableNumber) {
      table.tableNumber = nextTableNumber;
    }
    if (dto.displayName !== undefined) {
      table.displayName = dto.displayName.trim() || undefined;
    }
    if (dto.zone !== undefined) {
      table.zone = dto.zone.trim() || undefined;
    }
    if (dto.capacity !== undefined) {
      table.capacity = dto.capacity;
    }
    if (dto.displayOrder !== undefined) {
      table.displayOrder = dto.displayOrder;
    }
    if (dto.layoutX !== undefined) {
      table.layoutX = dto.layoutX;
    }
    if (dto.layoutY !== undefined) {
      table.layoutY = dto.layoutY;
    }
    if (dto.layoutWidth !== undefined) {
      table.layoutWidth = dto.layoutWidth;
    }
    if (dto.layoutHeight !== undefined) {
      table.layoutHeight = dto.layoutHeight;
    }
    if (dto.layoutRotation !== undefined) {
      table.layoutRotation = dto.layoutRotation;
    }

    await table.save();
    return this.toDto(table);
  }

  async archive(restaurantId: string, tableId: string): Promise<void> {
    const table = await this.tableModel.findOneAndUpdate(
      { _id: tableId, restaurantId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!table) {
      throw new NotFoundException('Table not found');
    }
  }

  async reactivate(restaurantId: string, tableId: string): Promise<RestaurantTableResponseDto> {
    const table = await this.tableModel.findOneAndUpdate(
      { _id: tableId, restaurantId },
      { $set: { isActive: true } },
      { new: true }
    );
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return this.toDto(table);
  }

  async generateQrCode(restaurantId: string, tableId: string) {
    const table = await this.tableModel.findOne({
      _id: tableId,
      restaurantId,
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return this.restaurantsService.generateQrCode(
      restaurantId,
      table.tableNumber
    );
  }

  async bulkCreate(
    restaurantId: string,
    dto: BulkCreateTablesDto,
    branchId?: string
  ): Promise<RestaurantTableResponseDto[]> {
    await this.ensureRestaurantExists(restaurantId);

    // Get existing table numbers to determine the next available number
    const query: FilterQuery<RestaurantTableDocument> = { restaurantId };
    if (branchId) {
      query.branchId = branchId;
    }

    const existingTables = await this.tableModel
      .find(query)
      .select('tableNumber')
      .exec();

    const existingNumbers = new Set(
      existingTables.map(t => t.tableNumber.toLowerCase())
    );

    const prefix = dto.tablePrefix || 'T';
    const capacity = dto.capacity || 4;
    const zone = dto.zone?.trim() || undefined;

    // Generate next available table numbers
    const getNextTableNumbers = (count: number): string[] => {
      const numbers: string[] = [];
      let current = 1;

      while (numbers.length < count) {
        const tableNumber = `${prefix}${current}`;
        if (!existingNumbers.has(tableNumber.toLowerCase())) {
          numbers.push(tableNumber);
        }
        current++;
      }
      return numbers;
    };

    // Define layout configurations
    const layoutConfigs = {
      [BulkTableLayout.LAYOUT_4]: {
        count: 4,
        positions: [
          { x: 200, y: 150 }, // Left top
          { x: 200, y: 280 }, // Left bottom
          { x: 700, y: 150 }, // Right top
          { x: 700, y: 280 }, // Right bottom
        ],
      },
      [BulkTableLayout.LAYOUT_6]: {
        count: 6,
        positions: [
          { x: 150, y: 120 }, // Left top
          { x: 150, y: 250 }, // Left middle
          { x: 150, y: 380 }, // Left bottom
          { x: 750, y: 120 }, // Right top
          { x: 750, y: 250 }, // Right middle
          { x: 750, y: 380 }, // Right bottom
        ],
      },
      [BulkTableLayout.LAYOUT_8]: {
        count: 8,
        positions: [
          { x: 120, y: 100 }, // Left top
          { x: 120, y: 200 }, // Left middle-top
          { x: 120, y: 300 }, // Left middle-bottom
          { x: 120, y: 400 }, // Left bottom
          { x: 780, y: 100 }, // Right top
          { x: 780, y: 200 }, // Right middle-top
          { x: 780, y: 300 }, // Right middle-bottom
          { x: 780, y: 400 }, // Right bottom
        ],
      },
      [BulkTableLayout.LAYOUT_16]: {
        count: 16,
        positions: [
          // Left group 1 (2x2)
          { x: 100, y: 80 },
          { x: 200, y: 80 },
          { x: 100, y: 180 },
          { x: 200, y: 180 },
          // Left group 2 (2x2)
          { x: 100, y: 320 },
          { x: 200, y: 320 },
          { x: 100, y: 420 },
          { x: 200, y: 420 },
          // Right group 1 (2x2)
          { x: 700, y: 80 },
          { x: 800, y: 80 },
          { x: 700, y: 180 },
          { x: 800, y: 180 },
          // Right group 2 (2x2)
          { x: 700, y: 320 },
          { x: 800, y: 320 },
          { x: 700, y: 420 },
          { x: 800, y: 420 },
        ],
      },
    };

    const config = layoutConfigs[dto.layout];
    const tableNumbers = getNextTableNumbers(config.count);

    // Create tables in bulk
    const tablesToCreate = tableNumbers.map((tableNumber, index) => ({
      restaurantId,
      branchId,
      tableNumber,
      capacity,
      zone,
      displayOrder: index,
      layoutX: config.positions[index].x,
      layoutY: config.positions[index].y,
      layoutWidth: 80,
      layoutHeight: 80,
      layoutRotation: 0,
    }));

    const createdTables = await this.tableModel.insertMany(tablesToCreate);
    return createdTables.map(table => this.toDto(table));
  }

  private async ensureRestaurantExists(restaurantId: string) {
    await this.restaurantsService.findById(restaurantId);
  }

  private toDto(
    doc: RestaurantTableDocument,
    activeOrder?: OrderDocument
  ): RestaurantTableResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
      tableNumber: doc.tableNumber,
      displayName: doc.displayName,
      capacity: doc.capacity,
      zone: doc.zone,
      displayOrder: doc.displayOrder ?? 0,
      isActive: doc.isActive,
      layoutX: doc.layoutX,
      layoutY: doc.layoutY,
      layoutWidth: doc.layoutWidth,
      layoutHeight: doc.layoutHeight,
      layoutRotation: doc.layoutRotation,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      activeOrder: activeOrder ? this.mapOrderToDto(activeOrder) : undefined,
    };
  }

  private mapOrderToDto(order: OrderDocument): OrderResponseDto {
    return {
      id: order._id.toString(),
      restaurantId: order.restaurantId.toString(),
      sessionId: order.sessionId?.toString(),
      createdBy: order.createdBy?.toString(),
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      customerGstin: order.customerGstin,
      customerState: order.customerState,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      progress: order.progress,
      items: order.items.map((item) => ({
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
      subTotalAmount: order.subTotalAmount,
      taxAmount: order.taxAmount,
      cgstAmount: order.cgstAmount,
      sgstAmount: order.sgstAmount,
      igstAmount: order.igstAmount,
      discountAmount: order.discountAmount,
      grossAmount:
        order.grossAmount ??
        this.roundToTwo(order.subTotalAmount + (order.discountAmount ?? 0)),
      totalAmount: order.totalAmount,
      roundOffAmount: order.roundOffAmount,
      taxType: order.taxType
        ? (order.taxType as 'intra-state' | 'inter-state')
        : undefined,
      notes: order.notes,
      statusNote: order.statusNote,
      paidAt: order.paidAt?.toISOString(),
      paymentProvider: order.paymentProvider,
      paymentTransactionId: order.paymentTransactionId,
      razorpayOrderId: order.razorpayOrderId,
      paymentMeta: order.paymentMeta ?? undefined,
      readyAt: order.readyAt?.toISOString(),
      paymentIntentUrl: order.paymentIntentUrl,
      taxInvoiceNumber: order.taxInvoiceNumber,
      taxInvoiceGeneratedAt: order.taxInvoiceGeneratedAt?.toISOString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private roundToTwo(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async calculateTodaysRevenue(
    restaurantId: Types.ObjectId
  ): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const aggregation = await this.orderModel.aggregate<{ total: number }>([
      {
        $match: {
          restaurantId,
          paymentStatus: PaymentStatus.Paid,
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);

    return aggregation[0]?.total ?? 0;
  }
}
