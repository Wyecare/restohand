import { useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useGetPublicOrderQuery } from '@/store/api/restaurantsApi';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import type { Order } from '@/store/api/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

const progressDisplay = (value: Order['progress']) => {
  switch (value) {
    case 0:
      return 'Not started';
    case 40:
      return 'Prep started';
    case 60:
      return 'Almost ready';
    case 100:
      return 'Ready';
    default:
      return `${value}%`;
  }
};

const paymentStatusLabel = (status: Order['paymentStatus']) =>
  status.replace('_', ' ');

const CustomerOrderStatusPage = () => {
  const { slug = '', orderId = '' } = useParams();
  const { data, isLoading, isError, refetch } = useGetPublicOrderQuery(
    { slug, orderId },
    { skip: !slug || !orderId }
  );

  const order = data;

  const handleSocketEvent = useCallback(
    (incoming: Order) => {
      if (incoming.id === orderId) {
        refetch();
      }
    },
    [orderId, refetch]
  );

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!orderId });

  const progressValue = order?.progress ?? 0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Order not found or no longer available.
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Ticket #{order.orderNumber}
        </h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll keep this page updated as your order moves through the kitchen.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order progress</CardTitle>
          <CardDescription>
            Latest update: {progressDisplay(progressValue)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressValue} />
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize">
              {order.status.replace('_', ' ')}
            </Badge>
            <Badge variant={order.paymentMethod === 'cash' ? 'destructive' : 'secondary'}>
              {order.paymentMethod === 'cash' ? 'Cash due' : 'UPI'}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {paymentStatusLabel(order.paymentStatus)}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Placed on: {new Date(order.createdAt).toLocaleString()}</p>
            {order.readyAt && (
              <p>Ready at: {new Date(order.readyAt).toLocaleString()}</p>
            )}
            {order.paidAt && (
              <p>Paid at: {new Date(order.paidAt).toLocaleString()}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div
              key={`${item.name}-${item.quantity}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>{item.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">×{item.quantity}</span>
                <span className="font-medium text-foreground">
                  ₹{item.pricing.unitAmount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span>₹{order.totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerOrderStatusPage;
