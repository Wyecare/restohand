import * as React from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId, selectUserRoles } from '@/store/slices/authSlice';
import { useBranchContext } from '@/contexts/BranchContext';
import { useGetCurrentTillQuery } from '@/store/api/tillApi';
import { TillOpenModal } from './components/TillOpenModal';
import { PosView } from './views/PosView';
import { SessionsView } from './views/SessionsView';
import { TillView } from './views/TillView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { skipToken } from '@reduxjs/toolkit/query';
import { ShoppingCart, LayoutGrid, Banknote, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActiveView = 'pos' | 'sessions' | 'till';

export default function CashierPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const roles = useAppSelector(selectUserRoles);
  const [activeView, setActiveView] = React.useState<ActiveView>('pos');
  const [showTillOpen, setShowTillOpen] = React.useState(false);

  const { data: currentTill, isLoading: tillLoading, refetch: refetchTill } = useGetCurrentTillQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id }
      : skipToken,
    { pollingInterval: 30000 },
  );

  // Show till open modal automatically if no till is open (cashier only, not manager)
  const isCashierOnly = roles.includes('cashier') && !roles.includes('manager') && !roles.includes('owner');
  const tillIsOpen = !!currentTill;

  React.useEffect(() => {
    if (!tillLoading && !tillIsOpen && isCashierOnly) {
      setShowTillOpen(true);
    }
  }, [tillLoading, tillIsOpen, isCashierOnly]);

  const tabs: { id: ActiveView; label: string; icon: React.ElementType }[] = [
    { id: 'pos', label: 'POS', icon: ShoppingCart },
    { id: 'sessions', label: 'Sessions', icon: LayoutGrid },
    { id: 'till', label: 'Till', icon: Banknote },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card flex-shrink-0">
        {/* Tab Nav */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeView === id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
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
        {activeView === 'sessions' && <SessionsView currentTill={currentTill ?? null} />}
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
