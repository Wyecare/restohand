import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { useDashboardTranslation, useCommonTranslation } from '@/hooks/use-translation';
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
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import { useGetRestaurantQuery } from '@/store/api/restaurantsApi';
import { useListOrdersQuery } from '@/store/api/ordersApi';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';
import {
  RefreshCw,
  CreditCard,
  ShoppingBag,
  QrCode,
  Wallet,
  TrendingUp,
  Clock,
  UtensilsCrossed,
} from 'lucide-react';

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

const DashboardPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const session = useAppSelector(selectAuthSession);
  const { t: tDashboard } = useDashboardTranslation();
  const { t: tCommon, formatCurrency: formatCurrencyLocale } = useCommonTranslation();

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

  // Real-time order updates via WebSocket
  useOrdersSocket({
    onEvent: refetchOrders,
    enabled: !!restaurantId
  });

  const totalOrders = recentOrders?.total ?? 0;
  const totalRevenue = recentOrders?.data.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );

  const paymentSummary = useMemo(() => {
    let cashTickets = 0;
    let upiTickets = 0;
    let cashAmount = 0;
    let upiAmount = 0;

    recentOrders?.data.forEach((order) => {
      if (order.paymentMethod === 'cash') {
        cashTickets += 1;
        cashAmount += order.totalAmount;
      } else {
        upiTickets += 1;
        upiAmount += order.totalAmount;
      }
    });

    const totalTickets = cashTickets + upiTickets;
    return {
      cashTickets,
      upiTickets,
      cashAmount,
      upiAmount,
      cashPercent: totalTickets
        ? Math.round((cashTickets / totalTickets) * 100)
        : 0,
      upiPercent: totalTickets
        ? Math.round((upiTickets / totalTickets) * 100)
        : 0,
    };
  }, [recentOrders]);

  const averageTicket = totalOrders > 0 ? (totalRevenue ?? 0) / totalOrders : 0;

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
        {tCommon('messages.error')}
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {restaurant.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tDashboard('welcomeBack')} {session.displayName ?? session.email ?? tCommon('user.defaultName')} 👋
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {tCommon('actions.refresh')}
        </Button>
      </div>

      {/* Restaurant Quick Stats */}
      <MetricsGrid columns={3}>
        <MetricsCard
          title={tDashboard('liveOrders')}
          value={isOrdersLoading ? '—' : totalOrders}
          description={tDashboard('activeOrdersDesc')}
          icon={ShoppingBag}
          iconColor="blue"
          loading={isOrdersLoading}
        />
        <MetricsCard
          title={tDashboard('revenue')}
          value={
            isOrdersLoading
              ? '—'
              : formatCurrencyLocale(totalRevenue ?? 0)
          }
          description={tDashboard('capturedPayments')}
          icon={CreditCard}
          iconColor="green"
          loading={isOrdersLoading}
        />
        <MetricsCard
          title={tDashboard('upiMode')}
          value={restaurant.upi.mode}
          description={tDashboard('qrWorkflow')}
          icon={QrCode}
          iconColor="purple"
        />
        <MetricsCard
          title={tDashboard('cashPayments')}
          value={`${paymentSummary.cashTickets}`}
          description={`${paymentSummary.cashPercent}% ${tDashboard('ofTickets')}`}
          icon={Wallet}
          iconColor="orange"
        />
        <MetricsCard
          title={tDashboard('upiPayments')}
          value={`${paymentSummary.upiTickets}`}
          description={`${paymentSummary.upiPercent}% ${tDashboard('ofTickets')}`}
          icon={TrendingUp}
          iconColor="blue"
        />
        <MetricsCard
          title={tDashboard('avgTicket')}
          value={formatCurrencyLocale(averageTicket ?? 0)}
          description={tDashboard('avgOrderValue')}
          icon={UtensilsCrossed}
          iconColor="gray"
        />
      </MetricsGrid>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {tDashboard('recentOrders')}
            </CardTitle>
            <CardDescription>{tDashboard('lastOrdersDesc')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchOrders}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            {tCommon('actions.refresh')}
          </Button>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {isOrdersLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : recentOrders && recentOrders.data.length > 0 ? (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{tDashboard('order')}</TableHead>
                  <TableHead>{tDashboard('table')}</TableHead>
                  <TableHead>{tDashboard('status')}</TableHead>
                  <TableHead>{tDashboard('payment')}</TableHead>
                  <TableHead>{tDashboard('method')}</TableHead>
                  <TableHead className="text-right">{tDashboard('total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.data.map((order) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    as={Link}
                    to={`/orders/${order.id}`}
                  >
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.tableNumber ?? '-'}</TableCell>
                    <TableCell className="capitalize">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          order.status === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : order.status === 'ready'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          order.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : order.paymentStatus === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.paymentStatus.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>{order.paymentMethod.toUpperCase()}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrencyLocale(order.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {tDashboard('noOrdersYet')}
            </div>
          )}
        </CardContent>

        <div className="flex justify-center py-4">
          <Link
            to="/orders"
            className="text-primary text-sm hover:underline font-medium"
          >
            {tDashboard('viewAllOrders')} →
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
