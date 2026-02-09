import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomerSession, CustomerSessionDocument } from '../customer-sessions/customer-session.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { ListActiveSessionsDto } from './dtos/list-active-sessions.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { PrintReceiptDto } from './dtos/print-receipt.dto';
import { BulkUpdateOrderStatusDto } from './dtos/bulk-update-order-status.dto';
import { TableSessionStatus } from './dtos/update-session-status.dto';

export interface TableSession {
  id: string;
  tableNumber: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'ready' | 'completed' | 'paid';
  orders: SessionOrder[];
  totals: {
    orderCount: number;
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
    subTotalAmount: number;
    taxAmount: number;
    discountAmount?: number;
  };
  customer: {
    customerSessionId?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  estimatedCompletion?: string;
  lastActivity: string;
  paymentStatus: 'pending' | 'partial' | 'paid';
  tableId?: string;
  branchId?: string;
}

export interface SessionOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  totalAmount: number;
  subTotalAmount: number;
  taxAmount: number;
  items: SessionOrderItem[];
  progress: number;
  estimatedTime?: number;
  notes?: string;
  customerSessionId?: string;
}

export interface SessionOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  selectedModifiers?: Array<{
    modifierName: string;
    selectedOptions: Array<{
      optionName: string;
      priceAdjustment: number;
    }>;
  }>;
  notes?: string;
  activePriceTagId?: string;
  menuItemId: string;
}

@Injectable()
export class RestaurantSessionsService {
  private readonly logger = new Logger(RestaurantSessionsService.name);

