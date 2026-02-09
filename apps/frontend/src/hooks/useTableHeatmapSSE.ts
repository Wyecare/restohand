import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useBranchContext } from '@/contexts/BranchContext';
import { API_BASE_URL } from '@/store/api/baseApi';

export interface TableHeatmapData {
  tableId: string;
  tableNumber: string;
  displayName?: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
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

interface UseTableHeatmapSSEReturn {
  tables: TableHeatmapData[];
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  reconnect: () => void;
  refreshManually: () => Promise<void>;
}

export function useTableHeatmapSSE(
  enabled = true,
  autoReconnect = true,
  fallbackRefreshInterval = 30000
): UseTableHeatmapSSEReturn {
  const [tables, setTables] = useState<TableHeatmapData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const authToken = useAppSelector(state => state.auth.idToken);
  const { currentBranch } = useBranchContext();

  const updateTable = useCallback((updatedTable: TableHeatmapData) => {
    setTables(prevTables => {
      const existingIndex = prevTables.findIndex(t => t.tableId === updatedTable.tableId);
      if (existingIndex >= 0) {
        const newTables = [...prevTables];
        newTables[existingIndex] = updatedTable;
        return newTables;
      } else {
        return [...prevTables, updatedTable];
      }
    });
    setLastUpdate(new Date());
  }, []);

  const refreshManually = useCallback(async () => {
    if (!restaurantId || !authToken || !currentBranch?._id) return;

    try {
      const url = `${API_BASE_URL}/restaurants/${restaurantId}/tables/branch/${currentBranch._id}/service-view`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const serviceData = await response.json();

      // Transform service data to heatmap format
      const heatmapTables: TableHeatmapData[] = serviceData.tables?.map((table: any) => ({
        tableId: table.id,
        tableNumber: table.tableNumber,
        displayName: table.displayName,
        status: table.currentStatus?.status || 'available',
        statusColor: table.currentStatus?.statusColor || 'green',
        occupiedDuration: table.currentStatus?.occupiedDuration,
        currentBillAmount: table.totalBillAmount || 0,
        partySize: table.currentStatus?.currentPartySize,
        assignedServerName: table.currentStatus?.assignedServerName,
        capacity: table.capacity,
        zone: table.zone,
        layoutPosition: {
          x: table.layoutX || 0,
          y: table.layoutY || 0,
          width: table.layoutWidth,
          height: table.layoutHeight
        },
        lastUpdate: new Date().toISOString(),
      })) || [];

      setTables(heatmapTables);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch table data';
      setError(errorMessage);
      console.error('Failed to refresh table data manually:', errorMessage);
    }
  }, [restaurantId, currentBranch?._id, authToken]);

  const connect = useCallback(() => {
    console.log('🔗 SSE connect called with:', { restaurantId, enabled, authToken: !!authToken, currentBranch: currentBranch?._id });

    if (!restaurantId || !enabled || !authToken || !currentBranch?._id) {
      console.log('❌ SSE connect conditions not met');
      return;
    }

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    setError(null);

    // Construct URL with proper base URL and token
    const urlParams = new URLSearchParams();
    urlParams.set('branchId', currentBranch._id); // We know this exists from the guard above
    urlParams.set('token', authToken);

    const url = `${API_BASE_URL}/tables/sse/connect/${restaurantId}?${urlParams.toString()}`;
    console.log('🌐 SSE connecting to URL (without token):', url.split('&token=')[0]);
    console.log('🌐 SSE token (first 50 chars):', authToken?.substring(0, 50) + '...');

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Table heatmap SSE connection opened');
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const eventData: TableHeatmapEvent = JSON.parse(event.data);

          switch (eventData.type) {
            case 'table-heatmap.initial':
            case 'table-heatmap.bulk-update':
              if (Array.isArray(eventData.data)) {
                setTables(eventData.data);
                setLastUpdate(new Date());
              }
              break;

            case 'table-status.updated':
              if (!Array.isArray(eventData.data)) {
                updateTable(eventData.data);
              }
              break;
          }
        } catch (parseError) {
          console.error('Failed to parse SSE event data:', parseError);
        }
      };

      eventSource.onerror = (event) => {
        console.error('Table heatmap SSE connection error:', event);
        setIsConnected(false);
        setConnectionStatus('error');
        setError('Connection error occurred');

        if (autoReconnect) {
          // Try to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect table heatmap SSE...');
            connect();
          }, 5000);
        }
      };

      // Set up fallback manual refresh when SSE is not connected
      if (fallbackRefreshInterval > 0) {
        fallbackIntervalRef.current = setInterval(() => {
          if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
            refreshManually();
          }
        }, fallbackRefreshInterval);
      }

    } catch (error) {
      console.error('Failed to create table heatmap SSE connection:', error);
      setConnectionStatus('error');
      setError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [restaurantId, currentBranch?._id, authToken, enabled, autoReconnect, fallbackRefreshInterval]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);

  // Connect/disconnect based on dependencies
  useEffect(() => {
    console.log('🔄 SSE useEffect triggered:', {
      enabled,
      restaurantId: !!restaurantId,
      authToken: !!authToken,
      currentBranchId: currentBranch?._id
    });

    if (enabled && restaurantId && authToken && currentBranch?._id) {
      console.log('✅ All conditions met, calling connect()');
      connect();
    } else {
      console.log('❌ Conditions not met, calling disconnect()');
      disconnect();
    }

    return disconnect;
  }, [enabled, restaurantId, authToken, currentBranch?._id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    tables,
    isConnected,
    lastUpdate,
    connectionStatus,
    error,
    reconnect,
    refreshManually,
  };
}