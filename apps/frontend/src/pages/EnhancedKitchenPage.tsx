import { useMemo, useCallback, useState, ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
} from '@/store/api/ordersApi';
import {
  useListRestaurantTablesQuery,
  useGetRestaurantQuery,
} from '@/store/api/restaurantsApi';
import type { Order } from '@/store/api/types';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { KitchenHeader } from '@/components/kitchen/KitchenHeader';
import { KitchenStats } from '@/components/kitchen/KitchenStats';
import {
  EnhancedOrderTicket,
  type EnhancedOrderTicketProps,
} from '@/components/kitchen/EnhancedOrderTicket';
import { useKitchenSounds } from '@/hooks/useKitchenSounds';

const statusesInKitchen: Order['status'][] = [
  'pending',
  'accepted',
  'in_progress',
];

const statusLabel: Record<Order['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'Cooking',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const EnhancedKitchenPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'upi' | 'cash'>(
    'all'
  );
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [previousOrderCount, setPreviousOrderCount] = useState(0);

  // Initialize kitchen sounds
  const {
    config: soundConfig,
    toggleEnabled: toggleSounds,
    sounds,
  } = useKitchenSounds();

  const orderArgs = restaurantId
    ? { restaurantId, limit: 20, page: 1 }
    : skipToken;

  const { data, isLoading, refetch } = useListOrdersQuery(orderArgs, {
    skip: !restaurantId,
  });

  const tablesArgs = restaurantId
    ? { restaurantId, includeInactive: false }
    : skipToken;
  const { data: tablesData } = useListRestaurantTablesQuery(tablesArgs, {
    skip: !restaurantId,
  });
  const { data: restaurant } = useGetRestaurantQuery(
    restaurantId ?? skipToken,
    { skip: !restaurantId }
  );

  const tableLookup = useMemo(() => {
    const map = new Map<
      string,
      { displayName?: string; zone?: string; capacity?: number }
    >();
    tablesData?.forEach((table) => {
      map.set(table.tableNumber.toLowerCase(), {
        displayName: table.displayName ?? undefined,
        zone: table.zone ?? undefined,
        capacity: table.capacity ?? undefined,
      });
    });
    return map;
  }, [tablesData]);

  const zones = useMemo(() => {
    const unique = new Set<string>();
    tablesData?.forEach((table) => {
      if (table.zone) unique.add(table.zone);
    });
    return Array.from(unique);
  }, [tablesData]);

  const buildCustomerLink = useCallback(
    (tableNumber: string) => {
      if (!restaurant?.slug) return null;
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';
      if (!origin) return null;
      const base = `${origin}/c/${restaurant.slug}`;
      return tableNumber ? `${base}?table=${encodeURIComponent(tableNumber)}` : base;
    },
    [restaurant?.slug]
  );

  const handleCopyLink = useCallback(
    async (tableNumber?: string | null) => {
      const link =
        tableNumber && tableNumber.trim().length > 0
          ? buildCustomerLink(tableNumber)
          : buildCustomerLink('');
      if (!link) {
        toast({
          title: 'Link unavailable',
          description: 'Restaurant slug not loaded yet.',
          variant: 'destructive',
        });
        return;
      }

      if (!navigator?.clipboard) {
        toast({
          title: 'Clipboard unavailable',
          description: 'Copy manually: ' + link,
        });
        return;
      }

      await navigator.clipboard.writeText(link);
      toast({
        title: 'Link copied',
        description: tableNumber
          ? `Customer link for table ${tableNumber}`
          : 'Generic menu link copied',
      });
    },
    [buildCustomerLink, toast]
  );

  const filteredOrders = useMemo(() => {
    if (!data?.data) return [];

    return data.data
      .filter((order) => statusesInKitchen.includes(order.status))
      .filter((order) => {
        if (paymentFilter === 'all') return true;
        return order.paymentMethod === paymentFilter;
      })
      .filter((order) => {
        if (zoneFilter === 'all') return true;
        const meta = order.tableNumber
          ? tableLookup.get(order.tableNumber.toLowerCase())
          : undefined;
        return meta?.zone === zoneFilter;
      })
      .filter((order) => {
        if (!searchTerm.trim()) return true;
        const needle = searchTerm.trim().toLowerCase();
        return (
          order.orderNumber.toLowerCase().includes(needle) ||
          (order.tableNumber ?? '').toLowerCase().includes(needle) ||
          (order.customerName ?? '').toLowerCase().includes(needle)
        );
      });
  }, [data?.data, paymentFilter, zoneFilter, searchTerm, tableLookup]);

  const grouped = useMemo(() => {
    const map: Record<string, Order[]> = {
      pending: [],
      accepted: [],
      in_progress: [],
    };
    filteredOrders.forEach((order) => {
      map[order.status]?.push(order);
    });
    return map;
  }, [filteredOrders]);

  const getTicketHighlight = (order: Order): EnhancedOrderTicketProps['highlight'] => {
    if (!order.createdAt) return 'muted';
    const created = new Date(order.createdAt).getTime();
    if (Number.isNaN(created)) return 'muted';
    const minutes = Math.floor((Date.now() - created) / 60000);
    if (order.status !== 'ready' && minutes >= 15) return 'danger';
    if (order.status !== 'ready' && minutes >= 10) return 'warning';
    return 'muted';
  };

  const headerBadgesFor = (order: Order): ReactNode => {
    const badges: ReactNode[] = [];

    if (order.paymentMethod === 'cash' && order.paymentStatus !== 'paid') {
      badges.push(
        <Badge
          key="cash-due"
          variant="destructive"
          className="text-[10px] uppercase tracking-wide"
        >
          Cash due
        </Badge>
      );
    }

    if (order.progress >= 60 && order.status === 'in_progress') {
      badges.push(
        <Badge
          key="almost"
          variant="outline"
          className="text-[10px] uppercase tracking-wide text-amber-700 border-amber-400/70"
        >
          Almost ready
        </Badge>
      );
    }

    if (!badges.length) return undefined;
    if (badges.length === 1) return badges[0];
    return <div className="flex items-center gap-1">{badges}</div>;
  };

  const kitchenActionsFor = (order: Order): ReactNode[] => {
    const disabled = isUpdating;
    const buttons: ReactNode[] = [];

    if (order.status === 'pending') {
      buttons.push(
        <Button
          key="accept"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => handleUpdate(order.id, 'accepted', order.progress ?? 0)}
          className="flex-1"
        >
          Accept Order
        </Button>
      );
      buttons.push(
        <Button
          key="start"
          size="sm"
          disabled={disabled}
          onClick={() => handleUpdate(order.id, 'in_progress', 40)}
          className="flex-1"
        >
          Start Cooking
        </Button>
      );
      return buttons;
    }

    if (order.status === 'accepted') {
      buttons.push(
        <Button
          key="start"
          size="sm"
          disabled={disabled}
          onClick={() => handleUpdate(order.id, 'in_progress', 40)}
          className="flex-1"
        >
          Begin Cooking
        </Button>
      );
      buttons.push(
        <Button
          key="ready"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => handleUpdate(order.id, 'ready', 100)}
          className="flex-1"
        >
          Mark Ready
        </Button>
      );
      return buttons;
    }

    if (order.status === 'in_progress') {
      buttons.push(
        <Button
          key="almost"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => handleUpdate(order.id, 'in_progress', 60)}
          className="flex-1"
        >
          Almost Ready
        </Button>
      );
      buttons.push(
        <Button
          key="ready"
          size="sm"
          disabled={disabled}
          onClick={() => handleUpdate(order.id, 'ready', 100)}
          className="flex-1"
        >
          Order Ready
        </Button>
      );
      return buttons;
    }

    return buttons;
  };

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleUpdate = async (orderId: string, status: Order['status'], progress?: number) => {
    await updateStatus({
      restaurantId,
      orderId,
      status,
      progress,
    });
    refetch();
  };

  const handleSocketEvent = useCallback(() => {
    refetch();
  }, [refetch]);

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!restaurantId });

  // Sound alerts for new orders
  useEffect(() => {
    if (!data?.data) return;

    const currentOrderCount = data.data.filter(order =>
      statusesInKitchen.includes(order.status)
    ).length;

    if (previousOrderCount > 0 && currentOrderCount > previousOrderCount) {
      // New order detected
      sounds.newOrder();

      // Check for urgent orders
      const urgentOrders = data.data.filter(order => {
        if (!order.createdAt || order.status === 'ready') return false;
        const minutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
        return minutes >= 15;
      });

      if (urgentOrders.length > 0) {
        setTimeout(() => sounds.urgent(), 500);
      }
    }

    setPreviousOrderCount(currentOrderCount);
  }, [data?.data, previousOrderCount, sounds]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Professional Kitchen Header */}
      <KitchenHeader
        orders={filteredOrders}
        restaurant={{
          name: restaurant?.name,
          logoUrl: restaurant?.logoUrl,
        }}
        soundEnabled={soundConfig.enabled}
        onSoundToggle={toggleSounds}
      />

      <div className="flex-1 p-3 md:p-4 lg:p-6 space-y-6">
        {/* Real-time Statistics */}
        <KitchenStats orders={filteredOrders} />

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardHeader className="text-center py-12">
              <CardTitle className="text-xl">🍳 Kitchen is quiet</CardTitle>
              <CardDescription className="text-base mt-2">
                No active orders right now. New tickets will appear here instantly!
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {/* Enhanced Filters Section */}
            <Card className="bg-muted/20 border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  🔍 Quick Filters
                </CardTitle>
                <CardDescription>
                  Filter orders by search term, payment method, or dining zone
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Search Orders
                  </label>
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Order #, table, or customer name"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Payment Method
                  </label>
                  <Select
                    value={paymentFilter}
                    onValueChange={(value) =>
                      setPaymentFilter(value as 'all' | 'upi' | 'cash')
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="upi">UPI Only</SelectItem>
                      <SelectItem value="cash">Cash Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Dining Zone
                  </label>
                  <Select value={zoneFilter} onValueChange={setZoneFilter}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="All zones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Professional Order Columns */}
            <div className="grid gap-4 lg:grid-cols-3">
              {statusesInKitchen.map((status) => {
                const statusOrders = grouped[status] || [];
                const statusColors = {
                  pending: 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-900/10',
                  accepted: 'border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/10',
                  in_progress: 'border-orange-200 bg-orange-50/30 dark:border-orange-800 dark:bg-orange-900/10'
                };

                return (
                  <Card key={status} className={cn(
                    'flex flex-col min-h-[400px] transition-all duration-200',
                    statusColors[status as keyof typeof statusColors]
                  )}>
                    <CardHeader className="pb-4 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          {status === 'pending' && '🔔'}
                          {status === 'accepted' && '👨‍🍳'}
                          {status === 'in_progress' && '🔥'}
                          {statusLabel[status]}
                        </CardTitle>
                        <Badge
                          variant={statusOrders.length > 0 ? 'default' : 'secondary'}
                          className="text-sm font-bold px-3 py-1"
                        >
                          {statusOrders.length}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {statusOrders.length === 0
                          ? `No ${statusLabel[status].toLowerCase()} orders`
                          : `${statusOrders.length} active order${statusOrders.length !== 1 ? 's' : ''}`
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 space-y-4">
                      {statusOrders.length > 0 ? (
                        statusOrders.map((order) => {
                          const meta = order.tableNumber
                            ? tableLookup.get(order.tableNumber.toLowerCase())
                            : undefined;
                          const actions = kitchenActionsFor(order);
                          const highlight = getTicketHighlight(order);
                          const headerBadges = headerBadgesFor(order);

                          return (
                            <EnhancedOrderTicket
                              key={order.id}
                              order={order}
                              tableMeta={meta}
                              highlight={highlight}
                              headerBadges={headerBadges}
                              onCopyLink={handleCopyLink}
                              actions={actions.length ? <div className="flex flex-wrap gap-2">{actions}</div> : undefined}
                            />
                          );
                        })
                      ) : (
                        <div className="flex-1 flex items-center justify-center py-12">
                          <div className="text-center space-y-2">
                            <div className="text-4xl opacity-50">
                              {status === 'pending' && '⏳'}
                              {status === 'accepted' && '✅'}
                              {status === 'in_progress' && '⏱️'}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              No {statusLabel[status].toLowerCase()} orders
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedKitchenPage;