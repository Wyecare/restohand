import React, { useMemo, useCallback, useState, ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  useListKitchenStationsQuery,
  useGetStationMetricsQuery,
  useGetStationAssignmentsQuery,
  useUpdateAssignmentStatusMutation,
  useAssignOrderToStationMutation,
} from '@/store/api/kitchenApi';
import type { Order, StationType, AssignmentStatus, KitchenStationMetrics, KitchenStation, OrderStationAssignment } from '@/store/api/types';
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
import {
  Filter,
  X,
  ChefHat,
  Clock,
  Activity,
  BarChart3,
  CheckCircle2,
  Timer,
  AlertCircle,
  Flame,
  Salad,
  Coffee,
  Cookie,
  Settings,
  Users,
  TrendingUp,
  Play,
  Pause,
  CheckCircle,
  Clock3,
  Target,
} from 'lucide-react';

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

const getStationIcon = (type: StationType) => {
  switch (type) {
    case 'grill':
      return Flame;
    case 'fryer':
      return Flame;
    case 'salad':
      return Salad;
    case 'beverage':
      return Coffee;
    case 'dessert':
      return Cookie;
    case 'preparation':
      return ChefHat;
    default:
      return Settings;
  }
};

const getStationTypeColor = (type: StationType) => {
  switch (type) {
    case 'grill':
      return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40';
    case 'fryer':
      return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/40';
    case 'salad':
      return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/40';
    case 'beverage':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40';
    case 'dessert':
      return 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/40';
    case 'preparation':
      return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900/40';
    default:
      return 'bg-slate-50 border-slate-200 dark:bg-slate-950/20 dark:border-slate-900/40';
  }
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
  const [activeTab, setActiveTab] = useState('orders');
  const [updateAssignmentStatus] = useUpdateAssignmentStatusMutation();
  const [assignOrderToStation] = useAssignOrderToStationMutation();

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

  // Kitchen station data
  const stationsArgs = restaurantId ? { restaurantId } : skipToken;
  const { data: stationsData } = useListKitchenStationsQuery(stationsArgs, {
    skip: !restaurantId,
  });
  const { data: stationMetrics } = useGetStationMetricsQuery(stationsArgs, {
    skip: !restaurantId,
  });
  const { data: stationAssignments } = useGetStationAssignmentsQuery(stationsArgs, {
    skip: !restaurantId,
  });

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

  const handleAssignmentUpdate = async (assignmentId: string, status: AssignmentStatus) => {
    if (!restaurantId) return;
    try {
      await updateAssignmentStatus({ restaurantId, assignmentId, status });
      toast({
        title: 'Assignment updated',
        description: `Station assignment marked as ${status.replace('_', ' ')}`
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update assignment status',
        variant: 'destructive'
      });
    }
  };

  const handleOrderAssignment = async (orderId: string, stationId: string, menuItemIds: string[]) => {
    if (!restaurantId) return;
    try {
      await assignOrderToStation({
        restaurantId,
        orderId,
        body: {
          stationId,
          menuItemIds,
          estimatedPrepTime: 15,
        }
      });
      toast({
        title: 'Order assigned',
        description: 'Order has been assigned to station'
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to assign order to station',
        variant: 'destructive'
      });
    }
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

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-3 pb-6 pt-4 sm:px-4 lg:px-6">
        <KitchenStats orders={filteredOrders} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="stations" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Stations
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">

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
          </TabsContent>

          <TabsContent value="stations" className="space-y-4">
            {stationsData && stationsData.length > 0 ? (
              <>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {stationsData.map((station) => {
                    const Icon = getStationIcon(station.type);
                    const assignments = stationAssignments?.filter(a => a.stationId === station.id) || [];
                    const activeAssignments = assignments.filter(a =>
                      a.status === 'assigned' || a.status === 'in_progress'
                    );
                    const utilizationRate = station.capacity > 0
                      ? (activeAssignments.length / station.capacity) * 100
                      : 0;

                    return (
                      <Card key={station.id} className={cn(
                        'border border-border/60 bg-card/80 backdrop-blur',
                        getStationTypeColor(station.type)
                      )}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-background/50">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <CardTitle className="text-base font-semibold">
                                  {station.name}
                                </CardTitle>
                                <CardDescription className="text-xs capitalize">
                                  {station.type.replace('_', ' ')}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge
                              variant={station.isActive ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {station.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 bg-background/30 rounded-lg">
                              <div className="text-lg font-semibold">
                                {activeAssignments.length}/{station.capacity}
                              </div>
                              <div className="text-xs text-muted-foreground">Capacity</div>
                            </div>
                            <div className="text-center p-2 bg-background/30 rounded-lg">
                              <div className="text-lg font-semibold">
                                {Math.round(utilizationRate)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Utilization</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Avg Prep Time</span>
                              <span className="font-medium">{station.avgPrepTime}min</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Today's Orders</span>
                              <span className="font-medium">{station.todayOrdersCount}</span>
                            </div>
                          </div>

                          {activeAssignments.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                Active Orders
                              </div>
                              {activeAssignments.slice(0, 2).map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex items-center justify-between p-2 bg-background/50 rounded text-xs"
                                >
                                  <span className="font-medium">{assignment.orderNumber}</span>
                                  <div className="flex items-center gap-1">
                                    {assignment.status === 'assigned' ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAssignmentUpdate(assignment.id, 'in_progress')}
                                        className="h-6 px-2 text-xs"
                                      >
                                        <Play className="h-3 w-3 mr-1" />
                                        Start
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAssignmentUpdate(assignment.id, 'completed')}
                                        className="h-6 px-2 text-xs"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Done
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {activeAssignments.length > 2 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  +{activeAssignments.length - 2} more
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Unassigned Orders */}
                <Card className="border border-border/60 bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      Unassigned Orders
                    </CardTitle>
                    <CardDescription>
                      Orders waiting for station assignment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredOrders.filter(order =>
                      !stationAssignments?.some(a => a.orderId === order.id)
                    ).length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        All orders are assigned to stations
                      </div>
                    ) : (
                      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {filteredOrders
                          .filter(order => !stationAssignments?.some(a => a.orderId === order.id))
                          .slice(0, 6)
                          .map((order) => (
                            <div
                              key={order.id}
                              className="p-3 border rounded-lg bg-background/50 space-y-2"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-sm">{order.orderNumber}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {order.items.length} items
                                </Badge>
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {stationsData?.slice(0, 3).map((station) => (
                                  <Button
                                    key={station.id}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOrderAssignment(
                                      order.id,
                                      station.id,
                                      order.items.map(item => item.menuItemId)
                                    )}
                                    className="h-6 px-2 text-xs"
                                    disabled={!station.isActive}
                                  >
                                    <Target className="h-3 w-3 mr-1" />
                                    {station.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-dashed border-2 bg-card/80 backdrop-blur">
                <CardHeader className="text-center py-10">
                  <CardTitle className="text-lg font-semibold">No Kitchen Stations</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    Set up kitchen stations to manage order workflow
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {stationMetrics && stationMetrics.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                {stationMetrics.map((station) => {
                  const Icon = getStationIcon(station.type);

                  return (
                    <Card key={station.id} className="border border-border/60 bg-card/80 backdrop-blur">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <CardTitle className="text-sm font-semibold truncate">
                            {station.name}
                          </CardTitle>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-primary">
                              {station.completedToday}
                            </div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {Math.round(station.utilizationRate)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Efficiency</div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Avg Time</span>
                            <span className="font-medium">{station.todayAvgPrepTime}min</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Load</span>
                            <span className="font-medium">
                              {station.currentLoad}/{station.capacity}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed border-2 bg-card/80 backdrop-blur">
                <CardHeader className="text-center py-10">
                  <CardTitle className="text-lg font-semibold">No Analytics Available</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    Kitchen station analytics will appear here once you start using stations
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedKitchenPage;
