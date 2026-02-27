import * as React from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId, selectUserRoles, selectIdToken } from '@/store/slices/authSlice';
import { useBranchContext } from '@/contexts/BranchContext';
import { useGetCurrentTillQuery } from '@/store/api/tillApi';
import { useListOrdersQuery } from '@/store/api/ordersApi';
import { TillOpenModal } from './components/TillOpenModal';
import { PosView } from './views/PosView';
import { SessionsView } from './views/SessionsView';
import { TillView } from './views/TillView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { skipToken } from '@reduxjs/toolkit/query';
import { ShoppingCart, LayoutGrid, Banknote, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import type { Order } from '@/store/api/types';

type ActiveView = 'pos' | 'sessions' | 'till';

export default function CashierPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const roles = useAppSelector(selectUserRoles);
  const token = useAppSelector(selectIdToken);
  const [activeView, setActiveView] = React.useState<ActiveView>('pos');
  const [showTillOpen, setShowTillOpen] = React.useState(false);
  const [pendingOrders, setPendingOrders] = React.useState<Order[]>([]);

  const { data: currentTill, isLoading: tillLoading, refetch: refetchTill } = useGetCurrentTillQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id }
      : skipToken,
    { pollingInterval: 30000 },
  );

  // Fetch existing pending orders on mount (orders placed before this session started)
  const { data: pendingOrdersData } = useListOrdersQuery(
    restaurantId
      ? { restaurantId, status: 'pending', limit: 50 }
      : skipToken,
    { refetchOnMountOrArgChange: true },
  );

  // Seed pending queue from API on first load (deduped against real-time additions)
  React.useEffect(() => {
    const fetched = pendingOrdersData?.data ?? [];
    if (fetched.length === 0) return;
    setPendingOrders((prev) => {
      const existingIds = new Set(prev.map((o) => o.id));
      const newOnes = fetched.filter((o) => !existingIds.has(o.id));
      return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
    });
  }, [pendingOrdersData]);

  // WebSocket — receives incoming orders for cashier gate
  const handleOrderPending = React.useCallback((order: Order) => {
    setPendingOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev];
    });
  }, []);

  const handleOrderUpdated = React.useCallback((order: Order) => {
    // Remove from pending if it was accepted or cancelled elsewhere
    if (order.status !== 'pending') {
      setPendingOrders((prev) => prev.filter((o) => o.id !== order.id));
    }
  }, []);

  useOrdersSocket({
    token,
    onOrderPending: handleOrderPending,
    onOrderUpdated: handleOrderUpdated,
  });

  // Show till open modal automatically if no till is open (cashier only, not manager)
  const isCashierOnly = roles.includes('cashier') && !roles.includes('manager') && !roles.includes('owner');
  const tillIsOpen = !!currentTill;

  React.useEffect(() => {
    if (!tillLoading && !tillIsOpen && isCashierOnly) {
      setShowTillOpen(true);
    }
  }, [tillLoading, tillIsOpen, isCashierOnly]);

  const pendingCount = pendingOrders.length;

  const tabs: { id: ActiveView; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'pos', label: 'POS', icon: ShoppingCart },
    { id: 'sessions', label: 'Sessions', icon: LayoutGrid, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'till', label: 'Till', icon: Banknote },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card flex-shrink-0">
        {/* Tab Nav */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeView === id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {badge !== undefined && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Till Status */}
        <div className="flex items-center gap-3">
          {currentBranch && (
            <span className="text-sm text-muted-foreground hidden sm:block">{currentBranch.name}</span>
          )}

          {tillLoading ? (
            <Badge variant="secondary" className="gap-1">
              <RefreshCcw className="h-3 w-3 animate-spin" /> Loading...
            </Badge>
          ) : tillIsOpen ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
              Till Open · {currentTill!.cashierName?.split(' ')[0] ?? 'Active'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              Till Closed
            </Badge>
          )}

          {!tillIsOpen && (
            <Button size="sm" onClick={() => setShowTillOpen(true)} className="gap-2">
              <Banknote className="h-4 w-4" />
              Open Till
            </Button>
          )}
        </div>
      </div>

      {/* Main Content — full height */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'pos' && <PosView currentTill={currentTill ?? null} />}
        {activeView === 'sessions' && (
          <SessionsView
            currentTill={currentTill ?? null}
            pendingOrders={pendingOrders}
            onPendingOrdersChange={setPendingOrders}
          />
        )}
        {activeView === 'till' && <TillView currentTill={currentTill ?? null} />}
      </div>

      {/* Till Open Gate */}
      <TillOpenModal
        open={showTillOpen}
        onOpened={() => { setShowTillOpen(false); refetchTill(); }}
      />
    </div>
  );
}
