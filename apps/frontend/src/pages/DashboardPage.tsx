import { Link, Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import { useGetRestaurantQuery } from '@/store/api/restaurantsApi';
import { useListOrdersQuery } from '@/store/api/ordersApi';

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

const DashboardPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const session = useAppSelector(selectAuthSession);

  const {
    data: restaurant,
    isLoading: isRestaurantLoading,
    isError: isRestaurantError,
  } = useGetRestaurantQuery(restaurantId ?? skipToken);

  const {
    data: recentOrders,
    isLoading: isOrdersLoading,
    refetch: refetchOrders,
  } = useListOrdersQuery(
    restaurantId
      ? { restaurantId, limit: 5, page: 1 }
      : skipToken
  );

  const totalOrders = recentOrders?.total ?? 0;
  const totalRevenue = recentOrders?.data.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );

  const restaurantCurrency = restaurant?.upi.mode === 'dynamic' ? 'INR' : 'INR';

  if (!session?.restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isRestaurantLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isRestaurantError || !restaurant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-destructive">
        Unable to load restaurant details. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.displayName ?? session.email ?? 'manager'}. Here's a snapshot of today's operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Live Orders</CardTitle>
            <CardDescription>Orders in the last sync window</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {isOrdersLoading ? '—' : totalOrders}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Snapshot</CardTitle>
            <CardDescription>Sum of captured payments</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {isOrdersLoading
              ? '—'
              : formatCurrency(totalRevenue ?? 0, restaurantCurrency)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UPI Mode</CardTitle>
            <CardDescription>QR workflow in use</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold capitalize">
            {restaurant.upi.mode}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Last five orders placed via QR and POS channels.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={refetchOrders} size="sm">
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isOrdersLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : recentOrders && recentOrders.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.orderNumber}</TableCell>
                    <TableCell>{order.customerName ?? 'Walk-in'}</TableCell>
                    <TableCell className="capitalize">
                      {order.status.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.paymentStatus.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(
                        order.totalAmount,
                        restaurantCurrency
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                <Link
                  to="/orders"
                  className="text-primary hover:underline"
                >
                  View all orders
                </Link>
              </TableCaption>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No orders yet. Share your QR code to start accepting orders.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
