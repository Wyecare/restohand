import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TableStatus } from './schemas/table-status.schema';
import { FloorPlansService } from './floor-plans.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    uid: string;
    restaurantId: string;
    roles: string[];
  };
}

@WebSocketGateway({
  namespace: 'floor-plans',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class FloorPlansGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(FloorPlansGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(private readonly floorPlansService: FloorPlansService) {}

  afterInit(server: Server) {
    this.logger.log('FloorPlans WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      this.logger.log(`Client connected: ${client.id}`);

      // Here you would verify the client's authentication
      // For now, we'll assume authentication is handled via JWT or similar

      this.connectedClients.set(client.id, client);
    } catch (error) {
      this.logger.error(`Failed to authenticate client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-restaurant')
  async handleJoinRestaurant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { restaurantId: string; token?: string }
  ) {
    try {
      // Verify client has access to this restaurant
      // You would implement JWT verification here

      client.join(`restaurant-${data.restaurantId}`);
      client.user = {
        uid: 'user-id', // Extract from JWT
        restaurantId: data.restaurantId,
        roles: ['manager'], // Extract from JWT
      };

      this.logger.log(`Client ${client.id} joined restaurant ${data.restaurantId}`);

      // Send current floor plan status
      const overview = await this.floorPlansService.getFloorPlanOverview(data.restaurantId);
      const tableStatuses = await this.floorPlansService.getTableStatuses(data.restaurantId);

      client.emit('floor-plan-overview', overview);
      client.emit('table-statuses', tableStatuses);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error joining restaurant:`, error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave-restaurant')
  handleLeaveRestaurant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { restaurantId: string }
  ) {
    client.leave(`restaurant-${data.restaurantId}`);
    this.logger.log(`Client ${client.id} left restaurant ${data.restaurantId}`);
    return { success: true };
  }

  @SubscribeMessage('get-table-status')
  async handleGetTableStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { restaurantId: string; tableId: string }
  ) {
    try {
      const tableStatus = await this.floorPlansService.getTableStatus(data.restaurantId, data.tableId);
      return { success: true, data: tableStatus };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Methods to broadcast updates
  async broadcastTableStatusUpdate(tableStatus: TableStatus) {
    this.logger.debug(`Broadcasting table status update for ${tableStatus.tableId}`);

    this.server
      .to(`restaurant-${tableStatus.restaurantId}`)
      .emit('table-status-updated', tableStatus);
  }

  async broadcastFloorPlanUpdate(restaurantId: string, floorPlan: any) {
    this.logger.debug(`Broadcasting floor plan update for restaurant ${restaurantId}`);

    this.server
      .to(`restaurant-${restaurantId}`)
      .emit('floor-plan-updated', floorPlan);
  }

  async broadcastOverviewUpdate(restaurantId: string) {
    try {
      const overview = await this.floorPlansService.getFloorPlanOverview(restaurantId);

      this.server
        .to(`restaurant-${restaurantId}`)
        .emit('overview-updated', overview);
    } catch (error) {
      this.logger.error(`Error broadcasting overview update:`, error);
    }
  }

  async broadcastTableAlert(restaurantId: string, alert: {
    tableId: string;
    tableLabel: string;
    type: 'needs-attention' | 'order-ready' | 'payment-pending' | 'cleaning-required';
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    timestamp: Date;
  }) {
    this.logger.debug(`Broadcasting table alert for ${alert.tableId}`);

    this.server
      .to(`restaurant-${restaurantId}`)
      .emit('table-alert', alert);
  }

  async broadcastOrderUpdate(restaurantId: string, orderUpdate: {
    orderId: string;
    tableId?: string;
    status: string;
    progress: number;
    estimatedReadyTime?: Date;
  }) {
    this.logger.debug(`Broadcasting order update for ${orderUpdate.orderId}`);

    this.server
      .to(`restaurant-${restaurantId}`)
      .emit('order-updated', orderUpdate);
  }

  // Analytics and insights broadcasts
  async broadcastRealtimeInsights(restaurantId: string, insights: {
    peakTables: string[];
    bottleneckAreas: string[];
    suggestedActions: Array<{
      type: 'reassign-waiter' | 'table-optimization' | 'capacity-alert';
      message: string;
      tableIds?: string[];
    }>;
    occupancyRate: number;
    averageWaitTime: number;
    revenueRate: number;
  }) {
    this.server
      .to(`restaurant-${restaurantId}`)
      .emit('realtime-insights', insights);
  }
}