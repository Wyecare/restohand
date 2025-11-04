import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Copy,
  Smartphone,
  Clock,
  AlertTriangle,
  ShoppingBag,
  User,
} from 'lucide-react';
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
  muted: 'border-border/60 shadow-sm',
  warning: 'border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10 shadow-md',
  danger:
    'border-orange-300/60 bg-orange-50/30 dark:bg-orange-950/10 shadow-lg',
};

const getTimerBadgeClass = (
  severity: ReturnType<typeof useTicketTimer>['severity']
) => {
  switch (severity) {
    case 'danger':
      return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700';
    case 'warning':
      return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-orange-500';
    case 'accepted':
      return 'bg-blue-500';
    case 'in_progress':
      return 'bg-amber-500';
    default:
      return 'bg-gray-500';
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
  const statusColor = getStatusColor(order.status);

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
        'overflow-hidden border transition-all duration-200 hover:shadow-lg',
        highlightClasses[highlight],
        className
      )}
    >
      {/* Compact Status Strip */}
      <div className={cn('h-1 w-full', statusColor)} />

      <div className="p-3 space-y-2">
        {/* Compact Header - Single Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-bold text-base">#{order.orderNumber}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] h-5 px-1.5',
                getTimerBadgeClass(timer.severity)
              )}
            >
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              {timer.label}
            </Badge>
            {timer.severity === 'danger' && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 border-orange-400 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
              >
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                URGENT
              </Badge>
            )}
            {headerBadges}
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="text-xs font-semibold h-6 px-2"
            >
              ₹{order.totalAmount.toFixed(2)}
            </Badge>
            <Badge
              variant={
                order.paymentMethod === 'cash' ? 'destructive' : 'outline'
              }
              className="text-[10px] h-5 px-1.5"
            >
              {order.paymentMethod === 'cash' ? 'CASH' : 'UPI'}
            </Badge>
          </div>
        </div>

        {/* Compact Info Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">
              {order.customerName ?? 'Guest'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-medium">Table {tableNumber ?? '—'}</span>
            {tableMeta?.zone && (
              <span className="text-[10px] opacity-70">({tableMeta.zone})</span>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <ShoppingBag className="h-3 w-3" />
            <span>{order.items.length}</span>
          </div>

          {showCopyButtons && (
            <div className="flex gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={linker(tableNumber)}
                title="Copy table link"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={linker('')}
                title="Copy generic link"
              >
                <Smartphone className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Compact Progress Bar */}
        {progress > 0 && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Compact Items List */}
        {hasItems && (
          <div className="space-y-1">
            {order.items.map((item, index) => (
              <div
                key={`${order.id}-${item.menuItemId ?? item.name}-${index}`}
                className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-muted/30 text-xs"
              >
                <span className="flex-1 truncate font-medium">{item.name}</span>
                <span className="text-muted-foreground font-semibold">
                  ×{item.quantity}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions && <div className="pt-1">{actions}</div>}

        {/* Footer */}
        {footer && <div className="pt-2 border-t">{footer}</div>}
      </div>
    </Card>
  );
}

export default EnhancedOrderTicket;
