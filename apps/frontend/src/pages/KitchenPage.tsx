import { useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
} from '@/store/api/ordersApi';
import type { Order } from '@/store/api/types';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';

const statusesInKitchen: Order['status'][] = [
  'pending',
  'accepted',
  'in_progress',
];

const statusLabel: Record<Order['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'Cooking',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const progressOptions = [
  { label: 'Start prep', stage: 40, status: 'in_progress' as const },
  { label: 'Almost ready', stage: 60, status: 'in_progress' as const },
  { label: 'Mark ready', stage: 100, status: 'ready' as const },
];

const KitchenPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();

  const orderArgs = restaurantId
    ? { restaurantId, limit: 20, page: 1 }
    : skipToken;

  const { data, isLoading, refetch } = useListOrdersQuery(orderArgs, {
    skip: !restaurantId,
  });

  const orders =
    data?.data.filter((order) =>
      statusesInKitchen.includes(order.status)
    ) ?? [];

  const grouped = useMemo(() => {
    const map: Record<string, Order[]> = {
      pending: [],
      accepted: [],
      in_progress: [],
    };
    orders.forEach((order) => {
      map[order.status]?.push(order);
    });
    return map;
  }, [orders]);

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleUpdate = async (orderId: string, status: Order['status'], progress?: number) => {
    await updateStatus({
      restaurantId,
      orderId,
      status,
      progress,
    });
    refetch();
  };

  const handleSocketEvent = useCallback(() => {
    refetch();
  }, [refetch]);

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!restaurantId });

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Kitchen board</h1>
        <p className="text-muted-foreground text-sm">
          Track incoming tickets and push updates as dishes move through prep.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No live orders</CardTitle>
            <CardDescription>
              New tickets will show up instantly. Enjoy the breather!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {statusesInKitchen.map((status) => (
            <Card key={status} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  {statusLabel[status]}
                </CardTitle>
                <CardDescription>
                  {grouped[status]?.length ?? 0} ticket(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
                {(grouped[status] ?? []).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          #{order.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.customerName ?? 'Guest'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Table {order.tableNumber ?? '—'} •{' '}
                          {order.items.length} item(s)
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">
                          ₹{order.totalAmount.toFixed(2)}
                        </Badge>
                        <Badge
                          variant={
                            order.paymentMethod === 'cash'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {order.paymentMethod === 'cash' ? 'Cash' : 'UPI'}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {order.items.map((item) => (
                        <div
                          key={`${order.id}-${item.menuItemId}-${item.name}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>{item.name}</span>
                          <span className="font-medium text-foreground">
                            ×{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {progressOptions.map((option) => (
                        <Button
                          key={option.label}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdate(
                              order.id,
                              option.status,
                              option.stage
                            )
                          }
                        >
                          {option.label}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isUpdating}
                        onClick={() => handleUpdate(order.id, 'ready', 100)}
                      >
                        Ticket ready
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenPage;
