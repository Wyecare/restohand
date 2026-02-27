import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';
import type { Order } from '@/store/api/types';

interface UseCashierSocketProps {
  token: string | null;
  onOrderPending?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onOrderAccepted?: (order: Order) => void;
  enabled?: boolean;
}

export const useCashierSocket = ({
  token,
  onOrderPending,
  onOrderUpdated,
  onOrderAccepted,
  enabled = true,
}: UseCashierSocketProps) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !token) return;

    const namespaceUrl = `${env.socketUrl.replace(/\/$/, '')}/orders`;

    socketRef.current = io(namespaceUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('order.pending', (order: Order) => {
      console.log('Cashier socket: order.pending', order.id);
      onOrderPending?.(order);
    });

    socket.on('order.updated', (order: Order) => {
      console.log('Cashier socket: order.updated', order.id);
      onOrderUpdated?.(order);
    });

    socket.on('order.accepted', (order: Order) => {
      console.log('Cashier socket: order.accepted', order.id);
      onOrderAccepted?.(order);
    });

    socket.on('connect', () => console.log('Cashier socket connected'));
    socket.on('disconnect', () => console.log('Cashier socket disconnected'));
    socket.on('connect_error', (err) =>
      console.warn('Cashier socket error:', err.message)
    );

    return () => {
      socket.off('order.pending');
      socket.off('order.updated');
      socket.off('order.accepted');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, token]);

  return { isConnected: socketRef.current?.connected ?? false };
};
