import React, { useState, useCallback, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  useGetActiveFloorPlanQuery,
  useGetTableStatusesQuery,
  useGetFloorPlanOverviewQuery,
  useUpdateTableStatusMutation,
  FloorPlan,
  TableStatus,
  TableStatusType,
  TablePriority
} from '@/store/api/floorPlansApi';
import { TableShape } from './TableShape';
import { TableStatusPanel } from './TableStatusPanel';
import { FloorPlanOverview } from './FloorPlanOverview';
import { TableAlerts } from './TableAlerts';
import { RealtimeInsights } from './RealtimeInsights';
import { useFloorPlanWebSocket } from '@/hooks/useFloorPlanWebSocket';
import { cn } from '@/lib/utils';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface FloorPlanDashboardProps {
  restaurantId: string;
  className?: string;
  onTableSelect?: (tableId: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const FloorPlanDashboard: React.FC<FloorPlanDashboardProps> = ({
  restaurantId,
  className,
  onTableSelect,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'floor-plan' | 'overview' | 'analytics'>('floor-plan');

  // API queries
  const {
    data: floorPlan,
    isLoading: floorPlanLoading,
    error: floorPlanError,
    refetch: refetchFloorPlan
  } = useGetActiveFloorPlanQuery({ restaurantId });

  const {
    data: tableStatuses = [],
    isLoading: statusesLoading,
    refetch: refetchStatuses
  } = useGetTableStatusesQuery({ restaurantId });

  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview
  } = useGetFloorPlanOverviewQuery({ restaurantId });

  const [updateTableStatus] = useUpdateTableStatusMutation();

  // WebSocket connection for real-time updates
  const {
    isConnected,
    tableAlerts,
    realtimeInsights,
    connect,
    disconnect
  } = useFloorPlanWebSocket(restaurantId);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const handleTableSelect = useCallback((tableId: string) => {
    setSelectedTableId(tableId);
    onTableSelect?.(tableId);
  }, [onTableSelect]);

  const handleTableStatusUpdate = useCallback(async (
    tableId: string,
    status: TableStatusType,
    additionalData?: any
  ) => {
    try {
      await updateTableStatus({
        restaurantId,
        tableId,
        data: { status, ...additionalData }
      }).unwrap();
    } catch (error) {
      console.error('Failed to update table status:', error);
    }
  }, [restaurantId, updateTableStatus]);

  const handleRefresh = useCallback(() => {
    refetchFloorPlan();
    refetchStatuses();
    refetchOverview();
  }, [refetchFloorPlan, refetchStatuses, refetchOverview]);

  const getTableStatus = useCallback((tableId: string): TableStatus | undefined => {
    return tableStatuses.find(status => status.tableId === tableId);
  }, [tableStatuses]);

  const getStatusColor = useCallback((status: TableStatusType): string => {
    switch (status) {
      case TableStatusType.Available:
        return 'hsl(var(--chart-2))'; // green
      case TableStatusType.Occupied:
        return 'hsl(var(--chart-1))'; // red
      case TableStatusType.Reserved:
        return 'hsl(var(--chart-3))'; // yellow
      case TableStatusType.NeedsAttention:
        return 'hsl(var(--chart-5))'; // orange
      case TableStatusType.Cleaning:
        return 'hsl(var(--chart-4))'; // blue
      case TableStatusType.OutOfOrder:
        return 'hsl(var(--muted))'; // gray
      default:
        return 'hsl(var(--muted))';
    }
  }, []);

  const selectedTableStatus = selectedTableId ? getTableStatus(selectedTableId) : null;

  if (floorPlanLoading || statusesLoading) {
    return (
      <div className={cn(
        'flex items-center justify-center h-96',
        className
      )}>
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  if (floorPlanError || !floorPlan) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px] p-8', className)}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Settings className="w-8 h-8 text-muted-foreground" />
          </div>

          {floorPlanError ? (
            <>
              <h3 className="text-lg font-semibold mb-2">Failed to Load Floor Plan</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading your floor plan. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2">Create Your First Floor Plan</h3>
              <p className="text-muted-foreground mb-6">
                Get started by designing your restaurant layout with tables, sections, and dividers.
                Create different dining areas like VIP sections, family areas, and bar areas.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={() => window.location.href = '/floor-plan/config'}
                  className="w-full"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Open Floor Plan Designer
                </Button>

                <div className="text-xs text-muted-foreground">
                  <p className="mb-2"><strong>Quick Start:</strong></p>
                  <ul className="text-left space-y-1">
                    <li>• Click "Section" to create dining areas</li>
                    <li>• Use "Divider" to add walls between areas</li>
                    <li>• Add "Table" shapes where customers sit</li>
                    <li>• Save and activate your floor plan</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const canvasScale = isFullscreen ? 1 : 0.7;
  const canvasWidth = floorPlan.metadata.canvasWidth * canvasScale;
  const canvasHeight = floorPlan.metadata.canvasHeight * canvasScale;

  return (
    <div className={cn(
      'flex flex-col h-full bg-background',
      isFullscreen && 'fixed inset-0 z-50',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">{floorPlan.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )} />
              {isConnected ? 'Live' : 'Disconnected'}
              {overview && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <Users className="w-4 h-4" />
                  {overview.occupiedTables}/{overview.totalTables} tables
                  <Clock className="w-4 h-4" />
                  {Math.round(overview.averageTurnover * 10) / 10} avg turnover
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border">
            <Button
              variant={viewMode === 'floor-plan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('floor-plan')}
              className="rounded-r-none"
            >
              Floor Plan
            </Button>
            <Button
              variant={viewMode === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('overview')}
              className="rounded-none"
            >
              Overview
            </Button>
            <Button
              variant={viewMode === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('analytics')}
              className="rounded-l-none"
            >
              Analytics
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          {onToggleFullscreen && (
            <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'floor-plan' && (
          <>
            {/* Floor Plan Canvas */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="relative">
                <Stage
                  width={canvasWidth}
                  height={canvasHeight}
                  className="border rounded-lg shadow-sm bg-card"
                  onClick={(e) => {
                    if (e.target === e.target.getStage()) {
                      setSelectedTableId(null);
                    }
                  }}
                >
                  <Layer>
                    {floorPlan.tables.map((table) => {
                      const status = getTableStatus(table.id);
                      const statusColor = status ? getStatusColor(status.status) : getStatusColor(TableStatusType.Available);

                      return (
                        <TableShape
                          key={table.id}
                          table={{
                            ...table,
                            x: table.x * canvasScale,
                            y: table.y * canvasScale,
                            width: table.width * canvasScale,
                            height: table.height * canvasScale,
                          }}
                          status={status}
                          isSelected={selectedTableId === table.id}
                          color={statusColor}
                          onSelect={() => handleTableSelect(table.id)}
                          scale={canvasScale}
                        />
                      );
                    })}
                  </Layer>
                </Stage>

                {/* Status Legend */}
                <Card className="absolute top-4 right-4 w-64">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Table Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.values(TableStatusType).map((status) => {
                      const count = tableStatuses.filter(s => s.status === status).length;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getStatusColor(status) }}
                            />
                            <span className="text-sm capitalize">
                              {status.replace('_', ' ')}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Table Status Panel */}
            {selectedTableStatus && (
              <div className="w-80 border-l bg-card">
                <TableStatusPanel
                  tableStatus={selectedTableStatus}
                  floorPlanTable={floorPlan.tables.find(t => t.id === selectedTableId)}
                  onStatusUpdate={handleTableStatusUpdate}
                  onClose={() => setSelectedTableId(null)}
                />
              </div>
            )}
          </>
        )}

        {viewMode === 'overview' && overview && (
          <div className="flex-1 p-4">
            <FloorPlanOverview
              overview={overview}
              tableStatuses={tableStatuses}
              onTableSelect={handleTableSelect}
            />
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="flex-1 p-4">
            <RealtimeInsights
              restaurantId={restaurantId}
              insights={realtimeInsights}
              tableStatuses={tableStatuses}
            />
          </div>
        )}
      </div>

      {/* Alerts */}
      {tableAlerts.length > 0 && (
        <div className="border-t bg-card">
          <TableAlerts
            alerts={tableAlerts}
            onAlertAction={handleTableStatusUpdate}
          />
        </div>
      )}
    </div>
  );
};