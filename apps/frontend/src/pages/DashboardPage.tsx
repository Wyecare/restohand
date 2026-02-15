import React, { useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  useDashboardTranslation,
  useCommonTranslation,
} from '@/hooks/use-translation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import {
  useGetRestaurantQuery,
  useGetDashboardMetricsQuery,
} from '@/store/api/restaurantsApi';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { useBranchContext } from '@/contexts/BranchContext';
import KycCompletionBanner from '@/components/KycCompletionBanner';
import {
  RefreshCw,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Minus,
  UtensilsCrossed,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  Line,
  LineChart,
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

const DashboardPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const session = useAppSelector(selectAuthSession);
  const { currentBranch } = useBranchContext();
  const { t: tDashboard } = useDashboardTranslation();
  const { t: tCommon, formatCurrency: formatCurrencyLocale } =
    useCommonTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<
    'today' | '7d' | '30d' | '3m' | '1y'
  >('today');

  const {
    data: restaurant,
    isLoading: isRestaurantLoading,
    isError: isRestaurantError,
  } = useGetRestaurantQuery(restaurantId ?? skipToken);

  const branchId = currentBranch?._id;
  const {
    data: dashboardMetrics,
    isLoading: isMetricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useGetDashboardMetricsQuery(
    restaurantId
      ? {
          restaurantId,
          branchId,
          period: selectedPeriod,
        }
      : skipToken
  );

  // Real-time order updates via WebSocket
  useOrdersSocket({
    onEvent: refetchMetrics,
    enabled: !!restaurantId,
  });

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Minus;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Chart Configs with proper shadcn/ui format
  const revenueChartConfig = {
    revenue: {
      label: 'Revenue',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  const ordersChartConfig = {
    orders: {
      label: 'Orders',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  const barChartConfig = {
    orders: {
      label: 'Orders',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  // Prepare chart data
  const revenueChartData = useMemo(() => {
    if (!dashboardMetrics?.charts) {
      // Return sample data with realistic revenue pattern for a restaurant
      return Array.from({ length: 24 }, (_, i) => {
        let baseRevenue = 500;
        // Simulate restaurant peak hours: lunch (11-14) and dinner (18-22)
        if ((i >= 11 && i <= 14) || (i >= 18 && i <= 22)) {
          baseRevenue = 1200 + Math.floor(Math.random() * 800);
        } else if (i >= 7 && i <= 10) {
          // Breakfast
          baseRevenue = 300 + Math.floor(Math.random() * 400);
        } else if (i >= 15 && i <= 17) {
          // Afternoon
          baseRevenue = 200 + Math.floor(Math.random() * 300);
        } else {
          // Off hours
          baseRevenue = Math.floor(Math.random() * 200);
        }

        return {
          time: `${i.toString().padStart(2, '0')}:00`,
          revenue: baseRevenue,
        };
      });
    }
    const revenueChart = dashboardMetrics.charts.find((c) => c.type === 'line');
    if (!revenueChart || revenueChart.data.length === 0) {
      // Generate sample revenue data with realistic restaurant pattern
      return Array.from({ length: 24 }, (_, i) => {
        let baseRevenue = 500;
        if ((i >= 11 && i <= 14) || (i >= 18 && i <= 22)) {
          baseRevenue = 1200 + Math.floor(Math.random() * 800);
        } else if (i >= 7 && i <= 10) {
          baseRevenue = 300 + Math.floor(Math.random() * 400);
        } else if (i >= 15 && i <= 17) {
          baseRevenue = 200 + Math.floor(Math.random() * 300);
        } else {
          baseRevenue = Math.floor(Math.random() * 200);
        }

        return {
          time: `${i.toString().padStart(2, '0')}:00`,
          revenue: baseRevenue,
        };
      });
    }

    // Create a proper 24-hour local time array and map UTC data to correct slots
    return Array.from({ length: 24 }, (_, localHour) => {
      // Find the UTC hour that corresponds to this local hour
      const now = new Date();
      const localDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        localHour
      );
      const utcHour = localDate.getUTCHours();

      // Find the revenue for this UTC hour in the data
      const revenueValue = revenueChart.data[utcHour]?.value || 0;

      return {
        time: `${localHour.toString().padStart(2, '0')}:00`,
        revenue: revenueValue,
      };
    });
  }, [dashboardMetrics]);

  const ordersChartData = useMemo(() => {
    if (!dashboardMetrics?.charts) {
      // Return sample orders data with realistic restaurant patterns
      return Array.from({ length: 24 }, (_, i) => {
        let baseOrders = 2;
        // Simulate restaurant peak hours: lunch (11-14) and dinner (18-22)
        if ((i >= 11 && i <= 14) || (i >= 18 && i <= 22)) {
          baseOrders = 15 + Math.floor(Math.random() * 10);
        } else if (i >= 7 && i <= 10) {
          // Breakfast
          baseOrders = 8 + Math.floor(Math.random() * 5);
        } else if (i >= 15 && i <= 17) {
          // Afternoon
          baseOrders = 5 + Math.floor(Math.random() * 5);
        } else {
          // Off hours
          baseOrders = Math.floor(Math.random() * 3);
        }

        return {
          time: `${i.toString().padStart(2, '0')}:00`,
          orders: baseOrders,
        };
      });
    }
    const ordersChart = dashboardMetrics.charts.find((c) => c.type === 'area');
    if (!ordersChart || ordersChart.data.length === 0) {
      // Generate sample orders data with realistic patterns
      return Array.from({ length: 24 }, (_, i) => {
        let baseOrders = 2;
        if ((i >= 11 && i <= 14) || (i >= 18 && i <= 22)) {
          baseOrders = 15 + Math.floor(Math.random() * 10);
        } else if (i >= 7 && i <= 10) {
          baseOrders = 8 + Math.floor(Math.random() * 5);
        } else if (i >= 15 && i <= 17) {
          baseOrders = 5 + Math.floor(Math.random() * 5);
        } else {
          baseOrders = Math.floor(Math.random() * 3);
        }

        return {
          time: `${i.toString().padStart(2, '0')}:00`,
          orders: baseOrders,
        };
      });
    }

    // Create a proper 24-hour local time array and map UTC data to correct slots
    return Array.from({ length: 24 }, (_, localHour) => {
      // Find the UTC hour that corresponds to this local hour
      const now = new Date();
      const localDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        localHour
      );
      const utcHour = localDate.getUTCHours();

      // Find the orders count for this UTC hour in the data
      const ordersValue = ordersChart.data[utcHour]?.value || 0;

      return {
        time: `${localHour.toString().padStart(2, '0')}:00`,
        orders: ordersValue,
      };
    });
  }, [dashboardMetrics]);

  const barChartData = useMemo(() => {
    if (
      !dashboardMetrics?.peakHours ||
      dashboardMetrics.peakHours.length === 0
    ) {
      // Use peak hours data directly if available, otherwise generate sample
      const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 8 PM
      return hours.map((hour) => ({
        hour: `${hour}:00`,
        orders: Math.floor(Math.random() * 15) + 1,
        revenue: Math.floor(Math.random() * 2000) + 200,
      }));
    }

    // Create a proper 24-hour local time array and map UTC peak hours to correct slots
    return Array.from({ length: 24 }, (_, localHour) => {
      // Find the UTC hour that corresponds to this local hour
      const now = new Date();
      const localDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        localHour
      );
      const utcHour = localDate.getUTCHours();

      // Find the peak data for this UTC hour
      const peakData = dashboardMetrics.peakHours.find(
        (p) => p.hour === utcHour
      );

      return {
        hour: `${localHour.toString().padStart(2, '0')}:00`,
        orders: peakData?.orderCount || 0,
        revenue: peakData?.revenue || 0,
      };
    });
  }, [dashboardMetrics]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {restaurant.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session.displayName?.split(' ')[0] || 'there'} 👋
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select
            value={selectedPeriod}
            onValueChange={(value: 'today' | '7d' | '30d' | '3m' | '1y') =>
              setSelectedPeriod(value)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refetchMetrics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KYC Banner */}
      <KycCompletionBanner />

      {/* Loading State */}
      {isMetricsLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {metricsError && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-destructive">Failed to load dashboard metrics</p>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {dashboardMetrics && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Total Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyLocale(dashboardMetrics.revenue.total.current)}
                </div>
                <div className="flex items-center text-xs mt-1">
                  {React.createElement(
                    getTrendIcon(dashboardMetrics.revenue.total.trend),
                    {
                      className: `h-3 w-3 mr-1 ${getTrendColor(
                        dashboardMetrics.revenue.total.trend
                      )}`,
                    }
                  )}
                  <span
                    className={getTrendColor(
                      dashboardMetrics.revenue.total.trend
                    )}
                  >
                    {formatChange(dashboardMetrics.revenue.total.change)} from
                    last period
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Total Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Orders
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardMetrics.orders.total.current}
                </div>
                <div className="flex items-center text-xs mt-1">
                  {React.createElement(
                    getTrendIcon(dashboardMetrics.orders.total.trend),
                    {
                      className: `h-3 w-3 mr-1 ${getTrendColor(
                        dashboardMetrics.orders.total.trend
                      )}`,
                    }
                  )}
                  <span
                    className={getTrendColor(
                      dashboardMetrics.orders.total.trend
                    )}
                  >
                    {formatChange(dashboardMetrics.orders.total.change)} from
                    last period
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Average Ticket */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Order Value
                </CardTitle>
                <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyLocale(
                    dashboardMetrics.revenue.averageTicket.current
                  )}
                </div>
                <div className="flex items-center text-xs mt-1">
                  {React.createElement(
                    getTrendIcon(dashboardMetrics.revenue.averageTicket.trend),
                    {
                      className: `h-3 w-3 mr-1 ${getTrendColor(
                        dashboardMetrics.revenue.averageTicket.trend
                      )}`,
                    }
                  )}
                  <span
                    className={getTrendColor(
                      dashboardMetrics.revenue.averageTicket.trend
                    )}
                  >
                    {formatChange(
                      dashboardMetrics.revenue.averageTicket.change
                    )}{' '}
                    from last period
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row: All 3 Charts in One Row (Desktop) / Stacked (Mobile) */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            {/* Revenue Line Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Revenue Over Time</CardTitle>
                <CardDescription className="text-xs">
                  {dashboardMetrics.period.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={revenueChartConfig}
                  className="h-[200px] w-full"
                >
                  <LineChart
                    accessibilityLayer
                    data={revenueChartData}
                    margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value}
                      className="text-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `₹${value}`}
                      className="text-muted-foreground"
                      tick={{ fontSize: 11 }}
                      width={45}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => `Time: ${value}`}
                          formatter={(value) => [`₹${value}`, 'Revenue']}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Orders Area Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Orders Over Time</CardTitle>
                <CardDescription className="text-xs">
                  {dashboardMetrics.period.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={ordersChartConfig}
                  className="h-[200px] w-full"
                >
                  <AreaChart
                    accessibilityLayer
                    data={ordersChartData}
                    margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-muted-foreground"
                      tick={{ fontSize: 11 }}
                      width={35}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => `Time: ${value}`}
                          formatter={(value) => [`${value}`, 'Orders']}
                        />
                      }
                    />
                    <Area
                      type="natural"
                      dataKey="orders"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Peak Hours Bar Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Peak Hours</CardTitle>
                <CardDescription className="text-xs">
                  Orders by hour
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={barChartConfig}
                  className="h-[200px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={barChartData}
                    margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-muted-foreground"
                      tick={{ fontSize: 11 }}
                      width={35}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => `Hour: ${value}`}
                          formatter={(value, _, props) => [
                            `${value} orders • ₹${props.payload.revenue}`,
                            'Orders',
                          ]}
                        />
                      }
                    />
                    <Bar dataKey="orders" radius={4} fill="#9fa5ff" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          {dashboardMetrics.recentOrders.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>
                      Latest transactions from your restaurant
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/orders" className="gap-1">
                      View All
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardMetrics.recentOrders.slice(0, 5).map((order) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {order.tableNumber
                              ? `Table ${order.tableNumber}`
                              : 'No table'}{' '}
                            • {order.timeSinceOrdered}m ago
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                        <span className="font-semibold">
                          {formatCurrencyLocale(order.totalAmount)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!isMetricsLoading && !metricsError && !dashboardMetrics && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No dashboard data available yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Start taking orders to see your metrics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
