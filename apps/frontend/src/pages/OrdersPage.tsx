/* eslint-disable react-hooks/exhaustive-deps */
import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  Filter,
  RefreshCcw,
  CheckCircle,
  Clock,
  CreditCard,
  Utensils,
  Ban,
  Receipt,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';
import { useToast } from '@/components/ui/use-toast';
import {
  useListOrdersByBranchQuery,
  useUpdateOrderStatusMutation,
  useUpdateOrderPaymentMutation,
} from '@/store/api/ordersApi';
import {
  useFindSessionsQuery,
  type CustomerSession,
} from '@/store/api/customerSessionsApi';
import {
  useGetDetailedSessionBillQuery,
  type DetailedBillCalculation,
} from '@/store/api/billingApi';
import { downloadThermalReceipt } from '@/components/DetailedThermalReceiptPDF';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { skipToken } from '@reduxjs/toolkit/query';
import type { Order } from '@/store/api/types';
import { useBranchContext } from '@/contexts/BranchContext';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';

const statusOptions: Array<{ label: string; value: Order['status'] | 'all' }> =
  [
    { label: 'All statuses', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'In progress', value: 'in_progress' },
    { label: 'Ready', value: 'ready' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

const paymentOptions: Array<{
  label: string;
  value: Order['paymentStatus'] | 'all';
}> = [
  { label: 'All payments', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
];

const ORDER_CANCELLABLE_STATUSES: Array<Order['status']> = [
  'pending',
  'accepted',
  'in_progress',
];

const sessionStatusOptions: Array<{ label: string; value: CustomerSession['status'] | 'all' }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Abandoned', value: 'abandoned' },
];

// Session Card Component
interface SessionCardProps {
  session: CustomerSession;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusConfig: (status: CustomerSession['status']) => {
    label: string;
    className: string;
  };
}

function SessionCard({
  session,
  isExpanded,
  onToggleExpanded,
  formatCurrency,
  formatDate,
  getStatusConfig,
}: SessionCardProps) {
  const [pdfLoading, setPdfLoading] = React.useState(false);

  // Use the new detailed billing API
  const { data: detailedBill, isLoading: billLoading } = useGetDetailedSessionBillQuery(
    isExpanded ? { sessionId: session.sessionId, includeUnpaid: true } : skipToken
  );

  const statusConfig = getStatusConfig(session.status);

  const handleThermalReceiptDownload = async () => {
    setPdfLoading(true);

    try {
      let billData = detailedBill;

      // If not already loaded, fetch the detailed bill
      if (!billData) {
        const { billingApi } = await import('@/store/api/billingApi');
        const { store } = await import('@/store');

        const result = await store.dispatch(
          billingApi.endpoints.getDetailedSessionBill.initiate({
            sessionId: session.sessionId,
            includeUnpaid: true
          })
        );

        if (result.data) {
          billData = result.data;
        } else {
          throw new Error('Failed to fetch detailed bill data');
        }
      }

      if (!billData) {
        alert('Failed to fetch session data. Please try again.');
        return;
      }

      // Generate thermal receipt PDF
      await downloadThermalReceipt(billData, 'Digital Payment');
    } catch (err) {
      console.error('Error generating thermal receipt:', err);
      alert('Failed to generate receipt. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="border rounded-lg">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Table {session.tableNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Started: {formatDate(session.startedAt)}
                    {session.closedAt && (
                      <span className="ml-4">
                        Closed: {formatDate(session.closedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(session.totalAmount)}</div>
                  <div className="text-sm text-gray-500">
                    {session.totalOrders} {session.totalOrders === 1 ? 'order' : 'orders'}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {session.status === 'closed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThermalReceiptDownload();
                      }}
                      disabled={pdfLoading}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {pdfLoading ? 'Generating...' : 'Receipt'}
                    </Button>
                  )}

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t">
            {billLoading ? (
              <div className="py-6 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : detailedBill ? (
              <div className="mt-4 space-y-4">
                {/* Restaurant Info */}
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">Restaurant Details</h4>
                  <div className="text-sm space-y-1">
                    <div className="font-medium">{detailedBill.restaurant.name}</div>
                    {detailedBill.restaurant.address && (
                      <div className="text-gray-600">
                        {detailedBill.restaurant.address.line1}, {detailedBill.restaurant.address.city}
                      </div>
                    )}
                    {detailedBill.restaurant.phone && (
                      <div className="text-gray-600">Phone: {detailedBill.restaurant.phone}</div>
                    )}
                    {detailedBill.restaurant.gstin && (
                      <div className="text-gray-600">GSTIN: {detailedBill.restaurant.gstin}</div>
                    )}
                  </div>
                </div>

                {/* All Items */}
                <div>
                  <h4 className="font-medium mb-2">All Items ({detailedBill.allItems.length})</h4>
                  <div className="space-y-2">
                    {detailedBill.allItems.map((item, index) => {
                      // Calculate price per unit with tax included
                      const pricePerUnitWithTax = item.totalWithTax / item.quantity;

                      return (
                        <div key={index} className="bg-white p-3 rounded border">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {item.quantity} × {formatCurrency(pricePerUnitWithTax)} = {formatCurrency(item.totalWithTax)}
                              </div>
                              {item.totalTaxAmount > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  GST ({item.gstRate}%) included: {formatCurrency(item.totalTaxAmount)}
                                  {item.cgstAmount > 0 && ` | CGST: ${formatCurrency(item.cgstAmount)}`}
                                  {item.sgstAmount > 0 && ` | SGST: ${formatCurrency(item.sgstAmount)}`}
                                  {item.igstAmount > 0 && ` | IGST: ${formatCurrency(item.igstAmount)}`}
                                </div>
                              )}
                              {item.hsnCode && (
                                <div className="text-xs text-gray-500">HSN: {item.hsnCode}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatCurrency(item.totalWithTax)}</div>
                              <div className="text-xs text-gray-500">incl. tax</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Orders Breakdown */}
                <div>
                  <h4 className="font-medium mb-2">Orders ({detailedBill.orderBreakdown.length})</h4>
                  {detailedBill.orderBreakdown.map((order) => (
                    <div key={order.orderId} className="bg-gray-50 p-3 rounded mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">#{order.orderNumber}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Payment: {order.paymentStatus} • {order.itemCount} items
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
                          {order.pendingAmount > 0 && (
                            <div className="text-sm text-orange-600">
                              Pending: {formatCurrency(order.pendingAmount)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detailed Bill Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded">
                  <div className="flex justify-between items-center font-medium mb-3">
                    <span>Session Total</span>
                    <span className="text-lg">{formatCurrency(detailedBill.totalAmount)}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(detailedBill.subTotalAmount)}</span>
                    </div>
                    {detailedBill.cgstAmount > 0 && (
                      <div className="flex justify-between">
                        <span>CGST</span>
                        <span>{formatCurrency(detailedBill.cgstAmount)}</span>
                      </div>
                    )}
                    {detailedBill.sgstAmount > 0 && (
                      <div className="flex justify-between">
                        <span>SGST</span>
                        <span>{formatCurrency(detailedBill.sgstAmount)}</span>
                      </div>
                    )}
                    {detailedBill.igstAmount > 0 && (
                      <div className="flex justify-between">
                        <span>IGST</span>
                        <span>{formatCurrency(detailedBill.igstAmount)}</span>
                      </div>
                    )}
                    {detailedBill.taxAmount > 0 && (
                      <div className="flex justify-between font-medium">
                        <span>Total Tax</span>
                        <span>{formatCurrency(detailedBill.taxAmount)}</span>
                      </div>
                    )}
                    {detailedBill.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>-{formatCurrency(detailedBill.discountAmount)}</span>
                      </div>
                    )}
                    {detailedBill.roundOffAmount !== 0 && (
                      <div className="flex justify-between">
                        <span>Round Off</span>
                        <span>{detailedBill.roundOffAmount >= 0 ? '+' : ''}{formatCurrency(detailedBill.roundOffAmount)}</span>
                      </div>
                    )}
                    {detailedBill.pendingAmount > 0 && (
                      <div className="flex justify-between text-orange-600 font-medium">
                        <span>Pending</span>
                        <span>{formatCurrency(detailedBill.pendingAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Tax Type */}
                  {detailedBill.taxType && (
                    <div className="mt-3 pt-2 border-t border-blue-200">
                      <div className="text-xs text-gray-600">
                        Tax Type: {detailedBill.taxType === 'intra-state' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500">
                Failed to load session details
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function OrdersPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<'orders' | 'sessions'>('orders');
  const [status, setStatus] = React.useState<string>('all');
  const [paymentStatus, setPaymentStatus] = React.useState<string>('all');
  const [sessionStatus, setSessionStatus] = React.useState<string>('all');
  const [expandedSessions, setExpandedSessions] = React.useState<Set<string>>(new Set());
  const [sorting, setSorting] = React.useState<SortingState>([]);


  console.log(
    'Rendering OrdersPage with status:',
    status,
    'and paymentStatus:',
    paymentStatus
  );

  console.log('Current Branch:', currentBranch);

  const branchId = currentBranch?._id;
  const queryArgs =
    restaurantId && branchId
      ? {
          restaurantId,
          branchId,
          status: status !== 'all' ? (status as Order['status']) : undefined,
          paymentStatus:
            paymentStatus !== 'all'
              ? (paymentStatus as Order['paymentStatus'])
              : undefined,
          limit: 20,
          page: 1,
        }
      : skipToken;

  const { data, isLoading, refetch } = useListOrdersByBranchQuery(queryArgs);
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [updateOrderPayment] = useUpdateOrderPaymentMutation();

  // Sessions query
  const sessionQueryArgs = restaurantId ? {
    restaurantId,
    status: sessionStatus !== 'all' ? (sessionStatus as CustomerSession['status']) : undefined,
    page: 1,
    limit: 20,
  } : skipToken;

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions
  } = useFindSessionsQuery(sessionQueryArgs);

  useOrdersSocket({ onEvent: refetch, enabled: !!restaurantId });

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: Order['status']
  ) => {
    if (!restaurantId) return;

    try {
      await updateOrderStatus({
        restaurantId,
        orderId,
        status: newStatus,
      }).unwrap();
      toast({ title: 'Order updated' });
    } catch (error) {
      toast({
        title: 'Unable to update order',
        description:
          error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    if (!restaurantId) return;

    try {
      await updateOrderPayment({
        restaurantId,
        orderId,
        paymentStatus: 'paid',
      }).unwrap();
      toast({ title: 'Marked as Paid' });
    } catch (error) {
      toast({
        title: 'Unable to mark as paid',
        description:
          error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!restaurantId || order.status === 'cancelled') {
      return;
    }

    if (!ORDER_CANCELLABLE_STATUSES.includes(order.status)) {
      toast({
        title: 'Cannot cancel order',
        description:
          'This ticket has progressed too far. Please coordinate with staff to resolve it.',
        variant: 'destructive',
      });
      return;
    }

    const confirmCancel =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            `Cancel ticket ${order.orderNumber}? This will notify staff and move it to Cancelled.`
          );

    if (!confirmCancel) return;

    try {
      await updateOrderStatus({
        restaurantId,
        orderId: order.id,
        status: 'cancelled',
        statusNote: 'Cancelled by staff',
      }).unwrap();
      toast({ title: 'Order cancelled' });
    } catch (error) {
      toast({
        title: 'Unable to cancel order',
        description:
          error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    }
  };


  const orders = data?.data ?? [];
  const sessions = sessionsData?.sessions ?? [];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: CustomerSession['status']) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          className: 'bg-orange-100 text-orange-700',
        };
      case 'closed':
        return {
          label: 'Closed',
          className: 'bg-green-100 text-green-700',
        };
      case 'abandoned':
        return {
          label: 'Abandoned',
          className: 'bg-gray-100 text-gray-700',
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-gray-100 text-gray-700',
        };
    }
  };

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const columns = React.useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Order <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-medium">{row.original.orderNumber}</div>
        ),
      },
      {
        accessorKey: 'tableNumber',
        header: 'Table',
        cell: ({ row }) => row.original.tableNumber ?? '-',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`px-2 py-0.5 rounded-full text-xs capitalize ${
              row.original.status === 'pending'
                ? 'bg-orange-100 text-orange-700'
                : row.original.status === 'ready'
                ? 'bg-green-100 text-green-700'
                : row.original.status === 'completed'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {row.original.status.replace('_', ' ')}
          </span>
        ),
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Payment',
        cell: ({ row }) => (
          <span
            className={`px-2 py-0.5 rounded-full text-xs capitalize ${
              row.original.paymentStatus === 'paid'
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
            }`}
          >
            {row.original.paymentStatus}
          </span>
        ),
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Method',
        cell: ({ row }) =>
          row.original.paymentMethod === 'cash' ? 'Cash' : 'UPI',
      },
      {
        accessorKey: 'totalAmount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Total <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => `₹${row.original.totalAmount.toFixed(2)}`,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2 justify-end">
            {ORDER_CANCELLABLE_STATUSES.includes(row.original.status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate(row.original.id, 'ready')}
              >
                Mark Ready
              </Button>
            )}
            {row.original.paymentStatus !== 'paid' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleMarkPaid(row.original.id)}
              >
                Mark Paid
              </Button>
            )}
            {row.original.status !== 'cancelled' &&
              row.original.status !== 'completed' &&
              ORDER_CANCELLABLE_STATUSES.includes(row.original.status) && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleCancelOrder(row.original)}
                  className="flex items-center gap-1"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
          </div>
        ),
      },
    ],
    [handleStatusUpdate, handleMarkPaid, handleCancelOrder]
  );

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    paid: orders.filter((o) => o.paymentStatus === 'paid').length,
  };

  const sessionStats = {
    total: sessions.length,
    active: sessions.filter((s) => s.status === 'active').length,
    closed: sessions.filter((s) => s.status === 'closed').length,
    paid: sessions.filter((s) => s.allOrdersPaid).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orders & Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage customer orders and dining sessions.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'orders' | 'sessions')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {/* Orders Controls */}
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" /> Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 space-y-3">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>

          {/* Orders Metrics */}
          <MetricsGrid columns={4}>
            <MetricsCard
              title="Total"
              value={orderStats.total}
              icon={Utensils}
              iconColor="blue"
            />
            <MetricsCard
              title="Pending"
              value={orderStats.pending}
              icon={Clock}
              iconColor="orange"
            />
            <MetricsCard
              title="Completed"
              value={orderStats.completed}
              icon={CheckCircle}
              iconColor="green"
            />
            <MetricsCard
              title="Paid"
              value={orderStats.paid}
              icon={CreditCard}
              iconColor="purple"
            />
          </MetricsGrid>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No orders found.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of{' '}
                  {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          {/* Sessions Controls */}
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" /> Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 space-y-3">
                <Select value={sessionStatus} onValueChange={setSessionStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionStatusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>

          {/* Sessions Metrics */}
          <MetricsGrid columns={4}>
            <MetricsCard
              title="Total"
              value={sessionStats.total}
              icon={Receipt}
              iconColor="blue"
            />
            <MetricsCard
              title="Active"
              value={sessionStats.active}
              icon={Clock}
              iconColor="orange"
            />
            <MetricsCard
              title="Closed"
              value={sessionStats.closed}
              icon={CheckCircle}
              iconColor="green"
            />
            <MetricsCard
              title="Paid"
              value={sessionStats.paid}
              icon={CreditCard}
              iconColor="purple"
            />
          </MetricsGrid>

          {/* Sessions List */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No sessions found.
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <SessionCard
                      key={session.sessionId}
                      session={session}
                      isExpanded={expandedSessions.has(session.sessionId)}
                      onToggleExpanded={() => toggleSessionExpansion(session.sessionId)}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      getStatusConfig={getStatusConfig}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
