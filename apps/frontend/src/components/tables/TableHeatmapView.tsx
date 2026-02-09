import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useTableHeatmapSSE,
  TableHeatmapData,
} from '@/hooks/useTableHeatmapSSE';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Users,
  TrendingUp,
  DollarSign,
  Info,
  MapPin,
} from 'lucide-react';
import { formatCurrency } from '@/lib/billing';
import { cn } from '@/lib/utils';

interface TableHeatmapViewProps {
  enabled?: boolean;
}

// Helper function to format duration
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Get color for table based on status and duration
function getTableColor(table: TableHeatmapData): string {
  switch (table.status) {
    case 'available':
      return 'bg-emerald-500';
    case 'cleaning':
      return 'bg-slate-400';
    case 'reserved':
      return 'bg-blue-500';
    case 'occupied':
      const duration = table.occupiedDuration || 0;
      const hours = duration / (1000 * 60 * 60);

      if (hours < 0.5) return 'bg-yellow-400'; // Fresh - yellow
      if (hours < 1) return 'bg-orange-400'; // Medium - orange
      if (hours < 1.5) return 'bg-orange-500'; // Getting long - dark orange
      if (hours < 2) return 'bg-red-500'; // Long - red
      return 'bg-red-600'; // Critical - deep red
    default:
      return 'bg-slate-300';
  }
}

// Get status label
function getStatusLabel(table: TableHeatmapData): string {
  switch (table.status) {
    case 'available':
      return 'Available';
    case 'cleaning':
      return 'Cleaning';
    case 'reserved':
      return 'Reserved';
    case 'occupied':
      const duration = table.occupiedDuration || 0;
      const hours = duration / (1000 * 60 * 60);

      if (hours < 0.5) return 'Fresh';
      if (hours < 1) return 'Medium';
      if (hours < 2) return 'Long';
      return 'Critical';
    default:
      return 'Unknown';
  }
}

// Compact Statistics Bar
function CompactStatsBar({ tables }: { tables: TableHeatmapData[] }) {
  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === 'available').length;
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    const reserved = tables.filter((t) => t.status === 'reserved').length;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;
    const totalRevenue = tables.reduce(
      (sum, table) => sum + table.currentBillAmount,
      0
    );

    // Calculate tables needing attention (occupied > 2 hours)
    const needsAttention = tables.filter((t) => {
      if (t.status !== 'occupied') return false;
      const hours = (t.occupiedDuration || 0) / (1000 * 60 * 60);
      return hours >= 2;
    }).length;

    return {
      total,
      available,
      occupied,
      reserved,
      occupancyRate,
      totalRevenue,
      needsAttention,
    };
  }, [tables]);

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <div className="flex flex-col">
          <span className="text-2xl font-bold">{stats.available}</span>
          <span className="text-xs text-muted-foreground">Available</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-rose-500" />
        <div className="flex flex-col">
          <span className="text-2xl font-bold">{stats.occupied}</span>
          <span className="text-xs text-muted-foreground">Occupied</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <div className="flex flex-col">
          <span className="text-2xl font-bold">{stats.reserved}</span>
          <span className="text-xs text-muted-foreground">Reserved</span>
        </div>
      </div>

      {stats.needsAttention > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-red-600">
              {stats.needsAttention}
            </span>
            <span className="text-xs text-muted-foreground">
              Needs Attention
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-2xl font-bold">
            {Math.round(stats.occupancyRate)}%
          </span>
          <span className="text-xs text-muted-foreground">Occupancy</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-2xl font-bold">
            {formatCurrency(stats.totalRevenue)}
          </span>
          <span className="text-xs text-muted-foreground">Revenue</span>
        </div>
      </div>
    </div>
  );
}

// Legend component
function HeatmapLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-sm">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-emerald-500" />
        <span>Available</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-blue-500" />
        <span>Reserved</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-yellow-400" />
        <span>Fresh (&lt;30m)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-orange-400" />
        <span>Medium (30m-1h)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-orange-500" />
        <span>Long (1-1.5h)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-red-500" />
        <span>Very Long (1.5-2h)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-red-600" />
        <span>Critical (2h+)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-slate-400" />
        <span>Cleaning</span>
      </div>
    </div>
  );
}

