import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import type { FirebaseConfig } from '../config/firebase.config';
import { CallWaiterType, CallWaiterUrgency } from './schemas/call-waiter.schema';

export interface FCMNotificationPayload {
  title: string;
  body: string;
  type: CallWaiterType;
  urgency: CallWaiterUrgency;
  tableId: string;
  tableLabel: string;
  callId: string;
  restaurantId: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
}

@Injectable()
export class FCMNotificationService {
  private readonly logger = new Logger(FCMNotificationService.name);
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const firebaseConfig = this.configService.get<FirebaseConfig>('firebase');

      if (!firebaseConfig?.projectId || !firebaseConfig?.clientEmail || !firebaseConfig?.privateKey) {
        this.logger.warn('Firebase configuration missing. FCM notifications will be disabled.');
        return;
      }

      // Use Firebase config service
      const serviceAccount = {
        projectId: firebaseConfig.projectId,
        clientEmail: firebaseConfig.clientEmail,
        privateKey: firebaseConfig.privateKey, // Already processed in config
      };

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
      }, 'call-waiter-fcm');

      this.logger.log('Firebase Admin SDK initialized successfully for FCM');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  async sendNotification(
    fcmToken: string,
    payload: FCMNotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.firebaseApp) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          type: payload.type,
          urgency: payload.urgency,
          tableId: payload.tableId,
          tableLabel: payload.tableLabel,
          callId: payload.callId,
          restaurantId: payload.restaurantId,
          ...(payload.orderId && { orderId: payload.orderId }),
          ...(payload.orderNumber && { orderNumber: payload.orderNumber }),
          ...(payload.customerName && { customerName: payload.customerName }),
        },
        android: {
          priority: payload.urgency === CallWaiterUrgency.Urgent ? 'high' : 'normal',
          notification: {
            priority: payload.urgency === CallWaiterUrgency.Urgent ? 'max' : 'default',
            sound: payload.urgency === CallWaiterUrgency.Urgent ? 'urgent' : 'default',
            channelId: 'call_waiter_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: payload.urgency === CallWaiterUrgency.Urgent ? 'urgent.wav' : 'default',
              badge: 1,
              'interruption-level': payload.urgency === CallWaiterUrgency.Urgent ? 'critical' : 'active',
            },
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/icons/waiter-call.png',
            badge: '/icons/badge.png',
            tag: `call-waiter-${payload.callId}`,
            requireInteraction: payload.urgency === CallWaiterUrgency.Urgent,
            vibrate: payload.urgency === CallWaiterUrgency.Urgent ? [200, 100, 200] : [100],
          },
          fcmOptions: {
            link: `/call-waiter/${payload.callId}`,
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`FCM notification sent successfully: ${response}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send FCM notification:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkNotifications(
    notifications: Array<{ fcmToken: string; payload: FCMNotificationPayload }>
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const results = await Promise.allSettled(
      notifications.map(({ fcmToken, payload }) =>
        this.sendNotification(fcmToken, payload)
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.error(
          `Bulk notification failed for token ${notifications[index].fcmToken}:`,
          result.reason
        );
        return { success: false, error: result.reason.message };
      }
    });
  }

  createNotificationPayload(
    type: CallWaiterType,
    urgency: CallWaiterUrgency,
    tableLabel: string,
    options: {
      tableId: string;
      callId: string;
      restaurantId: string;
      message?: string;
      customerName?: string;
      orderId?: string;
      orderNumber?: string;
    }
  ): FCMNotificationPayload {
    const urgencyEmoji = this.getUrgencyEmoji(urgency);
    const typeEmoji = this.getTypeEmoji(type);

    let title = '';
    let body = '';

    switch (type) {
      case CallWaiterType.Assistance:
        title = `${urgencyEmoji} Customer Needs Assistance`;
        body = `Table ${tableLabel} is requesting help`;
        break;
      case CallWaiterType.Emergency:
        title = `🚨 EMERGENCY - Table ${tableLabel}`;
        body = `Immediate assistance required!`;
        break;
      case CallWaiterType.BillRequest:
        title = `💳 Bill Request`;
        body = `Table ${tableLabel} is ready to pay`;
        break;
      case CallWaiterType.Complaint:
        title = `⚠️ Customer Complaint`;
        body = `Table ${tableLabel} has a concern`;
        break;
      case CallWaiterType.Feedback:
        title = `💭 Customer Feedback`;
        body = `Table ${tableLabel} has feedback to share`;
        break;
    }

    if (options.customerName) {
      body += ` (${options.customerName})`;
    }

    if (options.message) {
      body += ` - ${options.message}`;
    }

    return {
      title,
      body,
      type,
      urgency,
      tableId: options.tableId,
      tableLabel,
      callId: options.callId,
      restaurantId: options.restaurantId,
      orderId: options.orderId,
      orderNumber: options.orderNumber,
      customerName: options.customerName,
    };
  }

  private getUrgencyEmoji(urgency: CallWaiterUrgency): string {
    switch (urgency) {
      case CallWaiterUrgency.Low:
        return '🔵';
      case CallWaiterUrgency.Normal:
        return '🟢';
      case CallWaiterUrgency.High:
        return '🟡';
      case CallWaiterUrgency.Urgent:
        return '🔴';
      default:
        return '🟢';
    }
  }

  private getTypeEmoji(type: CallWaiterType): string {
    switch (type) {
      case CallWaiterType.Assistance:
        return '🙋‍♂️';
      case CallWaiterType.Emergency:
        return '🚨';
      case CallWaiterType.BillRequest:
        return '💳';
      case CallWaiterType.Complaint:
        return '⚠️';
      case CallWaiterType.Feedback:
        return '💭';
      default:
        return '🔔';
    }
  }
}