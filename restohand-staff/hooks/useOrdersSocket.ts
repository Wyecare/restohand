import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { env } from '@/config/env';

interface UseOrdersSocketProps {
  onEvent?: (data: any) => void;
  enabled?: boolean;
}

export const useOrdersSocket = ({ onEvent, enabled = true }: UseOrdersSocketProps = {}) => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !restaurantId) {
      return;
    }

    // Initialize socket connection
    socketRef.current = io(env.socketUrl, {
      transports: ['websocket'],
      query: {
        restaurantId,
      },
    });

    const socket = socketRef.current;

    // Join restaurant room
    socket.emit('join-restaurant', restaurantId);

    // Listen for order updates
    socket.on('order-updated', (data) => {
      console.log('Order updated:', data);
      onEvent?.(data);
    });

    socket.on('new-order', (data) => {
      console.log('New order received:', data);
      onEvent?.(data);
    });

    socket.on('order-status-changed', (data) => {
      console.log('Order status changed:', data);
      onEvent?.(data);
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.off('order-updated');
      socket.off('new-order');
      socket.off('order-status-changed');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, restaurantId, onEvent]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
  };
};