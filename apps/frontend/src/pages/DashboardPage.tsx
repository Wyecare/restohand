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
import { RefreshCw, CreditCard, ShoppingBag, QrCode } from 'lucide-react';

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
    restaurantId ? { restaurantId, limit: 5, page: 1 } : skipToken
  );

  const totalOrders = recentOrders?.total ?? 0;
  const totalRevenue = recentOrders?.data.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );

  const restaurantCurrency = restaurant?.upi.mode === 'dynamic' ? 'INR' : 'INR';

  if (!session?.restaurantId) return <Navigate to="/onboarding" replace />;

  if (isRestaurantLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (isRestaurantError || !restaurant)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-destructive">
        Unable to load restaurant details. Please try again.
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">{restaurant.name}</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.displayName ?? session.email ?? 'manager'} 👋
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-all border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Live Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {isOrdersLoading ? '—' : totalOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active orders in last sync
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Revenue Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {isOrdersLoading
                ? '—'
                : formatCurrency(totalRevenue ?? 0, restaurantCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sum of captured payments
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              UPI Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold capitalize">
              {restaurant.upi.mode}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              QR workflow in use
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              Recent Orders
            </CardTitle>
            <CardDescription>Last five placed via QR and POS</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchOrders}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isOrdersLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : recentOrders && recentOrders.data.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.data.map((order) => (
                    <TableRow
                      key={order.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName ?? 'Walk-in'}</TableCell>
                      <TableCell className="capitalize">
                        {order.status.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="capitalize">
                        {order.paymentStatus.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.totalAmount, restaurantCurrency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableCaption>
                  <Link to="/orders" className="text-primary hover:underline">
                    View all orders
                  </Link>
                </TableCaption>
              </Table>
            </div>
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
