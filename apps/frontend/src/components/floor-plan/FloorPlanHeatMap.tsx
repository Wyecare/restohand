import React, { useMemo } from 'react';
import { Stage, Layer, Rect, Circle, Text } from 'react-konva';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FloorPlan, TableStatus } from '@/store/api/floorPlansApi';
import { TrendingUp, DollarSign, Clock, Users, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloorPlanHeatMapProps {
  floorPlan: FloorPlan;
  tableStatuses: TableStatus[];
  metric: 'revenue' | 'orders' | 'occupancy' | 'turnover' | 'wait-time';
  onMetricChange: (metric: string) => void;
  className?: string;
}

export const FloorPlanHeatMap: React.FC<FloorPlanHeatMapProps> = ({
  floorPlan,
  tableStatuses,
  metric,
  onMetricChange,
  className,
}) => {
  // Calculate heat map data
  const heatMapData = useMemo(() => {
    const tableMetrics = floorPlan.tables.map(table => {
      const status = tableStatuses.find(s => s.tableId === table.id);
      if (!status) {
        return { ...table, value: 0, intensity: 0 };
      }

      let value = 0;
      switch (metric) {
        case 'revenue':
          value = status.dailyMetrics.totalRevenue;
          break;
        case 'orders':
          value = status.dailyMetrics.totalOrders;
          break;
        case 'occupancy':
          value = status.dailyMetrics.occupancyMinutes / 60; // Convert to hours
          break;
        case 'turnover':
          value = status.dailyMetrics.turnoverCount;
          break;
        case 'wait-time':
          // Simulate wait time based on occupancy and orders
          value = status.dailyMetrics.occupancyMinutes / Math.max(status.dailyMetrics.turnoverCount, 1);
          break;
        default:
          value = 0;
      }

      return { ...table, value, status };
    });

    // Calculate intensity (0-1) based on relative values
    const maxValue = Math.max(...tableMetrics.map(t => t.value), 1);
    const minValue = Math.min(...tableMetrics.map(t => t.value));
    const range = maxValue - minValue || 1;

    return tableMetrics.map(table => ({
      ...table,
      intensity: maxValue === 0 ? 0 : (table.value - minValue) / range,
    }));
  }, [floorPlan.tables, tableStatuses, metric]);

  // Get heat map color
  const getHeatMapColor = (intensity: number): string => {
    if (intensity === 0) return 'hsl(var(--muted))';

    // Color gradient from cool (blue) to hot (red)
    const hue = (1 - intensity) * 240; // 240 = blue, 0 = red
    const saturation = 70 + (intensity * 30); // 70-100%
    const lightness = 85 - (intensity * 35); // 85-50%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Get metric icon
  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'revenue':
        return <DollarSign className="w-4 h-4" />;
      case 'orders':
        return <TrendingUp className="w-4 h-4" />;
      case 'occupancy':
        return <Clock className="w-4 h-4" />;
      case 'turnover':
        return <Users className="w-4 h-4" />;
      case 'wait-time':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // Get metric label
  const getMetricLabel = (metricType: string) => {
    switch (metricType) {
      case 'revenue':
        return 'Revenue ($)';
      case 'orders':
        return 'Orders Count';
      case 'occupancy':
        return 'Occupancy (hours)';
      case 'turnover':
        return 'Table Turnover';
      case 'wait-time':
        return 'Avg Wait Time (min)';
      default:
        return 'Unknown';
    }
  };

  // Format metric value
  const formatMetricValue = (value: number, metricType: string) => {
    switch (metricType) {
      case 'revenue':
        return `$${value.toFixed(0)}`;
      case 'orders':
        return value.toString();
      case 'occupancy':
        return `${value.toFixed(1)}h`;
      case 'turnover':
        return value.toString();
      case 'wait-time':
        return `${value.toFixed(0)}min`;
      default:
        return value.toString();
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const values = heatMapData.map(t => t.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const max = Math.max(...values, 0);
    const min = Math.min(...values);

    return { total, average, max, min };
  }, [heatMapData]);

  // Find top and bottom performers
  const topPerformers = useMemo(() => {
    return heatMapData
      .filter(t => t.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [heatMapData]);

  const bottomPerformers = useMemo(() => {
    return heatMapData
      .filter(t => t.value > 0)
      .sort((a, b) => a.value - b.value)
      .slice(0, 3);
  }, [heatMapData]);

  const canvasScale = 0.8;
  const canvasWidth = floorPlan.metadata.canvasWidth * canvasScale;
  const canvasHeight = floorPlan.metadata.canvasHeight * canvasScale;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {getMetricIcon(metric)}
              Heat Map Analysis
            </CardTitle>
            <Select value={metric} onValueChange={onMetricChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue Performance</SelectItem>
                <SelectItem value="orders">Order Volume</SelectItem>
                <SelectItem value="occupancy">Time Occupied</SelectItem>
                <SelectItem value="turnover">Table Turnover</SelectItem>
                <SelectItem value="wait-time">Average Wait Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="font-semibold text-lg">
                {formatMetricValue(stats.total, metric)}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">
                {formatMetricValue(stats.average, metric)}
              </div>
              <div className="text-sm text-muted-foreground">Average</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-green-600">
                {formatMetricValue(stats.max, metric)}
              </div>
              <div className="text-sm text-muted-foreground">Highest</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-red-600">
                {formatMetricValue(stats.min, metric)}
              </div>
              <div className="text-sm text-muted-foreground">Lowest</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heat Map Visualization */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {getMetricLabel(metric)} Heat Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Stage
                  width={canvasWidth}
                  height={canvasHeight}
                  className="border rounded-lg bg-background"
                >
                  <Layer>
                    {heatMapData.map((table) => (
                      <React.Fragment key={table.id}>
                        {/* Table Shape */}
                        {table.shape === 'circle' ? (
                          <Circle
                            x={table.x * canvasScale + (table.width * canvasScale) / 2}
                            y={table.y * canvasScale + (table.height * canvasScale) / 2}
                            radius={(table.width * canvasScale) / 2}
                            fill={getHeatMapColor(table.intensity)}
                            stroke="hsl(var(--border))"
                            strokeWidth={1}
                          />
                        ) : (
                          <Rect
                            x={table.x * canvasScale}
                            y={table.y * canvasScale}
                            width={table.width * canvasScale}
                            height={table.height * canvasScale}
                            fill={getHeatMapColor(table.intensity)}
                            stroke="hsl(var(--border))"
                            strokeWidth={1}
                            cornerRadius={table.shape === 'square' ? 4 : 0}
                          />
                        )}

                        {/* Table Label */}
                        <Text
                          x={table.x * canvasScale}
                          y={table.y * canvasScale}
                          text={table.label}
                          fontSize={Math.max(10, 12 * canvasScale)}
                          fontFamily="Inter, system-ui, sans-serif"
                          fill="hsl(var(--foreground))"
                          fontStyle="bold"
                          align="center"
                          verticalAlign="middle"
                          width={table.width * canvasScale}
                          height={table.height * canvasScale / 2}
                        />

                        {/* Metric Value */}
                        <Text
                          x={table.x * canvasScale}
                          y={table.y * canvasScale + (table.height * canvasScale / 2)}
                          text={formatMetricValue(table.value, metric)}
                          fontSize={Math.max(8, 10 * canvasScale)}
                          fontFamily="Inter, system-ui, sans-serif"
                          fill="hsl(var(--muted-foreground))"
                          align="center"
                          verticalAlign="middle"
                          width={table.width * canvasScale}
                          height={table.height * canvasScale / 2}
                        />
                      </React.Fragment>
                    ))}
                  </Layer>
                </Stage>

                {/* Legend */}
                <div className="absolute top-4 right-4 bg-background/95 p-3 rounded-lg border">
                  <div className="text-sm font-medium mb-2">Intensity</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs">Low</div>
                    <div className="flex">
                      {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 border-r border-white/20 last:border-r-0"
                          style={{ backgroundColor: getHeatMapColor(intensity) }}
                        />
                      ))}
                    </div>
                    <div className="text-xs">High</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Rankings */}
        <div className="space-y-6">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-700">
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((table, index) => (
                  <div key={table.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">Table {table.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatMetricValue(table.value, metric)}
                      </div>
                      <Progress
                        value={table.intensity * 100}
                        className="w-12 h-1 mt-1"
                      />
                    </div>
                  </div>
                ))}
                {topPerformers.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-orange-700">
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bottomPerformers.map((table, index) => (
                  <div key={table.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">Table {table.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-orange-600">
                        {formatMetricValue(table.value, metric)}
                      </div>
                      <Progress
                        value={table.intensity * 100}
                        className="w-12 h-1 mt-1"
                      />
                    </div>
                  </div>
                ))}
                {bottomPerformers.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {stats.max > stats.average * 2 && (
                  <div className="p-2 rounded-md bg-blue-50 text-blue-700">
                    Some tables are significantly outperforming others. Consider analyzing what makes them successful.
                  </div>
                )}
                {stats.min === 0 && topPerformers.length > 0 && (
                  <div className="p-2 rounded-md bg-orange-50 text-orange-700">
                    Some tables have no activity today. Check if they need attention or repositioning.
                  </div>
                )}
                {metric === 'revenue' && stats.average > 100 && (
                  <div className="p-2 rounded-md bg-green-50 text-green-700">
                    Strong revenue performance across tables. Great work!
                  </div>
                )}
                {metric === 'wait-time' && stats.average > 30 && (
                  <div className="p-2 rounded-md bg-red-50 text-red-700">
                    High average wait times detected. Consider optimizing service flow.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};