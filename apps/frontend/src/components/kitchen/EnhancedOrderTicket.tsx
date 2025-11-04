import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Copy, Smartphone, Clock, AlertTriangle, Timer, User, MapPin } from 'lucide-react';
import { Order } from '@/store/api/types';
import { cn } from '@/lib/utils';
import { useTicketTimer } from '@/hooks/useTicketTimer';

type TableMeta = {
  displayName?: string;
  zone?: string;
  capacity?: number;
};

type Highlight = 'muted' | 'warning' | 'danger';

export interface EnhancedOrderTicketProps {
  order: Order;
  tableMeta?: TableMeta;
  headerBadges?: ReactNode;
  highlight?: Highlight;
  showItems?: boolean;
  onCopyLink?: (tableNumber?: string | null) => void;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const highlightClasses: Record<Highlight, string> = {
  muted: 'border-border/60 hover:border-border',
  warning: 'border-amber-300/70 bg-amber-50/30 dark:bg-amber-900/10 hover:border-amber-400/80 shadow-amber-100/50 dark:shadow-amber-900/20',
  danger: 'border-destructive/60 bg-destructive/5 hover:border-destructive/80 shadow-destructive/10 animate-pulse',
};

const getTimerBadgeClass = (severity: ReturnType<typeof useTicketTimer>['severity']) => {
  switch (severity) {
    case 'danger':
      return 'border-destructive bg-destructive text-destructive-foreground animate-pulse';
    case 'warning':
      return 'border-amber-500 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    default:
      return 'border-border bg-muted/50 text-muted-foreground';
  }
};

const getStatusIndicator = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return { color: 'bg-red-500', label: 'New Order', pulse: true };
    case 'accepted':
      return { color: 'bg-blue-500', label: 'Accepted', pulse: false };
    case 'in_progress':
      return { color: 'bg-orange-500', label: 'Cooking', pulse: true };
    default:
      return { color: 'bg-gray-500', label: status, pulse: false };
  }
};

export function EnhancedOrderTicket({
  order,
  tableMeta,
  headerBadges,
  highlight = 'muted',
  showItems = true,
  onCopyLink,
  actions,
  footer,
  className,
}: EnhancedOrderTicketProps) {
  const timer = useTicketTimer(order.createdAt);
  const tableNumber = order.tableNumber ?? undefined;
  const statusIndicator = getStatusIndicator(order.status);

  const showCopyButtons = typeof onCopyLink === 'function';
  const hasItems = showItems && order.items?.length;

  const linker = (table?: string | null) => () => onCopyLink?.(table ?? null);

  // Calculate progress based on order status and time
  const getProgress = () => {
    switch (order.status) {
      case 'pending':
        return 0;
      case 'accepted':
        return 25;
      case 'in_progress':
        return order.progress || 50;
      case 'ready':
        return 100;
      default:
        return 0;
    }
  };

  const progress = getProgress();

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-xl border-2 p-0 shadow-lg transition-all duration-300 hover:shadow-xl',
        highlightClasses[highlight],
        className
      )}
    >
      {/* Status Strip */}
      <div className={cn(
        'h-1.5 w-full',
        statusIndicator.color,
        statusIndicator.pulse && 'animate-pulse'
      )} />

      <div className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg">#{order.orderNumber}</h3>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-semibold uppercase tracking-wider',
                  getTimerBadgeClass(timer.severity)
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {timer.label}
              </Badge>
              {timer.severity === 'danger' && (
                <Badge variant="destructive" className="text-xs animate-bounce">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  URGENT
                </Badge>
              )}
              {headerBadges}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="font-medium">{order.customerName ?? 'Guest'}</span>
              </div>

              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>Table {tableNumber ?? '—'}</span>
                {tableMeta && (
                  <span className="text-xs">
                    {tableMeta.displayName && `• ${tableMeta.displayName}`}
                    {tableMeta.zone && ` • ${tableMeta.zone}`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="secondary"
              className="text-sm font-bold px-3 py-1"
            >
              ₹{order.totalAmount.toFixed(2)}
            </Badge>
            <Badge
              variant={order.paymentMethod === 'cash' ? 'destructive' : 'outline'}
              className="text-xs uppercase font-semibold"
            >
              {order.paymentMethod === 'cash' ? 'Cash' : 'UPI'}
            </Badge>
            {showCopyButtons && (
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={linker(tableNumber)}
                  title="Copy table link"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={linker('')}
                  title="Copy generic link"
                >
                  <Smartphone className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              {statusIndicator.label}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {progress}%
            </span>
          </div>
          <Progress
            value={progress}
            className="h-2"
          />
        </div>

        {/* Items List */}
        {hasItems && (
          <div className="mb-4">
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div
                  key={`${order.id}-${item.menuItemId ?? item.name}-${index}`}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <span className="flex-1 truncate font-medium text-sm">{item.name}</span>
                  <Badge variant="outline" className="text-xs font-bold">
                    ×{item.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="flex flex-wrap gap-2 mb-2">
            {actions}
          </div>
        )}

        {/* Footer */}
        {footer && <div className="pt-2 border-t border-border/50">{footer}</div>}
      </div>
    </Card>
  );
}

export default EnhancedOrderTicket;