import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useBranchAwareQueries } from '@/hooks/useBranchAwareQuery';
import {
  useTableHeatmapSSE,
  TableHeatmapData,
} from '@/hooks/useTableHeatmapSSE';
import { formatCurrency } from '@/lib/billing';
import { cn } from '@/lib/utils';
import {
  Wifi,
  WifiOff,
  AlertCircle,
  Users,
  Clock,
  TrendingUp,
  MapPin,
  RefreshCw,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Returns heat config based on status + duration
function getHeatConfig(table: TableHeatmapData): {
  bg: string;
  glow: string;
  ring: string;
  label: string;
  intensity: number; // 0–1 for bar width
} {
  switch (table.status) {
    case 'available':
      return {
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
        glow: 'shadow-emerald-500/5',
        ring: 'ring-emerald-500/40',
        label: 'Available',
        intensity: 0,
      };
    case 'cleaning':
      return {
        bg: 'bg-slate-500/20 hover:bg-slate-500/30',
        glow: 'shadow-slate-500/5',
        ring: 'ring-slate-400/40',
        label: 'Cleaning',
        intensity: 0,
      };
    case 'reserved':
      return {
        bg: 'bg-blue-500/20 hover:bg-blue-500/30',
        glow: 'shadow-blue-500/5',
        ring: 'ring-blue-500/40',
        label: 'Reserved',
        intensity: 0.2,
      };
    case 'occupied': {
      const hours = (table.occupiedDuration || 0) / 3600000;
      if (hours < 0.5)
        return {
          bg: 'bg-amber-400/20 hover:bg-amber-400/30',
          glow: 'shadow-amber-400/5',
          ring: 'ring-amber-400/50',
          label: 'Just seated',
          intensity: 0.25,
        };
      if (hours < 1)
        return {
          bg: 'bg-orange-400/25 hover:bg-orange-400/35',
          glow: 'shadow-orange-400/5',
          ring: 'ring-orange-400/50',
          label: 'Dining',
          intensity: 0.5,
        };
      if (hours < 1.5)
        return {
          bg: 'bg-orange-500/30 hover:bg-orange-500/40',
          glow: 'shadow-orange-500/5',
          ring: 'ring-orange-500/60',
          label: 'Long stay',
          intensity: 0.7,
        };
      if (hours < 2)
        return {
          bg: 'bg-red-500/30 hover:bg-red-500/40',
          glow: 'shadow-red-500/5',
          ring: 'ring-red-500/60',
          label: 'Overstay',
          intensity: 0.85,
        };
      return {
        bg: 'bg-red-600/40 hover:bg-red-600/50',
        glow: 'shadow-red-600/5',
        ring: 'ring-red-600/70',
        label: 'Critical',
        intensity: 1,
      };
    }
    default:
      return {
        bg: 'bg-slate-600/20',
        glow: '',
        ring: 'ring-slate-600/30',
        label: 'Unknown',
        intensity: 0,
      };
  }
}

// ─── Tooltip ───────────────────────────────────────────────────────────────────

function TableTooltip({
  table,
  position,
}: {
  table: TableHeatmapData;
  position: { x: number; y: number };
}) {
  const { label } = getHeatConfig(table);

  return createPortal(
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, calc(-100% - 12px))',
      }}
    >
      <div className="bg-popover border border-border rounded-xl shadow-2xl p-3.5 min-w-[200px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
          <span className="font-bold text-foreground text-sm">
            {table.displayName || table.tableNumber}
          </span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              table.status === 'available' && 'bg-emerald-500/20 text-emerald-400',
              table.status === 'occupied' && 'bg-orange-500/20 text-orange-400',
              table.status === 'reserved' && 'bg-blue-500/20 text-blue-400',
              table.status === 'cleaning' && 'bg-muted/50 text-muted-foreground',
            )}
          >
            {label}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <Row label="Capacity" value={`${table.capacity} seats`} />
          {table.zone && <Row label="Zone" value={table.zone} />}
          {table.status === 'occupied' && (
            <>
              {table.occupiedDuration != null && (
                <Row
                  label="Time"
                  value={formatDuration(table.occupiedDuration)}
                  highlight
                />
              )}
              {table.currentBillAmount > 0 && (
                <Row
                  label="Bill"
                  value={formatCurrency(table.currentBillAmount)}
                  highlight
                />
              )}
              {table.partySize && (
                <Row label="Party" value={`${table.partySize} guests`} />
              )}
              {table.assignedServerName && (
                <Row label="Server" value={table.assignedServerName} />
              )}
            </>
          )}
        </div>

        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-border" />
      </div>
    </div>,
    document.body
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', highlight ? 'text-foreground' : 'text-muted-foreground')}>
        {value}
      </span>
    </div>
  );
}

// ─── Table Cell ────────────────────────────────────────────────────────────────

