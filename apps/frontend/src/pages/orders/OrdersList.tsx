/* eslint-disable react-hooks/exhaustive-deps */
import * as React from 'react';
import {
  CheckCircle,
  Clock,
  Utensils,
  Ban,
  RefreshCcw,
  ChevronRight,
  X,
  ArrowUpDown,
  Circle,
  Loader2,
  Receipt,
  TableProperties,
  CreditCard,
  CalendarClock,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  useListOrdersByBranchQuery,
  useUpdateOrderStatusMutation,
} from '@/store/api/ordersApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { skipToken } from '@reduxjs/toolkit/query';
import type { Order } from '@/store/api/types';
import { useBranchContext } from '@/contexts/BranchContext';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_CANCELLABLE_STATUSES: Array<Order['status']> = [
  'pending',
  'accepted',
  'in_progress',
];

type StatusKey = Order['status'] | 'all';

interface StatusMeta {
  label: string;
  dot: string;
  badge: string;
  border: string;
}

const STATUS_META: Record<Order['status'], StatusMeta> = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',     border: 'border-l-amber-400' },
  accepted:    { label: 'Accepted',    dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',       border: 'border-l-blue-400' },
  in_progress: { label: 'In Progress', dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', border: 'border-l-violet-400' },
  ready:       { label: 'Ready',       dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', border: 'border-l-emerald-400' },
  completed:   { label: 'Completed',   dot: 'bg-slate-300',   badge: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',    border: 'border-l-slate-200' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-red-300',     badge: 'bg-red-50 text-red-500 ring-1 ring-red-200',         border: 'border-l-red-300' },
};

const STATUS_FILTERS: Array<{ value: StatusKey; label: string }> = [
  { value: 'all',         label: 'All' },
  { value: 'pending',     label: 'Pending' },
  { value: 'accepted',    label: 'Accepted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready',       label: 'Ready' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

function itemsSummary(items: Order['items']): string {
  if (!items?.length) return '—';
  const first = items[0];
  if (items.length === 1) return `${first.name} × ${first.quantity}`;
  return `${first.name} × ${first.quantity} +${items.length - 1} more`;
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Order['status'] }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

// ─── PaymentBadge ─────────────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <CheckCircle className="h-3 w-3" /> Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
      <Circle className="h-3 w-3" /> Unpaid
    </span>
  );
}

// ─── TimelineRow ──────────────────────────────────────────────────────────────

function TimelineRow({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-medium text-slate-700">{formatTime(date)}</span>
        <span className="text-xs text-slate-400 ml-1.5">{formatDate(date)}</span>
      </div>
    </div>
  );
}

// ─── Side Panel ───────────────────────────────────────────────────────────────

interface SidePanelProps {
  order: Order | null;
  onClose: () => void;
  onMarkReady: (id: string) => void;
  onMarkCompleted: (id: string) => void;
  onCancel: (order: Order) => void;
  isUpdating: boolean;
}

function OrderSidePanel({
  order, onClose, onMarkReady, onMarkCompleted, onCancel, isUpdating,
}: SidePanelProps) {
  const isOpen = !!order;

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const canAct = order && (ORDER_CANCELLABLE_STATUSES.includes(order.status) || order.status === 'ready');

  return (
    <>
      {/* Backdrop */}
      <div
  className={`fixed inset-x-0 bottom-0 bg-black/20 z-30 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
  style={{ top: '50px' }}
  onClick={onClose}
/>

<div
  className={`fixed right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
  style={{ top: '50px' }}
>
        {order && (
          <>
            {/* Header */}
            <div className={`border-l-4 ${STATUS_META[order.status].border} border-b border-slate-100`}>
              <div className="flex items-start justify-between p-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Order</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{order.orderNumber}</h2>
                  {order.tableNumber && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      <TableProperties className="h-3 w-3" />
                      Table {order.tableNumber}
                    </span>
                  )}
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* Items */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Items
                </h3>
                <div className="space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center font-bold">
                          {item.quantity}
                        </span>
                        <span className="text-sm font-medium text-slate-800">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {formatCurrency(item.pricing.unitAmount * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-sm font-semibold text-slate-600">Total</span>
                  <span className="text-base font-bold text-slate-900">{formatCurrency(order.totalAmount)}</span>
                </div>
              </section>

              {/* Payment */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Payment
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Status</p>
                    <PaymentBadge status={order.paymentStatus} />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Method</p>
                    <p className="text-sm font-medium text-slate-700 capitalize">
                      {order.paymentMethod === 'pending' ? '—' : order.paymentMethod}
                    </p>
                  </div>
                  {order.paymentProvider && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Provider</p>
                      <p className="text-sm font-medium text-slate-700 capitalize">{order.paymentProvider}</p>
                    </div>
                  )}
                  {order.paidAt && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Paid at</p>
                      <p className="text-sm font-medium text-slate-700">{formatTime(order.paidAt)}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Timeline */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> Timeline
                </h3>
                <div className="space-y-3">
                  <TimelineRow label="Created" date={order.createdAt} />
                  {order.readyAt && <TimelineRow label="Ready" date={order.readyAt} />}
                  {order.paidAt && <TimelineRow label="Completed" date={order.paidAt} />}
                </div>
              </section>

              {/* Status Note */}
              {order.statusNote && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-600 mb-0.5">Note</p>
                  <p className="text-sm text-red-700">{order.statusNote}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {canAct && (
              <div className="border-t border-slate-100 p-4 space-y-2 bg-white">
                {ORDER_CANCELLABLE_STATUSES.includes(order.status) && (
                  <Button
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium h-10"
                    disabled={isUpdating}
                    onClick={() => onMarkReady(order.id)}
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Mark as Ready
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-10"
                    disabled={isUpdating}
                    onClick={() => onMarkCompleted(order.id)}
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Mark as Completed
                  </Button>
                )}
                {ORDER_CANCELLABLE_STATUSES.includes(order.status) && (
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium h-10"
                    disabled={isUpdating}
                    onClick={() => onCancel(order)}
                  >
                    <Ban className="h-4 w-4 mr-2" /> Cancel Order
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── FilterTab ────────────────────────────────────────────────────────────────

interface FilterTabProps {
  value: StatusKey;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterTab({ value, label, count, isActive, onClick }: FilterTabProps) {
  const isUrgent = (value === 'pending' || value === 'ready') && count > 0;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 ${
        isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[1.25rem] text-center ${
          isActive ? 'bg-white/20 text-white' : isUrgent ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── OrderRow ─────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: Order;
  isSelected: boolean;
  onClick: () => void;
}

function OrderRow({ order, isSelected, onClick }: OrderRowProps) {
  const meta = STATUS_META[order.status];
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-4 px-4 py-3.5 cursor-pointer border-l-4 ${meta.border} border-b border-slate-100 last:border-b-0 transition-colors duration-100 ${
        isSelected ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/70'
      }`}
    >
      {/* Left: order info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-slate-900 font-mono tracking-tight">
            #{order.orderNumber.split('-').pop()}
          </span>
          {order.tableNumber && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
              {order.tableNumber}
            </span>
          )}
          {order.customerName && order.customerName !== 'Guest Customer' && (
            <span className="text-xs text-slate-400 truncate">{order.customerName}</span>
          )}
        </div>
        <p className="text-xs text-slate-400 truncate">{itemsSummary(order.items)}</p>
      </div>

      {/* Right: meta */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{timeAgo(order.createdAt)}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800">{formatCurrency(order.totalAmount)}</p>
          <div className="flex justify-end mt-0.5">
            <PaymentBadge status={order.paymentStatus} />
          </div>
        </div>
        <StatusBadge status={order.status} />
        <ChevronRight className={`h-4 w-4 transition-transform duration-150 shrink-0 ${
          isSelected ? 'text-slate-600 rotate-90' : 'text-slate-300 group-hover:text-slate-400'
        }`} />
      </div>
    </div>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-l-4 border-l-slate-100 border-b border-slate-100 animate-pulse">
      <div className="flex-1">
        <div className="h-3.5 bg-slate-100 rounded w-24 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-44" />
      </div>
      <div className="h-3 bg-slate-100 rounded w-12" />
      <div className="h-3 bg-slate-100 rounded w-16" />
      <div className="h-5 bg-slate-100 rounded-full w-20" />
      <div className="h-4 w-4 bg-slate-100 rounded" />
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Receipt className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600 mb-1">
        {filtered ? 'No orders match this filter' : 'No orders yet'}
      </p>
      <p className="text-xs text-slate-400 max-w-xs">
        {filtered ? 'Try selecting a different status above' : 'Orders will appear here as customers place them'}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = React.useState<StatusKey>('all');
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const branchId = currentBranch?._id;

  const queryArgs =
    restaurantId && branchId
      ? {
          restaurantId,
          branchId,
          status: statusFilter !== 'all' ? (statusFilter as Order['status']) : undefined,
          limit: 20,
          page: 1,
        }
      : skipToken;

  const { data, isLoading, refetch } = useListOrdersByBranchQuery(queryArgs);
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  useOrdersSocket({ onEvent: refetch, enabled: !!restaurantId });

  // Keep selected order fresh when data updates via socket
  React.useEffect(() => {
    if (selectedOrder && data?.data) {
      const updated = data.data.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
  }, [data]);

  const allOrders = data?.data ?? [];

  const orders = React.useMemo(() => {
    return [...allOrders].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [allOrders, sortDir]);

  const counts = React.useMemo(() => {
    const map: Partial<Record<Order['status'], number>> = {};
    allOrders.forEach((o) => { map[o.status] = (map[o.status] ?? 0) + 1; });
    return { all: data?.total ?? allOrders.length, ...map } as Record<string, number>;
  }, [allOrders, data?.total]);

  const totalRevenue = React.useMemo(
    () => allOrders.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0),
    [allOrders]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    if (!restaurantId) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus({ restaurantId, orderId, status: newStatus }).unwrap();
      toast({ title: `Order marked as ${STATUS_META[newStatus].label}` });
      refetch();
    } catch (error) {
      toast({
        title: 'Unable to update order',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!restaurantId || order.status === 'cancelled') return;
    if (!ORDER_CANCELLABLE_STATUSES.includes(order.status)) {
      toast({ title: 'Cannot cancel order', description: 'This order has progressed too far to cancel.', variant: 'destructive' });
      return;
    }
    const confirmed = typeof window === 'undefined' ? true : window.confirm(`Cancel order ${order.orderNumber}? This cannot be undone.`);
    if (!confirmed) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus({ restaurantId, orderId: order.id, status: 'cancelled', statusNote: 'Cancelled by staff' }).unwrap();
      toast({ title: 'Order cancelled' });
      setSelectedOrder(null);
      refetch();
    } catch (error) {
      toast({
        title: 'Unable to cancel order',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="mx-auto px-4 py-6 space-y-4">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Utensils className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">{currentBranch?.name ?? 'Branch'}</span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orders</h1>
          </div>

          <div className="flex items-center gap-3">
            {totalRevenue > 0 && (
              <div className="hidden sm:block text-right">
                <p className="text-xs text-slate-400">Collected</p>
                <p className="text-sm font-bold text-slate-800">{formatCurrency(totalRevenue)}</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-100"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Filter Tabs + Sort */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <FilterTab
                key={f.value}
                value={f.value}
                label={f.label}
                count={counts[f.value] ?? 0}
                isActive={statusFilter === f.value}
                onClick={() => setStatusFilter(f.value)}
              />
            ))}
          </div>
          <button
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors shrink-0"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* List header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {statusFilter === 'all'
                  ? 'All Orders'
                  : STATUS_META[statusFilter as Order['status']]?.label ?? 'Orders'}
              </span>
              {!isLoading && (
                <span className="text-xs text-slate-400">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                  {data?.total && data.total > orders.length ? ` of ${data.total}` : ''}
                </span>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400 pr-8">
              <span>Time</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
          </div>

          {/* Rows */}
          {isLoading ? (
            <>{Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}</>
          ) : orders.length === 0 ? (
            <EmptyState filtered={statusFilter !== 'all'} />
          ) : (
            <>{orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                isSelected={selectedOrder?.id === order.id}
                onClick={() => setSelectedOrder((prev) => prev?.id === order.id ? null : order)}
              />
            ))}</>
          )}

          {/* Pagination footer */}
          {!isLoading && data && data.total > orders.length && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">Showing {orders.length} of {data.total} orders</span>
              <span className="text-xs text-slate-400">Page {data.page} · {data.limit} per page</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center">
          Click any order to view details and take action
        </p>
      </div>

      {/* Side Panel */}
      <OrderSidePanel
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onMarkReady={(id) => handleStatusUpdate(id, 'ready')}
        onMarkCompleted={(id) => handleStatusUpdate(id, 'completed')}
        onCancel={handleCancelOrder}
        isUpdating={isUpdating}
      />
    </div>
  );
}