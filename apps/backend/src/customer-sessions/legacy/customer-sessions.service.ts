import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CustomerSession, CustomerSessionDocument } from './customer-session.schema';
import { SessionHistory, SessionHistoryDocument } from './session-history.schema';

@Injectable()
export class CustomerSessionsService {
  private readonly logger = new Logger(CustomerSessionsService.name);

  constructor(
    @InjectModel(CustomerSession.name)
    private customerSessionModel: Model<CustomerSessionDocument>,
    @InjectModel(SessionHistory.name)
    private sessionHistoryModel: Model<SessionHistoryDocument>,
  ) {}

  /**
   * Create a new customer session when QR is scanned
   */
  async createSession(
    restaurantId: string,
    tableId: string,
    tableNumber: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<CustomerSessionDocument> {
    const sessionId = uuidv4();

    // Check for existing active sessions for this table
    await this.expireOldSessionsForTable(restaurantId, tableId);

    const session = new this.customerSessionModel({
      sessionId,
      restaurantId: new Types.ObjectId(restaurantId),
      tableId: new Types.ObjectId(tableId),
      tableNumber,
      userAgent,
      ipAddress,
      status: 'active',
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    });

    const savedSession = await session.save();
    this.logger.log(`Created customer session ${sessionId} for table ${tableNumber}`);

    return savedSession;
  }

  /**
   * Get session by sessionId
   */
  async getSession(sessionId: string): Promise<CustomerSessionDocument | null> {
    const session = await this.customerSessionModel
      .findOne({
        sessionId,
        status: 'active',
        expiresAt: { $gt: new Date() }
      })
      .populate('restaurantId', 'name slug')
      .populate('tableId', 'tableNumber displayName')
      .lean();

    if (session) {
      // Update last activity
      await this.updateLastActivity(sessionId);
    }

    return session;
  }

  /**
   * Update customer details in session
   */
  async updateCustomerInfo(
    sessionId: string,
    customerName?: string,
    customerPhone?: string
  ): Promise<CustomerSessionDocument | null> {
    const updated = await this.customerSessionModel.findOneAndUpdate(
      { sessionId, status: 'active' },
      {
        ...(customerName && { customerName }),
        ...(customerPhone && { customerPhone }),
        lastActivity: new Date(),
      },
      { new: true }
    );

    if (updated) {
      this.logger.log(`Updated customer info for session ${sessionId}`);
    }

    return updated;
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    await this.customerSessionModel.updateOne(
      { sessionId, status: 'active' },
      {
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // Extend expiry
      }
    );
  }

  /**
   * Complete a session (when customer leaves/pays)
   */
  async completeSession(sessionId: string): Promise<void> {
    await this.customerSessionModel.updateOne(
      { sessionId },
      { status: 'completed', lastActivity: new Date() }
    );

    this.logger.log(`Completed session ${sessionId}`);
  }

  /**
   * Get all active sessions for a table
   */
  async getActiveSessionsForTable(
    restaurantId: string,
    tableId: string
  ): Promise<CustomerSessionDocument[]> {
    return this.customerSessionModel
      .find({
        restaurantId: new Types.ObjectId(restaurantId),
        tableId: new Types.ObjectId(tableId),
        status: 'active',
        expiresAt: { $gt: new Date() }
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Expire old sessions for a table (when new customer scans QR)
   */
  private async expireOldSessionsForTable(
    restaurantId: string,
    tableId: string
  ): Promise<void> {
    const result = await this.customerSessionModel.updateMany(
      {
        restaurantId: new Types.ObjectId(restaurantId),
        tableId: new Types.ObjectId(tableId),
        status: 'active',
      },
      {
        status: 'expired',
        lastActivity: new Date()
      }
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Expired ${result.modifiedCount} old sessions for table ${tableId}`);
    }
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<void> {
    const result = await this.customerSessionModel.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: new Date() }
      },
      { status: 'expired' }
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Cleaned up ${result.modifiedCount} expired sessions`);
    }
  }

  /**
   * Get session statistics for analytics
   */
  async getSessionStats(restaurantId: string, days = 7): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.customerSessionModel.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    return stats;
  }

  /**
   * Archive a session to history when payment is completed
   */
  async archiveSession(sessionId: string, orderIds: string[] = [], totalAmount?: number, paymentStatus?: string): Promise<SessionHistoryDocument | null> {
    const session = await this.customerSessionModel.findOne({ sessionId });

    if (!session) {
      this.logger.warn(`Session ${sessionId} not found for archival`);
      return null;
    }

    // Create history record
    const historyRecord = new this.sessionHistoryModel({
      originalSessionId: session.sessionId,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      tableNumber: session.tableNumber,
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      sessionStartedAt: session.createdAt,
      sessionCompletedAt: new Date(),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      orderIds: orderIds.map(id => new Types.ObjectId(id)),
      totalAmount,
      paymentStatus
    });

    const savedHistory = await historyRecord.save();

    // Mark original session as archived
    await this.customerSessionModel.updateOne(
      { sessionId },
      {
        status: 'archived',
        lastActivity: new Date()
      }
    );

    this.logger.log(`Archived session ${sessionId} to history with ${orderIds.length} orders`);
    return savedHistory;
  }

  /**
   * Find session in history by original session ID
   */
  async findSessionInHistory(originalSessionId: string): Promise<SessionHistoryDocument | null> {
    return this.sessionHistoryModel.findOne({ originalSessionId }).lean();
  }

  /**
   * Find session in both active and history by session ID
   */
  async findSessionAnywhere(sessionId: string): Promise<{ session: CustomerSessionDocument | SessionHistoryDocument | null, isHistory: boolean }> {
    // First check active sessions
    const activeSession = await this.customerSessionModel.findOne({ sessionId }).lean();
    if (activeSession) {
      return { session: activeSession, isHistory: false };
    }

    // Then check history
    const historySession = await this.sessionHistoryModel.findOne({ originalSessionId: sessionId }).lean();
    if (historySession) {
      return { session: historySession, isHistory: true };
    }

    return { session: null, isHistory: false };
  }
}