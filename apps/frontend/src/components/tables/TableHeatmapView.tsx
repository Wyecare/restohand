import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useTableHeatmapSSE,
  TableHeatmapData,
} from '@/hooks/useTableHeatmapSSE';
import { Wifi, WifiOff, Clock, MapPin, AlertCircle } from 'lucide-react';
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
      return 'bg-green-700 hover:bg-green-400';
    case 'cleaning':
      return 'bg-slate-400 hover:bg-slate-500';
    case 'reserved':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'occupied':
      const duration = table.occupiedDuration || 0;
      const hours = duration / (1000 * 60 * 60);

      if (hours < 0.5) return 'bg-yellow-400 hover:bg-yellow-500';
      if (hours < 1) return 'bg-orange-400 hover:bg-orange-500';
      if (hours < 1.5) return 'bg-orange-500 hover:bg-orange-600';
      if (hours < 2) return 'bg-red-500 hover:bg-red-600';
      return 'bg-red-600 hover:bg-red-700';
    default:
      return 'bg-slate-300 hover:bg-slate-400';
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

    const needsAttention = tables.filter((t) => {
      if (t.status !== 'occupied') return false;
      const hours = (t.occupiedDuration || 0) / (1000 * 60 * 60);
      return hours >= 2;
    }).length;

    return {
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
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="text-lg font-bold">{stats.available}</span>
        <span className="text-xs text-muted-foreground">Available</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
        <span className="text-lg font-bold">{stats.occupied}</span>
        <span className="text-xs text-muted-foreground">Occupied</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        <span className="text-lg font-bold">{stats.reserved}</span>
        <span className="text-xs text-muted-foreground">Reserved</span>
      </div>

      {stats.needsAttention > 0 && (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
          <span className="text-lg font-bold text-red-600">
            {stats.needsAttention}
          </span>
          <span className="text-xs text-muted-foreground">Critical</span>
        </div>
      )}

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">
          {Math.round(stats.occupancyRate)}%
        </span>
        <span className="text-xs text-muted-foreground">Occupancy</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">
          {formatCurrency(stats.totalRevenue)}
        </span>
        <span className="text-xs text-muted-foreground">Revenue</span>
      </div>
    </div>
  );
}

// Tooltip component using Portal
function TableTooltip({
  table,
  position,
}: {
  table: TableHeatmapData;
  position: { x: number; y: number };
}) {
  const label = getStatusLabel(table);

  return createPortal(
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px',
      }}
    >
      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-xl border">
        <div className="font-semibold mb-2">
          {table.displayName || table.tableNumber}
        </div>

        <div className="space-y-1.5 text-sm min-w-[180px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline" className="text-xs">
              {label}
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-medium">{table.capacity} seats</span>
          </div>

          {table.zone && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Zone</span>
              <span className="font-medium">{table.zone}</span>
            </div>
          )}

          {table.status === 'occupied' && (
            <>
              {table.occupiedDuration && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-bold">
                    {formatDuration(table.occupiedDuration)}
                  </span>
                </div>
              )}

              {table.currentBillAmount > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Bill</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(table.currentBillAmount)}
                  </span>
                </div>
              )}

              {table.partySize && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Party</span>
                  <span className="font-medium">{table.partySize} guests</span>
                </div>
              )}

              {table.assignedServerName && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Server</span>
                  <span className="font-medium truncate max-w-[100px]">
                    {table.assignedServerName}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover" />
        </div>
      </div>
    </div>,
    document.body
  );
}

// Individual heatmap cell - SMALLER SIZE
function HeatmapCell({
  table,
  onClick,
}: {
  table: TableHeatmapData | null;
  onClick?: () => void;
}) {
  const [tooltipData, setTooltipData] = useState<{
    table: TableHeatmapData;
    position: { x: number; y: number };
  } | null>(null);

  if (!table) {
    return (
      <div className="aspect-square bg-slate-50 rounded border border-slate-200" />
    );
  }

  const color = getTableColor(table);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipData({
      table,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top,
      },
    });
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  return (
    <>
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'w-full aspect-square rounded-sm',
          'flex flex-col items-center justify-center',
          'transition-all duration-200',
          'hover:scale-110 hover:shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary',
          color,
          'text-white font-semibold'
        )}
      >
        <span className="text-sm leading-none">
          {table.displayName || table.tableNumber}
        </span>
        <span className="text-[10px] opacity-80 mt-0.5">{table.capacity}</span>
      </button>

      {tooltipData && tooltipData.table === table && (
        <TableTooltip
          table={tooltipData.table}
          position={tooltipData.position}
        />
      )}
    </>
  );
}

// Custom Heatmap Grid
function CustomHeatmapGrid({ tables }: { tables: TableHeatmapData[] }) {
  const zoneGroups = useMemo(() => {
    const groups = tables.reduce((acc, table) => {
      const zone = table.zone || 'Main Area';
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(table);
      return acc;
    }, {} as Record<string, TableHeatmapData[]>);

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
  };

  return (
    <div className="space-y-6">
      {zoneGroups.map(({ zone, tables: zoneTables }) => (
        <div key={zone} className="flex flex-col items-start">
          <div className="flex items-center mx-auto gap-2 mb-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">{zone}</h3>
            <Badge variant="secondary" className="text-xs">
              {zoneTables.length}
            </Badge>
          </div>

          <div className="w-[70%] mx-auto">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-2">
              {zoneTables.map((table) => (
                <HeatmapCell
                  key={table.tableId}
                  table={table}
                  onClick={() => handleTableClick(table)}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Legend - Compact
function CompactLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-green-900" />
        <span>Available</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-blue-500" />
        <span>Reserved</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-yellow-400" />
        <span>&lt;30m</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-orange-400" />
        <span>30m-1h</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-orange-500" />
        <span>1-1.5h</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-red-500" />
        <span>1.5-2h</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-red-600" />
        <span>2h+</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-slate-400" />
        <span>Cleaning</span>
      </div>
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
  } = useTableHeatmapSSE(enabled);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Compact Header */}
      <div className="flex items-center justify-between pb-4 border-b mb-6">
        <CompactStatsBar tables={tables} />

        <div className="flex items-center gap-3">
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
              {connectionStatus === 'connecting' && 'Connecting'}
              {connectionStatus === 'disconnected' && 'Offline'}
              {connectionStatus === 'error' && 'Error'}
            </Badge>
          </div>

          {lastUpdate && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}

          {!isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              className="flex items-center gap-1.5"
            >
              <Wifi className="h-3 w-3" />
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tables.length > 0 ? (
          <CustomHeatmapGrid tables={tables} />
        ) : (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No tables available</p>
              <p className="text-sm mt-1">
                {!isConnected ? 'Check your connection' : 'Waiting for data...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Compact Legend at Bottom */}
      {tables.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-3">
            <CompactLegend />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
