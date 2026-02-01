import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';
import type { Order } from '@/store/api/types';

type OrdersSocketOptions = {
  onEvent?: (order: Order) => void;
  enabled?: boolean;
};

export const useOrdersSocket = ({
  onEvent,
  enabled = true,
}: OrdersSocketOptions) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const namespaceUrl = `${env.wsBaseUrl.replace(/\/$/, '')}/orders`;
    const socket: Socket = io(namespaceUrl);

    const handler = (order: Order) => {
      console.log('Received order event via socket:', order);
      onEvent?.(order);
    };

    socket.on('order.created', handler);
    socket.on('order.updated', handler);

    return () => {
      socket.off('order.created', handler);
      socket.off('order.updated', handler);
      socket.disconnect();
    };
  }, [onEvent, enabled]);
};
