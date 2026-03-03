import React, { useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  useDashboardTranslation,
  useCommonTranslation,
} from '@/hooks/use-translation';
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
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ArrowRight,
  CheckCircle,
  Circle,
  Utensils,
  ReceiptText,
  BadgeIndianRupee,
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
  ResponsiveContainer,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrencyShort(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${amount.toFixed(0)}`;
}

function getTrendIcon(trend: 'up' | 'down' | 'same') {
  switch (trend) {
    case 'up': return TrendingUp;
    case 'down': return TrendingDown;
    default: return Minus;
  }
}

function getTrendColor(trend: 'up' | 'down' | 'same') {
  switch (trend) {
    case 'up': return 'text-emerald-600';
    case 'down': return 'text-red-500';
    default: return 'text-slate-400';
  }
}

function getTrendBg(trend: 'up' | 'down' | 'same') {
  switch (trend) {
    case 'up': return 'bg-emerald-50 text-emerald-700';
    case 'down': return 'bg-red-50 text-red-600';
    default: return 'bg-slate-50 text-slate-500';
  }
}

function formatChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Sample data generators ───────────────────────────────────────────────────

function sampleRevenueData() {
  return Array.from({ length: 24 }, (_, i) => {
    let base = 0;
    if ((i >= 11 && i <= 14) || (i >= 18 && i <= 22)) base = 1200 + Math.floor(Math.random() * 800);
    else if (i >= 7 && i <= 10) base = 300 + Math.floor(Math.random() * 400);
    else if (i >= 15 && i <= 17) base = 200 + Math.floor(Math.random() * 300);
    else base = Math.floor(Math.random() * 200);
    return { time: `${i.toString().padStart(2, '0')}:00`, revenue: base };
  });
}

function sampleOrdersData() {
  return Array.from({ length: 24 }, (_, i) => {
    let base = 0;
    if ((i >= 11 && i <= 14) || (i >= 18 && i <= 22)) base = 15 + Math.floor(Math.random() * 10);
    else if (i >= 7 && i <= 10) base = 8 + Math.floor(Math.random() * 5);
    else if (i >= 15 && i <= 17) base = 5 + Math.floor(Math.random() * 5);
    else base = Math.floor(Math.random() * 3);
    return { time: `${i.toString().padStart(2, '0')}:00`, orders: base };
  });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'same';
  icon: React.ElementType;
  accent: string;
}

function KpiCard({ label, value, change, trend, icon: Icon, accent }: KpiCardProps) {
  const TrendIcon = getTrendIcon(trend);
  return (
    <div className={`relative bg-white rounded-xl border border-slate-200 p-5 shadow-sm overflow-hidden`}>
      {/* Accent stripe */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="p-1.5 bg-slate-50 rounded-lg">
          <Icon className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight mb-2">{value}</p>
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getTrendBg(trend)}`}>
        <TrendIcon className="h-3 w-3" />
        {formatChange(change)} vs last period
      </div>
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="h-3 bg-slate-100 rounded w-20 mb-4" />
      <div className="h-7 bg-slate-100 rounded w-28 mb-3" />
      <div className="h-5 bg-slate-100 rounded-full w-32" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="h-3 bg-slate-100 rounded w-32 mb-1" />
      <div className="h-2 bg-slate-100 rounded w-24 mb-5" />
      <div className="h-[180px] bg-slate-50 rounded-lg" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const session = useAppSelector(selectAuthSession);
  const { currentBranch } = useBranchContext();
  const { formatCurrency: formatCurrencyLocale } = useCommonTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7d' | '30d' | '3m' | '1y'>('today');

  const { data: restaurant, isLoading: isRestaurantLoading, isError: isRestaurantError } =
    useGetRestaurantQuery(restaurantId ?? skipToken);

  const branchId = currentBranch?._id;

  const {
    data: dashboardMetrics,
    isLoading: isMetricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useGetDashboardMetricsQuery(
    restaurantId ? { restaurantId, branchId, period: selectedPeriod } : skipToken
  );

  useOrdersSocket({ onEvent: refetchMetrics, enabled: !!restaurantId });

  // ── Chart data ─────────────────────────────────────────────────────────────

  const revenueChartData = useMemo(() => {
    const chart = dashboardMetrics?.charts?.find((c) => c.type === 'line');
    if (!chart || chart.data.length === 0) return sampleRevenueData();
    return Array.from({ length: 24 }, (_, localHour) => {
      const now = new Date();
      const utcHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), localHour).getUTCHours();
      return { time: `${localHour.toString().padStart(2, '0')}:00`, revenue: chart.data[utcHour]?.value || 0 };
    });
  }, [dashboardMetrics]);

  const ordersChartData = useMemo(() => {
    const chart = dashboardMetrics?.charts?.find((c) => c.type === 'area');
    if (!chart || chart.data.length === 0) return sampleOrdersData();
    return Array.from({ length: 24 }, (_, localHour) => {
      const now = new Date();
      const utcHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), localHour).getUTCHours();
      return { time: `${localHour.toString().padStart(2, '0')}:00`, orders: chart.data[utcHour]?.value || 0 };
    });
  }, [dashboardMetrics]);

  const barChartData = useMemo(() => {
    if (!dashboardMetrics?.peakHours?.length) {
      return Array.from({ length: 12 }, (_, i) => ({
        hour: `${(i + 8).toString().padStart(2, '0')}:00`,
        orders: Math.floor(Math.random() * 15) + 1,
        revenue: Math.floor(Math.random() * 2000) + 200,
      }));
    }
    return Array.from({ length: 24 }, (_, localHour) => {
      const now = new Date();
      const utcHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), localHour).getUTCHours();
      const peak = dashboardMetrics.peakHours.find((p) => p.hour === utcHour);
      return {
        hour: `${localHour.toString().padStart(2, '0')}:00`,
        orders: peak?.orderCount || 0,
        revenue: peak?.revenue || 0,
      };
    });
  }, [dashboardMetrics]);

  // Chart configs
  const revenueChartConfig = { revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' } } satisfies ChartConfig;
  const ordersChartConfig = { orders: { label: 'Orders', color: 'hsl(var(--chart-1))' } } satisfies ChartConfig;
  const barChartConfig = { orders: { label: 'Orders', color: 'hsl(var(--chart-1))' } } satisfies ChartConfig;

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!session?.restaurantId) return <Navigate to="/onboarding" replace />;

  if (isRestaurantLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isRestaurantError || !restaurant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-500">
        Failed to load restaurant data.
      </div>
    );
  }

  const firstName = session.displayName?.split(' ')[0] || 'there';
  const periodLabel = dashboardMetrics?.period?.label ?? 'Today';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="mx-auto px-4 py-6 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">{currentBranch?.name ?? restaurant.name}</span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {greetingByHour()}, {firstName} 👋
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{restaurant.name}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={selectedPeriod}
              onValueChange={(v: 'today' | '7d' | '30d' | '3m' | '1y') => setSelectedPeriod(v)}
            >
              <SelectTrigger className="w-36 h-8 text-xs border-slate-200 bg-white">
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
            <Button
              variant="outline"
              size="sm"
              onClick={refetchMetrics}
              className="h-8 w-8 p-0 border-slate-200 hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* ── KYC Banner ── */}
        <KycCompletionBanner />

        {/* ── KPI Cards ── */}
        <section className="space-y-3">
          <SectionLabel>Overview · {periodLabel}</SectionLabel>
          {isMetricsLoading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
            </div>
          ) : metricsError ? (
            <div className="bg-white rounded-xl border border-red-100 p-6 text-center">
              <p className="text-sm text-red-500">Failed to load metrics</p>
            </div>
          ) : dashboardMetrics ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <KpiCard
                label="Total Revenue"
                value={formatCurrencyLocale(dashboardMetrics.revenue.total.current)}
                change={dashboardMetrics.revenue.total.change}
                trend={dashboardMetrics.revenue.total.trend}
                icon={BadgeIndianRupee}
                accent="bg-blue-400"
              />
              <KpiCard
                label="Total Orders"
                value={String(dashboardMetrics.orders.total.current)}
                change={dashboardMetrics.orders.total.change}
                trend={dashboardMetrics.orders.total.trend}
                icon={ReceiptText}
                accent="bg-violet-400"
              />
              <KpiCard
                label="Avg. Order Value"
                value={formatCurrencyLocale(dashboardMetrics.revenue.averageTicket.current)}
                change={dashboardMetrics.revenue.averageTicket.change}
                trend={dashboardMetrics.revenue.averageTicket.trend}
                icon={TrendingUp}
                accent="bg-emerald-400"
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No data yet for this period</p>
              <p className="text-xs text-slate-400 mt-1">Start taking orders to see your metrics here</p>
            </div>
          )}
        </section>

        {/* ── Charts ── */}
        {(isMetricsLoading || dashboardMetrics) && (
          <section className="space-y-3">
            <SectionLabel>Performance · {periodLabel}</SectionLabel>
            {isMetricsLoading ? (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                <ChartSkeleton /><ChartSkeleton /><ChartSkeleton />
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">

                {/* Revenue Line Chart */}
                <ChartCard title="Revenue" subtitle={periodLabel}>
                  <ChartContainer config={revenueChartConfig} className="h-[180px] w-full">
                    <LineChart data={revenueChartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="time"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval={5}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        tickFormatter={(v) => formatCurrencyShort(v)}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        width={40}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(v) => `${v}`}
                            formatter={(v) => [`₹${v}`, 'Revenue']}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                        stroke="#3b82f6"
                      />
                    </LineChart>
                  </ChartContainer>
                </ChartCard>

                {/* Orders Area Chart */}
                <ChartCard title="Orders" subtitle={periodLabel}>
                  <ChartContainer config={ordersChartConfig} className="h-[180px] w-full">
                    <AreaChart data={ordersChartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="time"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval={5}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        width={30}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(v) => `${v}`}
                            formatter={(v) => [`${v}`, 'Orders']}
                          />
                        }
                      />
                      <Area
                        type="natural"
                        dataKey="orders"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#ordersGradient)"
                      />
                    </AreaChart>
                  </ChartContainer>
                </ChartCard>

                {/* Peak Hours Bar Chart */}
                <ChartCard title="Peak Hours" subtitle="Orders by hour">
                  <ChartContainer config={barChartConfig} className="h-[180px] w-full">
                    <BarChart data={barChartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="hour"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval={3}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        width={30}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(v) => `${v}`}
                            formatter={(v, _, props) => [
                              `${v} orders · ₹${props.payload.revenue}`,
                              'Orders',
                            ]}
                          />
                        }
                      />
                      <Bar dataKey="orders" radius={[3, 3, 0, 0]} fill="#10b981" />
                    </BarChart>
                  </ChartContainer>
                </ChartCard>
              </div>
            )}
          </section>
        )}

        {/* ── Recent Orders ── */}
        {dashboardMetrics?.recentOrders?.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Orders</span>
              <div className="flex-1 h-px bg-slate-100" />
              <Link
                to="/orders"
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {dashboardMetrics.recentOrders.slice(0, 5).map((order, index) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className={`flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-b-0 ${
                    order.paymentStatus !== 'paid' ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-slate-100'
                  }`}
                >
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-slate-900 font-mono tracking-tight">
                        #{order.orderNumber}
                      </span>
                      {order.tableNumber && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                          Table {order.tableNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {order.timeSinceOrdered}m ago
                    </p>
                  </div>

                  {/* Payment */}
                  <div className="flex items-center gap-3 shrink-0">
                    {order.paymentStatus === 'paid' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle className="h-3 w-3" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <Circle className="h-3 w-3" /> Unpaid
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-800">
                      {formatCurrencyLocale(order.totalAmount)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default DashboardPage;