  constructor(
    @InjectModel(CustomerSession.name)
    private customerSessionModel: Model<CustomerSessionDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async listActiveSessions(
    restaurantId: string,
    query: ListActiveSessionsDto,
  ) {
    const { status, search, branchId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Build match conditions for customer sessions
    const sessionMatch: any = {
      restaurantId: new Types.ObjectId(restaurantId),
      status: 'active',
      expiresAt: { $gt: new Date() },
    };

    if (search) {
      sessionMatch.$or = [
        { tableNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    // Get active customer sessions
    const sessions = await this.customerSessionModel
      .find(sessionMatch)
      .populate('tableId', 'tableNumber displayName branchId')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.customerSessionModel.countDocuments(sessionMatch);

    // Get orders for each session and aggregate data
    const tableSessions: TableSession[] = [];

    for (const session of sessions) {
      const orders = await this.orderModel
        .find({
          customerSessionId: session.sessionId,
          restaurantId: new Types.ObjectId(restaurantId),
        })
        .sort({ createdAt: -1 })
        .lean();

      const tableSession = await this.buildTableSession(session, orders);

      // Apply status filter if provided
      if (!status || tableSession.status === status) {
        tableSessions.push(tableSession);
      }
    }

    // Calculate stats
    const stats = {
      activeCount: tableSessions.filter(s => s.status === 'active').length,
      readyCount: tableSessions.filter(s => s.status === 'ready').length,
      completedCount: tableSessions.filter(s => s.status === 'completed').length,
      totalRevenue: tableSessions.reduce((sum, s) => sum + s.totals.totalAmount, 0),
    };

    return {
      sessions: tableSessions,
      total: tableSessions.length,
      stats,
    };
  }

  async getSessionDetails(restaurantId: string, sessionId: string): Promise<TableSession> {
    const session = await this.customerSessionModel
      .findOne({
        sessionId,
        restaurantId: new Types.ObjectId(restaurantId),
      })
      .populate('tableId', 'tableNumber displayName branchId')
      .lean();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const orders = await this.orderModel
      .find({
        customerSessionId: sessionId,
        restaurantId: new Types.ObjectId(restaurantId),
      })
      .sort({ createdAt: -1 })
      .lean();

    return this.buildTableSession(session, orders);
  }

  async updateSessionStatus(
    restaurantId: string,
    sessionId: string,
    status: TableSessionStatus,
  ): Promise<TableSession> {
    const session = await this.customerSessionModel.findOne({
      sessionId,
      restaurantId: new Types.ObjectId(restaurantId),
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Update session status logic
    if (status === TableSessionStatus.COMPLETED) {
      session.status = 'completed';
    } else if (status === TableSessionStatus.PAID) {
      session.status = 'completed';
      // Mark all orders as paid
      await this.orderModel.updateMany(
        { customerSessionId: sessionId },
        { paymentStatus: 'paid' },
      );
    }

    await session.save();
    this.logger.log(`Session ${sessionId} status updated to ${status}`);

    return this.getSessionDetails(restaurantId, sessionId);
  }

  async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    updateDto: UpdateOrderStatusDto,
  ): Promise<SessionOrder> {
    const order = await this.orderModel.findOne({
      _id: orderId,
      restaurantId: new Types.ObjectId(restaurantId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Map our enum to order status
    const statusMapping: any = {
      pending: 'pending',
      confirmed: 'confirmed',
      preparing: 'preparing',
      ready: 'ready',
      served: 'served',
      cancelled: 'cancelled',
    };

    if (updateDto.status && statusMapping[updateDto.status]) {
      order.status = statusMapping[updateDto.status];
    }

    if (updateDto.progress !== undefined) {
      order.progress = updateDto.progress;
    }

    await order.save();
    this.logger.log(`Order ${orderId} status updated to ${updateDto.status}`);

    return this.buildSessionOrder(order);
  }

  async bulkUpdateOrderStatus(
    restaurantId: string,
    bulkUpdateDto: BulkUpdateOrderStatusDto,
  ) {
    const { orderIds, status, estimatedTime } = bulkUpdateDto;

    const updateData: any = {};
    if (status) {
      const statusMapping: any = {
        pending: 'pending',
        confirmed: 'confirmed',
        preparing: 'preparing',
        ready: 'ready',
        served: 'served',
        cancelled: 'cancelled',
      };
      updateData.status = statusMapping[status];
    }

    if (estimatedTime !== undefined) {
      updateData.estimatedTime = estimatedTime;
    }

    const result = await this.orderModel.updateMany(
      {
        _id: { $in: orderIds.map(id => new Types.ObjectId(id)) },
        restaurantId: new Types.ObjectId(restaurantId),
      },
      updateData,
    );

    this.logger.log(`Bulk updated ${result.modifiedCount} orders to status ${status}`);

    return {
      success: true,
      updated: result.modifiedCount,
    };
  }

  async printSessionReceipt(
    restaurantId: string,
    sessionId: string,
    printDto: PrintReceiptDto,
  ) {
    const session = await this.getSessionDetails(restaurantId, sessionId);

    // Implementation would integrate with printing service
    // For now, returning mock response
    return {
      success: true,
      message: `${printDto.type} receipt printed successfully`,
      receiptData: {
        receiptNumber: `REC-${Date.now()}`,
        printData: session,
      },
    };
  }

  async printKitchenTicket(
    restaurantId: string,
    sessionId: string,
    printDto: PrintReceiptDto,
  ) {
    const session = await this.getSessionDetails(restaurantId, sessionId);

    // Implementation would integrate with kitchen printer
    return {
      success: true,
      message: 'Kitchen ticket printed successfully',
      receiptData: {
        receiptNumber: `KIT-${Date.now()}`,
        printData: session,
      },
    };
  }

  async markSessionComplete(
    restaurantId: string,
    sessionId: string,
    notes?: string,
  ): Promise<TableSession> {
    const session = await this.customerSessionModel.findOne({
      sessionId,
      restaurantId: new Types.ObjectId(restaurantId),
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.status = 'completed';
    await session.save();

    this.logger.log(`Session ${sessionId} marked as complete`);
    return this.getSessionDetails(restaurantId, sessionId);
  }

  async getSessionBill(restaurantId: string, sessionId: string) {
    return this.getSessionDetails(restaurantId, sessionId);
  }

  async downloadSessionReceipt(
    restaurantId: string,
    sessionId: string,
    type: string,
  ) {
    // Implementation would generate PDF and return blob
    // For now, returning mock response
    return {
      success: true,
      message: `${type} receipt generated`,
      downloadUrl: `/receipts/${sessionId}-${type}.pdf`,
    };
  }

  async getSessionStats(restaurantId: string, date?: string) {
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Today's stats
    const todaySession = await this.customerSessionModel.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenue calculation would need to join with orders
    const todayRevenue = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    // Weekly stats
    const weeklyStats = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          createdAt: { $gte: weekAgo },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalSessions: { $addToSet: '$customerSessionId' },
        },
      },
    ]);

    const todayData = todayRevenue[0] || { totalRevenue: 0, totalOrders: 0 };
    const weeklyData = weeklyStats[0] || { totalRevenue: 0, totalSessions: [] };

    return {
      todayStats: {
        totalSessions: todaySession.reduce((sum, s) => sum + s.count, 0),
        activeSessions: todaySession.find(s => s._id === 'active')?.count || 0,
        completedSessions: todaySession.find(s => s._id === 'completed')?.count || 0,
        totalRevenue: todayData.totalRevenue,
        averageOrderValue: todayData.totalOrders > 0 ? todayData.totalRevenue / todayData.totalOrders : 0,
      },
      weeklyStats: {
        totalSessions: weeklyData.totalSessions.length,
        totalRevenue: weeklyData.totalRevenue,
      },
    };
  }

  async getSessionOrders(restaurantId: string, sessionId: string): Promise<SessionOrder[]> {
    const orders = await this.orderModel
      .find({
        customerSessionId: sessionId,
        restaurantId: new Types.ObjectId(restaurantId),
      })
      .sort({ createdAt: -1 })
      .lean();

    return orders.map(order => this.buildSessionOrder(order));
  }

  // Helper methods
  private async buildTableSession(
    session: any,
    orders: any[],
  ): Promise<TableSession> {
    const sessionOrders = orders.map(order => this.buildSessionOrder(order));

    // Calculate totals
    const totals = sessionOrders.reduce(
      (acc, order) => ({
        orderCount: acc.orderCount + 1,
        totalAmount: acc.totalAmount + order.totalAmount,
        pendingAmount: acc.pendingAmount + (order.paymentStatus === 'pending' ? order.totalAmount : 0),
        paidAmount: acc.paidAmount + (order.paymentStatus === 'paid' ? order.totalAmount : 0),
        subTotalAmount: acc.subTotalAmount + order.subTotalAmount,
        taxAmount: acc.taxAmount + order.taxAmount,
        discountAmount: acc.discountAmount || 0,
      }),
      {
        orderCount: 0,
        totalAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
        subTotalAmount: 0,
        taxAmount: 0,
        discountAmount: 0,
      },
    );

    // Determine session status based on order statuses
    let sessionStatus: 'active' | 'ready' | 'completed' | 'paid' = 'active';

    if (session.status === 'completed') {
      sessionStatus = totals.paidAmount >= totals.totalAmount ? 'paid' : 'completed';
    } else if (sessionOrders.every(o => ['ready', 'served'].includes(o.status))) {
      sessionStatus = 'ready';
    }

    // Calculate payment status
    let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (totals.paidAmount >= totals.totalAmount && totals.totalAmount > 0) {
      paymentStatus = 'paid';
    } else if (totals.paidAmount > 0) {
      paymentStatus = 'partial';
    }

    return {
      id: session.sessionId,
      tableNumber: session.tableNumber || session.tableId?.tableNumber || 'Unknown',
      startTime: session.createdAt.toISOString(),
      endTime: session.status === 'completed' ? session.updatedAt?.toISOString() : undefined,
      status: sessionStatus,
      orders: sessionOrders,
      totals,
      customer: {
        customerSessionId: session.sessionId,
        name: session.customerName,
        phone: session.customerPhone,
        email: undefined, // Not available in customer session
      },
      estimatedCompletion: undefined, // Calculate based on order estimates
      lastActivity: session.lastActivity.toISOString(),
      paymentStatus,
      tableId: session.tableId?._id?.toString(),
      branchId: session.tableId?.branchId?.toString(),
    };
  }

  private buildSessionOrder(order: any): SessionOrder {
    const items: SessionOrderItem[] = order.items?.map((item: any) => ({
      id: item._id?.toString() || Math.random().toString(),
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.pricing?.unitAmount || 0,
      lineTotal: (item.pricing?.unitAmount || 0) * item.quantity,
      status: 'pending', // Default status for items
      selectedModifiers: item.selectedModifiers?.map((mod: any) => ({
        modifierName: mod.modifierName,
        selectedOptions: mod.selectedOptions?.map((opt: any) => ({
          optionName: opt.optionName,
          priceAdjustment: opt.priceAdjustment,
        })) || [],
      })) || [],
      notes: item.notes,
      activePriceTagId: item.activePriceTagId,
      menuItemId: item.menuItemId,
    })) || [];

    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      status: order.status || 'pending',
      paymentStatus: order.paymentStatus || 'pending',
      totalAmount: order.totalAmount || 0,
      subTotalAmount: order.subTotalAmount || 0,
      taxAmount: order.taxAmount || 0,
      items,
      progress: order.progress || 0,
      estimatedTime: order.estimatedTime,
      notes: order.notes,
      customerSessionId: order.customerSessionId,
    };
  }
}