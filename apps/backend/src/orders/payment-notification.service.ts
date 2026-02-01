import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { FCMNotificationService } from '../call-waiter/fcm-notification.service';
import { UserRole } from '../common/enums/user-role.enum';

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
    private fcmService: FCMNotificationService
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

    return users.map(user => ({
      userId: user._id.toString(),
      name: user.name,
      fcmToken: user.fcmToken,
      roles: user.roles,
    }));
  }

  private async findWaitersForTable(
    restaurantId: string,
    tableId: string,
    branchId?: string
  ): Promise<Array<{ userId: string; name: string; fcmToken: string; roles: UserRole[] }>> {
    try {
      // Get table details to determine zone
      const tableModel = this.userModel.db.collection('restauranttables');
      const table = await tableModel.findOne({
        _id: new require('mongoose').Types.ObjectId(tableId),
        restaurantId: new require('mongoose').Types.ObjectId(restaurantId)
      });

      if (!table) {
        this.logger.warn(`Table ${tableId} not found for restaurant ${restaurantId}`);
        return [];
      }

      const query: any = {
        restaurantId,
        roles: { $in: [UserRole.Waiter] },
        fcmToken: { $exists: true, $ne: null, $ne: '' },
        isActive: true,
      };

      // If table has a zone, find waiters assigned to that zone
      if (table.zone) {
        query.assignedZones = table.zone;
      }

      // If branchId is provided, include users from that branch or users without specific branch assignment
      if (branchId || table.branchId) {
        const targetBranchId = branchId || table.branchId;
        query.$or = [
          { branchId: targetBranchId },
          { branchId: { $exists: false } },
          { branchId: null }
        ];
      }

      const waiters = await this.userModel
        .find(query)
        .select('name roles fcmToken assignedZones')
        .lean();

      return waiters.map(waiter => ({
        userId: waiter._id.toString(),
        name: waiter.name,
        fcmToken: waiter.fcmToken,
        roles: waiter.roles,
      }));
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
      return { success: false, error: error.message };
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
}