import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  CustomerSession,
  CustomerSessionDocument,
  SessionStatus,
  SessionClosureReason,
} from './schemas/customer-session.schema';
import {
  SessionHistory,
  SessionHistoryDocument,
  SessionAction,
} from './schemas/session-history.schema';
import {
  RestaurantTable,
  RestaurantTableDocument,
} from '../restaurant-tables/schemas/restaurant-table.schema';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { BillCalculatorService } from '../billing/services/bill-calculator.service';
import {
  CreateCustomerSessionDto,
  CustomerSessionResponseDto,
  UpdateSessionStatusDto,
  FindSessionsQueryDto,
} from './dtos/customer-session.dto';

@Injectable()
export class CustomerSessionsService {
  constructor(
    @InjectModel(CustomerSession.name)
    private readonly sessionModel: Model<CustomerSessionDocument>,
    @InjectModel(SessionHistory.name)
    private readonly historyModel: Model<SessionHistoryDocument>,
    @InjectModel(RestaurantTable.name)
    private readonly tableModel: Model<RestaurantTableDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly billCalculatorService: BillCalculatorService
  ) {}

  /**
   * Create a new customer session
   */
  /**
   * Create session by restaurant ID (for staff app)
   */
  async createSessionByRestaurantId(
    restaurantId: string,
    tableId: string,
    userAgent: string = 'Staff App',
    ipAddress: string = 'internal'
  ): Promise<CustomerSessionResponseDto> {
    // Find restaurant by ID
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant with ID '${restaurantId}' not found`
      );
    }

    // Find table
    const table = await this.tableModel.findById(tableId);
    if (!table || table.restaurantId.toString() !== restaurant._id.toString()) {
      throw new NotFoundException(
        'Table not found or does not belong to this restaurant'
      );
    }

    // Check for existing active session at this table
    const existingSession = await this.sessionModel.findOne({
      tableId: tableId,
      status: SessionStatus.ACTIVE,
    });

    if (existingSession) {
      // Extend existing session if it's close to expiry
      const now = new Date();
      const expiryBuffer = 30 * 60 * 1000; // 30 minutes

      if (existingSession.expiresAt.getTime() - now.getTime() < expiryBuffer) {
        existingSession.expiresAt = new Date(
          now.getTime() + 4 * 60 * 60 * 1000
        ); // Extend by 4 hours
        existingSession.lastActivityAt = now;
        await existingSession.save();

        await this.logSessionAction({
          sessionId: existingSession.sessionId,
          customerSessionId: existingSession._id.toString(),
          action: SessionAction.SESSION_REOPENED,
          description: 'Session extended due to staff activity',
          userAgent,
          ipAddress,
        });
      }

      return this.toResponseDto(existingSession);
    }

    // Create new session
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

    const session = await this.sessionModel.create({
      sessionId,
      restaurantId: restaurant._id.toString(),
      branchId: table.branchId,
      tableId: tableId,
      tableNumber: table.tableNumber,
      status: SessionStatus.ACTIVE,
      startedAt: now,
      expiresAt,
      userAgent,
      ipAddress,
      deviceFingerprint: 'staff-app',
      lastActivityAt: now.getTime(),
    });

    // Log session creation
    await this.logSessionAction({
      sessionId: session.sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.SESSION_CREATED,
      description: 'Customer session created by staff',
      userAgent,
      ipAddress,
    });

    return this.toResponseDto(session);
  }

  async createSession(
    dto: CreateCustomerSessionDto
  ): Promise<CustomerSessionResponseDto> {
    // Find restaurant by slug
    const restaurant = await this.restaurantModel.findOne({
      slug: dto.restaurantSlug,
    });
    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant with slug '${dto.restaurantSlug}' not found`
      );
    }

    // Find table
    const table = await this.tableModel.findById(dto.tableId);
    if (!table || table.restaurantId.toString() !== restaurant._id.toString()) {
      throw new NotFoundException(
        'Table not found or does not belong to this restaurant'
      );
    }

    // Allow multiple customer sessions per table - each customer gets their own session

    // Create new session with auto-generated customer number
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

    // Get next customer number for this table (only count active sessions due to unique constraint)
    const activeSessions = await this.sessionModel.find({
      tableId: dto.tableId,
      status: SessionStatus.ACTIVE,
    });
    const customerNumber = (activeSessions.length || 0) + 1;

    const session = await this.sessionModel.create({
      sessionId,
      restaurantId: restaurant._id.toString(),
      branchId: table.branchId,
      tableId: dto.tableId,
      tableNumber: table.tableNumber,
      customerNumber,
      status: SessionStatus.ACTIVE,
      startedAt: now,
      expiresAt,
      userAgent: dto.userAgent,
      ipAddress: dto.ipAddress,
      deviceFingerprint: dto.deviceFingerprint,
      lastActivityAt: now.getTime(),
    });

    // Log session creation
    await this.logSessionAction({
      sessionId: session.sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.SESSION_CREATED,
      description: 'Customer session created',
      userAgent: dto.userAgent,
      ipAddress: dto.ipAddress,
    });

    return this.toResponseDto(session);
  }

  /**
   * Find session by sessionId
   */
  async findBySessionId(
    sessionId: string
  ): Promise<CustomerSessionResponseDto | null> {
    console.log(`Finding session by sessionId: ${sessionId}`);
    const session = await this.sessionModel.findOne({ sessionId });
    return session ? this.toResponseDto(session) : null;
  }

  /**
   * Find active session for a table
   */
  async findActiveSessionByTable(
    tableId: string
  ): Promise<CustomerSessionResponseDto | null> {
    const session = await this.sessionModel.findOne({
      tableId: new Types.ObjectId(tableId),
      status: SessionStatus.ACTIVE,
    });
    return session ? this.toResponseDto(session) : null;
  }

  /**
   * Update session activity (keep alive)
   */
  async updateActivity(sessionId: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      {
        lastActivityAt: Date.now(),
        $setOnInsert: { expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) },
      },
      { upsert: false }
    );
  }

  /**
   * Close a session
   */
  async closeSession(
    sessionId: string,
    closureReason: SessionClosureReason,
    closedBy?: string,
    notes?: string
  ): Promise<CustomerSessionResponseDto> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status === SessionStatus.CLOSED) {
      return this.toResponseDto(session);
    }

    // Calculate final bill
    await this.billCalculatorService.updateSessionBillingTotals(sessionId);
    const updatedSession = await this.sessionModel.findOne({ sessionId });

    // Check if session has any non-cancelled orders
    const activeOrderCount = await this.orderModel.countDocuments({
      customerSessionId: sessionId,
      status: { $ne: 'cancelled' },
    });

    // If no active orders, delete the session instead of closing it
    if (activeOrderCount === 0) {
      await this.deleteSession(sessionId);
      // Return a dummy response since the session was deleted
      throw new NotFoundException(
        'Session was deleted due to no active orders'
      );
    }

    // Close the session
    updatedSession!.status = SessionStatus.CLOSED;
    updatedSession!.closedAt = new Date();
    updatedSession!.closureReason = closureReason;
    updatedSession!.closedBy = closedBy;
    updatedSession!.closureNotes = notes;

    await updatedSession!.save();

    // Log session closure
    await this.logSessionAction({
      sessionId: sessionId,
      customerSessionId: updatedSession!._id.toString(),
      action: SessionAction.SESSION_CLOSED,
      description: `Session closed: ${closureReason}`,
      actorId: closedBy,
      actorType: closedBy ? 'staff' : 'system',
      metadata: { closureReason, notes },
    });

    return this.toResponseDto(updatedSession!);
  }

  /**
   * Delete an empty session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if session has any orders
    const orderCount = await this.orderModel.countDocuments({
      customerSessionId: session.sessionId,
      status: { $ne: 'cancelled' }, // Only count non-cancelled orders
    });

    if (orderCount > 0) {
      throw new BadRequestException('Cannot delete session with active orders');
    }

    // Delete the session
    await this.sessionModel.deleteOne({ sessionId });

    // Log session deletion
    await this.logSessionAction({
      sessionId: sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.SESSION_DELETED || ('SESSION_DELETED' as any),
      description: 'Session deleted due to no active orders',
      actorType: 'staff',
      metadata: { reason: 'empty_session' },
    });
  }

  /**
   * Handle order placement in session
   */
  async onOrderPlaced(sessionId: string, orderId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    // Update session activity
    await this.updateActivity(sessionId);

    // Recalculate session totals
    await this.billCalculatorService.updateSessionBillingTotals(sessionId);

    // Log the order placement
    await this.logSessionAction({
      sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.ORDER_PLACED,
      orderId,
      description: 'New order placed in session',
    });
  }

  /**
   * Handle order payment in session
   */
  async onOrderPaid(sessionId: string, orderId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    // Recalculate session totals
    await this.billCalculatorService.updateSessionBillingTotals(sessionId);

    const updatedSession = await this.sessionModel.findOne({ sessionId });

    // Log the payment
    await this.logSessionAction({
      sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.ORDER_PAID,
      orderId,
      description: 'Order paid in session',
      sessionTotalAmount: updatedSession?.totalAmount,
      sessionOrderCount: updatedSession?.totalOrders,
    });

    // Auto-close session if all orders are paid
    if (updatedSession?.allOrdersPaid) {
      await this.closeSession(
        sessionId,
        SessionClosureReason.PAYMENT_COMPLETED
      );
    }
  }

  /**
   * Handle order cancellation in session
   */
  async onOrderCancelled(sessionId: string, orderId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    // Recalculate session totals after cancellation
    await this.billCalculatorService.updateSessionBillingTotals(sessionId);

    const updatedSession = await this.sessionModel.findOne({ sessionId });

    // Log the cancellation
    await this.logSessionAction({
      sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.ORDER_CANCELLED || ('ORDER_CANCELLED' as any),
      orderId,
      description: 'Order cancelled in session',
      sessionTotalAmount: updatedSession?.totalAmount,
      sessionOrderCount: updatedSession?.totalOrders,
    });

    // Check if session has any non-cancelled orders left
    const activeOrderCount = await this.orderModel.countDocuments({
      customerSessionId: sessionId,
      status: { $ne: 'cancelled' },
    });

    // Auto-delete session if no active orders remain
    if (activeOrderCount === 0) {
      await this.deleteSession(sessionId);
    }
  }

  /**
   * Get session with orders and bill calculation
   */
  async getSessionWithBill(sessionId: string): Promise<{
    session: CustomerSessionResponseDto;
    bill: any;
    orders: any[];
  }> {
    const session = await this.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get bill calculation with detailed category-based tax breakdown
    const bill = await this.billCalculatorService.calculateDetailedSessionBill(
      sessionId
    );

    // Get session orders
    const orders = await this.orderModel
      .find({
        customerSessionId: sessionId,
        status: { $ne: 'cancelled' },
      })
      .sort({ createdAt: -1 });

    return {
      session,
      bill,
      orders,
    };
  }

  /**
   * Find sessions with filtering
   */
  async findSessions(query: FindSessionsQueryDto): Promise<{
    sessions: CustomerSessionResponseDto[];
    total: number;
    page: number | string | undefined;
    limit: number | string | undefined;
  }> {
    const filter: FilterQuery<CustomerSessionDocument> = {};

    if (query.status) filter.status = query.status;
    if (query.restaurantId) filter.restaurantId = query.restaurantId;
    if (query.branchId) filter.branchId = query.branchId;
    if (query.tableId) filter.tableId = query.tableId;

    // Only return sessions that have orders

    if (!query.returnEmpty) filter.totalOrders = { $gt: 0 };

    if (query.startDate && query.endDate) {
      filter.createdAt = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate),
      };
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    console.log(filter, 'andi');

    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sessionModel.countDocuments(filter),
    ]);

    return {
      sessions: sessions.map((session) => this.toResponseDto(session)),
      total,
      page,
      limit,
    };
  }

  /**
   * Auto-close expired sessions (background job)
   */
  async closeExpiredSessions(): Promise<number> {
    const expiredSessions = await this.sessionModel.find({
      status: SessionStatus.ACTIVE,
      expiresAt: { $lt: new Date() },
    });

    let closedCount = 0;
    for (const session of expiredSessions) {
      await this.closeSession(
        session.sessionId,
        SessionClosureReason.AUTO_TIMEOUT
      );
      closedCount++;
    }

    return closedCount;
  }

  /**
   * Mark sessions as abandoned (no activity for long time)
   */
  async markAbandonedSessions(): Promise<number> {
    const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    const result = await this.sessionModel.updateMany(
      {
        status: SessionStatus.ACTIVE,
        lastActivityAt: { $lt: cutoffTime.getTime() },
      },
      {
        status: SessionStatus.ABANDONED,
        closedAt: new Date(),
        closureReason: SessionClosureReason.AUTO_TIMEOUT,
      }
    );

    return result.modifiedCount;
  }

  private async logSessionAction(params: {
    sessionId: string;
    customerSessionId: string;
    action: SessionAction;
    description?: string;
    orderId?: string;
    actorId?: string;
    actorType?: 'customer' | 'staff' | 'system';
    metadata?: any;
    sessionTotalAmount?: number;
    sessionOrderCount?: number;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.historyModel.create({
      sessionId: params.sessionId,
      customerSessionId: params.customerSessionId,
      action: params.action,
      description: params.description,
      orderId: params.orderId,
      actorId: params.actorId,
      actorType: params.actorType || 'customer',
      metadata: params.metadata,
      sessionTotalAmount: params.sessionTotalAmount,
      sessionOrderCount: params.sessionOrderCount,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });
  }

  private toResponseDto(
    session: CustomerSessionDocument
  ): CustomerSessionResponseDto {
    return {
      sessionId: session.sessionId,
      restaurantId: session.restaurantId,
      branchId: session.branchId,
      tableId: session.tableId,
      tableNumber: session.tableNumber,
      customerNumber: session.customerNumber,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      closedAt: session.closedAt?.toISOString(),
      closureReason: session.closureReason,
      expiresAt: session.expiresAt.toISOString(),
      closedBy: session.closedBy,
      closureNotes: session.closureNotes,
      totalOrders: session.totalOrders,
      totalAmount: session.totalAmount,
      lastActivityAt: session.lastActivityAt
        ? new Date(session.lastActivityAt).toISOString()
        : undefined,
      subTotalAmount: session.subTotalAmount,
      paidAmount: session.paidAmount,
      pendingAmount: session.pendingAmount,
      allOrdersPaid: session.allOrdersPaid,
      createdAt:
        (session as any).createdAt?.toISOString() || new Date().toISOString(),
      updatedAt:
        (session as any).updatedAt?.toISOString() || new Date().toISOString(),
    };
  }
}
