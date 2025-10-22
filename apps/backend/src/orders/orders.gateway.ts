import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { OrderResponseDto } from './dtos/order-response.dto';

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
      this.logger.warn('Socket server not ready – skipping order.created broadcast');
      return;
    }
    this.server.emit('order.created', payload);
  }

  emitOrderUpdated(payload: OrderResponseDto) {
    this.logger.debug(`Emitting order.updated for ${payload.id}`);
    if (!this.server) {
      this.logger.warn('Socket server not ready – skipping order.updated broadcast');
      return;
    }
    this.server.emit('order.updated', payload);
  }
}
