import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OrderResponseDto } from './dtos/order-response.dto';
import { OrderModification } from './schemas/order-modification.schema';
import { JwtAuthService } from '../auth/jwt-auth.service';

@WebSocketGateway({ namespace: 'orders', cors: { origin: '*' } })
export class OrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  private server: Server | null = null;

  constructor(private readonly jwtAuthService: JwtAuthService) {}

  afterInit(server: Server) {
    this.server = server;
    this.logger.debug('Orders gateway ready');
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      this.logger.warn(`WS connection rejected — no token (${client.id})`);
      client.disconnect(true);
      return;
    }

    try {
      const user = await this.jwtAuthService.verifyToken(token);

      if (!user.restaurantId) {
        this.logger.warn(`WS connection rejected — no restaurantId (${client.id})`);
        client.disconnect(true);
        return;
      }

      // Store user info on socket for later use
      (client as any).authenticatedUser = user;

      const restaurantId = user.restaurantId;
      const branchId = user.branchId;

      // Join restaurant-wide room (for modification events, etc.)
      await client.join(`restaurant:${restaurantId}`);

      // Join branch-scoped cashier / kitchen rooms
      if (branchId) {
        await client.join(`cashier:${restaurantId}:${branchId}`);
        await client.join(`kitchen:${restaurantId}:${branchId}`);
      }

      // Also join a per-order room so customers can get updates
      // (joined later via 'join-order' event from customer side if needed)

      this.logger.log(
        `WS connected: user=${user.uid} restaurant=${restaurantId} branch=${branchId ?? 'none'} roles=${user.roles.join(',')}`
      );
    } catch {
      this.logger.warn(`WS connection rejected — invalid token (${client.id})`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).authenticatedUser;
    this.logger.log(`WS disconnected: ${user?.uid ?? client.id}`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Emit helpers — always branch-scoped, never global broadcast
  // ────────────────────────────────────────────────────────────────────────────

  private cashierRoom(restaurantId: string, branchId?: string): string {
    return branchId
      ? `cashier:${restaurantId}:${branchId}`
      : `restaurant:${restaurantId}`;
  }

  private kitchenRoom(restaurantId: string, branchId?: string): string {
    return branchId
      ? `kitchen:${restaurantId}:${branchId}`
      : `restaurant:${restaurantId}`;
  }

  /** New order arrived — notify cashier(s) only (cashier gate) */
  emitOrderPending(payload: OrderResponseDto) {
    if (!this.server) return;
    const room = this.cashierRoom(payload.restaurantId, payload.branchId);
    this.logger.debug(`Emitting order.pending to room ${room} for order ${payload.id}`);
    this.server.to(room).emit('order.pending', payload);
  }

  /** Cashier accepted — notify kitchen */
  emitOrderAccepted(payload: OrderResponseDto) {
    if (!this.server) return;
    const room = this.kitchenRoom(payload.restaurantId, payload.branchId);
    this.logger.debug(`Emitting order.accepted to room ${room} for order ${payload.id}`);
    this.server.to(room).emit('order.accepted', payload);
    // Also emit a generic order.updated so other listeners stay in sync
    this.server.to(`restaurant:${payload.restaurantId}`).emit('order.updated', payload);
  }

  /** Auto-accept path: order created and immediately forwarded to kitchen */
  emitOrderCreated(payload: OrderResponseDto) {
    if (!this.server) {
      this.logger.warn('Socket server not ready – skipping order.created broadcast');
      return;
    }
    const kitchenRoom = this.kitchenRoom(payload.restaurantId, payload.branchId);
    const cashierRoom = this.cashierRoom(payload.restaurantId, payload.branchId);
    this.logger.debug(`Emitting order.created to kitchen=${kitchenRoom} cashier=${cashierRoom}`);
    this.server.to(kitchenRoom).emit('order.created', payload);
    this.server.to(cashierRoom).emit('order.created', payload);
  }

  emitOrderUpdated(payload: OrderResponseDto) {
    if (!this.server) {
      this.logger.warn('Socket server not ready – skipping order.updated broadcast');
      return;
    }
    const room = `restaurant:${payload.restaurantId}`;
    this.logger.debug(`Emitting order.updated to ${room} for order ${payload.id}`);
    this.server.to(room).emit('order.updated', payload);
  }

  emitOrderModificationRequested(
    restaurantId: string,
    modification: OrderModification
  ) {
    if (!this.server) return;
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('order.modification.requested', modification);
    this.server
      .to(`order:${modification.orderId}`)
      .emit('order.modification.requested', modification);
  }

  emitOrderModificationProcessed(
    restaurantId: string,
    modification: OrderModification
  ) {
    if (!this.server) return;
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
    if (!this.server) return;
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('order.modification.applied', { modification, order: updatedOrder });
    this.server
      .to(`order:${modification.orderId}`)
      .emit('order.modification.applied', { modification, order: updatedOrder });
  }
}
