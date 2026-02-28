import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId, selectAuthState } from '@/store/slices/authSlice';
import { env } from '@/config/env';
import EventSource from 'react-native-sse';

export interface TableHeatmapData {
  tableId: string;
  tableNumber: string;
  displayName?: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  statusColor: string;
  occupiedDuration?: number;  // ms
  currentBillAmount: number;
  partySize?: number;
  assignedServerName?: string;
  capacity: number;
  zone?: string;
  activeSessionId?: string;
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
  reconnect: () => void;
  refreshManually: () => Promise<void>;
}

export function useTableHeatmapSSE(enabled = true): UseTableHeatmapSSEReturn {
  const [tables, setTables] = useState<TableHeatmapData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  const eventSourceRef = useRef<InstanceType<typeof EventSource> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const authState = useAppSelector(selectAuthState);
  const branchId = authState.session?.branchId;
  const authToken = authState.idToken;

  const updateTable = useCallback((updated: TableHeatmapData) => {
    setTables(prev => {
      const idx = prev.findIndex(t => t.tableId === updated.tableId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
    setLastUpdate(new Date());
  }, []);

  const refreshManually = useCallback(async () => {
    if (!restaurantId || !authToken || !branchId) return;
    try {
      const url = `${env.apiUrl}/restaurants/${restaurantId}/tables/enhanced`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const heatmapTables: TableHeatmapData[] = (data ?? []).map((t: any) => ({
        tableId: t.id,
        tableNumber: t.tableNumber,
        displayName: t.displayName,
        status: t.currentStatus?.status ?? 'available',
        statusColor: t.currentStatus?.statusColor ?? 'green',
        occupiedDuration: t.currentStatus?.occupiedDuration,
        currentBillAmount: t.totalBillAmount ?? 0,
        partySize: t.currentStatus?.currentPartySize,
        assignedServerName: t.currentStatus?.assignedServerName,
        capacity: t.capacity,
        zone: t.zone,
        activeSessionId: t.activeSessionId,
        lastUpdate: new Date().toISOString(),
      }));
      setTables(heatmapTables);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Table heatmap manual refresh failed:', e);
    }
  }, [restaurantId, branchId, authToken]);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !restaurantId || !authToken || !branchId) return;
    cleanup();

    setConnectionStatus('connecting');

    const url = `${env.apiUrl}/tables/sse/connect/${restaurantId}?branchId=${branchId}`;

    try {
      const es = new EventSource(url, {
        headers: { Authorization: `Bearer ${authToken}`, 'ngrok-skip-browser-warning': 'true' },
        withCredentials: false,
      });

      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        // Also do a manual refresh to get initial data quickly
        refreshManually();
      };

      es.onmessage = (event: any) => {
        try {
          const parsed: TableHeatmapEvent = JSON.parse(event.data);
          switch (parsed.type) {
            case 'table-heatmap.initial':
            case 'table-heatmap.bulk-update':
              if (Array.isArray(parsed.data)) {
                setTables(parsed.data);
                setLastUpdate(new Date());
              }
              break;
            case 'table-status.updated':
              if (!Array.isArray(parsed.data)) {
                updateTable(parsed.data);
              }
              break;
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        setConnectionStatus('error');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
    } catch (e) {
      setConnectionStatus('error');
      // Fall back to polling
      refreshManually();
    }
  }, [enabled, restaurantId, branchId, authToken, cleanup, updateTable, refreshManually]);

  const reconnect = useCallback(() => {
    cleanup();
    setTimeout(connect, 500);
  }, [cleanup, connect]);

  useEffect(() => {
    if (enabled && restaurantId && authToken && branchId && authState.status === 'authenticated') {
      // Small delay so auth is settled
      const t = setTimeout(connect, 800);
      return () => {
        clearTimeout(t);
        cleanup();
      };
    } else {
      cleanup();
    }
  }, [enabled, restaurantId, authToken, branchId, authState.status]);

  // Fallback polling every 30s when SSE is not connected
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      if (!isConnected) refreshManually();
    }, 30000);
    return () => clearInterval(interval);
  }, [enabled, isConnected, refreshManually]);

  return { tables, isConnected, lastUpdate, connectionStatus, reconnect, refreshManually };
}
