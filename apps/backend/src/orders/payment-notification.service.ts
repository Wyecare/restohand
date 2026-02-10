import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { FCMNotificationService } from '../call-waiter/fcm-notification.service';
import { UserRole } from '../common/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationUrgency } from '../notifications/schemas/notification.schema';

export interface PaymentNotificationPayload {
  title: string;
  body: string;
  orderId: string;
  orderNumber: string;
  tableId?: string;
  tableLabel?: string;
  amount: number;
  paymentMethod: string;
  restaurantId: string;
  staffMemberName?: string;
  customerName?: string;
}

@Injectable()
export class PaymentNotificationService {
  private readonly logger = new Logger(PaymentNotificationService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private fcmService: FCMNotificationService,
    private notificationsService: NotificationsService
  ) {}

  async sendPaymentConfirmationNotification(
    restaurantId: string,
    orderId: string,
    orderNumber: string,
    amount: number,
    paymentMethod: string,
    options: {
      tableId?: string;
      tableNumber?: string;
      staffMemberName?: string;
      customerName?: string;
      branchId?: string;
      isCustomerPayment?: boolean;
    } = {}
  ): Promise<void> {
    const callId = `PAYMENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log('🎯 PAYMENT CONFIRMATION NOTIFICATION ENTRY POINT:', {
      callId,
      restaurantId,
      orderId,
      orderNumber,
      amount,
      paymentMethod,
      options,
      timestamp: new Date().toISOString(),
      stack: new Error().stack?.split('\n').slice(1, 8) // Get more call stack to see where this is called from
    });

    try {
      // Find managers and owners for the restaurant with FCM tokens
      const notificationTargets = await this.findNotificationTargets(restaurantId, options.branchId);

      // For customer payments, also find waiters assigned to the table
      let waiterTargets: Array<{ userId: string; name: string; fcmToken: string; roles: UserRole[] }> = [];
      if (options.isCustomerPayment && options.tableId) {
        waiterTargets = await this.findWaitersForTable(restaurantId, options.tableId, options.branchId);
      }

      // Combine all targets
      const allTargets = [...notificationTargets, ...waiterTargets];

      if (allTargets.length === 0) {
        this.logger.warn(`No staff with FCM tokens found for restaurant ${restaurantId}`);
        return;
      }

      const tableLabel = options.tableNumber || options.tableId || 'N/A';

      // Create notification payload
      const payload = this.createPaymentNotificationPayload(
        orderId,
        orderNumber,
        amount,
        paymentMethod,
        restaurantId,
        tableLabel,
        {
          staffMemberName: options.staffMemberName,
          customerName: options.customerName,
          tableId: options.tableId,
          isCustomerPayment: options.isCustomerPayment,
        }
      );

      // Send notifications to all targets
      const notificationPromises = allTargets.map(target =>
        this.sendPaymentNotification(target.fcmToken, payload)
      );

      const results = await Promise.allSettled(notificationPromises);

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failureCount = results.length - successCount;

      // Create database notifications for each recipient
      this.logger.log('🗄️ CALLING DATABASE NOTIFICATIONS:', {
        callId,
        restaurantId,
        targetsCount: allTargets.length,
        branchId: options.branchId,
        orderId,
        orderNumber,
        timestamp: new Date().toISOString()
      });

      await this.createDatabaseNotifications(
        restaurantId,
        allTargets,
        payload,
        options.branchId
      );

      this.logger.log(
        `Payment notification sent for order ${orderNumber}. ` +
        `Managers/Owners: ${notificationTargets.length}, Waiters: ${waiterTargets.length}, ` +
        `Success: ${successCount}, Failed: ${failureCount}, Total: ${results.length}`
      );

    } catch (error) {
      this.logger.error(`Failed to send payment notification for order ${orderNumber}:`, error);
    }
  }

  private async findNotificationTargets(
    restaurantId: string,
    branchId?: string
  ): Promise<Array<{ userId: string; name: string; fcmToken: string; roles: UserRole[] }>> {
    const query: any = {
      restaurantId,
      roles: { $in: [UserRole.Manager, UserRole.Owner] },
      fcmToken: { $exists: true, $ne: null, $ne: '' },
      isActive: true,
    };

    // If branchId is provided, include users from that branch or users without specific branch assignment
    if (branchId) {
      query.$or = [
        { branchId },
        { branchId: { $exists: false } },
        { branchId: null }
      ];
    }

    const users = await this.userModel
      .find(query)
      .select('name roles fcmToken')
      .lean();

    return users
      .filter(user => user.fcmToken) // Only include users with FCM tokens
      .map(user => ({
        userId: user._id.toString(),
        name: user.name,
        fcmToken: user.fcmToken!,
        roles: user.roles,
      }));
  }

  private async findWaitersForTable(
    restaurantId: string,
    tableId: string,
    branchId?: string
  ): Promise<Array<{ userId: string; name: string; fcmToken: string; roles: UserRole[] }>> {
    try {
      const waiters: Array<{ userId: string; name: string; fcmToken: string; roles: UserRole[] }> = [];

      // First, check if there's a specific waiter assigned to this table via table status
      try {
        const tableStatusModel = this.userModel.db.collection('tablestatuses');
        const tableStatus = await tableStatusModel.findOne({
          restaurantId,
          tableId: new require('mongoose').Types.ObjectId(tableId)
        });

        if (tableStatus?.assignedServerId) {
          const assignedWaiter = await this.userModel.findOne({
            _id: tableStatus.assignedServerId,
            roles: { $in: [UserRole.Waiter] },
            fcmToken: { $exists: true, $ne: null, $ne: '' },
            isActive: true,
          }).select('name roles fcmToken').lean();

          if (assignedWaiter && assignedWaiter.fcmToken) {
            waiters.push({
              userId: assignedWaiter._id.toString(),
              name: assignedWaiter.name,
              fcmToken: assignedWaiter.fcmToken,
              roles: assignedWaiter.roles,
            });
            this.logger.log(`Found assigned waiter ${assignedWaiter.name} for table ${tableId}`);
          }
        }
      } catch (error) {
        this.logger.warn(`Could not check table status for assigned waiter: ${error instanceof Error ? error.message : String(error)}`);
      }

      // If no assigned waiter found, fall back to zone-based assignment
      if (waiters.length === 0) {
        try {
          const tableModel = this.userModel.db.collection('restauranttables');
          const table = await tableModel.findOne({
            _id: new Types.ObjectId(tableId),
            restaurantId: new Types.ObjectId(restaurantId)
          });

          if (table?.zone) {
            const query: any = {
              restaurantId,
              roles: { $in: [UserRole.Waiter] },
              fcmToken: { $exists: true, $ne: null, $ne: '' },
              isActive: true,
              assignedZones: table.zone
            };

            // If branchId is provided, include users from that branch or users without specific branch assignment
            if (branchId || table.branchId) {
              const targetBranchId = branchId || table.branchId;
              query.$or = [
                { branchId: targetBranchId },
                { branchId: { $exists: false } },
                { branchId: null }
              ];
            }

            const zoneWaiters = await this.userModel
              .find(query)
              .select('name roles fcmToken assignedZones')
              .lean();

            zoneWaiters.forEach(waiter => {
              if (waiter.fcmToken) {
                waiters.push({
                  userId: waiter._id.toString(),
                  name: waiter.name,
                  fcmToken: waiter.fcmToken,
                  roles: waiter.roles,
                });
              }
            });

            this.logger.log(`Found ${zoneWaiters.length} zone-assigned waiters for table ${tableId} zone ${table.zone}`);
          }
        } catch (error) {
          this.logger.warn(`Could not check zone assignment for waiters: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return waiters;
    } catch (error) {
      this.logger.error(`Error finding waiters for table ${tableId}:`, error);
      return [];
    }
  }

  private async sendPaymentNotification(
    fcmToken: string,
    payload: PaymentNotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.fcmService['firebaseApp']) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const admin = require('firebase-admin');
      const message: any = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          type: 'payment_confirmation',
          orderId: payload.orderId,
          orderNumber: payload.orderNumber,
          restaurantId: payload.restaurantId,
          amount: payload.amount.toString(),
          paymentMethod: payload.paymentMethod,
          ...(payload.tableId && { tableId: payload.tableId }),
          ...(payload.tableLabel && { tableLabel: payload.tableLabel }),
          ...(payload.staffMemberName && { staffMemberName: payload.staffMemberName }),
          ...(payload.customerName && { customerName: payload.customerName }),
        },
        android: {
          priority: 'normal',
          notification: {
            priority: 'default',
            sound: 'default',
            channelId: 'payment_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/icons/payment.png',
            badge: '/icons/badge.png',
            tag: `payment-${payload.orderId}`,
            vibrate: [100],
          },
          fcmOptions: {
            link: `/orders/${payload.orderId}`,
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Payment FCM notification sent successfully: ${response}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send payment FCM notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private createPaymentNotificationPayload(
    orderId: string,
    orderNumber: string,
    amount: number,
    paymentMethod: string,
    restaurantId: string,
    tableLabel: string,
    options: {
      staffMemberName?: string;
      customerName?: string;
      tableId?: string;
      isCustomerPayment?: boolean;
    }
  ): PaymentNotificationPayload {
    const amountFormatted = `₹${amount.toFixed(2)}`;
    const paymentMethodFormatted = paymentMethod === 'upi' ? 'UPI' :
                                   paymentMethod === 'card' ? 'Card' :
                                   paymentMethod === 'cash' ? 'Cash' :
                                   paymentMethod.toUpperCase();

    let title = '💰 Payment Received';
    let body = `${amountFormatted} paid for Order #${orderNumber}`;

    // Add table information
    if (tableLabel && tableLabel !== 'N/A') {
      body += ` (Table ${tableLabel})`;
    }

    // Add payment method
    body += ` via ${paymentMethodFormatted}`;

    // Add payment source context
    if (options.isCustomerPayment) {
      body += ` - Customer Self-Payment`;
    } else if (options.staffMemberName) {
      body += ` - Marked by ${options.staffMemberName}`;
    }

    // Add customer name if available
    if (options.customerName) {
      body += ` - Customer: ${options.customerName}`;
    }

    return {
      title,
      body,
      orderId,
      orderNumber,
      tableId: options.tableId,
      tableLabel,
      amount,
      paymentMethod,
      restaurantId,
      staffMemberName: options.staffMemberName,
      customerName: options.customerName,
    };
  }

  /**
   * Create database notifications for payment confirmations
   */
  private async createDatabaseNotifications(
    restaurantId: string,
    targets: Array<{ userId: string; name: string; fcmToken: string; roles: any[] }>,
    payload: PaymentNotificationPayload,
    branchId?: string
  ): Promise<void> {
    this.logger.log('🗄️ DATABASE NOTIFICATION CREATION STARTED:', {
      restaurantId,
      branchId,
      targetsCount: targets.length,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      timestamp: new Date().toISOString(),
      targets: targets.map(t => ({ userId: t.userId, name: t.name, roles: t.roles }))
    });

    try {
      // Create notifications for all targets
      const notificationPromises = targets.map((target, index) => {
        this.logger.log(`📝 CREATING NOTIFICATION FOR TARGET ${index + 1}:`, {
          targetUserId: target.userId,
          targetName: target.name,
          targetRoles: target.roles,
          orderId: payload.orderId,
          orderNumber: payload.orderNumber
        });

        return this.notificationsService.create(restaurantId, {
          recipientId: target.userId,
          branchId: branchId,
          type: NotificationType.PAYMENT_CONFIRMATION,
          title: payload.title,
          message: payload.body,
          urgency: NotificationUrgency.NORMAL,
          orderId: payload.orderId,
          orderNumber: payload.orderNumber,
          tableId: payload.tableId,
          tableNumber: payload.tableLabel,
          metadata: {
            amount: payload.amount,
            paymentMethod: payload.paymentMethod,
            staffMemberName: payload.staffMemberName,
            customerName: payload.customerName,
            isPaymentNotification: true
          },
          fcmSent: true,
          fcmMessageId: `payment_notification_${Date.now()}`,
          senderName: 'Payment System'
        });
      });

      const databaseResults = await Promise.allSettled(notificationPromises);

      const successfulCreations = databaseResults.filter(r => r.status === 'fulfilled').length;
      const failedCreations = databaseResults.filter(r => r.status === 'rejected').length;

      this.logger.log(`✅ DATABASE NOTIFICATIONS COMPLETED:`, {
        totalTargets: targets.length,
        successful: successfulCreations,
        failed: failedCreations,
        orderNumber: payload.orderNumber,
        orderId: payload.orderId,
        timestamp: new Date().toISOString(),
        failures: databaseResults.filter(r => r.status === 'rejected').map((r, i) => ({
          targetIndex: i,
          error: r.reason
        }))
      });

    } catch (error) {
      this.logger.error('❌ CRITICAL ERROR in createDatabaseNotifications:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        orderNumber: payload.orderNumber,
        orderId: payload.orderId,
        timestamp: new Date().toISOString()
      });
      // Don't throw - database notifications are supplementary to FCM
    }
  }
}