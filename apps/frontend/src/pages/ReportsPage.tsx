import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import {
  CalendarIcon,
  DownloadIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  StarIcon,
  FileTextIcon,
  BarChart3Icon,
} from 'lucide-react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useGetAnalyticsQuery, useDownloadPdfReportMutation } from '@/store/api/reportsApi';
import { useBranchContext } from '@/contexts/BranchContext';

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
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  // Date range state (default to last 30 days)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      from: thirtyDaysAgo,
      to: today,
    };
  });

  const { data: analytics, isLoading, isError } = useGetAnalyticsQuery(
    restaurantId && dateRange?.from && dateRange?.to
      ? {
          startDate: dateRange.from.toISOString().split('T')[0],
          endDate: dateRange.to.toISOString().split('T')[0],
        }
      : skipToken
  );

  const [downloadPdf, { isLoading: isDownloading }] = useDownloadPdfReportMutation();

  const handleDownloadPDF = async () => {
    if (!restaurantId || !dateRange?.from || !dateRange?.to) return;

    try {
      const blob = await downloadPdf({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
      }).unwrap();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `restaurant-report-${dateRange.from.toISOString().split('T')[0]}-${dateRange.to.toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Downloaded',
        description: 'Your PDF report has been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Unable to generate PDF report. Please try again.',
        variant: 'destructive',
      });
    }
  };

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
      {/* Header with Date Range and Download */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your restaurant's performance
            {currentBranch && (
              <span className="ml-2 inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {currentBranch.name}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start px-3 font-normal min-w-70"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd, y")} -{" "}
                      {format(dateRange.to, "MMM dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                disabled={(date: Date) =>
                  date > new Date() || date < new Date("2020-01-01")
                }
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading || !dateRange?.from || !dateRange?.to}
            className="gap-2"
          >
            {isDownloading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.summary.totalRevenue || 0)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {(analytics?.trends.revenueChange || 0) >= 0 ? (
                <TrendingUpIcon className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDownIcon className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={(analytics?.trends.revenueChange || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(analytics?.trends.revenueChange || 0).toFixed(1)}%
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.summary.totalOrders || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {(analytics?.trends.ordersChange || 0) >= 0 ? (
                <TrendingUpIcon className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDownIcon className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={(analytics?.trends.ordersChange || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(analytics?.trends.ordersChange || 0).toFixed(1)}%
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.summary.avgOrderValue || 0)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {(analytics?.trends.avgOrderValueChange || 0) >= 0 ? (
                <TrendingUpIcon className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDownIcon className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={(analytics?.trends.avgOrderValueChange || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(analytics?.trends.avgOrderValueChange || 0).toFixed(1)}%
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics?.summary.successRate || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Order completion rate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Revenue breakdown by payment type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics?.paymentMethods.map((method, index) => (
              <div key={method.method} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{method.method} Payments</span>
                  <div className="text-right">
                    <div className="text-sm font-mono">{formatCurrency(method.amount)}</div>
                    <div className="text-xs text-muted-foreground">{method.count} orders</div>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-green-500'}`}
                    style={{ width: `${method.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {!analytics?.paymentMethods.length && (
              <div className="text-center text-muted-foreground py-4">
                No payment data available
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Most Popular:</span>
              <Badge variant="default">
                {analytics?.paymentMethods[0]?.method.toUpperCase() || 'N/A'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StarIcon className="h-5 w-5" />
              Top Performing Items
            </CardTitle>
            <CardDescription>Best sellers by revenue generated</CardDescription>
          </CardHeader>
          <CardContent>
            {!analytics?.topItems.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No items data available yet
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.topItems.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} sold • {item.timesOrdered} orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Daily Performance
            {dateRange?.from && dateRange?.to && (
              <span className="text-sm font-normal text-muted-foreground">
                ({format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, y")})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Detailed breakdown of orders and revenue by date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!analytics?.dailyPerformance.length ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No order activity to display yet
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-center">Revenue</TableHead>
                    <TableHead className="text-right">Avg Order Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.dailyPerformance.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="font-medium">
                        {new Date(row.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{row.orders}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {formatCurrency(row.revenue)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(row.avgOrder)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
