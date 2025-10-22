import { useMemo, useCallback, useState } from 'react';
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
import { Copy, AlarmClock, Smartphone } from 'lucide-react';
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

const progressOptions = [
  { label: 'Start prep', stage: 40, status: 'in_progress' as const },
  { label: 'Almost ready', stage: 60, status: 'in_progress' as const },
  { label: 'Mark ready', stage: 100, status: 'ready' as const },
];

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
                {(grouped[status] ?? []).map((order) => (
                  <div
                    key={order.id}
                    className={cn(
                      'rounded-xl border bg-card p-3 shadow-sm transition-colors',
                      (() => {
                        const createdAt = order.createdAt
                          ? new Date(order.createdAt)
                          : null;
                        if (!createdAt) return '';
                        const minutes = Math.floor(
                          (Date.now() - createdAt.getTime()) / 60000
                        );
                        return status !== 'ready' && minutes >= 12
                          ? 'border-destructive/50 bg-destructive/5'
                          : '';
                      })()
                    )}
                  >
                    {(() => {
                      const createdAt = order.createdAt
                        ? new Date(order.createdAt)
                        : null;
                      if (!createdAt) return null;
                      const minutes = Math.floor(
                        (Date.now() - createdAt.getTime()) / 60000
                      );
                      if (status === 'ready' || minutes < 12) return null;
                      return (
                        <Badge
                          variant="outline"
                          className="mb-2 w-fit border-destructive/60 text-destructive"
                        >
                          <AlarmClock className="mr-1 h-3 w-3" />
                          Over {minutes} mins
                        </Badge>
                      );
                    })()}
                    {order.paymentMethod === 'cash' &&
                      order.paymentStatus !== 'paid' && (
                        <Badge className="mb-2 w-fit" variant="destructive">
                          Collect cash at pickup
                        </Badge>
                      )}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          #{order.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.customerName ?? 'Guest'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Table {order.tableNumber ?? '—'}
                          {(() => {
                            if (!order.tableNumber) return null;
                            const meta = tableLookup.get(
                              order.tableNumber.toLowerCase()
                            );
                            if (!meta) return null;
                            const parts: string[] = [];
                            if (meta.displayName) parts.push(meta.displayName);
                            if (meta.zone) parts.push(meta.zone);
                            if (meta.capacity)
                              parts.push(`${meta.capacity} covers`);
                            return parts.length
                              ? ` • ${parts.join(' • ')}`
                              : null;
                          })()}
                        </p>
                        {order.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            Placed{' '}
                            {(() => {
                              const minutes = Math.max(
                                0,
                                Math.floor(
                                  (Date.now() -
                                    new Date(order.createdAt).getTime()) /
                                    60000
                                )
                              );
                              if (minutes === 0) return 'just now';
                              if (minutes < 60) return `${minutes} min ago`;
                              const hours = Math.floor(minutes / 60);
                              const remaining = minutes % 60;
                              if (hours >= 4)
                                return `${hours} hr${hours > 1 ? 's' : ''} ago`;
                              return `${hours}h ${remaining}m ago`;
                            })()}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} item(s)
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">
                          ₹{order.totalAmount.toFixed(2)}
                        </Badge>
                        <Badge
                          variant={
                            order.paymentMethod === 'cash'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {order.paymentMethod === 'cash' ? 'Cash' : 'UPI'}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleCopyLink(order.tableNumber)}
                            title="Copy customer link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleCopyLink('')}
                            title="Generic menu link"
                          >
                            <Smartphone className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {order.items.map((item) => (
                        <div
                          key={`${order.id}-${item.menuItemId}-${item.name}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>{item.name}</span>
                          <span className="font-medium text-foreground">
                            ×{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {progressOptions.map((option) => (
                        <Button
                          key={option.label}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdate(
                              order.id,
                              option.status,
                              option.stage
                            )
                          }
                        >
                          {option.label}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isUpdating}
                        onClick={() => handleUpdate(order.id, 'ready', 100)}
                        >
                          Ticket ready
                        </Button>
                    </div>
                  </div>
                ))}
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
