import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TableStatus,
  TableStatusDocument,
  TableStatusType,
} from './schemas/table-status.schema';
import {
  RestaurantTable,
  RestaurantTableDocument,
} from './schemas/restaurant-table.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { TableStatusGateway } from './table-status.gateway';
import {
  UpdateTableStatusDto,
  TableStatusResponseDto,
  TableStatusStatsDto,
  EnhancedRestaurantTableResponseDto,
} from './dtos/table-status.dto';
import { OrderResponseDto } from '../orders/dtos/order-response.dto';

@Injectable()
export class TableStatusService {
  constructor(
    @InjectModel(TableStatus.name)
    private readonly tableStatusModel: Model<TableStatusDocument>,
    @InjectModel(RestaurantTable.name)
    private readonly restaurantTableModel: Model<RestaurantTableDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly tableStatusGateway: TableStatusGateway
  ) {}

  async updateTableStatus(
    restaurantId: string,
    tableId: string,
    dto: UpdateTableStatusDto,
    actor: AuthenticatedUser
  ): Promise<TableStatusResponseDto> {
    // Verify table exists and belongs to restaurant
    const table = await this.restaurantTableModel.findOne({
      _id: tableId,
      restaurantId,
      isActive: true,
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Get or create table status
    let tableStatus = await this.tableStatusModel.findOne({
      restaurantId,
      tableId,
    });

    const now = new Date();
    const statusChanges: any = {
      status: dto.status,
      lastStatusChange: now,
      lastUpdatedBy: actor.uid,
      lastUpdatedByName: actor.displayName || actor.email,
    };

    // Handle status-specific logic
    switch (dto.status) {
      case TableStatusType.Occupied:
        if (dto.currentPartySize) {
          statusChanges.currentPartySize = dto.currentPartySize;
        }
        if (!tableStatus || tableStatus.status !== TableStatusType.Occupied) {
          statusChanges.occupiedSince = now;
          statusChanges.availableSince = undefined;
          statusChanges.cleaningSince = undefined;
        }
        break;

      case TableStatusType.Available:
        statusChanges.availableSince = now;
        statusChanges.occupiedSince = undefined;
        statusChanges.cleaningSince = undefined;
        statusChanges.currentPartySize = undefined;
        statusChanges.currentBillAmount = 0;
        statusChanges.reservedFrom = undefined;
        statusChanges.reservedUntil = undefined;
        statusChanges.reservationCustomerName = undefined;
        statusChanges.reservationCustomerPhone = undefined;
        statusChanges.notes = undefined;
        break;

      case TableStatusType.Cleaning:
        statusChanges.cleaningSince = now;
        statusChanges.occupiedSince = undefined;
        statusChanges.availableSince = undefined;
        statusChanges.currentPartySize = undefined;
        break;

      case TableStatusType.Reserved:
        if (dto.reservedFrom) {
          statusChanges.reservedFrom = new Date(dto.reservedFrom);
        }
        if (dto.reservedUntil) {
          statusChanges.reservedUntil = new Date(dto.reservedUntil);
        }
        if (dto.reservationCustomerName) {
          statusChanges.reservationCustomerName = dto.reservationCustomerName;
        }
        if (dto.reservationCustomerPhone) {
          statusChanges.reservationCustomerPhone = dto.reservationCustomerPhone;
        }
        statusChanges.occupiedSince = undefined;
        statusChanges.availableSince = undefined;
        statusChanges.cleaningSince = undefined;
        break;
    }

    // Handle server assignment
    if (dto.assignedServerId !== undefined) {
      if (dto.assignedServerId) {
        const server = await this.userModel.findById(dto.assignedServerId);
        if (server) {
          statusChanges.assignedServerId = dto.assignedServerId;
          statusChanges.assignedServerName = server.displayName || server.email;
        }
      } else {
        // Remove server assignment
        statusChanges.assignedServerId = undefined;
        statusChanges.assignedServerName = undefined;
      }
    }

    // Handle notes
    if (dto.notes !== undefined) {
      statusChanges.notes = dto.notes;
    }

    // Update or create table status
    if (tableStatus) {
      Object.assign(tableStatus, statusChanges);
      await tableStatus.save();
    } else {
      tableStatus = await this.tableStatusModel.create({
        restaurantId,
        tableId,
        ...statusChanges,
      });
    }

    return this.toStatusDto(tableStatus);
  }

  async getTableStatus(
    restaurantId: string,
    tableId: string
  ): Promise<TableStatusResponseDto | null> {
    const status = await this.tableStatusModel.findOne({
      restaurantId,
      tableId,
    });

    return status ? this.toStatusDto(status) : null;
  }

  async getRestaurantTableStatuses(
    restaurantId: string,
    branchId?: string
  ): Promise<TableStatusStatsDto> {
    // First get tables for the specific branch
    const tableQuery: any = { restaurantId, isActive: true };
    if (branchId) {
      tableQuery.branchId = branchId;
    }

    const tables = await this.restaurantTableModel
      .find(tableQuery)
      .select('_id');
    const tableIds = tables.map((t) => t._id);

    // Then get statuses only for those tables
    const statuses = await this.tableStatusModel.find({
      restaurantId,
      tableId: { $in: tableIds },
    });

    const stats = {
      totalTables: statuses.length,
      availableTables: 0,
      occupiedTables: 0,
      reservedTables: 0,
      cleaningTables: 0,
      averageOccupancyTime: 0,
      totalRevenue: 0,
    };

    let totalOccupancyTime = 0;
    let occupiedCount = 0;

    for (const status of statuses) {
      switch (status.status) {
        case TableStatusType.Available:
          stats.availableTables++;
          break;
        case TableStatusType.Occupied:
          stats.occupiedTables++;
          if (status.occupiedSince) {
            totalOccupancyTime += Date.now() - status.occupiedSince.getTime();
            occupiedCount++;
          }
          break;
        case TableStatusType.Reserved:
          stats.reservedTables++;
          break;
        case TableStatusType.Cleaning:
          stats.cleaningTables++;
          break;
      }

      stats.totalRevenue += status.currentBillAmount || 0;
    }

    if (occupiedCount > 0) {
      stats.averageOccupancyTime = totalOccupancyTime / occupiedCount;
    }

    return stats;
  }

  async getEnhancedTablesList(
    restaurantId: string,
    branchId?: string
  ): Promise<EnhancedRestaurantTableResponseDto[]> {
    // Get all active tables for the restaurant and branch
    const tableQuery: any = { restaurantId, isActive: true };
    if (branchId) {
      tableQuery.branchId = branchId;
    }

    const tables = await this.restaurantTableModel
      .find(tableQuery)
      .sort({ displayOrder: 1, tableNumber: 1 });

    // Get all table statuses for the restaurant
    const statuses = await this.tableStatusModel.find({ restaurantId });
    const statusMap = new Map(statuses.map((s) => [s.tableId.toString(), s]));

    // Get current bill amounts from active orders
    // CRITICAL FIX: Add branchId filter to ensure correct branch isolation
    const orderQuery: any = {
      restaurantId: new Types.ObjectId(restaurantId),
      status: {
        $in: [
          OrderStatus.Pending,
          OrderStatus.Accepted,
          OrderStatus.InProgress,
          OrderStatus.Ready,
        ],
      },
      paymentStatus: { $ne: PaymentStatus.Paid },
    };

    console.log(branchId, 'branchId in getEnhancedTablesList'); // DEBUG LOG

    if (branchId) {
      orderQuery.branchId = new Types.ObjectId(branchId);
    }

    const activeOrders = await this.orderModel.find(orderQuery);

    console.log(activeOrders.length, 'activeOrders count'); // DEBUG LOG

    const billMap = new Map<string, number>();
    activeOrders.forEach((order) => {
      if (order.tableNumber) {
        const current = billMap.get(order.tableNumber) || 0;
        billMap.set(order.tableNumber, current + order.totalAmount);
      }
    });

    // Combine tables with their status information
    const enhancedTables: EnhancedRestaurantTableResponseDto[] = [];

    for (const table of tables) {
      const tableStatus = statusMap.get(table._id.toString());
      const currentBill = billMap.get(table.tableNumber) || 0;

      // Update bill amount if different AND auto-correct status if needed
      if (tableStatus) {
        let needsUpdate = false;

        if (currentBill !== tableStatus.currentBillAmount) {
          tableStatus.currentBillAmount = currentBill;
          needsUpdate = true;
        }

        // Auto-correct status: if no active orders but table is marked as occupied
        if (currentBill === 0 && tableStatus.status === TableStatusType.Occupied) {
          console.log(`Auto-correcting table ${table.tableNumber} status from occupied to available (no active orders)`);
          tableStatus.status = TableStatusType.Available;
          tableStatus.availableSince = new Date();
          tableStatus.occupiedSince = undefined;
          tableStatus.currentPartySize = undefined;
          tableStatus.lastStatusChange = new Date();
          tableStatus.lastUpdatedByName = 'Auto-correction System';
          needsUpdate = true;
        }

        if (needsUpdate) {
          await tableStatus.save();
        }
      }

      // Get all orders for this table
      const tableOrders = activeOrders.filter(
        (order) => order.tableNumber === table.tableNumber
      );
      const firstOrder = tableOrders.length > 0 ? tableOrders[0] : undefined;

      // Calculate total bill amount for this table
      const totalBillAmount = tableOrders.reduce((total, order) => total + order.totalAmount, 0);

      enhancedTables.push({
        id: table._id.toString(),
        restaurantId: table.restaurantId.toString(),
        tableNumber: table.tableNumber,
        displayName: table.displayName,
        capacity: table.capacity,
        zone: table.zone,
        displayOrder: table.displayOrder,
        activeOrder: firstOrder ? this.mapOrderToDto(firstOrder) : undefined,
        activeOrders: tableOrders?.map(order => this.mapOrderToDto(order)) || [],
        totalBillAmount: totalBillAmount > 0 ? totalBillAmount : undefined,
        isActive: table.isActive,
        layoutX: table.layoutX,
        layoutY: table.layoutY,
        layoutWidth: table.layoutWidth,
        layoutHeight: table.layoutHeight,
        layoutRotation: table.layoutRotation,
        createdAt: table.createdAt.toISOString(),
        updatedAt: table.updatedAt.toISOString(),
        currentStatus: tableStatus ? this.toStatusDto(tableStatus) : undefined,
      });
    }

    return enhancedTables;
  }

  async initializeTableStatus(
    restaurantId: string,
    tableId: string
  ): Promise<TableStatusResponseDto> {
    const existing = await this.tableStatusModel.findOne({
      restaurantId,
      tableId,
    });

    if (existing) {
      return this.toStatusDto(existing);
    }

    const newStatus = await this.tableStatusModel.create({
      restaurantId,
      tableId,
      status: TableStatusType.Available,
      availableSince: new Date(),
      lastStatusChange: new Date(),
    });

    return this.toStatusDto(newStatus);
  }

  private toStatusDto(doc: TableStatusDocument): TableStatusResponseDto {
    const now = Date.now();
    const statusChangeTime =
      doc.lastStatusChange?.getTime() || doc.createdAt.getTime();

    let occupiedDuration: number | undefined;
    if (doc.status === TableStatusType.Occupied && doc.occupiedSince) {
      occupiedDuration = now - doc.occupiedSince.getTime();
    }

    // Calculate status color based on timing
    let statusColor: string;
    switch (doc.status) {
      case TableStatusType.Available:
        statusColor = 'green';
        break;
      case TableStatusType.Reserved:
        statusColor = 'blue';
        break;
      case TableStatusType.Cleaning:
        statusColor = 'grey';
        break;
      case TableStatusType.Occupied:
        const occupiedTime = occupiedDuration || 0;
        if (occupiedTime < 3600000) {
          // < 1 hour
          statusColor = 'yellow';
        } else if (occupiedTime < 7200000) {
          // < 2 hours
          statusColor = 'orange';
        } else {
          // > 2 hours
          statusColor = 'red';
        }
        break;
      default:
        statusColor = 'grey';
    }

    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
      tableId: doc.tableId.toString(),
      status: doc.status,
      occupiedSince: doc.occupiedSince?.toISOString(),
      availableSince: doc.availableSince?.toISOString(),
      cleaningSince: doc.cleaningSince?.toISOString(),
      reservedFrom: doc.reservedFrom?.toISOString(),
      reservedUntil: doc.reservedUntil?.toISOString(),
      assignedServerId: doc.assignedServerId?.toString(),
      assignedServerName: doc.assignedServerName,
      currentPartySize: doc.currentPartySize,
      currentBillAmount: doc.currentBillAmount,
      notes: doc.notes,
      reservationCustomerName: doc.reservationCustomerName,
      reservationCustomerPhone: doc.reservationCustomerPhone,
      lastStatusChange: doc.lastStatusChange?.toISOString(),
      lastUpdatedBy: doc.lastUpdatedBy?.toString(),
      lastUpdatedByName: doc.lastUpdatedByName,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      timeSinceLastChange: now - statusChangeTime,
      occupiedDuration,
      statusColor,
    };
  }

  /**
   * Update table status based on order events - triggered directly from order service
   */
  async updateTableStatusFromOrder(
    restaurantId: string,
    tableId: string,
    action: 'order-created' | 'order-completed' | 'order-cancelled',
    orderData?: {
      totalAmount?: number;
      createdBy?: string;
      createdByName?: string;
    }
  ): Promise<TableStatusResponseDto | null> {
    if (!tableId) {
      console.warn('Cannot update table status: tableId is missing');
      return null;
    }

    try {
      // Verify table exists
      const table = await this.restaurantTableModel
        .findOne({
          _id: new Types.ObjectId(tableId),
          restaurantId: new Types.ObjectId(restaurantId),
          isActive: true,
        })
        .lean();

      if (!table) {
        console.warn(
          `Table ${tableId} not found for restaurant ${restaurantId}`
        );
        return null;
      }

      // Get current table status
      let tableStatus = await this.tableStatusModel.findOne({
        restaurantId: new Types.ObjectId(restaurantId),
        tableId: new Types.ObjectId(tableId),
      });

      const now = new Date();

      if (action === 'order-created') {
        // When order is created, set table to occupied
        if (!tableStatus) {
          tableStatus = await this.tableStatusModel.create({
            restaurantId: new Types.ObjectId(restaurantId),
            tableId: new Types.ObjectId(tableId),
            status: TableStatusType.Occupied,
            occupiedSince: now,
            lastStatusChange: now,
            currentBillAmount: orderData?.totalAmount || 0,
            lastUpdatedBy: orderData?.createdBy,
            lastUpdatedByName: orderData?.createdByName || 'System',
          });
        } else {
          // Update existing status to occupied
          if (tableStatus.status !== TableStatusType.Occupied) {
            tableStatus.status = TableStatusType.Occupied;
            tableStatus.occupiedSince = now;
            tableStatus.availableSince = undefined;
            tableStatus.cleaningSince = undefined;
            tableStatus.lastStatusChange = now;
          }

          // Update bill amount
          if (orderData?.totalAmount) {
            tableStatus.currentBillAmount =
              (tableStatus.currentBillAmount || 0) + orderData.totalAmount;
          }

          tableStatus.lastUpdatedBy = orderData?.createdBy;
          tableStatus.lastUpdatedByName = orderData?.createdByName || 'System';
          await tableStatus.save();
        }

        console.log(
          `Table ${tableId} status updated to occupied due to new order`
        );
        const statusDto = this.toStatusDto(tableStatus);
        this.tableStatusGateway.emitTableStatusUpdated(statusDto);
        return statusDto;
      }

      if (action === 'order-completed' || action === 'order-cancelled') {
        if (!tableStatus) {
          return null; // No status to update
        }

        // Check if there are any remaining active orders for this table
        const activeOrdersQuery = {
          tableId: new Types.ObjectId(tableId),
          status: { $nin: ['completed', 'cancelled', 'refunded'] },
          paymentStatus: { $nin: ['paid', 'refunded'] },
        };

        console.log(`Checking for active orders for table ${tableId}:`, activeOrdersQuery);

        const activeOrdersCount = await this.orderModel.countDocuments(activeOrdersQuery);

        console.log(`Found ${activeOrdersCount} active orders for table ${tableId}`);

        if (activeOrdersCount === 0) {
          // No more active orders, set table to available
          tableStatus.status = TableStatusType.Available;
          tableStatus.availableSince = now;
          tableStatus.occupiedSince = undefined;
          tableStatus.currentBillAmount = 0;
          tableStatus.currentPartySize = undefined;
          tableStatus.lastStatusChange = now;
          tableStatus.lastUpdatedBy = orderData?.createdBy;
          tableStatus.lastUpdatedByName = orderData?.createdByName || 'System';
          await tableStatus.save();

          console.log(
            `Table ${tableId} status updated to available - no active orders remaining`
          );
          const statusDto = this.toStatusDto(tableStatus);
          this.tableStatusGateway.emitTableStatusUpdated(statusDto);
          return statusDto;
        } else {
          // Calculate new bill amount from remaining active orders
          const activeBillAmount = await this.orderModel.aggregate([
            {
              $match: {
                tableId: new Types.ObjectId(tableId),
                status: { $nin: ['completed', 'cancelled', 'refunded'] },
                paymentStatus: { $nin: ['paid', 'refunded'] },
              },
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$totalAmount' },
              },
            },
          ]);

          const newBillAmount =
            activeBillAmount.length > 0 ? activeBillAmount[0].totalAmount : 0;
          tableStatus.currentBillAmount = newBillAmount;
          await tableStatus.save();

          console.log(
            `Table ${tableId} bill amount updated to ${newBillAmount} - ${activeOrdersCount} active orders remaining`
          );
          const statusDto = this.toStatusDto(tableStatus);
          this.tableStatusGateway.emitTableStatusUpdated(statusDto);
          return statusDto;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error updating table status for table ${tableId}:`, error);
      return null;
    }
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
      billGeneratedAt: undefined,
      subtotal: undefined,
    };
  }

  private roundToTwo(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
