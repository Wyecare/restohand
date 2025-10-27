import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Smartphone } from 'lucide-react';
import { Order } from '@/store/api/types';
import { cn } from '@/lib/utils';
import { useTicketTimer } from '@/hooks/useTicketTimer';

type TableMeta = {
  displayName?: string;
  zone?: string;
  capacity?: number;
};

type Highlight = 'muted' | 'warning' | 'danger';

export interface OrderTicketProps {
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
  muted: 'border-border/60 bg-card/80',
  warning: 'border-amber-300/70 bg-amber-100/20',
  danger: 'border-destructive/60 bg-destructive/10',
};

const getTimerBadgeClass = (severity: ReturnType<typeof useTicketTimer>['severity']) => {
  switch (severity) {
    case 'danger':
      return 'border-destructive/80 bg-destructive/10 text-destructive';
    case 'warning':
      return 'border-amber-500/70 bg-amber-100/20 text-amber-700';
    default:
      return 'border-border bg-background/60 text-muted-foreground';
  }
};

export function OrderTicket({
  order,
  tableMeta,
  headerBadges,
  highlight = 'muted',
  showItems = true,
  onCopyLink,
  actions,
  footer,
  className,
}: OrderTicketProps) {
  const timer = useTicketTimer(order.createdAt);
  const tableNumber = order.tableNumber ?? undefined;

  const showCopyButtons = typeof onCopyLink === 'function';
  const hasItems = showItems && order.items?.length;

  const linker = (table?: string | null) => () => onCopyLink?.(table ?? null);

  return (
    <Card
      className={cn(
        'rounded-2xl border bg-card p-4 shadow-sm transition-colors',
        highlightClasses[highlight],
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">#{order.orderNumber}</p>
            <Badge
              variant="outline"
              className={cn(
                'border text-[11px] font-medium uppercase tracking-wide',
                getTimerBadgeClass(timer.severity)
              )}
            >
              {timer.label}
            </Badge>
            {headerBadges}
          </div>
          <p className="text-xs text-muted-foreground">
            {order.customerName ?? 'Guest'} •{' '}
            {order.items.length} item{order.items.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Table {tableNumber ?? '—'}
            {tableMeta && (
              <>
                {tableMeta.displayName ? ` • ${tableMeta.displayName}` : ''}
                {tableMeta.zone ? ` • ${tableMeta.zone}` : ''}
                {tableMeta.capacity ? ` • ${tableMeta.capacity} covers` : ''}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary" className="text-xs font-semibold">
            ₹{order.totalAmount.toFixed(2)}
          </Badge>
          <Badge
            variant={order.paymentMethod === 'cash' ? 'destructive' : 'outline'}
            className="text-xs uppercase"
          >
            {order.paymentMethod === 'cash' ? 'Cash' : 'UPI'}
          </Badge>
          {showCopyButtons && (
            <div className="flex gap-2 pt-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={linker(tableNumber)}
                title="Copy table link"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={linker('')}
                title="Copy generic link"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {hasItems && (
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          {order.items.map((item) => (
            <div
              key={`${order.id}-${item.menuItemId ?? item.name}`}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex-1 truncate">{item.name}</span>
              <span className="font-medium text-foreground">
                ×{item.quantity}
              </span>
            </div>
          ))}
        </div>
      )}

      {actions && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions}
        </div>
      )}

      {footer && <div className="mt-3">{footer}</div>}
    </Card>
  );
}

export default OrderTicket;
