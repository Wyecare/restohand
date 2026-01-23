import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export interface CallWaiterEvent {
  callId: string;
  tableId: string;
  tableLabel: string;
  type: string;
  urgency: string;
  message?: string;
  customerName?: string;
  assignedWaiterName?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolutionNote?: string;
  responseTimeMinutes?: number;
}

@WebSocketGateway({ namespace: 'call-waiter', cors: { origin: '*' } })
export class CallWaiterGateway implements OnGatewayInit {
  private readonly logger = new Logger(CallWaiterGateway.name);

  @WebSocketServer()
  private server: Server | null = null;

  afterInit(server: Server) {
    this.server = server;
    this.logger.debug('Call waiter gateway ready');
  }

  emitToRestaurant(restaurantId: string, event: string, payload: CallWaiterEvent) {
    this.logger.debug(`Emitting ${event} for restaurant ${restaurantId}`);
    if (!this.server) {
      this.logger.warn('Socket server not ready – skipping call waiter event broadcast');
      return;
    }

    // Emit to restaurant-specific room
    this.server.to(`restaurant:${restaurantId}`).emit(event, payload);

    // Also emit globally for staff who might not be in specific rooms
    this.server.emit(event, { ...payload, restaurantId });
  }

  emitCallCreated(restaurantId: string, payload: CallWaiterEvent) {
    this.emitToRestaurant(restaurantId, 'call-waiter:created', payload);
  }

  emitCallAcknowledged(restaurantId: string, payload: Partial<CallWaiterEvent>) {
    this.emitToRestaurant(restaurantId, 'call-waiter:acknowledged', payload as CallWaiterEvent);
  }

  emitCallResolved(restaurantId: string, payload: Partial<CallWaiterEvent>) {
    this.emitToRestaurant(restaurantId, 'call-waiter:resolved', payload as CallWaiterEvent);
  }
}