import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CallWaiter,
  CallWaiterDocument,
  CallWaiterStatus,
  CallWaiterUrgency,
} from './schemas/call-waiter.schema';
import {
  TableStatus,
  TableStatusDocument,
} from '../floor-plans/schemas/table-status.schema';
import {
  RestaurantTable,
  RestaurantTableDocument,
} from '../restaurant-tables/schemas/restaurant-table.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { FCMNotificationService } from './fcm-notification.service';
import { CallWaiterGateway } from './call-waiter.gateway';
import {
  CreateCallWaiterDto,
  AcknowledgeCallDto,
  ResolveCallDto,
} from './dtos/call-waiter.dto';

@Injectable()
export class CallWaiterService {
  private readonly logger = new Logger(CallWaiterService.name);

  constructor(
    @InjectModel(CallWaiter.name)
    private callWaiterModel: Model<CallWaiterDocument>,
    @InjectModel(TableStatus.name)
    private tableStatusModel: Model<TableStatusDocument>,
    @InjectModel(RestaurantTable.name)
    private restaurantTableModel: Model<RestaurantTableDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private fcmService: FCMNotificationService,
    private callWaiterGateway: CallWaiterGateway
  ) {}

  async createCallWaiter(
    restaurantId: string,
    createCallWaiterDto: CreateCallWaiterDto
  ): Promise<CallWaiter> {
    try {
      // First find the actual table by table number/identifier
      const table = await this.restaurantTableModel
        .findOne({
          restaurantId: new Types.ObjectId(restaurantId),
          _id: new Types.ObjectId(createCallWaiterDto.tableId),
          isActive: true,
        })
        .lean();

      if (!table) {
        throw new NotFoundException(
          `Table ${createCallWaiterDto.tableId} not found or inactive`
        );
      }

      // Get table status using the actual table ObjectId
      const tableStatus = await this.tableStatusModel
        .findOne({
          restaurantId,
          tableId: table._id, // Now use the actual ObjectId
        })
        .lean();

      if (!tableStatus) {
        this.logger.warn(
          `No table status found for table ${createCallWaiterDto.tableId}, proceeding without assigned waiter`
        );
      }

      // Get order details if provided
      let orderDetails = null;
      if (createCallWaiterDto.orderId) {
        orderDetails = await this.orderModel
          .findById(createCallWaiterDto.orderId)
          .lean();

        if (!orderDetails) {
          throw new NotFoundException('Order not found');
        }
      }

      // Get assigned waiter details
      let assignedWaiter = null;
      console.log(assignedWaiter, 'tableStatus?.assignedServerId');
      if (tableStatus?.assignedServerId) {
        assignedWaiter = await this.userModel
          .findById(tableStatus.assignedServerId)
          .select('name fcmToken fcmTokenUpdatedAt')
          .lean();
      }

      // Create the call waiter alert
      const tableLabel = table.displayName || table.tableNumber;
      const callWaiter = new this.callWaiterModel({
        restaurantId,
        tableId: createCallWaiterDto.tableId, // Keep original table identifier for reference
        tableLabel,
        orderId: createCallWaiterDto.orderId,
        orderNumber: orderDetails?.orderNumber,
        type: createCallWaiterDto.type,
        urgency: createCallWaiterDto.urgency || CallWaiterUrgency.Normal,
        message: createCallWaiterDto.message,
        customerName:
          createCallWaiterDto.customerName || orderDetails?.customerName,
        customerPhone:
          createCallWaiterDto.customerPhone || orderDetails?.customerPhone,
        assignedWaiterId: assignedWaiter?._id,
        assignedWaiterName: assignedWaiter?.name,
        fcmSent: false,
      });

      const savedCall = await callWaiter.save();

      // Send FCM notification if waiter has token
      if (assignedWaiter?.fcmToken) {
        await this.sendFCMNotification(savedCall, assignedWaiter.fcmToken);
      } else {
        this.logger.warn(
          `No FCM token for waiter ${
            assignedWaiter?.name || 'unassigned'
          } - notification not sent`
        );
      }

      // Emit real-time event to all restaurant staff
      this.callWaiterGateway.emitCallCreated(restaurantId, {
        callId: savedCall._id.toString(),
        tableId: savedCall.tableId,
        tableLabel: savedCall.tableLabel,
        type: savedCall.type,
        urgency: savedCall.urgency,
        message: savedCall.message,
        customerName: savedCall.customerName,
        assignedWaiterName: savedCall.assignedWaiterName,
        createdAt: savedCall.createdAt,
      });

      this.logger.log(
        `Call waiter created: ${savedCall._id} for table ${tableLabel}`
      );
      return savedCall;
    } catch (error) {
      this.logger.error('Failed to create call waiter:', error);
      throw error;
    }
  }

