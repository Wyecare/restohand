import { useCallback, useMemo, useState, ReactNode } from 'react';
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
  useUpdateOrderPaymentMutation,
} from '@/store/api/ordersApi';
import {
  useListRestaurantTablesQuery,
  useGetRestaurantQuery,
} from '@/store/api/restaurantsApi';
import type { Order } from '@/store/api/types';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { useToast } from '@/components/ui/use-toast';
import {
  OrderTicket,
  type OrderTicketProps,
} from '@/components/orders/OrderTicket';

const serviceStatuses: Order['status'][] = ['ready', 'completed'];

const getServiceHighlight = (order: Order): OrderTicketProps['highlight'] => {
  if (order.paymentMethod === 'cash' && order.paymentStatus !== 'paid') {
    return 'danger';
  }
  const pivot = order.readyAt ?? order.createdAt;
  if (!pivot) return 'muted';
  const readyTime = new Date(pivot).getTime();
  if (Number.isNaN(readyTime)) return 'muted';
  const minutes = Math.floor((Date.now() - readyTime) / 60000);
  if (order.status === 'ready' && minutes >= 10) return 'warning';
  return 'muted';
};

const ServicePage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();

  const orderArgs = restaurantId
    ? { restaurantId, limit: 40, page: 1 }
    : skipToken;

  const { data, isLoading, refetch } = useListOrdersQuery(orderArgs, {
    skip: !restaurantId,
  });
  const [updateStatus, { isLoading: updatingStatus }] =
    useUpdateOrderStatusMutation();
  const [updatePayment, { isLoading: updatingPayment }] =
    useUpdateOrderPaymentMutation();

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

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'upi' | 'cash'>(
    'all'
  );
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

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
    const set = new Set<string>();
    tablesData?.forEach((table) => {
      if (table.zone) set.add(table.zone);
    });
    return Array.from(set);
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

  const orders = useMemo(() => {
    if (!data?.data) return [];
    return data.data
      .filter((order) => serviceStatuses.includes(order.status))
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

  const readyOrders = orders.filter((order) => order.status === 'ready');
  const completedOrders = orders.filter((order) => order.status === 'completed');

  const readyBadgesFor = (order: Order): ReactNode => {
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
    return badges.length ? (
      <div className="flex items-center gap-1">{badges}</div>
    ) : undefined;
  };

  const completedBadgesFor = (order: Order): ReactNode => {
    if (order.paymentStatus === 'paid') {
      return (
        <Badge
          variant="outline"
          className="text-[10px] uppercase tracking-wide text-emerald-700 border-emerald-400/70"
        >
          Paid
        </Badge>
      );
    }
    return (
      <Badge
        variant="destructive"
        className="text-[10px] uppercase tracking-wide"
      >
        Awaiting payment
      </Badge>
    );
  };

  const readyActionsFor = (order: Order): ReactNode[] => {
    const actions: ReactNode[] = [];
    actions.push(
      <Button
        key="delivered"
        size="sm"
        className="flex-1"
        disabled={updatingStatus}
        onClick={() => handleComplete(order.id)}
      >
        Mark delivered
      </Button>
    );

    if (order.paymentMethod === 'cash' && order.paymentStatus !== 'paid') {
      actions.push(
        <Button
          key="mark-paid"
          size="sm"
          variant="secondary"
          className="flex-1"
          disabled={updatingPayment}
          onClick={() => handleMarkPaid(order.id)}
        >
          Collect cash
        </Button>
      );
    }

    return actions;
  };

  const completedActionsFor = (order: Order): ReactNode[] => {
    const actions: ReactNode[] = [];
    if (order.paymentStatus !== 'paid') {
      actions.push(
        <Button
          key="paid"
          size="sm"
          variant="secondary"
          className="flex-1"
          disabled={updatingPayment}
          onClick={() => handleMarkPaid(order.id)}
        >
          Mark as paid
        </Button>
      );
    }
    return actions;
  };

  const handleComplete = async (orderId: string) => {
    await updateStatus({
      restaurantId,
      orderId,
      status: 'completed',
      progress: 100,
    });
    refetch();
  };

  const handleMarkPaid = async (orderId: string) => {
    await updatePayment({
      restaurantId,
      orderId,
      paymentStatus: 'paid',
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
        <h1 className="text-2xl font-semibold">Service board</h1>
        <p className="text-muted-foreground text-sm">
          Serve ready dishes, close out tables, and keep payment status updated.
        </p>
      </div>

      <Card className="border-muted bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Find tickets by table, zone, payment method, or guest.
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
              placeholder="e.g. T2 or Patel"
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
                <SelectValue placeholder="All payments" />
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
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
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

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Ready for pickup
            </CardTitle>
            <CardDescription>
              {readyOrders.length} ticket(s) waiting to be served
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
            {readyOrders.length ? (
              readyOrders.map((order) => {
                const meta = order.tableNumber
                  ? tableLookup.get(order.tableNumber.toLowerCase())
                  : undefined;
                const highlight = getServiceHighlight(order);
                const badges = readyBadgesFor(order);
                const actions = readyActionsFor(order);

                return (
                  <OrderTicket
                    key={order.id}
                    order={order}
                    tableMeta={meta}
                    highlight={highlight}
                    headerBadges={badges}
                    onCopyLink={handleCopyLink}
                    actions={actions.length ? <>{actions}</> : undefined}
                  />
                );
              })
            ) : (
              <CardDescription>No ready orders at the moment.</CardDescription>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
              <CardTitle className="text-base font-semibold">
                Recently completed
              </CardTitle>
              <CardDescription>
                {completedOrders.length} ticket(s) awaiting payment confirmation
              </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
            {completedOrders.length ? (
              completedOrders.map((order) => {
                const meta = order.tableNumber
                  ? tableLookup.get(order.tableNumber.toLowerCase())
                  : undefined;
                const highlight = getServiceHighlight(order);
                const badges = completedBadgesFor(order);
                const actions = completedActionsFor(order);

                return (
                  <OrderTicket
                    key={order.id}
                    order={order}
                    tableMeta={meta}
                    highlight={highlight}
                    headerBadges={badges}
                    onCopyLink={handleCopyLink}
                    actions={actions.length ? <>{actions}</> : undefined}
                  />
                );
              })
            ) : (
              <CardDescription>
                Closed tickets will accumulate here for reconciliation.
              </CardDescription>
            )}
          </CardContent>
        </Card>
      </div>
    )}
    </div>
  );
};

export default ServicePage;
