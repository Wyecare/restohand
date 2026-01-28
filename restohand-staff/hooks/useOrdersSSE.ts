import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId, selectAuthState } from '@/store/slices/authSlice';
import { env } from '@/config/env';

interface UseOrdersSSEProps {
  onEvent?: (data: any) => void;
  enabled?: boolean;
}

interface SSEEvent {
  type: string;
  data?: any;
  timestamp: string;
}

export const useOrdersSSE = ({ onEvent, enabled = true }: UseOrdersSSEProps = {}) => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const authState = useAppSelector(selectAuthState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

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
  }, []);

  const connect = useCallback(() => {
    console.log('SSE connect attempt:', {
      enabled,
      restaurantId,
      hasToken: !!authState.idToken,
      hasRoles: !!authState.session?.roles,
      authStatus: authState.status,
      session: authState.session
    });

    if (!enabled || !restaurantId || !authState.idToken || !authState.session?.roles) {
      console.log('SSE connection skipped: missing requirements', {
        enabled,
        restaurantId,
        hasToken: !!authState.idToken,
        hasRoles: !!authState.session?.roles
      });
      return;
    }

    cleanup();

    try {
      const roles = authState.session.roles.join(',');
      const sseUrl = `${env.apiUrl}/orders/sse/connect/${restaurantId}?roles=${encodeURIComponent(roles)}&token=${encodeURIComponent(authState.idToken)}`;

      console.log('Connecting to SSE:', sseUrl);

      const eventSource = new EventSource(sseUrl, {
        withCredentials: false
      });

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setIsConnected(true);
        setConnectionAttempts(0);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData: SSEEvent = JSON.parse(event.data);
          console.log('SSE event received:', parsedData);

          // Handle specific event types
          switch (parsedData.type) {
            case 'connection':
              console.log('SSE connection confirmed');
              break;
            case 'heartbeat':
              // Heartbeat - no action needed
              break;
            case 'order.created':
            case 'order.updated':
            case 'order.status.changed':
            case 'new.order':
            case 'order.modification.requested':
            case 'order.modification.processed':
            case 'order.modification.applied':
            // Legacy WebSocket event names for compatibility
            case 'order-created':
            case 'order-updated':
            case 'new-order':
            case 'order-status-changed':
              // Pass event with type and data so handlers can differentiate
              console.log('SSE order event:', parsedData.type, parsedData.data);
              onEvent?.({ type: parsedData.type, data: parsedData.data });
              break;
            default:
              console.log('Unknown SSE event type:', parsedData.type);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error, event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);

        // Implement exponential backoff for reconnection
        const backoffDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);

        console.log(`SSE reconnecting in ${backoffDelay}ms (attempt ${connectionAttempts + 1})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          setConnectionAttempts(prev => prev + 1);
          connect();
        }, backoffDelay);
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setIsConnected(false);
    }
  }, [enabled, restaurantId, authState.idToken, authState.session?.roles, onEvent, connectionAttempts, cleanup]);

  // Connect when dependencies change
  useEffect(() => {
    // Add a small delay to ensure auth is fully loaded
    if (authState.status === 'authenticated' && restaurantId && authState.idToken) {
      const timeoutId = setTimeout(connect, 1000); // 1 second delay
      return () => {
        clearTimeout(timeoutId);
        cleanup();
      };
    } else {
      cleanup();
    }
  }, [connect, cleanup, authState.status, restaurantId, authState.idToken]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isConnected,
    connectionAttempts,
    reconnect: connect,
    disconnect: cleanup
  };
};