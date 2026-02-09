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
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';
import { useToast } from '@/components/ui/use-toast';
import {
  useListOrdersByBranchQuery,
  useUpdateOrderStatusMutation,
  useUpdateOrderPaymentMutation,
  useCreateSessionReceiptMutation,
  useGenerateSessionReceiptQrMutation,
  useGetAdminConsolidatedBillQuery,
  ordersApi,
} from '@/store/api/ordersApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { skipToken } from '@reduxjs/toolkit/query';
import type { Order } from '@/store/api/types';
import { useBranchContext } from '@/contexts/BranchContext';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { generateProfessionalInvoicePDF } from '@/components/ProfessionalInvoicePDF';

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

export default function OrdersPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const authToken = useAppSelector(state => state.auth.idToken);
  const { toast } = useToast();

  const [status, setStatus] = React.useState<string>('all');
  const [paymentStatus, setPaymentStatus] = React.useState<string>('all');
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Helper function to convert numbers to words (from customer page)
  const convertToWords = (amount: number): string => {
    if (amount === 0) return 'Zero Rupees Only';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertHundreds = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        n = 0;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result.trim();
    };

    let rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let result = '';

    if (rupees >= 10000000) {
      result += convertHundreds(Math.floor(rupees / 10000000)) + ' Crore ';
      rupees %= 10000000;
    }
    if (rupees >= 100000) {
      result += convertHundreds(Math.floor(rupees / 100000)) + ' Lakh ';
      rupees %= 100000;
    }
    if (rupees >= 1000) {
      result += convertHundreds(Math.floor(rupees / 1000)) + ' Thousand ';
      rupees %= 1000;
    }
    if (rupees > 0) {
      result += convertHundreds(rupees);
    }

    result += result.trim() ? ' Rupees' : 'Rupees';
    if (paise > 0) {
      result += ' And ' + convertHundreds(paise) + ' Paisa';
    }
    return result + ' Only';
  };

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
  const [createSessionReceipt] = useCreateSessionReceiptMutation();
  const [generateSessionReceiptQr] = useGenerateSessionReceiptQrMutation();
  const [getAdminConsolidatedBill] = ordersApi.useLazyGetAdminConsolidatedBillQuery();

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

  const handleViewReceipt = async (order: Order) => {
    if (!order.tableNumber || !restaurantId) {
      toast({
        title: 'Error',
        description: 'Unable to generate receipt - missing table or restaurant info',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Use lazy query exactly like customer frontend
      const result = await getAdminConsolidatedBill({
        restaurantId,
        tableId: order.tableNumber
      });

      if ('data' in result && result.data) {
        // Transform data for professional invoice (same as customer frontend)
        const invoiceData = {
          restaurant: {
            name: result.data.restaurant.name,
            legalEntity: result.data.restaurant.name?.toUpperCase(),
            address: result.data.restaurant.address,
            phone: result.data.restaurant.phone,
            email: result.data.restaurant.email,
            gstin: result.data.restaurant.gstin || 'UNREGISTERED',
            fssai: 'Not Available',
            pan: 'Not Available',
            cin: 'Not Available',
          },
          customer: {
            name: 'Guest Customer',
            address: `Table ${order.tableNumber}`,
            gstin: 'UNREGISTERED',
          },
          invoice: {
            number: `INV-${Date.now().toString().slice(-8)}`,
            date: new Date().toISOString(),
            orderId: order.id,
            orderNumber: order.orderNumber,
            tableNumber: order.tableNumber,
            paymentMethod: 'Digital payment',
          },
          bill: {
            ...result.data.bill,
            discountAmount: 0,
            orders: result.data.bill.orders.map((billOrder: any) => ({
              ...billOrder,
              items: billOrder.items.map((item: any) => {
                const totalItems = result.data?.bill?.orders.reduce((sum, o) => sum + o.items.length, 0) || 1;
                const itemCgst = (result.data?.bill?.cgstAmount || 0) / totalItems;
                const itemSgst = (result.data?.bill?.sgstAmount || 0) / totalItems;
                const itemIgst = (result.data?.bill?.igstAmount || 0) / totalItems;
                const taxIncludedTotal = item.lineTotal + itemCgst + itemSgst + itemIgst;

                return {
                  ...item,
                  grossValue: item.lineTotal,
                  discount: 0,
                  netValue: item.lineTotal,
                  cgstAmount: itemCgst,
                  sgstAmount: itemSgst,
                  igstAmount: itemIgst,
                  lineTotal: taxIncludedTotal,
                  hsnCode: '996331',
                };
              }),
            })),
            amountInWords: convertToWords(result.data.bill.totalAmount),
          },
        };

        const pdfBlob = await generateProfessionalInvoicePDF(invoiceData);

        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `table-${order.tableNumber}-bill.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Receipt Downloaded',
          description: 'Bill has been downloaded successfully',
        });
      } else {
        throw new Error('Failed to get bill data');
      }
    } catch (error) {
      console.error('Error downloading bill:', error);
      toast({
        title: 'Download Failed',
        description: 'Unable to download the bill. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSessionReceipt = async (order: Order) => {
    if (!order.customerSessionId) {
      toast({
        title: 'Error',
        description: 'No customer session found for this order',
        variant: 'destructive',
      });
      return;
    }

    if (!restaurantId) {
      toast({
        title: 'Error',
        description: 'Restaurant ID not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await generateSessionReceiptQr({
        restaurantId,
        customerSessionId: order.customerSessionId,
        tableNumber: order.tableNumber,
      }).unwrap();

      // Open receipt URL in new tab
      window.open(result.receiptUrl, '_blank');

      toast({
        title: 'Session Receipt Generated',
        description: 'Session receipt has been opened in a new tab',
      });
    } catch (error) {
      console.error('Session receipt error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate session receipt',
        variant: 'destructive',
      });
    }
  };

  const orders = data?.data ?? [];

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
            {row.original.paymentStatus === 'paid' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewReceipt(row.original)}
                  className="flex items-center gap-1"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Download Bill
                </Button>
                {row.original.customerSessionId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSessionReceipt(row.original)}
                    className="flex items-center gap-1"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Session Receipt
                  </Button>
                )}
              </>
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
    [handleStatusUpdate, handleMarkPaid, handleCancelOrder, handleViewReceipt, handleSessionReceipt, restaurantId, authToken, toast, convertToWords]
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

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    paid: orders.filter((o) => o.paymentStatus === 'paid').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage customer orders.
          </p>
        </div>
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
      </div>

      {/* Metrics */}
      <MetricsGrid columns={4}>
        <MetricsCard
          title="Total"
          value={stats.total}
          icon={Utensils}
          iconColor="blue"
        />
        <MetricsCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          iconColor="orange"
        />
        <MetricsCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle}
          iconColor="green"
        />
        <MetricsCard
          title="Paid"
          value={stats.paid}
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

    </div>
  );
}
