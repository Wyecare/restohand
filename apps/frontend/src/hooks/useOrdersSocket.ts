import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';
import type { Order } from '@/store/api/types';

type OrdersSocketOptions = {
  token: string | null;
  onOrderCreated?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onOrderPending?: (order: Order) => void;
  onOrderAccepted?: (order: Order) => void;
  enabled?: boolean;
};

export const useOrdersSocket = ({
  token,
  onOrderCreated,
  onOrderUpdated,
  onOrderPending,
  onOrderAccepted,
  enabled = true,
}: OrdersSocketOptions) => {
  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    const namespaceUrl = `${env.wsBaseUrl.replace(/\/$/, '')}/orders`;
    const socket: Socket = io(namespaceUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('order.created', (order: Order) => {
      console.log('WS order.created:', order.id);
      onOrderCreated?.(order);
    });

    socket.on('order.updated', (order: Order) => {
      console.log('WS order.updated:', order.id);
      onOrderUpdated?.(order);
    });

    socket.on('order.pending', (order: Order) => {
      console.log('WS order.pending:', order.id);
      onOrderPending?.(order);
    });

    socket.on('order.accepted', (order: Order) => {
      console.log('WS order.accepted:', order.id);
      onOrderAccepted?.(order);
    });

    return () => {
      socket.off('order.created');
      socket.off('order.updated');
      socket.off('order.pending');
      socket.off('order.accepted');
      socket.disconnect();
    };
  }, [token, enabled, onOrderCreated, onOrderUpdated, onOrderPending, onOrderAccepted]);
};
