import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useListOrdersQuery } from '@/store/api/ordersApi';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const ReportsPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const { data, isLoading, isError } = useListOrdersQuery(
    restaurantId
      ? {
          restaurantId,
          limit: 100,
          page: 1,
        }
      : skipToken
  );

  const dailySummary = useMemo(() => {
    const summary = new Map<
      string,
      { orders: number; revenue: number; cash: number; upi: number }
    >();

    data?.data.forEach((order) => {
      if (!order.createdAt) return;
      const key = dateFormatter.format(new Date(order.createdAt));
      if (!summary.has(key)) {
        summary.set(key, { orders: 0, revenue: 0, cash: 0, upi: 0 });
      }
      const bucket = summary.get(key)!;
      bucket.orders += 1;
      bucket.revenue += order.totalAmount;
      if (order.paymentMethod === 'cash') {
        bucket.cash += order.totalAmount;
      } else {
        bucket.upi += order.totalAmount;
      }
    });

    return Array.from(summary.entries())
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const topItems = useMemo(() => {
    const counts = new Map<string, { name: string; quantity: number }>();
    data?.data.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.menuItemId ?? item.name;
        if (!counts.has(key)) {
          counts.set(key, { name: item.name, quantity: 0 });
        }
        counts.get(key)!.quantity += item.quantity;
      });
    });
    return Array.from(counts.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [data]);

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-destructive">
        Unable to load reports right now. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports & Trends</h1>
        <p className="text-muted-foreground">
          Quick snapshot of recent performance. Export deeper analytics later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily performance</CardTitle>
          <CardDescription>
            Aggregated ticket count and revenue for the last 100 orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailySummary.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No order activity to summarise yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Cash</TableHead>
                  <TableHead>UPI</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailySummary.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell>{row.orders}</TableCell>
                    <TableCell>{formatCurrency(row.cash)}</TableCell>
                    <TableCell>{formatCurrency(row.upi)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(row.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top dishes</CardTitle>
          <CardDescription>
            Based on quantities in the same order window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Once orders start flowing, you&apos;ll see item rankings here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
