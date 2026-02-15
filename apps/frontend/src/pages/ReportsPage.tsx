import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import {
  CalendarIcon,
  DownloadIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  StarIcon,
  ClockIcon,
  PieChart,
  BarChart3Icon,
  LineChart,
  DollarSignIcon,
  MinusIcon,
  Users2Icon,
  TargetIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetComprehensiveAnalyticsQuery,
  useDownloadOptimizedPdfReportMutation,
} from '@/store/api/reportsApi';
import type { ReportsQueryParams } from '@/store/api/types/reports.types';
import { useBranchContext } from '@/contexts/BranchContext';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
  switch (trend) {
    case 'up':
      return <TrendingUpIcon className="h-3 w-3 text-green-500" />;
    case 'down':
      return <TrendingDownIcon className="h-3 w-3 text-red-500" />;
    default:
      return <MinusIcon className="h-3 w-3 text-gray-500" />;
  }
};

const getTrendColor = (trend: 'up' | 'down' | 'same') => {
  switch (trend) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

const ReportsPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  // Query state
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '3m' | '1y'>(
    '30d'
  );
  const [customDateRange, setCustomDateRange] = useState<
    DateRange | undefined
  >();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'performance'
  >('overview');

  // Build query params
  const queryParams: ReportsQueryParams = {
    period: customDateRange ? undefined : period,
    from: customDateRange?.from?.toISOString(),
    to: customDateRange?.to?.toISOString(),
    branchId: currentBranch?._id,
  };

  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
  } = useGetComprehensiveAnalyticsQuery(restaurantId ? queryParams : skipToken);

  const [downloadPdf, { isLoading: isDownloading }] =
    useDownloadOptimizedPdfReportMutation();

  const handleDownloadPDF = async () => {
    if (!restaurantId) return;

    try {
      const blob = await downloadPdf(queryParams).unwrap();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprehensive-restaurant-report-${period}-${
        new Date().toISOString().split('T')[0]
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Downloaded',
        description:
          'Your comprehensive PDF report has been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Unable to generate PDF report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="text-sm text-destructive text-center">
          Unable to load comprehensive reports right now.
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.revenue.total.current || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {getTrendIcon(metrics?.revenue.total.trend || 'same')}
              <span
                className={`ml-1 ${getTrendColor(
                  metrics?.revenue.total.trend || 'same'
                )}`}
              >
                {formatPercent(Math.abs(metrics?.revenue.total.change || 0))}
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.orders.total.current || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {getTrendIcon(metrics?.orders.total.trend || 'same')}
              <span
                className={`ml-1 ${getTrendColor(
                  metrics?.orders.total.trend || 'same'
                )}`}
              >
                {formatPercent(Math.abs(metrics?.orders.total.change || 0))}
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Ticket
            </CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.revenue.averageTicket.current || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {getTrendIcon(metrics?.revenue.averageTicket.trend || 'same')}
              <span
                className={`ml-1 ${getTrendColor(
                  metrics?.revenue.averageTicket.trend || 'same'
                )}`}
              >
                {formatPercent(
                  Math.abs(metrics?.revenue.averageTicket.change || 0)
                )}
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(metrics?.orders.successRate.current || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {getTrendIcon(metrics?.orders.successRate.trend || 'same')}
              <span
                className={`ml-1 ${getTrendColor(
                  metrics?.orders.successRate.trend || 'same'
                )}`}
              >
                {formatPercent(
                  Math.abs(metrics?.orders.successRate.change || 0)
                )}
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Compact Layout */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {metrics?.charts.slice(0, 4).map((chart) => {
          // Convert UTC hours to local time for hourly charts
          const chartData = chart.data.map((d, i) => {
            if (chart.title.includes('Hour') || chart.title.includes('Trend') || chart.title.includes('Volume')) {
              // For hourly data, convert UTC hour to local time
              const now = new Date();
              const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i);
              const utcHour = localDate.getUTCHours();
              const originalData = chart.data.find((item, idx) => idx === utcHour) || { value: 0 };

              return {
                ...d,
                label: `${i.toString().padStart(2, '0')}:00`,
                value: originalData.value,
              };
            }
            return d;
          });

          return (
            <Card key={chart.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{chart.title}</CardTitle>
                {chart.yAxisLabel && (
                  <CardDescription className="text-xs">
                    {chart.yAxisLabel}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.type === 'line' && (
                      <RechartsLineChart
                        data={chartData}
                        margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          tickMargin={8}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickMargin={8}
                          width={45}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={chart.colors?.[0] || COLORS[0]}
                          strokeWidth={2}
                          dot={false}
                        />
                      </RechartsLineChart>
                    )}
                    {chart.type === 'area' && (
                      <AreaChart
                        data={chartData}
                        margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          tickMargin={8}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickMargin={8}
                          width={45}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={chart.colors?.[0] || COLORS[0]}
                          fill={chart.colors?.[0] || COLORS[0]}
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    )}
                    {chart.type === 'bar' && (
                      <BarChart
                        data={chartData}
                        margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          tickMargin={8}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickMargin={8}
                          width={45}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="value"
                          fill={chart.colors?.[0] || COLORS[0]}
                          radius={4}
                        />
                      </BarChart>
                    )}
                    {(chart.type === 'pie' || chart.type === 'donut') && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-muted-foreground text-sm">
                          Chart visualization coming soon
                        </div>
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Revenue Breakdown
            </CardTitle>
            <CardDescription>Revenue by payment method</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cash Revenue</span>
                <div className="text-right">
                  <div className="font-bold">
                    {formatCurrency(metrics?.revenue.cash.current || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercent(metrics?.payments.cashPercentage || 0)}
                  </div>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${metrics?.payments.cashPercentage || 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">UPI Revenue</span>
                <div className="text-right">
                  <div className="font-bold">
                    {formatCurrency(metrics?.revenue.upi.current || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercent(metrics?.payments.upiPercentage || 0)}
                  </div>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${metrics?.payments.upiPercentage || 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Card Revenue</span>
                <div className="text-right">
                  <div className="font-bold">
                    {formatCurrency(metrics?.revenue.card.current || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercent(metrics?.payments.cardPercentage || 0)}
                  </div>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-purple-500"
                  style={{ width: `${metrics?.payments.cardPercentage || 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StarIcon className="h-5 w-5" />
              Top Menu Items
            </CardTitle>
            <CardDescription>Best performers by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.topMenuItems.slice(0, 5).map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="w-6 h-6 p-0 flex items-center justify-center text-xs"
                    >
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.category} • {item.orderCount} orders •{' '}
                        {formatPercent(item.profitMargin)} margin
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-mono">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Customer Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <Users2Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.customerAnalytics.totalCustomers.current || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {getTrendIcon(
                metrics?.customerAnalytics.totalCustomers.trend || 'same'
              )}
              <span
                className={`ml-1 ${getTrendColor(
                  metrics?.customerAnalytics.totalCustomers.trend || 'same'
                )}`}
              >
                {formatPercent(
                  Math.abs(
                    metrics?.customerAnalytics.totalCustomers.change || 0
                  )
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.customerAnalytics.newCustomers.current || 0}
            </div>
            <div className="text-xs text-muted-foreground">This period</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Retention Rate
            </CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(
                metrics?.customerAnalytics.retentionRate.current || 0
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {getTrendIcon(
                metrics?.customerAnalytics.retentionRate.trend || 'same'
              )}
              <span
                className={`ml-1 ${getTrendColor(
                  metrics?.customerAnalytics.retentionRate.trend || 'same'
                )}`}
              >
                {formatPercent(
                  Math.abs(metrics?.customerAnalytics.retentionRate.change || 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer LTV</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                metrics?.customerAnalytics.customerLifetimeValue.current || 0
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Average lifetime value
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Category Performance
          </CardTitle>
          <CardDescription>
            Revenue breakdown by menu categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metrics?.categoryPerformance.slice(0, 6).map((category) => (
              <div
                key={category.id}
                className="space-y-2 p-4 border rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{category.name}</h4>
                  <Badge variant="secondary">
                    {formatPercent(category.revenuePercentage)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {category.orderCount} orders • Avg:{' '}
                  {formatCurrency(category.averageItemPrice)}
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(category.revenue)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Top: {category.topItem.name} ({category.topItem.orderCount}{' '}
                  orders)
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Time Performance Analysis
          </CardTitle>
          <CardDescription>Performance patterns by time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Busiest Day
              </div>
              <div className="text-lg font-bold">
                {new Date(
                  metrics?.timeAnalytics.busiestDay.date || ''
                ).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics?.timeAnalytics.busiestDay.orderCount} orders,{' '}
                {formatCurrency(metrics?.timeAnalytics.busiestDay.revenue || 0)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Peak Hour
              </div>
              <div className="text-lg font-bold">
                {(() => {
                  const utcHour = metrics?.timeAnalytics.peakHours[0]?.hour || 0;
                  const now = new Date();
                  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour));
                  const localHour = utcDate.getHours();
                  return `${localHour.toString().padStart(2, '0')}:00`;
                })()}
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics?.timeAnalytics.peakHours[0]?.orderCount || 0} avg
                orders
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Avg Wait Time
              </div>
              <div className="text-lg font-bold">
                {(
                  metrics?.timeAnalytics.peakHours[0]?.averageWaitTime || 0
                ).toFixed(1)}{' '}
                min
              </div>
              <div className="text-xs text-muted-foreground">
                During peak hours
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Orders/Hour
              </div>
              <div className="text-lg font-bold">
                {(metrics?.orders.ordersPerHour.current || 0).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">
                Average throughout day
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Profitability Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                metrics?.profitabilityMetrics.grossProfit.current || 0
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatPercent(
                metrics?.profitabilityMetrics.grossProfitMargin.current || 0
              )}{' '}
              margin
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                metrics?.profitabilityMetrics.netProfit.current || 0
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatPercent(
                metrics?.profitabilityMetrics.netProfitMargin.current || 0
              )}{' '}
              margin
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost of Goods</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                metrics?.profitabilityMetrics.costOfGoodsSold.current || 0
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {getTrendIcon(
                metrics?.profitabilityMetrics.costOfGoodsSold.trend || 'same'
              )}
              <span
                className={`ml-1 ${getTrendColor(
                  metrics?.profitabilityMetrics.costOfGoodsSold.trend || 'same'
                )}`}
              >
                {formatPercent(
                  Math.abs(
                    metrics?.profitabilityMetrics.costOfGoodsSold.change || 0
                  )
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Operating Expenses
            </CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                metrics?.profitabilityMetrics.operatingExpenses.current || 0
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Fixed + variable costs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Recent Orders
          </CardTitle>
          <CardDescription>Latest order activity</CardDescription>
        </CardHeader>
        <CardContent>
          {!metrics?.recentOrders.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No recent orders to display
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Time Ago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentOrders.slice(0, 10).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.tableNumber}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === 'completed'
                            ? 'default'
                            : order.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {order.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.paymentMethod}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {order.timeSinceOrdered}m ago
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <Select
            value={customDateRange ? 'custom' : period}
            onValueChange={(value) => {
              if (value === 'custom') return;
              setPeriod(value as 'today' | '7d' | '30d' | '3m' | '1y');
              setCustomDateRange(undefined);
            }}
          >
            <SelectTrigger className="w-35">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={customDateRange}
                onSelect={(range) => {
                  setCustomDateRange(range);
                  if (range?.from && range?.to) {
                    setPeriod('30d'); // Reset period when custom range is set
                  }
                }}
                numberOfMonths={2}
                disabled={(date: Date) =>
                  date > new Date() || date < new Date('2020-01-01')
                }
              />
            </PopoverContent>
          </Popover>

          {/* <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="gap-2"
          >
            {isDownloading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
            Download PDF
          </Button> */}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3Icon },
            { id: 'analytics', label: 'Analytics', icon: LineChart },
            { id: 'performance', label: 'Performance', icon: TargetIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as 'overview' | 'analytics' | 'performance')
              }
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
      </div>
    </div>
  );
};

export default ReportsPage;