// Individual heatmap cell
function HeatmapCell({
  table,
  onClick,
}: {
  table: TableHeatmapData | null;
  onClick?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!table) {
    return (
      <div className="aspect-square bg-slate-100 rounded border border-slate-200" />
    );
  }

  const color = getTableColor(table);
  const label = getStatusLabel(table);

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'w-full aspect-square rounded border-2 border-white',
          'flex flex-col items-center justify-center',
          'transition-all duration-200',
          'hover:scale-110 hover:shadow-lg hover:z-10',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
          color,
          'text-white font-medium text-sm'
        )}
      >
        <span className="font-bold text-base">
          {table.displayName || table.tableNumber}
        </span>
        <span className="text-xs opacity-90">{table.capacity}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-xl border min-w-[200px]">
            <div className="font-semibold text-base mb-2">
              {table.displayName || table.tableNumber}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="text-xs">
                  {label}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span>{table.capacity} seats</span>
              </div>

              {table.zone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Zone:</span>
                  <span>{table.zone}</span>
                </div>
              )}

              {table.status === 'occupied' && (
                <>
                  {table.occupiedDuration && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">
                        {formatDuration(table.occupiedDuration)}
                      </span>
                    </div>
                  )}

                  {table.currentBillAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bill:</span>
                      <span className="font-bold">
                        {formatCurrency(table.currentBillAmount)}
                      </span>
                    </div>
                  )}

                  {table.partySize && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Party:</span>
                      <span>{table.partySize} guests</span>
                    </div>
                  )}

                  {table.assignedServerName && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Server:</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {table.assignedServerName}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="border-8 border-transparent border-t-popover" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Heatmap Grid
function CustomHeatmapGrid({ tables }: { tables: TableHeatmapData[] }) {
  // Group tables by zone
  const zoneGroups = useMemo(() => {
    const groups = tables.reduce((acc, table) => {
      const zone = table.zone || 'Main Area';
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(table);
      return acc;
    }, {} as Record<string, TableHeatmapData[]>);

    // Sort zones alphabetically
    return Object.keys(groups)
      .sort()
      .map((zone) => ({
        zone,
        tables: groups[zone].sort((a, b) =>
          (a.tableNumber || '').localeCompare(b.tableNumber || '')
        ),
      }));
  }, [tables]);

  const handleTableClick = (table: TableHeatmapData) => {
    console.log('Table clicked:', table);
    // Add your navigation or modal logic here
  };

  return (
    <div className="space-y-8">
      {zoneGroups.map(({ zone, tables: zoneTables }) => (
        <div key={zone}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{zone}</h3>
            <Badge variant="secondary">{zoneTables.length} tables</Badge>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
            {zoneTables.map((table) => (
              <HeatmapCell
                key={table.tableId}
                table={table}
                onClick={() => handleTableClick(table)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Main heatmap view component
export function TableHeatmapView({ enabled = true }: TableHeatmapViewProps) {
  const {
    tables,
    isConnected,
    lastUpdate,
    connectionStatus,
    error,
    reconnect,
    refreshManually,
  } = useTableHeatmapSSE(enabled);

  return (
    <div className="flex flex-col h-full w-full space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b">
        <CompactStatsBar tables={tables} />

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-rose-500" />
            )}
            <Badge
              variant={isConnected ? 'default' : 'secondary'}
              className="text-xs"
            >
              {connectionStatus === 'connected' && 'Live'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'disconnected' && 'Offline'}
              {connectionStatus === 'error' && 'Error'}
            </Badge>
          </div>

          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}

          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshManually}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>

          {!isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              className="flex items-center gap-1"
            >
              <Wifi className="h-3 w-3" />
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Color Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HeatmapLegend />
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card className="flex-1 overflow-auto z-30">
        <CardHeader>
          <CardTitle>Table Status Heatmap ({tables.length} tables)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Hover over any table to view details. Click to open full
            information.
          </p>
        </CardHeader>
        <CardContent>
          {tables.length > 0 ? (
            <CustomHeatmapGrid tables={tables} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No tables available</p>
                <p className="text-sm">
                  {!isConnected
                    ? 'Check your connection and try again.'
                    : 'Waiting for data...'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
