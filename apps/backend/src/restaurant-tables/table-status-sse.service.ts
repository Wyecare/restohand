import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TableStatusResponseDto } from './dtos/table-status.dto';

interface SSEConnection {
  id: string;
  restaurantId: string;
  branchId?: string;
  userRoles: string[];
  userId: string;
  response: Response;
  createdAt: Date;
}

interface TableHeatmapData {
  tableId: string;
  tableNumber: string;
  displayName?: string;
  status: string;
  statusColor: string;
  occupiedDuration?: number;
  currentBillAmount: number;
  partySize?: number;
  assignedServerName?: string;
  capacity: number;
  zone?: string;
  layoutPosition?: { x: number; y: number; width?: number; height?: number };
  lastUpdate: string;
}

interface TableHeatmapEvent {
  type: 'table-status.updated' | 'table-heatmap.bulk-update' | 'table-heatmap.initial';
  timestamp: string;
  restaurantId: string;
  branchId?: string;
  data: TableHeatmapData | TableHeatmapData[];
}

@Injectable()
export class TableStatusSSEService {
  private readonly logger = new Logger(TableStatusSSEService.name);
  private readonly connections = new Map<string, SSEConnection>();

  addConnection(
    restaurantId: string,
    branchId: string | undefined,
    userRoles: string[],
    response: Response,
    userId: string
  ): string {
    const connectionId = uuidv4();

    this.connections.set(connectionId, {
      id: connectionId,
      restaurantId,
      branchId,
      userRoles,
      userId,
      response,
      createdAt: new Date(),
    });

    this.logger.log(
      `Added table status SSE connection ${connectionId} for restaurant ${restaurantId}, branch ${branchId || 'all'}, user ${userId}, roles: ${userRoles.join(',')}`
    );

    // Send keep-alive ping immediately
    this.sendKeepAlive(connectionId);

    return connectionId;
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.logger.log(
        `Removed table status SSE connection ${connectionId} for restaurant ${connection.restaurantId}`
      );
    }
  }

  // Get connections for a specific restaurant and branch
  getConnectionsForRestaurant(
    restaurantId: string,
    branchId?: string
  ): SSEConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) =>
        conn.restaurantId === restaurantId &&
        (!branchId || !conn.branchId || conn.branchId === branchId)
    );
  }

  // Send initial table status data to a specific connection
  sendInitialData(connectionId: string, tableData: TableHeatmapData[]): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const event: TableHeatmapEvent = {
      type: 'table-heatmap.initial',
      timestamp: new Date().toISOString(),
      restaurantId: connection.restaurantId,
      branchId: connection.branchId,
      data: tableData,
    };

    this.sendEventToConnection(connection, event);
  }

  // Emit single table status update
  emitTableStatusUpdated(tableStatus: TableStatusResponseDto, tableData?: Partial<TableHeatmapData>): void {
    const connections = this.getConnectionsForRestaurant(tableStatus.restaurantId);

    if (connections.length === 0) {
      this.logger.debug(`No SSE connections for restaurant ${tableStatus.restaurantId}`);
      return;
    }

    const heatmapData: TableHeatmapData = {
      tableId: tableStatus.tableId,
      tableNumber: tableData?.tableNumber || 'Unknown',
      displayName: tableData?.displayName,
      status: tableStatus.status,
      statusColor: tableStatus.statusColor,
      occupiedDuration: tableStatus.occupiedDuration,
      currentBillAmount: tableStatus.currentBillAmount || 0,
      partySize: tableStatus.currentPartySize,
      assignedServerName: tableStatus.assignedServerName,
      capacity: tableData?.capacity || 4,
      zone: tableData?.zone,
      layoutPosition: tableData?.layoutPosition,
      lastUpdate: new Date().toISOString(),
    };

    const event: TableHeatmapEvent = {
      type: 'table-status.updated',
      timestamp: new Date().toISOString(),
      restaurantId: tableStatus.restaurantId,
      data: heatmapData,
    };

    connections.forEach((connection) => {
      this.sendEventToConnection(connection, event);
    });

    this.logger.debug(
      `Emitted table status update to ${connections.length} SSE connections for table ${tableStatus.tableId}`
    );
  }

  // Emit bulk table status update
  emitBulkTableStatusUpdate(
    restaurantId: string,
    branchId: string | undefined,
    tableData: TableHeatmapData[]
  ): void {
    const connections = this.getConnectionsForRestaurant(restaurantId, branchId);

    if (connections.length === 0) {
      this.logger.debug(`No SSE connections for restaurant ${restaurantId}, branch ${branchId || 'all'}`);
      return;
    }

    const event: TableHeatmapEvent = {
      type: 'table-heatmap.bulk-update',
      timestamp: new Date().toISOString(),
      restaurantId,
      branchId,
      data: tableData,
    };

    connections.forEach((connection) => {
      this.sendEventToConnection(connection, event);
    });

    this.logger.debug(
      `Emitted bulk table status update to ${connections.length} SSE connections for restaurant ${restaurantId}`
    );
  }

  private sendEventToConnection(connection: SSEConnection, event: TableHeatmapEvent): void {
    try {
      const sseData = `data: ${JSON.stringify(event)}\n\n`;
      connection.response.write(sseData);
    } catch (error) {
      this.logger.warn(
        `Failed to send SSE event to connection ${connection.id}: ${error.message}`
      );
      this.removeConnection(connection.id);
    }
  }

  private sendKeepAlive(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      connection.response.write(': heartbeat\n\n');
    } catch (error) {
      this.logger.warn(
        `Failed to send keep-alive to connection ${connectionId}: ${error.message}`
      );
      this.removeConnection(connectionId);
    }
  }

  // Send periodic keep-alive to all connections
  startKeepAlive(): void {
    setInterval(() => {
      this.connections.forEach((connection, connectionId) => {
        this.sendKeepAlive(connectionId);
      });
    }, 30000); // 30 seconds
  }

  // Get connection statistics
  getConnectionStats(): {
    totalConnections: number;
    connectionsByRestaurant: Record<string, number>;
    connectionsByBranch: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      connectionsByRestaurant: {} as Record<string, number>,
      connectionsByBranch: {} as Record<string, number>,
    };

    this.connections.forEach((connection) => {
      stats.connectionsByRestaurant[connection.restaurantId] =
        (stats.connectionsByRestaurant[connection.restaurantId] || 0) + 1;

      if (connection.branchId) {
        stats.connectionsByBranch[connection.branchId] =
          (stats.connectionsByBranch[connection.branchId] || 0) + 1;
      }
    });

    return stats;
  }
}