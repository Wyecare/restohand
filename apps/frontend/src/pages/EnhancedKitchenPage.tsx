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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { Filter, X } from 'lucide-react';

const statusesInKitchen: Order['status'][] = [
  'pending',
  'in_progress',
  'accepted',
];

const statusLabel: Record<Order['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'Cooking',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusConfig = {
  pending: {
    label: 'New Orders',
    icon: '🔔',
    color: 'bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-900/40',
  },
  accepted: {
    label: 'Accepted',
    icon: '✓',
    color:
      'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40',
  },
  in_progress: {
    label: 'Cooking',
    icon: '🔥',
    color:
      'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40',
  },
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
  const [filterOpen, setFilterOpen] = useState(false);

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
      return tableNumber
        ? `${base}?table=${encodeURIComponent(tableNumber)}`
        : base;
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
      in_progress: [],
      accepted: [],
    };
    filteredOrders.forEach((order) => {
      map[order.status]?.push(order);
    });
    return map;
  }, [filteredOrders]);

  const getTicketHighlight = (
    order: Order
  ): EnhancedOrderTicketProps['highlight'] => {
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
          variant="outline"
          className="text-[9px] px-1.5 py-0 h-4 border-amber-300 text-amber-700 bg-amber-50/70 dark:bg-amber-950/40"
        >
          Cash Due
        </Badge>
      );
    }

    if (order.progress >= 60 && order.status === 'in_progress') {
      badges.push(
        <Badge
          key="almost"
          variant="outline"
          className="text-[9px] px-1.5 py-0 h-4 border-emerald-300 text-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40"
        >
          Almost Ready
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
          variant="outline"
          disabled={disabled}
          onClick={() =>
            handleUpdate(order.id, 'accepted', order.progress ?? 0)
          }
          className="flex-1 h-8 text-xs border-sky-300 text-sky-700 hover:bg-sky-50"
        >
          Accept
        </Button>
      );
      buttons.push(
        <Button
          key="start"
          size="sm"
          disabled={disabled}
          onClick={() => handleUpdate(order.id, 'in_progress', 40)}
          className="flex-1 h-8 text-xs bg-primary/95 text-primary-foreground hover:bg-primary"
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
          className="flex-1 h-8 text-xs bg-primary/95 text-primary-foreground hover:bg-primary"
        >
          Start Cooking
        </Button>
      );
      buttons.push(
        <Button
          key="ready"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => handleUpdate(order.id, 'ready', 100)}
          className="flex-1 h-8 text-xs"
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
          className="flex-1 h-8 text-xs"
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
          className="flex-1 h-8 text-xs"
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

  const handleUpdate = async (
    orderId: string,
    status: Order['status'],
    progress?: number
  ) => {
    await updateStatus({
      restaurantId,
      orderId,
      status,
      progress,
    });
    refetch();
  };

  const handleSocketEvent = useCallback(
    (data) => {
      if (data.status === 'pending') {
        sounds.newOrder();
      } else if (data.status === 'accepted' || data.status === 'in_progress') {
        // No sound for these statuses
      } else if (data.status === 'cancelled') {
        sounds.urgent();
      } else {
        sounds.notification();
        // No sound for other statuses
      }
      refetch();
    },
    [refetch]
  );

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!restaurantId });

  // Sound alerts for new orders
  useEffect(() => {
    if (!data?.data) return;

    const currentOrderCount = data.data.filter((order) =>
      statusesInKitchen.includes(order.status)
    ).length;

    if (previousOrderCount > 0 && currentOrderCount > previousOrderCount) {
      sounds.newOrder();

      const urgentOrders = data.data.filter((order) => {
        if (!order.createdAt || order.status === 'ready') return false;
        const minutes = Math.floor(
          (Date.now() - new Date(order.createdAt).getTime()) / 60000
        );
        return minutes >= 15;
      });

      if (urgentOrders.length > 0) {
        setTimeout(() => sounds.urgent(), 500);
      }
    }

    setPreviousOrderCount(currentOrderCount);
  }, [data?.data, previousOrderCount, sounds]);

  const hasActiveFilters =
    paymentFilter !== 'all' || zoneFilter !== 'all' || searchTerm.trim() !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setPaymentFilter('all');
    setZoneFilter('all');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background/95 to-muted/40">
      <KitchenHeader
        orders={filteredOrders}
        restaurant={{
          name: restaurant?.name,
          logoUrl: restaurant?.logoUrl,
        }}
        soundEnabled={soundConfig.enabled}
        onSoundToggle={toggleSounds}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 pb-6 pt-4 sm:px-4 lg:px-6">
        <KitchenStats orders={filteredOrders} />

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredOrders.length === 0 && !hasActiveFilters ? (
          <Card className="border-dashed border-2 bg-card/80 backdrop-blur">
            <CardHeader className="text-center py-10">
              <CardTitle className="text-lg font-semibold">No Active Orders</CardTitle>
              <CardDescription className="text-sm mt-2">
                New tickets will show up here instantly
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card className="border border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by order, table, or guest"
                    className="h-10 md:flex-1"
                  />

                  <div className="flex items-center gap-2 md:w-auto">
                    <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 gap-2">
                          <Filter className="h-4 w-4" />
                          Filters
                          {hasActiveFilters && (
                            <Badge
                              variant="secondary"
                              className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
                            >
                              {
                                [
                                  paymentFilter !== 'all',
                                  zoneFilter !== 'all',
                                  searchTerm.trim() !== '',
                                ].filter(Boolean).length
                              }
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">Filter orders</h4>
                            {hasActiveFilters && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-7 text-xs"
                              >
                                Clear all
                              </Button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                Payment method
                              </label>
                              <Select
                                value={paymentFilter}
                                onValueChange={(value) =>
                                  setPaymentFilter(value as 'all' | 'upi' | 'cash')
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All payments</SelectItem>
                                  <SelectItem value="upi">UPI</SelectItem>
                                  <SelectItem value="cash">Cash</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {zones.length > 0 && (
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                  Dining zone
                                </label>
                                <Select
                                  value={zoneFilter}
                                  onValueChange={setZoneFilter}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All zones" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All zones</SelectItem>
                                    {zones.map((zone) => (
                                      <SelectItem key={zone} value={zone}>
                                        {zone}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" className="h-10" onClick={clearFilters}>
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {paymentFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1 h-7">
                        {paymentFilter.toUpperCase()}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setPaymentFilter('all')}
                        />
                      </Badge>
                    )}
                    {zoneFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1 h-7">
                        Zone: {zoneFilter}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setZoneFilter('all')}
                        />
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              {statusesInKitchen.map((status) => {
                const statusOrders = grouped[status] || [];
                const config =
                  statusConfig[status as keyof typeof statusConfig];

                return (
                  <Card
                    key={status}
                    className={cn(
                      'flex flex-col border border-border/60 bg-card/85 backdrop-blur',
                      config.color
                    )}
                  >
                    <CardHeader className="pb-3 border-b space-y-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          <CardTitle className="text-base font-semibold">
                            {config.label}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={
                            statusOrders.length > 0 ? 'default' : 'secondary'
                          }
                          className="text-sm font-semibold h-6 min-w-[28px] justify-center"
                        >
                          {statusOrders.length}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-3 space-y-2 min-h-[200px]">
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
                              actions={
                                actions.length ? (
                                  <div className="flex gap-2">{actions}</div>
                                ) : undefined
                              }
                            />
                          );
                        })
                      ) : (
                        <div className="flex items-center justify-center h-full py-8">
                          <div className="text-center space-y-1">
                            <div className="text-3xl opacity-40">
                              {config.icon}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              No {config.label.toLowerCase()} orders
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Show message when filters result in no orders */}
            {filteredOrders.length === 0 && hasActiveFilters && (
              <Card className="border-dashed bg-card/80 backdrop-blur">
                <CardHeader className="text-center py-8">
                  <CardTitle className="text-base">
                    No orders match your filters
                  </CardTitle>
                  <CardDescription className="text-sm">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearFilters}
                      className="h-auto p-0"
                    >
                      Clear filters
                    </Button>{' '}
                    to see all orders
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedKitchenPage;
