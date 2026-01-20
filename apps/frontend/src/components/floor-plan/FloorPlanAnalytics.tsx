import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FloorPlan, TableStatus } from '@/store/api/floorPlansApi';
import { FloorPlanHeatMap } from './FloorPlanHeatMap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Target,
  Activity,
  MapPin,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface FloorPlanAnalyticsProps {
  floorPlan: FloorPlan;
  tableStatuses: TableStatus[];
  className?: string;
}

export const FloorPlanAnalytics: React.FC<FloorPlanAnalyticsProps> = ({
  floorPlan,
  tableStatuses,
  className,
}) => {
  const [selectedView, setSelectedView] = useState<
    'overview' | 'heatmap' | 'trends' | 'zones'
  >('overview');
  const [selectedMetric, setSelectedMetric] = useState<
    'revenue' | 'orders' | 'occupancy' | 'turnover' | 'wait-time'
  >('revenue');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>(
    'today'
  );

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const totalRevenue = tableStatuses.reduce(
      (sum, table) => sum + table.dailyMetrics.totalRevenue,
      0
    );
    const totalOrders = tableStatuses.reduce(
      (sum, table) => sum + table.dailyMetrics.totalOrders,
      0
    );
    const totalOccupancyMinutes = tableStatuses.reduce(
      (sum, table) => sum + table.dailyMetrics.occupancyMinutes,
      0
    );
    const totalTurnovers = tableStatuses.reduce(
      (sum, table) => sum + table.dailyMetrics.turnoverCount,
      0
    );

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageOccupancyHours = totalOccupancyMinutes / 60;
    const occupancyRate =
      (totalOccupancyMinutes / (floorPlan.tables.length * 24 * 60)) * 100; // 24 hours max
    const revenuePerTable =
      floorPlan.tables.length > 0 ? totalRevenue / floorPlan.tables.length : 0;

    return {
      totalRevenue,
      totalOrders,
      totalOccupancyMinutes,
      totalTurnovers,
      averageOrderValue,
      averageOccupancyHours,
      occupancyRate,
      revenuePerTable,
    };
  }, [tableStatuses, floorPlan.tables.length]);

  // Generate table performance data
  const tablePerformanceData = useMemo(() => {
    return floorPlan.tables
      .map((table) => {
        const status = tableStatuses.find((s) => s.tableId === table.id);
        return {
          tableLabel: table.label,
          revenue: status?.dailyMetrics.totalRevenue || 0,
          orders: status?.dailyMetrics.totalOrders || 0,
          occupancy: (status?.dailyMetrics.occupancyMinutes || 0) / 60,
          turnover: status?.dailyMetrics.turnoverCount || 0,
          capacity: table.capacity,
          zone: table.zone || 'Main',
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [floorPlan.tables, tableStatuses]);

  // Generate zone analytics
  const zoneAnalytics = useMemo(() => {
    const zones = new Map<
      string,
      {
        revenue: number;
        orders: number;
        occupancy: number;
        turnover: number;
        tableCount: number;
      }
    >();

    floorPlan.tables.forEach((table) => {
      const zone = table.zone || 'Main';
      const status = tableStatuses.find((s) => s.tableId === table.id);

      if (!zones.has(zone)) {
        zones.set(zone, {
          revenue: 0,
          orders: 0,
          occupancy: 0,
          turnover: 0,
          tableCount: 0,
        });
      }

      const zoneData = zones.get(zone)!;
      zoneData.revenue += status?.dailyMetrics.totalRevenue || 0;
      zoneData.orders += status?.dailyMetrics.totalOrders || 0;
      zoneData.occupancy += (status?.dailyMetrics.occupancyMinutes || 0) / 60;
      zoneData.turnover += status?.dailyMetrics.turnoverCount || 0;
      zoneData.tableCount += 1;
    });

    return Array.from(zones.entries()).map(([zone, data]) => ({
      zone,
      ...data,
      avgRevenuePerTable:
        data.tableCount > 0 ? data.revenue / data.tableCount : 0,
      avgOccupancyPerTable:
        data.tableCount > 0 ? data.occupancy / data.tableCount : 0,
    }));
  }, [floorPlan.tables, tableStatuses]);

  // Generate hourly trend data (simulated for demo)
  const hourlyTrendData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((hour) => {
      // Simulate realistic restaurant patterns
      let occupancyMultiplier = 0.1;
      if (hour >= 11 && hour <= 14) occupancyMultiplier = 0.8; // Lunch rush
      if (hour >= 18 && hour <= 21) occupancyMultiplier = 1.0; // Dinner rush
      if (hour >= 7 && hour <= 10) occupancyMultiplier = 0.4; // Breakfast

      const revenue = (analyticsData.totalRevenue * occupancyMultiplier) / 10;
      const occupancy = occupancyMultiplier * 100;

      return {
        hour: format(new Date().setHours(hour), 'HH:mm'),
        revenue: Math.round(revenue),
        occupancy: Math.round(occupancy),
        orders: Math.round(revenue / analyticsData.averageOrderValue || 0),
      };
    });
  }, [analyticsData]);

  // Colors for charts
  const chartColors = {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--chart-2))',
    tertiary: 'hsl(var(--chart-3))',
    quaternary: 'hsl(var(--chart-4))',
    quinary: 'hsl(var(--chart-5))',
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-md border">
            <Button
              variant={selectedView === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('overview')}
              className="rounded-r-none"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Overview
            </Button>
            <Button
              variant={selectedView === 'heatmap' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('heatmap')}
              className="rounded-none"
            >
              <Activity className="w-4 h-4 mr-1" />
              Heat Map
            </Button>
            <Button
              variant={selectedView === 'trends' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('trends')}
              className="rounded-none"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Trends
            </Button>
            <Button
              variant={selectedView === 'zones' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('zones')}
              className="rounded-l-none"
            >
              <MapPin className="w-4 h-4 mr-1" />
              Zones
            </Button>
          </div>
        </div>

        <Select
          value={timeRange}
          onValueChange={(value: any) => setTimeRange(value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-green-100">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${analyticsData.totalRevenue.toFixed(0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Revenue
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  ${analyticsData.averageOrderValue.toFixed(2)} avg order
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-100">
                    <Users className="w-5 h-5 " />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.totalOrders}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Orders
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {analyticsData.totalTurnovers} table turns
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-purple-100">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.occupancyRate.toFixed(0)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Occupancy Rate
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {analyticsData.averageOccupancyHours.toFixed(1)}h avg
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-orange-100">
                    <Target className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${analyticsData.revenuePerTable.toFixed(0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Revenue/Table
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {floorPlan.tables.length} tables total
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Table Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tablePerformanceData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tableLabel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill={chartColors.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Zone Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={zoneAnalytics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                      nameKey="zone"
                    >
                      {zoneAnalytics.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            Object.values(chartColors)[
                              index % Object.values(chartColors).length
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toFixed(0)}`,
                        'Revenue',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tablePerformanceData.slice(0, 5).map((table, index) => (
                  <div
                    key={table.tableLabel}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="w-8 h-8 rounded-full p-0 flex items-center justify-center"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <span className="font-medium">
                          Table {table.tableLabel}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({table.zone})
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${table.revenue.toFixed(0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {table.orders} orders
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Heat Map View */}
      {selectedView === 'heatmap' && (
        <FloorPlanHeatMap
          floorPlan={floorPlan}
          tableStatuses={tableStatuses}
          metric={selectedMetric}
          onMetricChange={(metric: any) => setSelectedMetric(metric)}
        />
      )}

      {/* Trends View */}
      {selectedView === 'trends' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={hourlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke={chartColors.primary}
                    fill={chartColors.primary}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Occupancy Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="occupancy"
                      stroke={chartColors.secondary}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill={chartColors.tertiary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Zones View */}
      {selectedView === 'zones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneAnalytics.map((zone) => (
              <Card key={zone.zone}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {zone.zone}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="font-semibold">
                        ${zone.revenue.toFixed(0)}
                      </div>
                      <div className="text-muted-foreground">Revenue</div>
                    </div>
                    <div>
                      <div className="font-semibold">{zone.orders}</div>
                      <div className="text-muted-foreground">Orders</div>
                    </div>
                    <div>
                      <div className="font-semibold">{zone.tableCount}</div>
                      <div className="text-muted-foreground">Tables</div>
                    </div>
                    <div>
                      <div className="font-semibold">{zone.turnover}</div>
                      <div className="text-muted-foreground">Turnovers</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Avg Revenue/Table</span>
                      <span className="font-medium">
                        ${zone.avgRevenuePerTable.toFixed(0)}
                      </span>
                    </div>
                    <Progress
                      value={
                        (zone.avgRevenuePerTable /
                          Math.max(
                            ...zoneAnalytics.map((z) => z.avgRevenuePerTable),
                            1
                          )) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
