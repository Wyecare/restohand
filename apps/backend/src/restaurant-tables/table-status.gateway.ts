import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { TableStatusResponseDto } from './dtos/table-status.dto';

@WebSocketGateway({ namespace: 'table-status', cors: { origin: '*' } })
export class TableStatusGateway implements OnGatewayInit {
  private readonly logger = new Logger(TableStatusGateway.name);

  @WebSocketServer()
  private server: Server | null = null;

  afterInit(server: Server) {
    this.server = server;
    this.logger.debug('Table status gateway ready');
  }

  emitTableStatusUpdated(payload: TableStatusResponseDto) {
    this.logger.debug(`Emitting table-status.updated for table ${payload.tableId}`);
    if (!this.server) {
      this.logger.warn(
        'Socket server not ready – skipping table-status.updated broadcast'
      );
      return;
    }

    // Emit to restaurant-specific room for waiter interface
    this.server
      .to(`restaurant:${payload.restaurantId}`)
      .emit('table-status.updated', payload);

    // Also emit globally for any clients that need table status updates
    this.server.emit('table-status.updated', payload);
  }

  emitMultipleTableStatusUpdated(payload: TableStatusResponseDto[]) {
    this.logger.debug(`Emitting table-status.bulk-updated for ${payload.length} tables`);
    if (!this.server) {
      this.logger.warn(
        'Socket server not ready – skipping table-status.bulk-updated broadcast'
      );
      return;
    }

    if (payload.length > 0) {
      const restaurantId = payload[0].restaurantId;
      // Emit to restaurant-specific room
      this.server
        .to(`restaurant:${restaurantId}`)
        .emit('table-status.bulk-updated', payload);

      // Also emit globally
      this.server.emit('table-status.bulk-updated', payload);
    }
  }
}