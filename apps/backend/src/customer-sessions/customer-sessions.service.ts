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
  FindSessionsQueryDto,
  GhostSessionResponseDto,
} from './dtos/customer-session.dto';

export interface FindOrCreateSessionParams {
  restaurantId: string;
  tableId: string;
  source?: 'staff' | 'customer';
  userAgent?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
}

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
   * Find an existing active session for a table, or create a new one.
   * This is the single entry point for session creation used internally
   * (called by orders service when creating an order for a table).
   */
  async findOrCreateForTable(
    params: FindOrCreateSessionParams
  ): Promise<CustomerSessionDocument> {
    const { restaurantId, tableId, source = 'staff', userAgent, ipAddress, deviceFingerprint } = params;

    const table = await this.tableModel.findById(tableId).lean();
    if (!table || table.restaurantId.toString() !== restaurantId) {
      throw new NotFoundException(
        'Table not found or does not belong to this restaurant'
      );
    }

    // Return existing active session if present, extending expiry if needed
    const existing = await this.sessionModel.findOne({
      tableId,
      status: SessionStatus.ACTIVE,
    });

    if (existing) {
      const now = new Date();
      const thirtyMinutes = 30 * 60 * 1000;
      if (existing.expiresAt.getTime() - now.getTime() < thirtyMinutes) {
        existing.expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        existing.lastActivityAt = now.getTime();
        await existing.save();
      }
      return existing;
    }

    // Create a fresh session
    const now = new Date();
    const session = await this.sessionModel.create({
      sessionId: uuidv4(),
      restaurantId,
      branchId: table.branchId,
      tableId,
      tableNumber: table.tableNumber,
      customerNumber: 1,
      status: SessionStatus.ACTIVE,
      startedAt: now,
      expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      deviceFingerprint: deviceFingerprint ?? `${source}-app`,
      userAgent,
      ipAddress,
      lastActivityAt: now.getTime(),
    });

    await this.logSessionAction({
      sessionId: session.sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.SESSION_CREATED,
      description: `Session created via ${source}`,
      actorType: source === 'staff' ? 'staff' : 'customer',
      userAgent,
      ipAddress,
    });

    return session;
  }

  /**
   * Public QR-flow session creation (customer scans table QR).
   * Uses findOrCreateForTable internally so multiple QR scans don't create ghost sessions.
   */
  async createSession(
    dto: CreateCustomerSessionDto
  ): Promise<CustomerSessionResponseDto> {
    const restaurant = await this.restaurantModel
      .findOne({ slug: dto.restaurantSlug })
      .lean();

    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant with slug '${dto.restaurantSlug}' not found`
      );
    }

    const session = await this.findOrCreateForTable({
      restaurantId: restaurant._id.toString(),
      tableId: dto.tableId,
      source: 'customer',
      userAgent: dto.userAgent,
      ipAddress: dto.ipAddress,
      deviceFingerprint: dto.deviceFingerprint,
    });

    return this.toResponseDto(session);
  }

  /**
   * Find session by sessionId (UUID).
   */
  async findBySessionId(
    sessionId: string
  ): Promise<CustomerSessionResponseDto | null> {
    const session = await this.sessionModel.findOne({ sessionId });
    return session ? this.toResponseDto(session) : null;
  }

  /**
   * Find the active session for a table (returns null if none).
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
   * Extend session activity timestamp (keep-alive from customer app).
   */
  async updateActivity(sessionId: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      { lastActivityAt: Date.now() },
      { upsert: false }
    );
  }

  /**
   * Close a session manually (staff or system).
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

    // Recalculate totals before closing
    await this.billCalculatorService.updateSessionBillingTotals(sessionId);
    const updatedSession = await this.sessionModel.findOne({ sessionId });

    // Delete instead of closing if no non-cancelled orders exist
    const activeOrderCount = await this.orderModel.countDocuments({
      customerSessionId: sessionId,
      status: { $ne: 'cancelled' },
    });

    if (activeOrderCount === 0) {
      await this.sessionModel.deleteOne({ sessionId });
      throw new NotFoundException(
        'Session deleted — no active orders were found'
      );
    }

    updatedSession!.status = SessionStatus.CLOSED;
    updatedSession!.closedAt = new Date();
    updatedSession!.closureReason = closureReason;
    updatedSession!.closedBy = closedBy;
    updatedSession!.closureNotes = notes;
    await updatedSession!.save();

    await this.logSessionAction({
      sessionId,
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
   * Delete an empty session (no non-cancelled orders).
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const orderCount = await this.orderModel.countDocuments({
      customerSessionId: session.sessionId,
      status: { $ne: 'cancelled' },
    });

    if (orderCount > 0) {
      throw new BadRequestException('Cannot delete a session with active orders');
    }

    await this.sessionModel.deleteOne({ sessionId });

    await this.logSessionAction({
      sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.SESSION_DELETED as any,
      description: 'Session deleted — no active orders',
      actorType: 'staff',
      metadata: { reason: 'empty_session' },
    });
  }

  // ─── Session event hooks (called directly by OrdersService) ──────────────

  async onOrderPlaced(sessionId: string, orderId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    await this.updateActivity(sessionId);
    await this.billCalculatorService.updateSessionBillingTotals(sessionId);

    await this.logSessionAction({
      sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.ORDER_PLACED,
      orderId,
      description: 'New order placed in session',
    });
  }

  async onOrderPaid(sessionId: string, orderId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    await this.billCalculatorService.updateSessionBillingTotals(sessionId);
    const updated = await this.sessionModel.findOne({ sessionId });

    await this.logSessionAction({
      sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.ORDER_PAID,
      orderId,
      description: 'Order paid in session',
      sessionTotalAmount: updated?.totalAmount,
      sessionOrderCount: updated?.totalOrders,
    });

    if (updated?.allOrdersPaid) {
      await this.closeSession(sessionId, SessionClosureReason.PAYMENT_COMPLETED);
    }
  }

  async onOrderCancelled(sessionId: string, orderId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    await this.billCalculatorService.updateSessionBillingTotals(sessionId);
    const updated = await this.sessionModel.findOne({ sessionId });

    await this.logSessionAction({
      sessionId,
      customerSessionId: session._id.toString(),
      action: SessionAction.ORDER_CANCELLED as any,
      orderId,
      description: 'Order cancelled in session',
      sessionTotalAmount: updated?.totalAmount,
      sessionOrderCount: updated?.totalOrders,
    });

    const activeOrderCount = await this.orderModel.countDocuments({
      customerSessionId: sessionId,
      status: { $ne: 'cancelled' },
    });

    if (activeOrderCount === 0) {
      await this.sessionModel.deleteOne({ sessionId });
    }
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getSessionWithBill(sessionId: string): Promise<{
    session: CustomerSessionResponseDto;
    bill: any;
    orders: any[];
  }> {
    const session = await this.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const bill = await this.billCalculatorService.calculateDetailedSessionBill(sessionId);

    const orders = await this.orderModel
      .find({ customerSessionId: sessionId, status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 });

    return { session, bill, orders };
  }

  async findSessions(query: FindSessionsQueryDto): Promise<{
    sessions: CustomerSessionResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: FilterQuery<CustomerSessionDocument> = {};

    if (query.status) filter.status = query.status;
    if (query.restaurantId) filter.restaurantId = query.restaurantId;
    if (query.branchId) filter.branchId = query.branchId;
    if (query.tableId) filter.tableId = query.tableId;
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

    const [sessions, total] = await Promise.all([
      this.sessionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.sessionModel.countDocuments(filter),
    ]);

    return {
      sessions: sessions.map((s) => this.toResponseDto(s)),
      total,
      page,
      limit,
    };
  }

  /**
   * List ghost sessions: active sessions with no non-cancelled orders.
   */
  async listGhostSessions(
    restaurantId: string,
    branchId?: string
  ): Promise<GhostSessionResponseDto[]> {
    const filter: FilterQuery<CustomerSessionDocument> = {
      restaurantId,
      status: SessionStatus.ACTIVE,
      totalOrders: { $lte: 0 },
    };
    if (branchId) filter.branchId = branchId;

    const sessions = await this.sessionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return sessions.map((s) => ({
      sessionId: s.sessionId,
      tableId: s.tableId,
      tableNumber: s.tableNumber,
      createdAt: (s as any).createdAt?.toISOString() ?? new Date().toISOString(),
      lastActivityAt: s.lastActivityAt
        ? new Date(s.lastActivityAt).toISOString()
        : undefined,
    }));
  }

  /**
   * Delete all ghost sessions for a restaurant/branch.
   * Returns the number of deleted sessions.
   */
  async cleanupGhostSessions(
    restaurantId: string,
    branchId?: string
  ): Promise<number> {
    const filter: FilterQuery<CustomerSessionDocument> = {
      restaurantId,
      status: SessionStatus.ACTIVE,
      totalOrders: { $lte: 0 },
    };
    if (branchId) filter.branchId = branchId;

    const result = await this.sessionModel.deleteMany(filter);
    return result.deletedCount;
  }

  // ─── Maintenance ──────────────────────────────────────────────────────────

  async closeExpiredSessions(): Promise<number> {
    const expired = await this.sessionModel.find({
      status: SessionStatus.ACTIVE,
      expiresAt: { $lt: new Date() },
    });

    let closedCount = 0;
    for (const session of expired) {
      try {
        await this.closeSession(session.sessionId, SessionClosureReason.AUTO_TIMEOUT);
        closedCount++;
      } catch {
        // session may have been deleted (no orders) — that's fine
      }
    }
    return closedCount;
  }

  async markAbandonedSessions(): Promise<number> {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await this.sessionModel.updateMany(
      {
        status: SessionStatus.ACTIVE,
        lastActivityAt: { $lt: cutoff.getTime() },
      },
      {
        status: SessionStatus.ABANDONED,
        closedAt: new Date(),
        closureReason: SessionClosureReason.AUTO_TIMEOUT,
      }
    );
    return result.modifiedCount;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

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
      actorType: params.actorType ?? 'customer',
      metadata: params.metadata,
      sessionTotalAmount: params.sessionTotalAmount,
      sessionOrderCount: params.sessionOrderCount,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });
  }

  private toResponseDto(session: CustomerSessionDocument): CustomerSessionResponseDto {
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
      createdAt: (session as any).createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: (session as any).updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
