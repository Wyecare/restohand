import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TableStatus, TableStatusDocument, TableStatusType } from './schemas/table-status.schema';
import { RestaurantTable, RestaurantTableDocument } from './schemas/restaurant-table.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  UpdateTableStatusDto,
  TableStatusResponseDto,
  TableStatusStatsDto,
  EnhancedRestaurantTableResponseDto
} from './dtos/table-status.dto';

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
      isActive: true
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Get or create table status
    let tableStatus = await this.tableStatusModel.findOne({
      restaurantId,
      tableId
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
        ...statusChanges
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
      tableId
    });

    return status ? this.toStatusDto(status) : null;
  }

  async getRestaurantTableStatuses(
    restaurantId: string
  ): Promise<TableStatusStatsDto> {
    const statuses = await this.tableStatusModel.find({ restaurantId });

    const stats = {
      totalTables: statuses.length,
      availableTables: 0,
      occupiedTables: 0,
      reservedTables: 0,
      cleaningTables: 0,
      averageOccupancyTime: 0,
      totalRevenue: 0
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
    restaurantId: string
  ): Promise<EnhancedRestaurantTableResponseDto[]> {
    // Get all active tables for the restaurant
    const tables = await this.restaurantTableModel
      .find({ restaurantId, isActive: true })
      .sort({ displayOrder: 1, tableNumber: 1 });

    // Get all table statuses for the restaurant
    const statuses = await this.tableStatusModel.find({ restaurantId });
    const statusMap = new Map(statuses.map(s => [s.tableId.toString(), s]));

    // Get current bill amounts from active orders
    const activeOrders = await this.orderModel.find({
      restaurantId: new Types.ObjectId(restaurantId),
      status: { $in: [OrderStatus.Pending, OrderStatus.Accepted, OrderStatus.InProgress, OrderStatus.Ready] },
      paymentStatus: { $ne: PaymentStatus.Paid }
    });

    const billMap = new Map<string, number>();
    activeOrders.forEach(order => {
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

      // Update bill amount if different
      if (tableStatus && currentBill !== tableStatus.currentBillAmount) {
        tableStatus.currentBillAmount = currentBill;
        await tableStatus.save();
      }

      enhancedTables.push({
        id: table._id.toString(),
        restaurantId: table.restaurantId.toString(),
        tableNumber: table.tableNumber,
        displayName: table.displayName,
        capacity: table.capacity,
        zone: table.zone,
        displayOrder: table.displayOrder,
        isActive: table.isActive,
        layoutX: table.layoutX,
        layoutY: table.layoutY,
        layoutWidth: table.layoutWidth,
        layoutHeight: table.layoutHeight,
        layoutRotation: table.layoutRotation,
        createdAt: table.createdAt.toISOString(),
        updatedAt: table.updatedAt.toISOString(),
        currentStatus: tableStatus ? this.toStatusDto(tableStatus) : undefined
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
      tableId
    });

    if (existing) {
      return this.toStatusDto(existing);
    }

    const newStatus = await this.tableStatusModel.create({
      restaurantId,
      tableId,
      status: TableStatusType.Available,
      availableSince: new Date(),
      lastStatusChange: new Date()
    });

    return this.toStatusDto(newStatus);
  }

  private toStatusDto(doc: TableStatusDocument): TableStatusResponseDto {
    const now = Date.now();
    const statusChangeTime = doc.lastStatusChange?.getTime() || doc.createdAt.getTime();

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
        if (occupiedTime < 3600000) { // < 1 hour
          statusColor = 'yellow';
        } else if (occupiedTime < 7200000) { // < 2 hours
          statusColor = 'orange';
        } else { // > 2 hours
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
      statusColor
    };
  }
}