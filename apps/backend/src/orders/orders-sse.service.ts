import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OrderResponseDto } from './dtos/order-response.dto';
import { OrderModification } from './schemas/order-modification.schema';

interface SSEConnection {
  id: string;
  restaurantId: string;
  branchId?: string;
  userRoles: string[];
  userId: string;
  response: Response;
  createdAt: Date;
}

@Injectable()
export class OrdersSSEService {
  private readonly logger = new Logger(OrdersSSEService.name);
  private readonly connections = new Map<string, SSEConnection>();

  addConnection(
    restaurantId: string,
    userRoles: string[],
    response: Response,
    userId: string,
    branchId?: string
  ): string {
    const connectionId = uuidv4();

    this.connections.set(connectionId, {
      id: connectionId,
      restaurantId,
      branchId,
      userRoles,
      userId,
      response,
      createdAt: new Date()
    });

    this.logger.log(`Added SSE connection ${connectionId} for restaurant ${restaurantId}, user ${userId}, roles: ${userRoles.join(',')}`);
    return connectionId;
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.logger.log(`Removed SSE connection ${connectionId} for restaurant ${connection.restaurantId}`);
    }
  }

  // Get connections for a restaurant, optionally filtered by role and branch
  private getRestaurantConnections(
    restaurantId: string,
    targetRoles?: string[],
    branchId?: string
  ): SSEConnection[] {
    return Array.from(this.connections.values()).filter(conn => {
      if (conn.restaurantId !== restaurantId) return false;

      // Branch-scoped filtering: if branchId provided, only match connections
      // that have the same branchId (or no branchId — managers/owners without branch)
      if (branchId && conn.branchId && conn.branchId !== branchId) return false;

      if (targetRoles && targetRoles.length > 0) {
        return targetRoles.some(role => conn.userRoles.includes(role));
      }

      return true;
    });
  }

  // Send event to specific connections
  private sendEventToConnections(connections: SSEConnection[], eventType: string, data: any): void {
    const eventData = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    const message = `data: ${JSON.stringify(eventData)}\n\n`;

    connections.forEach(conn => {
      try {
        conn.response.write(message);
      } catch (error) {
        this.logger.error(`Failed to send SSE event to connection ${conn.id}:`, error);
        this.removeConnection(conn.id);
      }
    });

    this.logger.log(`Sent ${eventType} event to ${connections.length} connections`);
  }

  // Public methods to emit order events (replacing WebSocket emissions)

  /** Order arrived but needs cashier approval — notify cashiers/managers for this branch */
  emitOrderPending(order: OrderResponseDto): void {
    this.logger.debug(`Emitting order.pending for ${order.id} via SSE`);
    const connections = this.getRestaurantConnections(
      order.restaurantId,
      ['cashier', 'manager'],
      order.branchId
    );
    this.sendEventToConnections(connections, 'order.pending', order);
  }

  /** Cashier accepted order — notify kitchen for this branch */
  emitOrderAccepted(order: OrderResponseDto): void {
    this.logger.debug(`Emitting order.accepted for ${order.id} via SSE`);
    const connections = this.getRestaurantConnections(
      order.restaurantId,
      ['chef', 'waiter', 'cashier', 'manager'],
      order.branchId
    );
    this.sendEventToConnections(connections, 'order.accepted', order);
  }

  emitOrderCreated(order: OrderResponseDto): void {
    this.logger.debug(`Emitting order.created for ${order.id} via SSE`);

    // Auto-accept path: send directly to kitchen + cashier (branch-scoped)
    const staffConnections = this.getRestaurantConnections(
      order.restaurantId,
      ['chef', 'waiter', 'cashier', 'manager'],
      order.branchId
    );

    this.sendEventToConnections(staffConnections, 'order.created', order);
  }

  emitOrderUpdated(order: OrderResponseDto): void {
    this.logger.debug(`Emitting order.updated for ${order.id} via SSE`);

    // Send to all staff in the restaurant
    const staffConnections = this.getRestaurantConnections(
      order.restaurantId,
      ['chef', 'waiter', 'cashier', 'manager']
    );

    this.sendEventToConnections(staffConnections, 'order.updated', order);
  }

  emitOrderStatusChanged(restaurantId: string, orderId: string, status: string, progress?: string): void {
    this.logger.debug(`Emitting order.status.changed for ${orderId} via SSE`);

    // Send primarily to waiters and managers (they need status updates)
    const relevantConnections = this.getRestaurantConnections(
      restaurantId,
      ['waiter', 'manager']
    );

    this.sendEventToConnections(relevantConnections, 'order.status.changed', {
      orderId,
      status,
      progress,
      restaurantId
    });
  }

  emitNewOrder(order: OrderResponseDto): void {
    this.logger.debug(`Emitting new.order for ${order.id} via SSE`);

    // Send to kitchen staff primarily
    const kitchenConnections = this.getRestaurantConnections(
      order.restaurantId,
      ['chef', 'manager']
    );

    this.sendEventToConnections(kitchenConnections, 'new.order', order);
  }

  emitOrderModificationRequested(
    restaurantId: string,
    modification: OrderModification
  ): void {
    this.logger.debug(`Emitting order.modification.requested for order ${modification.orderNumber} via SSE`);

    // Send to kitchen and management staff
    const staffConnections = this.getRestaurantConnections(
      restaurantId,
      ['chef', 'manager']
    );

    this.sendEventToConnections(staffConnections, 'order.modification.requested', modification);
  }

  emitOrderModificationProcessed(
    restaurantId: string,
    modification: OrderModification
  ): void {
    this.logger.debug(`Emitting order.modification.processed for order ${modification.orderNumber} via SSE`);

    // Send to all staff
    const staffConnections = this.getRestaurantConnections(
      restaurantId,
      ['chef', 'waiter', 'cashier', 'manager']
    );

    this.sendEventToConnections(staffConnections, 'order.modification.processed', modification);
  }

  emitOrderModificationApplied(
    restaurantId: string,
    modification: OrderModification,
    updatedOrder?: OrderResponseDto
  ): void {
    this.logger.debug(`Emitting order.modification.applied for order ${modification.orderNumber} via SSE`);

    // Send to all staff
    const staffConnections = this.getRestaurantConnections(
      restaurantId,
      ['chef', 'waiter', 'cashier', 'manager']
    );

    this.sendEventToConnections(staffConnections, 'order.modification.applied', {
      modification,
      order: updatedOrder
    });
  }

  // Utility method to get connection stats
  getConnectionStats(): { total: number; byRestaurant: Record<string, number> } {
    const stats = {
      total: this.connections.size,
      byRestaurant: {} as Record<string, number>
    };

    this.connections.forEach(conn => {
      stats.byRestaurant[conn.restaurantId] = (stats.byRestaurant[conn.restaurantId] || 0) + 1;
    });

    return stats;
  }

  // Clean up stale connections
  cleanupStaleConnections(): void {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    this.connections.forEach((conn, id) => {
      if (now.getTime() - conn.createdAt.getTime() > staleThreshold) {
        // Try sending a heartbeat to check if connection is still alive
        try {
          conn.response.write(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: now.toISOString()
          })}\n\n`);
        } catch (error) {
          this.logger.warn(`Removing stale SSE connection ${id}`);
          this.removeConnection(id);
        }
      }
    });
  }
}