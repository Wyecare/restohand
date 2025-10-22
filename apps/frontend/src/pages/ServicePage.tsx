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
  useUpdateOrderPaymentMutation,
} from '@/store/api/ordersApi';
import type { Order } from '@/store/api/types';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { useCallback } from 'react';

const serviceStatuses: Order['status'][] = ['ready', 'completed'];

const ServicePage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const orderArgs = restaurantId
    ? { restaurantId, limit: 20, page: 1 }
    : skipToken;
  const { data, isLoading, refetch } = useListOrdersQuery(orderArgs, {
    skip: !restaurantId,
  });
  const [updateStatus, { isLoading: updatingStatus }] =
    useUpdateOrderStatusMutation();
  const [updatePayment, { isLoading: updatingPayment }] =
    useUpdateOrderPaymentMutation();

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const orders =
    data?.data.filter((order) => serviceStatuses.includes(order.status)) ?? [];

  const readyOrders = orders.filter((order) => order.status === 'ready');
  const completedOrders = orders.filter((order) => order.status === 'completed');

  const handleComplete = async (orderId: string) => {
    await updateStatus({
      restaurantId,
      orderId,
      status: 'completed',
      progress: 100,
    });
    refetch();
  };

  const handleMarkPaid = async (orderId: string) => {
    await updatePayment({
      restaurantId,
      orderId,
      paymentStatus: 'paid',
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
        <h1 className="text-2xl font-semibold">Service board</h1>
        <p className="text-muted-foreground text-sm">
          Serve ready dishes, close out tables, and keep payment status updated.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Ready for pickup
              </CardTitle>
              <CardDescription>
                {readyOrders.length} ticket(s) waiting to be served
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
              {readyOrders.length ? (
                readyOrders.map((order) => (
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
                          Table {order.tableNumber ?? '—'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">
                          ₹{order.totalAmount.toFixed(2)}
                        </Badge>
                        <Badge
                          variant={
                            order.paymentMethod === 'cash'
                              ? 'destructive'
                              : 'outline'
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
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={updatingStatus}
                        onClick={() => handleComplete(order.id)}
                      >
                        Mark delivered
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <CardDescription>No ready orders at the moment.</CardDescription>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Recently completed
              </CardTitle>
              <CardDescription>
                {completedOrders.length} ticket(s) awaiting payment confirmation
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
              {completedOrders.length ? (
                completedOrders.map((order) => (
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
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">
                          {order.paymentStatus === 'paid'
                            ? 'Paid'
                            : 'Awaiting Payment'}
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
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        disabled={updatingPayment || order.paymentStatus === 'paid'}
                        onClick={() => handleMarkPaid(order.id)}
                      >
                        Mark as paid
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <CardDescription>
                  Closed tickets will accumulate here for reconciliation.
                </CardDescription>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ServicePage;
