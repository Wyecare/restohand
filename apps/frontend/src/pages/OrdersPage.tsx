import { useMemo, useState, useCallback } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Navigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useToast } from '@/components/ui/use-toast';
import {
  useListOrdersQuery,
  useUpdateOrderPaymentMutation,
  useUpdateOrderStatusMutation,
} from '@/store/api/ordersApi';
import type { Order } from '@/store/api/types';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';

const statusOptions: Array<{ label: string; value: Order['status'] | 'all' }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Ready', value: 'ready' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const paymentOptions: Array<{
  label: string;
  value: Order['paymentStatus'] | 'all';
}> = [
  { label: 'All payments', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Authorized', value: 'authorized' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
];

const PAGE_SIZE = 20;

const OrdersPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [status, setStatus] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const { toast } = useToast();

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const queryArgs = useMemo(() => {
    if (!restaurantId) return skipToken;
    return {
      restaurantId,
      status: status !== 'all' ? (status as Order['status']) : undefined,
      paymentStatus:
        paymentStatus !== 'all'
          ? (paymentStatus as Order['paymentStatus'])
          : undefined,
      limit: PAGE_SIZE,
      page: 1,
    } as const;
  }, [restaurantId, status, paymentStatus]);

  const { data, isLoading, refetch, isError } = useListOrdersQuery(queryArgs);

  const [updateOrderStatus, { isLoading: isUpdatingStatus }] =
    useUpdateOrderStatusMutation();
  const [updateOrderPayment, { isLoading: isUpdatingPayment }] =
    useUpdateOrderPaymentMutation();

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: Order['status']
  ) => {
    if (!restaurantId) return;
    try {
      await updateOrderStatus({
        restaurantId,
        orderId,
        status: newStatus,
      }).unwrap();
      toast({ title: 'Order status updated' });
    } catch (error) {
      toast({
        title: 'Unable to update order',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    if (!restaurantId) return;
    try {
      await updateOrderPayment({
        restaurantId,
        orderId,
        paymentStatus: 'paid',
      }).unwrap();
      toast({ title: 'Order marked paid' });
    } catch (error) {
      toast({
        title: 'Unable to update payment',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSocketEvent = useCallback(() => {
    refetch();
  }, [refetch]);

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!restaurantId });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-muted-foreground">
            Monitor dining room, takeaway, and QR orders in real time.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} size="sm">
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              {paymentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-0">
          {data ? (
            <div className="flex items-center justify-between px-4 pt-4 text-sm text-muted-foreground">
              <span>Total matching orders: {data.total}</span>
              <span>Showing first {Math.min(data.data.length, PAGE_SIZE)} records</span>
            </div>
          ) : null}
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-sm text-destructive">
              Unable to load orders. Please try again.
            </div>
          ) : data && data.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.customerName ?? 'Walk-in'}</TableCell>
                    <TableCell>{order.tableNumber ?? '-'}</TableCell>
                    <TableCell className="capitalize">
                      {order.status.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.paymentStatus.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.paymentMethod === 'cash' ? 'Cash' : 'UPI'}
                    </TableCell>
                    <TableCell>₹{order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(order.updatedAt).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdatingStatus}
                          onClick={() =>
                            handleStatusUpdate(order.id, 'ready')
                          }
                        >
                          Mark ready
                        </Button>
                        {order.paymentStatus !== 'paid' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isUpdatingPayment}
                            onClick={() => handleMarkPaid(order.id)}
                          >
                            Mark paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No orders found for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;