  async acknowledgeCall(
    callId: string,
    userId: string,
    restaurantId: string,
    acknowledgeDto?: AcknowledgeCallDto
  ): Promise<CallWaiter> {
    const call = await this.callWaiterModel.findOne({
      _id: callId,
      restaurantId,
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (call.status !== CallWaiterStatus.Pending) {
      throw new BadRequestException('Call already acknowledged');
    }

    const user = await this.userModel.findById(userId).select('name').lean();

    call.status = CallWaiterStatus.Acknowledged;
    call.acknowledgedBy = userId;
    call.acknowledgedAt = new Date();

    if (acknowledgeDto?.note) {
      call.resolutionNote = acknowledgeDto.note;
    }

    // Calculate response time
    const responseTimeMs = new Date().getTime() - call.createdAt.getTime();
    call.responseTimeMinutes = Math.round(responseTimeMs / (1000 * 60));

    const updatedCall = await call.save();

    // Emit real-time event
    this.callWaiterGateway.emitCallAcknowledged(restaurantId, {
      callId: updatedCall._id.toString(),
      acknowledgedBy: user?.name,
      acknowledgedAt: updatedCall.acknowledgedAt,
      responseTimeMinutes: updatedCall.responseTimeMinutes,
    });

    this.logger.log(`Call ${callId} acknowledged by ${user?.name}`);
    return updatedCall;
  }

  async resolveCall(
    callId: string,
    userId: string,
    restaurantId: string,
    resolveDto: ResolveCallDto
  ): Promise<CallWaiter> {
    const call = await this.callWaiterModel.findOne({
      _id: callId,
      restaurantId,
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (call.status === CallWaiterStatus.Resolved) {
      throw new BadRequestException('Call already resolved');
    }

    const user = await this.userModel.findById(userId).select('name').lean();

    call.status = CallWaiterStatus.Resolved;
    call.resolvedBy = userId;
    call.resolvedAt = new Date();
    call.resolutionNote = resolveDto.resolutionNote;

    // Update response time if not already set
    if (!call.responseTimeMinutes && call.acknowledgedAt) {
      const responseTimeMs =
        call.acknowledgedAt.getTime() - call.createdAt.getTime();
      call.responseTimeMinutes = Math.round(responseTimeMs / (1000 * 60));
    }

    const updatedCall = await call.save();

    // Emit real-time event
    this.callWaiterGateway.emitCallResolved(restaurantId, {
      callId: updatedCall._id.toString(),
      resolvedBy: user?.name,
      resolvedAt: updatedCall.resolvedAt,
      resolutionNote: updatedCall.resolutionNote,
    });

    this.logger.log(`Call ${callId} resolved by ${user?.name}`);
    return updatedCall;
  }

  async getRestaurantCalls(
    restaurantId: string,
    status?: CallWaiterStatus,
    limit = 50
  ): Promise<CallWaiter[]> {
    const filter: any = { restaurantId, isArchived: false };

    if (status) {
      filter.status = status;
    }

    return this.callWaiterModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getWaiterCalls(
    restaurantId: string,
    waiterId: string,
    status?: CallWaiterStatus,
    limit = 50
  ): Promise<CallWaiter[]> {
    const filter: any = {
      restaurantId,
      assignedWaiterId: waiterId,
      isArchived: false,
    };

    if (status) {
      filter.status = status;
    }

    return this.callWaiterModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    if (!userId) {
      this.logger.error('Cannot update FCM token: userId is undefined');
      throw new BadRequestException('User ID is required');
    }

    const result = await this.userModel.updateOne(
      { _id: userId },
      {
        fcmToken,
        fcmTokenUpdatedAt: new Date(),
      }
    );

    if (result.matchedCount === 0) {
      this.logger.error(`User not found for FCM token update: ${userId}`);
      throw new NotFoundException('User not found');
    }

    this.logger.log(
      `FCM token updated for user ${userId} (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`
    );
  }

  private async sendFCMNotification(
    call: CallWaiterDocument,
    fcmToken: string
  ): Promise<void> {
    try {
      const payload = this.fcmService.createNotificationPayload(
        call.type,
        call.urgency,
        call.tableLabel,
        {
          tableId: call.tableId,
          callId: call._id.toString(),
          restaurantId: call.restaurantId,
          message: call.message,
          customerName: call.customerName,
          orderId: call.orderId,
          orderNumber: call.orderNumber,
        }
      );

      const result = await this.fcmService.sendNotification(fcmToken, payload);

      // Update call with FCM status
      call.fcmSent = result.success;
      call.fcmSentAt = new Date();

      if (!result.success) {
        call.fcmError = result.error;
        this.logger.error(
          `FCM notification failed for call ${call._id}: ${result.error}`
        );
      } else {
        this.logger.log(`FCM notification sent for call ${call._id}`);
      }

      await call.save();
    } catch (error) {
      this.logger.error('Error sending FCM notification:', error);
    }
  }
}