function TableCell({ table }: { table: TableHeatmapData }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const config = getHeatConfig(table);
  const isCritical = table.status === 'occupied' && config.intensity === 1;

  return (
    <>
      <button
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setTooltip({ x: r.left + r.width / 2, y: r.top });
        }}
        onMouseLeave={() => setTooltip(null)}
        className={cn(
          'relative w-full aspect-square rounded-xl border transition-all duration-200 group',
          'flex flex-col items-center justify-center gap-1',
          'focus:outline-none focus:ring-2 focus:ring-white/30',
          config.bg,
          `ring-1 ${config.ring}`,
          config.glow && `shadow-lg ${config.glow}`,
          isCritical && 'animate-pulse'
        )}
      >
        {/* Heat bar — bottom fill indicating occupancy duration */}
        {table.status === 'occupied' && config.intensity > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-30 transition-all duration-700"
            style={{
              height: `${config.intensity * 100}%`,
              background: config.intensity > 0.7
                ? 'linear-gradient(to top, rgb(239,68,68), transparent)'
                : config.intensity > 0.4
                ? 'linear-gradient(to top, rgb(249,115,22), transparent)'
                : 'linear-gradient(to top, rgb(251,191,36), transparent)',
            }}
          />
        )}

        <span className="relative text-xs font-bold 
        leading-none z-10">
          {table.displayName || table.tableNumber}
        </span>
        <span className="relative text-[10px] 
         leading-none z-10">
          {table.capacity}p
        </span>

        {/* Duration badge for occupied */}
        {table.status === 'occupied' && table.occupiedDuration != null && (
          <span className="relative text-[9px] text-white/70 leading-none z-10 font-mono">
            {formatDuration(table.occupiedDuration)}
          </span>
        )}

        {/* Status dot */}
        <div
          className={cn(
            'absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full',
            table.status === 'available' && 'bg-emerald-400',
            table.status === 'occupied' && 'bg-orange-400',
            table.status === 'reserved' && 'bg-blue-400',
            table.status === 'cleaning' && 'bg-slate-400',
          )}
        />
      </button>

      {tooltip && <TableTooltip table={table} position={tooltip} />}
    </>
  );
}

// ─── Zone Section ──────────────────────────────────────────────────────────────

function ZoneSection({
  zone,
  tables,
}: {
  zone: string;
  tables: TableHeatmapData[];
}) {
  const occupied = tables.filter((t) => t.status === 'occupied').length;
  const pct = Math.round((occupied / tables.length) * 100);

  return (
    <div>
      {/* Zone header */}
      <div className="flex items-center gap-3 mb-3">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {zone}
        </span>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-mono">
          {occupied}/{tables.length}
        </span>
        {/* Mini occupancy bar */}
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-orange-400' : 'bg-emerald-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
        {tables.map((table) => (
          <TableCell key={table.tableId} table={table} />
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  icon: React.ElementType;
}) {
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-2', 'bg-card border-border')}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', accent)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: 'bg-emerald-500', label: 'Available' },
    { color: 'bg-blue-500', label: 'Reserved' },
    { color: 'bg-amber-400', label: '<30 min' },
    { color: 'bg-orange-400', label: '30m–1h' },
    { color: 'bg-orange-500', label: '1–1.5h' },
    { color: 'bg-red-500', label: '1.5–2h' },
    { color: 'bg-red-600', label: '2h+ critical' },
    { color: 'bg-slate-500', label: 'Cleaning' },
  ];

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={cn('w-2.5 h-2.5 rounded-sm opacity-80', color)} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

function TableHeatmapView({ enabled = true }: { enabled?: boolean }) {
  const { tables, isConnected, lastUpdate, connectionStatus, error, reconnect } =
    useTableHeatmapSSE(enabled);

  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === 'available').length;
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    const reserved = tables.filter((t) => t.status === 'reserved').length;
    const revenue = tables.reduce((s, t) => s + t.currentBillAmount, 0);
    const critical = tables.filter((t) => {
      if (t.status !== 'occupied') return false;
      return (t.occupiedDuration || 0) >= 7200000;
    }).length;
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, available, occupied, reserved, revenue, critical, occupancyPct };
  }, [tables]);

  const zoneGroups = useMemo(() => {
    const map: Record<string, TableHeatmapData[]> = {};
    tables.forEach((t) => {
      const z = t.zone || 'Main Area';
      if (!map[z]) map[z] = [];
      map[z].push(t);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([zone, tbls]) => ({
        zone,
        tables: tbls.sort((a, b) => (a.tableNumber || '').localeCompare(b.tableNumber || '')),
      }));
  }, [tables]);

  return (
    <div className="flex flex-col gap-6 h-full">

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Occupancy"
          value={`${stats.occupancyPct}%`}
          sub={`${stats.occupied} of ${stats.total} tables`}
          accent="bg-orange-500/15 text-orange-400"
          icon={TrendingUp}
        />
        <KpiCard
          label="Available"
          value={String(stats.available)}
          sub={`${stats.reserved} reserved`}
          accent="bg-emerald-500/15 text-emerald-400"
          icon={Users}
        />
        <KpiCard
          label="Live Revenue"
          value={formatCurrency(stats.revenue)}
          sub="open bills"
          accent="bg-blue-500/15 text-blue-400"
          icon={TrendingUp}
        />
        <KpiCard
          label="Critical"
          value={String(stats.critical)}
          sub="tables over 2h"
          accent={stats.critical > 0 ? 'bg-red-500/15 text-red-400' : 'bg-muted text-muted-foreground'}
          icon={AlertCircle}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Heatmap card */}
      <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">

        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <Legend />
          <div className="flex items-center gap-3 shrink-0">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40'
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  isConnected ? 'text-emerald-400' : 'text-muted-foreground'
                )}
              >
                {isConnected ? 'Live' : connectionStatus}
              </span>
            </div>
            {!isConnected && (
              <button
                onClick={reconnect}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Reconnect
              </button>
            )}
          </div>
        </div>

        {/* Grid content */}
        <div className="flex-1 overflow-auto p-5">
          {tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-60 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No table data</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isConnected ? 'Waiting for updates...' : 'Check your connection'}
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {zoneGroups.map(({ zone, tables: zoneTables }) => (
                <ZoneSection key={zone} zone={zone} tables={zoneTables} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const TableHeatmapPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  useBranchAwareQueries();

  if (!restaurantId) return <Navigate to="/auth" replace />;

  return (
    <div className="flex flex-col h-[calc(100vh-50px)] px-6 py-5 bg-background">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Table Heatmap</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time occupancy · auto-updates via SSE</p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TableHeatmapView />
      </div>
    </div>
  );
};

export default TableHeatmapPage;