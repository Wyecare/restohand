import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';

interface TableAlert {
  tableId: string;
  tableLabel: string;
  type: 'needs-attention' | 'order-ready' | 'payment-pending' | 'cleaning-required';
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: Date;
}

interface RealtimeInsight {
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
}

interface OrderUpdate {
  orderId: string;
  tableId?: string;
  status: string;
  progress: number;
  estimatedReadyTime?: Date;
}

interface FloorPlanWebSocketHook {
  isConnected: boolean;
  tableAlerts: TableAlert[];
  realtimeInsights?: RealtimeInsight;
  connect: () => void;
  disconnect: () => void;
  clearAlert: (alertId: string) => void;
}

export const useFloorPlanWebSocket = (restaurantId: string): FloorPlanWebSocketHook => {
  const [isConnected, setIsConnected] = useState(false);
  const [tableAlerts, setTableAlerts] = useState<TableAlert[]>([]);
  const [realtimeInsights, setRealtimeInsights] = useState<RealtimeInsight>();

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const baseUrl = env.apiBaseUrl.replace('/api', '').replace(/\/$/, '');

      socketRef.current = io(`${baseUrl}/floor-plans`, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: maxReconnectAttempts,
        timeout: 10000,
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('[FloorPlan WebSocket] Connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Join restaurant room
        socket.emit('join-restaurant', {
          restaurantId,
          // In a real app, you'd pass the auth token here
          token: localStorage.getItem('authToken')
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('[FloorPlan WebSocket] Disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[FloorPlan WebSocket] Connection error:', error);
        setIsConnected(false);

        // Implement exponential backoff for reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            socket.connect();
          }, delay);
        }
      });

      // Listen for table status updates
      socket.on('table-status-updated', (tableStatus) => {
        console.log('[FloorPlan WebSocket] Table status updated:', tableStatus);
        // This would typically trigger a refetch of table statuses
        // For now, we'll just log it
      });

      // Listen for floor plan updates
      socket.on('floor-plan-updated', (floorPlan) => {
        console.log('[FloorPlan WebSocket] Floor plan updated:', floorPlan);
        // This would typically trigger a refetch of the floor plan
      });

      // Listen for overview updates
      socket.on('overview-updated', (overview) => {
        console.log('[FloorPlan WebSocket] Overview updated:', overview);
        // This would typically update the overview data
      });

      // Listen for table alerts
      socket.on('table-alert', (alert: TableAlert) => {
        console.log('[FloorPlan WebSocket] Table alert:', alert);
        setTableAlerts(prev => {
          // Remove any existing alert for the same table and type
          const filtered = prev.filter(
            a => !(a.tableId === alert.tableId && a.type === alert.type)
          );
          return [...filtered, { ...alert, timestamp: new Date(alert.timestamp) }];
        });
      });

      // Listen for order updates
      socket.on('order-updated', (orderUpdate: OrderUpdate) => {
        console.log('[FloorPlan WebSocket] Order updated:', orderUpdate);
        // Handle order updates - could trigger alerts or status changes
      });

      // Listen for real-time insights
      socket.on('realtime-insights', (insights: RealtimeInsight) => {
        console.log('[FloorPlan WebSocket] Realtime insights:', insights);
        setRealtimeInsights(insights);
      });

      // Listen for join confirmation
      socket.on('floor-plan-overview', (overview) => {
        console.log('[FloorPlan WebSocket] Received initial overview:', overview);
      });

      socket.on('table-statuses', (statuses) => {
        console.log('[FloorPlan WebSocket] Received initial table statuses:', statuses);
      });

    } catch (error) {
      console.error('[FloorPlan WebSocket] Failed to connect:', error);
    }
  }, [restaurantId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit('leave-restaurant', { restaurantId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setTableAlerts([]);
    setRealtimeInsights(undefined);
    reconnectAttempts.current = 0;
  }, [restaurantId]);

  const clearAlert = useCallback((alertId: string) => {
    setTableAlerts(prev => prev.filter(alert =>
      `${alert.tableId}-${alert.type}` !== alertId
    ));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-remove old alerts (older than 1 hour)
  useEffect(() => {
    const interval = setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      setTableAlerts(prev =>
        prev.filter(alert => new Date(alert.timestamp) > oneHourAgo)
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    tableAlerts,
    realtimeInsights,
    connect,
    disconnect,
    clearAlert,
  };
};