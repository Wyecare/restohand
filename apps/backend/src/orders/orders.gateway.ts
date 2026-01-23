import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { OrderResponseDto } from './dtos/order-response.dto';
import { OrderModification } from './schemas/order-modification.schema';

@WebSocketGateway({ namespace: 'orders', cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayInit {
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  private server: Server | null = null;

  afterInit(server: Server) {
    this.server = server;
    this.logger.debug('Orders gateway ready');
  }

  emitOrderCreated(payload: OrderResponseDto) {
    this.logger.debug(`Emitting order.created for ${payload.id}`);
    if (!this.server) {
      this.logger.warn(
        'Socket server not ready – skipping order.created broadcast'
      );
      return;
    }
    this.server.emit('order.created', payload);
  }

  emitOrderUpdated(payload: OrderResponseDto) {
    this.logger.debug(`Emitting order.updated for ${payload.id}`);
    if (!this.server) {
      this.logger.warn(
        'Socket server not ready – skipping order.updated broadcast'
      );
      return;
    }
    this.server.emit('order.updated', payload);
  }

  emitOrderModificationRequested(
    restaurantId: string,
    modification: OrderModification
  ) {
    this.logger.debug(
      `Emitting order.modification.requested for order ${modification.orderNumber}`
    );
    if (!this.server) {
      this.logger.warn(
        'Socket server not ready – skipping order.modification.requested broadcast'
      );
      return;
    }
    // Emit to restaurant-specific room for kitchen/staff notifications
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('order.modification.requested', modification);
    // Also emit to the specific order room for customer updates
    this.server
      .to(`order:${modification.orderId}`)
      .emit('order.modification.requested', modification);
  }

  emitOrderModificationProcessed(
    restaurantId: string,
    modification: OrderModification
  ) {
    this.logger.debug(
      `Emitting order.modification.processed for order ${modification.orderNumber}`
    );
    if (!this.server) {
      this.logger.warn(
        'Socket server not ready – skipping order.modification.processed broadcast'
      );
      return;
    }
    // Notify all parties about the processed modification
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('order.modification.processed', modification);
    this.server
      .to(`order:${modification.orderId}`)
      .emit('order.modification.processed', modification);
  }

  emitOrderModificationApplied(
    restaurantId: string,
    modification: OrderModification,
    updatedOrder?: OrderResponseDto
  ) {
    this.logger.debug(
      `Emitting order.modification.applied for order ${modification.orderNumber}`
    );
    if (!this.server) {
      this.logger.warn(
        'Socket server not ready – skipping order.modification.applied broadcast'
      );
      return;
    }
    // Notify about applied modification
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('order.modification.applied', {
        modification,
        order: updatedOrder,
      });
    this.server
      .to(`order:${modification.orderId}`)
      .emit('order.modification.applied', {
        modification,
        order: updatedOrder,
      });
  }
}
