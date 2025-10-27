import { useMemo, useCallback, useState, ReactNode } from 'react';
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
import {
  OrderTicket,
  type OrderTicketProps,
} from '@/components/orders/OrderTicket';

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

const getTicketHighlight = (order: Order): OrderTicketProps['highlight'] => {
  if (!order.createdAt) return 'muted';
  const created = new Date(order.createdAt).getTime();
  if (Number.isNaN(created)) return 'muted';
  const minutes = Math.floor((Date.now() - created) / 60000);
  if (order.status !== 'ready' && minutes >= 15) return 'danger';
  if (order.status !== 'ready' && minutes >= 10) return 'warning';
  return 'muted';
};

const KitchenPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'upi' | 'cash'>(
    'all'
  );
  const [zoneFilter, setZoneFilter] = useState<string>('all');

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
        >
          Accept ticket
        </Button>
      );
      buttons.push(
        <Button
          key="start"
          size="sm"
          disabled={disabled}
          onClick={() => handleUpdate(order.id, 'in_progress', 40)}
        >
          Start prep
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
          Begin cooking
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
          Mark ready
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
          Almost ready
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
          Ticket ready
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

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Kitchen board</h1>
        <p className="text-muted-foreground text-sm">
          Track incoming tickets and push updates as dishes move through prep.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No live orders</CardTitle>
            <CardDescription>
              New tickets will show up instantly. Enjoy the breather!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card className="border-muted bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>
                Narrow the board by table, payment method, or zone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex w-full flex-col gap-1 md:max-w-xs">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Search ticket / table
                </p>
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="e.g. T4 or 102"
                />
              </div>
              <div className="flex w-full flex-col gap-1 md:max-w-[200px]">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Payment
                </p>
                <Select
                  value={paymentFilter}
                  onValueChange={(value) =>
                    setPaymentFilter(value as 'all' | 'upi' | 'cash')
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-full flex-col gap-1 md:max-w-[220px]">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Zone / section
                </p>
                <Select
                  value={zoneFilter}
                  onValueChange={setZoneFilter}
                >
                  <SelectTrigger>
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
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
          {statusesInKitchen.map((status) => (
          <Card key={status} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {statusLabel[status]}
              </CardTitle>
              <CardDescription>
                {grouped[status]?.length ?? 0} ticket(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
              {grouped[status]?.length ? (
                grouped[status].map((order) => {
                  const meta = order.tableNumber
                    ? tableLookup.get(order.tableNumber.toLowerCase())
                    : undefined;
                  const actions = kitchenActionsFor(order);
                  const highlight = getTicketHighlight(order);
                  const headerBadges = headerBadgesFor(order);

                  return (
                    <OrderTicket
                      key={order.id}
                      order={order}
                      tableMeta={meta}
                      highlight={highlight}
                      headerBadges={headerBadges}
                      onCopyLink={handleCopyLink}
                      actions={
                        actions.length ? <>{actions}</> : undefined
                      }
                    />
                  );
                })
              ) : (
                <CardDescription className="text-sm text-muted-foreground">
                  No {statusLabel[status].toLowerCase()} tickets right now.
                </CardDescription>
              )}
            </CardContent>
          </Card>
          ))}
          </div>
        </>
      )}
    </div>
  );
};

export default KitchenPage;
