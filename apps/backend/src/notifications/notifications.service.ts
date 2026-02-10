import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
  NotificationUrgency,
  NotificationStatus
} from './schemas/notification.schema';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationQueryDto,
  NotificationResponseDto,
  BulkUpdateNotificationsDto,
  NotificationStatsDto
} from './dtos/notification.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private validateObjectId(id: string, fieldName: string = 'id'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${fieldName}: ${id}`);
    }
  }

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>
  ) {}

  async create(
    restaurantId: string,
    createDto: CreateNotificationDto
  ): Promise<NotificationResponseDto> {
    // Add comprehensive logging to track duplicate sources
    const logContext = {
      restaurantId,
      recipientId: createDto.recipientId,
      type: createDto.type,
      orderId: createDto.orderId,
      orderNumber: createDto.orderNumber,
      title: createDto.title,
      callWaiterId: createDto.callWaiterId,
      timestamp: new Date().toISOString(),
      stack: new Error().stack?.split('\n').slice(1, 6) // Get call stack
    };

    this.logger.log('🔔 NOTIFICATION CREATE ATTEMPT:', JSON.stringify(logContext, null, 2));

    try {
      const notification = await this.notificationModel.create({
        restaurantId: new Types.ObjectId(restaurantId),
        branchId: createDto.branchId ? new Types.ObjectId(createDto.branchId) : undefined,
        recipientId: new Types.ObjectId(createDto.recipientId),
        type: createDto.type,
        title: createDto.title,
        message: createDto.message,
        urgency: createDto.urgency || NotificationUrgency.NORMAL,
        orderId: createDto.orderId ? new Types.ObjectId(createDto.orderId) : undefined,
        orderNumber: createDto.orderNumber,
        tableId: createDto.tableId ? new Types.ObjectId(createDto.tableId) : undefined,
        tableNumber: createDto.tableNumber,
        callWaiterId: createDto.callWaiterId ? new Types.ObjectId(createDto.callWaiterId) : undefined,
        metadata: createDto.metadata,
        fcmSent: createDto.fcmSent || false,
        fcmSentAt: createDto.fcmSent ? new Date() : undefined,
        fcmMessageId: createDto.fcmMessageId,
        senderId: createDto.senderId ? new Types.ObjectId(createDto.senderId) : undefined,
        senderName: createDto.senderName,
      });

      this.logger.log(`✅ NOTIFICATION CREATED SUCCESSFULLY:`, {
        notificationId: notification._id,
        recipientId: createDto.recipientId,
        type: createDto.type,
        orderId: createDto.orderId,
        orderNumber: createDto.orderNumber,
        timestamp: new Date().toISOString()
      });
      return this.toResponseDto(notification);
    } catch (error) {
      // Handle duplicate key error (code 11000)
      if (error.code === 11000) {
        this.logger.warn('🚫 DUPLICATE NOTIFICATION DETECTED:', {
          ...logContext,
          error: error.message,
          keyPattern: error.keyPattern,
          keyValue: error.keyValue
        });

        // Find and return the existing notification instead
        const existingNotification = await this.notificationModel.findOne({
          restaurantId: new Types.ObjectId(restaurantId),
          recipientId: new Types.ObjectId(createDto.recipientId),
          type: createDto.type,
          ...(createDto.orderId && { orderId: new Types.ObjectId(createDto.orderId) }),
          ...(createDto.callWaiterId && { callWaiterId: new Types.ObjectId(createDto.callWaiterId) })
        });

        if (existingNotification) {
          this.logger.log('📄 RETURNING EXISTING NOTIFICATION:', {
            existingId: existingNotification._id,
            createdAt: existingNotification.createdAt
          });
          return this.toResponseDto(existingNotification);
        }
      }

      this.logger.error('Error creating notification:', error);
      throw new BadRequestException('Failed to create notification');
    }
  }

  async createBulk(
    restaurantId: string,
    recipientIds: string[],
    notificationData: Omit<CreateNotificationDto, 'recipientId'>
  ): Promise<NotificationResponseDto[]> {
    try {
      const notifications = await Promise.all(
        recipientIds.map(recipientId =>
          this.create(restaurantId, { ...notificationData, recipientId })
        )
      );

      this.logger.log(`Created ${notifications.length} bulk notifications for restaurant ${restaurantId}`);
      return notifications;
    } catch (error) {
      this.logger.error('Error creating bulk notifications:', error);
      throw new BadRequestException('Failed to create bulk notifications');
    }
  }

  async findAll(
    restaurantId: string,
    query: NotificationQueryDto,
    user: AuthenticatedUser
  ): Promise<{ notifications: NotificationResponseDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { restaurantId: new Types.ObjectId(restaurantId) };

    // For non-admin users, only show their own notifications
    if (!['super_admin', 'owner', 'manager'].includes(user.role)) {
      filter.recipientId = new Types.ObjectId(user.uid);
    } else if (query.recipientId) {
      filter.recipientId = new Types.ObjectId(query.recipientId);
    }

    if (query.branchId) {
      filter.branchId = new Types.ObjectId(query.branchId);
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.urgency) {
      filter.urgency = query.urgency;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    try {
      const [notifications, total] = await Promise.all([
        this.notificationModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.notificationModel.countDocuments(filter)
      ]);

      return {
        notifications: notifications.map(notification => this.toResponseDto(notification)),
        total,
        page,
        limit
      };
    } catch (error) {
      this.logger.error('Error fetching notifications:', error);
      throw new BadRequestException('Failed to fetch notifications');
    }
  }

  async findOne(
    restaurantId: string,
    id: string,
    user: AuthenticatedUser
  ): Promise<NotificationResponseDto> {
    try {
      this.validateObjectId(id, 'notification id');
      this.validateObjectId(restaurantId, 'restaurant id');

      const filter: any = {
        _id: new Types.ObjectId(id),
        restaurantId: new Types.ObjectId(restaurantId)
      };

      // Non-admin users can only access their own notifications
      if (!['super_admin', 'owner', 'manager'].includes(user.role)) {
        filter.recipientId = new Types.ObjectId(user.uid);
      }

      const notification = await this.notificationModel.findOne(filter).lean();

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      return this.toResponseDto(notification);
    } catch (error) {
      this.logger.error(`Error fetching notification ${id}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch notification');
    }
  }

  async update(
    restaurantId: string,
    id: string,
    updateDto: UpdateNotificationDto,
    user: AuthenticatedUser
  ): Promise<NotificationResponseDto> {
    try {
      this.validateObjectId(id, 'notification id');
      this.validateObjectId(restaurantId, 'restaurant id');

      const filter: any = {
        _id: new Types.ObjectId(id),
        restaurantId: new Types.ObjectId(restaurantId)
      };

      // Non-admin users can only update their own notifications
      if (!['super_admin', 'owner', 'manager'].includes(user.role)) {
        filter.recipientId = new Types.ObjectId(user.uid);
      }

      const updateData: any = {};

      if (updateDto.status) {
        updateData.status = updateDto.status;

        if (updateDto.status === NotificationStatus.READ) {
          updateData.readAt = updateDto.readAt ? new Date(updateDto.readAt) : new Date();
        }

        if (updateDto.status === NotificationStatus.ARCHIVED) {
          updateData.archivedAt = updateDto.archivedAt ? new Date(updateDto.archivedAt) : new Date();
        }
      }

      const notification = await this.notificationModel
        .findOneAndUpdate(filter, updateData, { new: true })
        .lean();

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      return this.toResponseDto(notification);
    } catch (error) {
      this.logger.error(`Error updating notification ${id}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to update notification');
    }
  }

  async markAsRead(
    restaurantId: string,
    id: string,
    user: AuthenticatedUser
  ): Promise<NotificationResponseDto> {
    return this.update(restaurantId, id, {
      status: NotificationStatus.READ,
      readAt: new Date().toISOString()
    }, user);
  }

  async markAllAsRead(
    restaurantId: string,
    user: AuthenticatedUser
  ): Promise<{ updated: number }> {
    try {
      this.validateObjectId(restaurantId, 'restaurant id');

      const filter: any = {
        restaurantId: new Types.ObjectId(restaurantId),
        status: NotificationStatus.UNREAD
      };

      // Non-admin users can only update their own notifications
      if (!['super_admin', 'owner', 'manager'].includes(user.role)) {
        filter.recipientId = new Types.ObjectId(user.uid);
      }

      const result = await this.notificationModel.updateMany(filter, {
        status: NotificationStatus.READ,
        readAt: new Date()
      });

      this.logger.log(`Marked ${result.modifiedCount} notifications as read for restaurant ${restaurantId}`);
      return { updated: result.modifiedCount };
    } catch (error) {
      this.logger.error('Error marking all notifications as read:', error);
      throw new BadRequestException('Failed to mark notifications as read');
    }
  }

  async bulkUpdate(
    restaurantId: string,
    bulkUpdateDto: BulkUpdateNotificationsDto,
    user: AuthenticatedUser
  ): Promise<{ updated: number }> {
    try {
      this.validateObjectId(restaurantId, 'restaurant id');

      // Validate all notification IDs
      bulkUpdateDto.notificationIds.forEach((id, index) => {
        this.validateObjectId(id, `notification id at index ${index}`);
      });

      const filter: any = {
        _id: { $in: bulkUpdateDto.notificationIds.map(id => new Types.ObjectId(id)) },
        restaurantId: new Types.ObjectId(restaurantId)
      };

      // Non-admin users can only update their own notifications
      if (!['super_admin', 'owner', 'manager'].includes(user.role)) {
        filter.recipientId = new Types.ObjectId(user.uid);
      }

      let updateData: any = {};

      switch (bulkUpdateDto.action) {
        case 'mark_read':
          updateData = { status: NotificationStatus.READ, readAt: new Date() };
          break;
        case 'mark_unread':
          updateData = { status: NotificationStatus.UNREAD, $unset: { readAt: 1 } };
          break;
        case 'archive':
          updateData = { status: NotificationStatus.ARCHIVED, archivedAt: new Date() };
          break;
        case 'unarchive':
          updateData = { status: NotificationStatus.UNREAD, $unset: { archivedAt: 1 } };
          break;
      }

      const result = await this.notificationModel.updateMany(filter, updateData);

      this.logger.log(`Bulk ${bulkUpdateDto.action}: updated ${result.modifiedCount} notifications`);
      return { updated: result.modifiedCount };
    } catch (error) {
      this.logger.error('Error performing bulk update:', error);
      throw new BadRequestException('Failed to perform bulk update');
    }
  }

  async getStats(
    restaurantId: string,
    user: AuthenticatedUser
  ): Promise<NotificationStatsDto> {
    try {
      const filter: any = { restaurantId: new Types.ObjectId(restaurantId) };

      // Non-admin users can only see their own stats
      if (!['super_admin', 'owner', 'manager'].includes(user.role)) {
        filter.recipientId = new Types.ObjectId(user.uid);
      }

      const [stats] = await this.notificationModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ['$status', NotificationStatus.UNREAD] }, 1, 0] }
            },
            read: {
              $sum: { $cond: [{ $eq: ['$status', NotificationStatus.READ] }, 1, 0] }
            },
            archived: {
              $sum: { $cond: [{ $eq: ['$status', NotificationStatus.ARCHIVED] }, 1, 0] }
            },
            urgent: {
              $sum: { $cond: [{ $eq: ['$urgency', NotificationUrgency.URGENT] }, 1, 0] }
            }
          }
        }
      ]);

      return stats || { total: 0, unread: 0, read: 0, archived: 0, urgent: 0 };
    } catch (error) {
      this.logger.error('Error fetching notification stats:', error);
      throw new BadRequestException('Failed to fetch notification stats');
    }
  }

  async deleteOld(restaurantId: string, daysOld: number = 90): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.notificationModel.deleteMany({
        restaurantId: new Types.ObjectId(restaurantId),
        createdAt: { $lt: cutoffDate },
        status: { $in: [NotificationStatus.READ, NotificationStatus.ARCHIVED] }
      });

      this.logger.log(`Deleted ${result.deletedCount} old notifications for restaurant ${restaurantId}`);
      return { deleted: result.deletedCount };
    } catch (error) {
      this.logger.error('Error deleting old notifications:', error);
      throw new BadRequestException('Failed to delete old notifications');
    }
  }

  private toResponseDto(notification: any): NotificationResponseDto {
    return {
      id: notification._id.toString(),
      restaurantId: notification.restaurantId.toString(),
      branchId: notification.branchId?.toString(),
      recipientId: notification.recipientId.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      urgency: notification.urgency,
      status: notification.status,
      orderId: notification.orderId?.toString(),
      orderNumber: notification.orderNumber,
      tableId: notification.tableId?.toString(),
      tableNumber: notification.tableNumber,
      callWaiterId: notification.callWaiterId?.toString(),
      metadata: notification.metadata,
      fcmSent: notification.fcmSent,
      fcmSentAt: notification.fcmSentAt?.toISOString(),
      fcmMessageId: notification.fcmMessageId,
      readAt: notification.readAt?.toISOString(),
      archivedAt: notification.archivedAt?.toISOString(),
      senderId: notification.senderId?.toString(),
      senderName: notification.senderName,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }
}