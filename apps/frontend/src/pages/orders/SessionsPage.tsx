/* eslint-disable react-hooks/exhaustive-deps */
import * as React from 'react';
import {
  Filter,
  RefreshCcw,
  CheckCircle,
  Clock,
  CreditCard,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';
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
import { useBranchContext } from '@/contexts/BranchContext';

const sessionStatusOptions: Array<{
  label: string;
  value: CustomerSession['status'] | 'all';
}> = [
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
  const { data: detailedBill, isLoading: billLoading } =
    useGetDetailedSessionBillQuery(
      isExpanded
        ? { sessionId: session.sessionId, includeUnpaid: true }
        : skipToken
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
            includeUnpaid: true,
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
          <div className="p-4 cursor-pointer ">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">
                      Table {session.tableNumber}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${statusConfig.className}`}
                    >
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
                  <div className="font-semibold">
                    {formatCurrency(session.totalAmount)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {session.totalOrders}{' '}
                    {session.totalOrders === 1 ? 'order' : 'orders'}
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
                <div className="p-3 rounded">
                  <h4 className="font-medium mb-2">Restaurant Details</h4>
                  <div className="text-sm space-y-1">
                    <div className="font-medium">
                      {detailedBill.restaurant.name}
                    </div>
                    {detailedBill.restaurant.address && (
                      <div className="text-gray-600">
                        {detailedBill.restaurant.address.line1},{' '}
                        {detailedBill.restaurant.address.city}
                      </div>
                    )}
                    {detailedBill.restaurant.phone && (
                      <div className="text-gray-600">
                        Phone: {detailedBill.restaurant.phone}
                      </div>
                    )}
                    {detailedBill.restaurant.gstin && (
                      <div className="text-gray-600">
                        GSTIN: {detailedBill.restaurant.gstin}
                      </div>
                    )}
                  </div>
                </div>

                {/* All Items */}
                <div>
                  <h4 className="font-medium mb-2">
                    All Items ({detailedBill.allItems.length})
                  </h4>
                  <div className="space-y-2">
                    {detailedBill.allItems.map((item, index) => {
                      // Calculate price per unit with tax included
                      const pricePerUnitWithTax =
                        item.totalWithTax / item.quantity;

                      return (
                        <div key={index} className="p-3 rounded border">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {item.quantity} ×{' '}
                                {formatCurrency(pricePerUnitWithTax)} ={' '}
                                {formatCurrency(item.totalWithTax)}
                              </div>
                              {item.totalTaxAmount > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.gstRate > 0 ? (
                                    <>
                                      GST ({item.gstRate}%) included:{' '}
                                      {formatCurrency(item.totalTaxAmount)}
                                      {item.cgstAmount > 0 &&
                                        ` | CGST: ${formatCurrency(
                                          item.cgstAmount
                                        )}`}
                                      {item.sgstAmount > 0 &&
                                        ` | SGST: ${formatCurrency(
                                          item.sgstAmount
                                        )}`}
                                      {item.igstAmount > 0 &&
                                        ` | IGST: ${formatCurrency(
                                          item.igstAmount
                                        )}`}
                                    </>
                                  ) : (
                                    <>
                                      VAT (25%) included:{' '}
                                      {formatCurrency(item.totalTaxAmount)}
                                    </>
                                  )}
                                </div>
                              )}
                              {item.hsnCode && (
                                <div className="text-xs text-gray-500">
                                  HSN: {item.hsnCode}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(item.totalWithTax)}
                              </div>
                              <div className="text-xs text-gray-500">
                                incl. tax
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Orders Breakdown */}
                <div>
                  <h4 className="font-medium mb-2">
                    Orders ({detailedBill.orderBreakdown.length})
                  </h4>
                  {detailedBill.orderBreakdown.map((order) => (
                    <div key={order.orderId} className=" p-3 rounded mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            #{order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Payment: {order.paymentStatus} • {order.itemCount}{' '}
                            items
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(order.totalAmount)}
                          </div>
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
                <div className="mt-4 p-4  rounded">
                  <div className="flex justify-between items-center font-medium mb-3">
                    <span>Session Total</span>
                    <span className="text-lg">
                      {formatCurrency(detailedBill.totalAmount)}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(detailedBill.subTotalAmount)}</span>
                    </div>

                    {/* Branch Charges - Dynamic Display */}
                    {detailedBill.branchCharges &&
                      detailedBill.branchCharges.length > 0 && (
                        <>
                          {detailedBill.branchCharges.map((charge, index) => {
                            let chargeName = charge.name;
                            if (charge.type === 'percentage') {
                              chargeName += ` (${charge.value}%)`;
                            }

                            return (
                              <div key={index} className="flex justify-between">
                                <span>{chargeName}</span>
                                <span>{formatCurrency(charge.amount)}</span>
                              </div>
                            );
                          })}
                        </>
                      )}

                    {/* Dynamic Tax breakdown - handle both mixed and simple tax scenarios */}
                    {detailedBill.taxAmount > 0 && (
                      <>
                        {/* Check if we have category-wise tax calculations */}
                        {detailedBill.categoryCalculations &&
                        detailedBill.categoryCalculations.length > 0 ? (
                          <>
                            {/* Category-wise tax breakdown */}
                            {detailedBill.categoryCalculations.map(
                              (categoryCalc, index) => {
                                if (categoryCalc.totalTaxAmount === 0)
                                  return null;

                                const categoryName = categoryCalc.category
                                  .replace('_', ' ')
                                  .replace(/\b\w/g, (l) => l.toUpperCase());

                                const taxTypeLabel =
                                  categoryCalc.taxType === 'vat'
                                    ? 'VAT'
                                    : 'GST';
                                const taxRate =
                                  categoryCalc.taxType === 'gst'
                                    ? categoryCalc.gstRate
                                    : categoryCalc.vatRate;

                                const displayText = `${categoryName} ${taxTypeLabel}${
                                  taxRate ? ` (${taxRate}%)` : ''
                                }`;

                                return (
                                  <div
                                    key={index}
                                    className="flex justify-between"
                                  >
                                    <span>{displayText}</span>
                                    <span>
                                      {formatCurrency(
                                        categoryCalc.totalTaxAmount
                                      )}
                                    </span>
                                  </div>
                                );
                              }
                            )}

                            {/* GST breakdown if GST items exist */}
                            {(detailedBill.totalGstAmount || 0) > 0 &&
                              (detailedBill.cgstAmount > 0 ||
                                detailedBill.sgstAmount > 0 ||
                                detailedBill.igstAmount > 0) && (
                                <>
                                  <div className="flex justify-between font-medium text-gray-700 pt-1">
                                    <span>GST Breakdown</span>
                                    <span></span>
                                  </div>

                                  {detailedBill.cgstAmount > 0 && (
                                    <div className="flex justify-between pl-4">
                                      <span>CGST</span>
                                      <span>
                                        {formatCurrency(
                                          detailedBill.cgstAmount
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {detailedBill.sgstAmount > 0 && (
                                    <div className="flex justify-between pl-4">
                                      <span>SGST</span>
                                      <span>
                                        {formatCurrency(
                                          detailedBill.sgstAmount
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {detailedBill.igstAmount > 0 && (
                                    <div className="flex justify-between pl-4">
                                      <span>IGST</span>
                                      <span>
                                        {formatCurrency(
                                          detailedBill.igstAmount
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                          </>
                        ) : (
                          <>
                            {/* Original simple GST breakdown for backward compatibility */}
                            {detailedBill.cgstAmount > 0 && (
                              <div className="flex justify-between">
                                <span>CGST</span>
                                <span>
                                  {formatCurrency(detailedBill.cgstAmount)}
                                </span>
                              </div>
                            )}
                            {detailedBill.sgstAmount > 0 && (
                              <div className="flex justify-between">
                                <span>SGST</span>
                                <span>
                                  {formatCurrency(detailedBill.sgstAmount)}
                                </span>
                              </div>
                            )}
                            {detailedBill.igstAmount > 0 && (
                              <div className="flex justify-between">
                                <span>IGST</span>
                                <span>
                                  {formatCurrency(detailedBill.igstAmount)}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Total tax - always show */}
                        <div className="flex justify-between font-medium">
                          <span>Total Tax</span>
                          <span>{formatCurrency(detailedBill.taxAmount)}</span>
                        </div>
                      </>
                    )}
                    {detailedBill.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>
                          -{formatCurrency(detailedBill.discountAmount)}
                        </span>
                      </div>
                    )}
                    {detailedBill.roundOffAmount !== 0 && (
                      <div className="flex justify-between">
                        <span>Round Off</span>
                        <span>
                          {detailedBill.roundOffAmount >= 0 ? '+' : ''}
                          {formatCurrency(detailedBill.roundOffAmount)}
                        </span>
                      </div>
                    )}
                    {detailedBill.pendingAmount > 0 && (
                      <div className="flex justify-between text-orange-600 font-medium">
                        <span>Pending</span>
                        <span>
                          {formatCurrency(detailedBill.pendingAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tax Type */}
                  {detailedBill.taxType && (
                    <div className="mt-3 pt-2 border-t border-blue-200">
                      <div className="text-xs text-gray-600">
                        Tax Type:{' '}
                        {detailedBill.taxType === 'intra-state'
                          ? 'Intra-State (CGST+SGST)'
                          : 'Inter-State (IGST)'}
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

export default function SessionsPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();

  const [sessionStatus, setSessionStatus] = React.useState<string>('all');
  const [expandedSessions, setExpandedSessions] = React.useState<Set<string>>(
    new Set()
  );

  const branchId = currentBranch?._id;

  // Sessions query - must include branchId for branch filtering
  const sessionQueryArgs =
    restaurantId && branchId
      ? {
          restaurantId,
          branchId,
          status:
            sessionStatus !== 'all'
              ? (sessionStatus as CustomerSession['status'])
              : undefined,
          page: 1,
          limit: 20,
        }
      : skipToken;

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useFindSessionsQuery(sessionQueryArgs);

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
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
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
          <h1 className="text-2xl font-semibold">Customer Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage customer dining sessions.
          </p>
        </div>
      </div>

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
                  onToggleExpanded={() =>
                    toggleSessionExpansion(session.sessionId)
                  }
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getStatusConfig={getStatusConfig}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
