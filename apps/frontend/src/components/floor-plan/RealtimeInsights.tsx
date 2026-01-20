import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TableStatus, TableStatusType } from '@/store/api/floorPlansApi';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  Target,
  Activity,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealtimeInsight {
  peakTables: string[];
  bottleneckAreas: string[];
  suggestedActions: Array<{
    type: 'reassign-waiter' | 'table-optimization' | 'capacity-alert';
    message: string;
    tableIds?: string[];
  }>;
  occupancyRate: number;
  averageWaitTime: number;
  revenueRate: number;
}

interface RealtimeInsightsProps {
  restaurantId: string;
  insights?: RealtimeInsight;
  tableStatuses: TableStatus[];
}

export const RealtimeInsights: React.FC<RealtimeInsightsProps> = ({
  restaurantId,
  insights,
  tableStatuses,
}) => {
  // Calculate real-time metrics
  const totalTables = tableStatuses.length;
  const occupiedTables = tableStatuses.filter(
    (t) => t.status === TableStatusType.Occupied
  ).length;
  const availableTables = tableStatuses.filter(
    (t) => t.status === TableStatusType.Available
  ).length;
  const needsAttentionTables = tableStatuses.filter(
    (t) => t.status === TableStatusType.NeedsAttention
  ).length;

  const totalRevenue = tableStatuses.reduce(
    (sum, table) => sum + table.dailyMetrics.totalRevenue,
    0
  );
  const totalOrders = tableStatuses.reduce(
    (sum, table) => sum + table.dailyMetrics.totalOrders,
    0
  );
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Calculate occupancy trend (simulated - in real app would compare with historical data)
  const occupancyRate =
    totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;
  const occupancyTrend =
    occupancyRate > 70 ? 'high' : occupancyRate > 40 ? 'medium' : 'low';

  // Calculate table efficiency
  const tableEfficiency = tableStatuses
    .map((table) => {
      const efficiency =
        table.dailyMetrics.turnoverCount > 0
          ? table.dailyMetrics.totalRevenue / table.dailyMetrics.turnoverCount
          : 0;
      return {
        tableId: table.tableId,
        tableLabel: table.tableLabel,
        efficiency,
      };
    })
    .sort((a, b) => b.efficiency - a.efficiency);

  const topPerformingTables = tableEfficiency.slice(0, 3);
  const underperformingTables = tableEfficiency
    .slice(-3)
    .filter((t) => t.efficiency > 0);

  // Generate insights
  const generateInsights = () => {
    const insights = [];

    if (occupancyRate > 85) {
      insights.push({
        type: 'warning' as const,
        title: 'High Occupancy Alert',
        message:
          'Restaurant is near capacity. Consider preparing for wait times.',
        icon: <AlertTriangle className="w-4 h-4" />,
      });
    }

    if (needsAttentionTables > 0) {
      insights.push({
        type: 'error' as const,
        title: 'Tables Need Attention',
        message: `${needsAttentionTables} table(s) require immediate attention.`,
        icon: <AlertTriangle className="w-4 h-4" />,
      });
    }

    if (averageOrderValue > 50) {
      insights.push({
        type: 'success' as const,
        title: 'High Order Value',
        message: `Average order value is $${averageOrderValue.toFixed(
          2
        )} - excellent performance!`,
        icon: <TrendingUp className="w-4 h-4" />,
      });
    }

    if (occupancyRate < 30 && new Date().getHours() > 18) {
      insights.push({
        type: 'info' as const,
        title: 'Low Evening Occupancy',
        message:
          'Consider promotional activities to increase evening footfall.',
        icon: <Lightbulb className="w-4 h-4" />,
      });
    }

    return insights;
  };

  const generatedInsights = generateInsights();

  return (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100">
                <Activity className="w-5 h-5 " />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {occupancyRate.toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {occupancyTrend === 'high' && (
                <TrendingUp className="w-3 h-3 text-green-600" />
              )}
              {occupancyTrend === 'medium' && (
                <Activity className="w-3 h-3 text-yellow-600" />
              )}
              {occupancyTrend === 'low' && (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
              <span className="text-xs text-muted-foreground capitalize">
                {occupancyTrend} traffic
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${averageOrderValue.toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {totalOrders} orders today
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
                  {insights?.averageWaitTime || 12}
                </p>
                <p className="text-sm text-muted-foreground">Avg Wait (min)</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Last hour average
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
                  {insights?.revenueRate || 85}
                </p>
                <p className="text-sm text-muted-foreground">Revenue Rate</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Per hour ($)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Alerts */}
      {generatedInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Real-time Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {generatedInsights.map((insight, index) => (
              <Alert
                key={index}
                className={cn(
                  insight.type === 'error' && 'border-red-200 bg-red-50',
                  insight.type === 'warning' &&
                    'border-orange-200 bg-orange-50',
                  insight.type === 'success' && 'border-green-200 bg-green-50',
                  insight.type === 'info' && 'border-blue-200 bg-blue-50'
                )}
              >
                <div className="flex items-center gap-2">
                  {insight.icon}
                  <strong className="text-sm">{insight.title}</strong>
                </div>
                <AlertDescription className="mt-1">
                  {insight.message}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Table Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2 text-green-700">
                Top Performers
              </h4>
              <div className="space-y-2">
                {topPerformingTables.map((table, index) => (
                  <div
                    key={table.tableId}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">Table {table.tableLabel}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        ${table.efficiency.toFixed(0)}/turn
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {underperformingTables.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-orange-700">
                  Needs Attention
                </h4>
                <div className="space-y-2">
                  {underperformingTables.map((table) => (
                    <div
                      key={table.tableId}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">Table {table.tableLabel}</span>
                      <Badge variant="outline" className="text-xs">
                        ${table.efficiency.toFixed(0)}/turn
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Capacity Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Capacity Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Table Utilization</span>
                  <span>
                    {occupiedTables}/{totalTables}
                  </span>
                </div>
                <Progress value={(occupiedTables / totalTables) * 100} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-md bg-green-50">
                  <div className="font-semibold text-green-700">
                    {availableTables}
                  </div>
                  <div className="text-xs text-green-600">Available</div>
                </div>
                <div className="p-2 rounded-md bg-red-50">
                  <div className="font-semibold text-red-700">
                    {occupiedTables}
                  </div>
                  <div className="text-xs text-red-600">Occupied</div>
                </div>
                <div className="p-2 rounded-md bg-orange-50">
                  <div className="font-semibold text-orange-700">
                    {needsAttentionTables}
                  </div>
                  <div className="text-xs text-orange-600">Attention</div>
                </div>
              </div>
            </div>

            {/* Suggested Actions */}
            {insights?.suggestedActions &&
              insights.suggestedActions.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">
                    Suggested Actions
                  </h4>
                  <div className="space-y-2">
                    {insights.suggestedActions.map((action, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-md bg-muted/50 text-sm"
                      >
                        {action.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Revenue Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-green-600">
                ${totalRevenue.toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
              <div className="text-xs text-muted-foreground mt-1">Today</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold ">
                ${(totalRevenue / Math.max(occupiedTables, 1)).toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Revenue per Table
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Active tables
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-purple-600">
                ${(insights?.revenueRate || 85).toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Hourly Rate</div>
              <div className="text-xs text-muted-foreground mt-1">
                Current pace
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
