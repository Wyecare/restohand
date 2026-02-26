import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  RefreshCcw,
  Users,
  Clock,
  Receipt,
  CheckCircle2,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { PaymentModal, PaymentMethod } from '../components/PaymentModal';
import { useFindSessionsQuery, useCloseSessionMutation } from '@/store/api/customerSessionsApi';
import { useGetDetailedSessionBillQuery } from '@/store/api/billingApi';
import { useUpdateOrderPaymentMutation } from '@/store/api/ordersApi';
import { useRecordTillTransactionMutation } from '@/store/api/tillApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query';
import { TillSession } from '@/store/api/tillApi';

interface SessionsViewProps {
  currentTill: TillSession | null;
}

export function SessionsView({ currentTill }: SessionsViewProps) {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const { data: sessionsData, isLoading, refetch } = useFindSessionsQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id, status: 'active', page: 1, limit: 50 }
      : skipToken,
  );

  const { data: billData } = useGetDetailedSessionBillQuery(
    selectedSessionId
      ? { sessionId: selectedSessionId, includeUnpaid: true }
      : skipToken,
  );

  const [updateOrderPayment] = useUpdateOrderPaymentMutation();
  const [closeSession] = useCloseSessionMutation();
  const [recordTransaction] = useRecordTillTransactionMutation();

  const sessions = sessionsData?.sessions ?? [];
  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId);

  const handlePaySession = async (method: PaymentMethod) => {
    if (!selectedSession || !billData) return;
    setIsProcessing(true);
    try {
      const orderIds = billData.orderBreakdown
        ?.filter((o) => o.paymentStatus !== 'paid')
        .map((o) => o.orderId) ?? [];

      await Promise.all(
        orderIds.map((orderId) =>
          updateOrderPayment({
            restaurantId: restaurantId!,
            orderId,
            paymentStatus: 'paid',
          }).unwrap(),
        ),
      );

      await closeSession({
        sessionId: selectedSession.sessionId,
        reason: 'payment_completed',
        notes: `Paid via ${method}`,
      }).unwrap();

      if (currentTill) {
        await recordTransaction({
          restaurantId: restaurantId!,
          tillId: currentTill._id || currentTill.id,
          paymentMethod: method,
          amount: billData.totalAmount,
        });
      }

      toast({
        title: 'Payment recorded',
        description: `Table ${selectedSession.tableNumber} — ₹${billData.totalAmount.toFixed(2)} via ${method.toUpperCase()}`,
      });

      setPaymentOpen(false);
      setSelectedSessionId(null);
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Payment failed', description: err?.data?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const fmt = (n: number) => `₹${n.toFixed(2)}`;
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="flex h-full">
      {/* Sessions Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Active Sessions</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sessions.length} table{sessions.length !== 1 ? 's' : ''} with pending bills
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-muted/30 h-36 animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                <CheckCircle2 className="h-12 w-12 opacity-20" />
                <p className="font-medium">All clear!</p>
                <p className="text-sm">No active sessions with pending bills.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {sessions.map((session) => {
                  const isPending = session.pendingAmount > 0;
                  const isSelected = session.sessionId === selectedSessionId;

                  return (
                    <button
                      key={session.sessionId}
                      onClick={() => setSelectedSessionId(isSelected ? null : session.sessionId)}
                      className={`rounded-xl border-2 p-4 text-left transition-all space-y-3 ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : isPending
                          ? 'border-border hover:border-primary/50 hover:shadow-sm bg-card'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-lg">T{session.tableNumber}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {fmtTime(session.startedAt)}
                          </p>
                        </div>
                        <Badge
                          className={
                            session.allOrdersPaid
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200'
                          }
                        >
                          {session.allOrdersPaid ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            {session.totalOrders} order{session.totalOrders !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-primary">{fmt(session.totalAmount)}</p>
                        {isPending && (
                          <p className="text-xs text-amber-600">
                            Pending: {fmt(session.pendingAmount)}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bill Panel */}
      {selectedSession && (
        <div className="w-80 border-l bg-card flex flex-col flex-shrink-0">
          <div className="p-4 border-b">
            <p className="font-bold text-base">Table {selectedSession.tableNumber}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Users className="h-3.5 w-3.5" />
              Session started {fmtTime(selectedSession.startedAt)}
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {billData ? (
                <>
                  {/* Items */}
                  <div className="space-y-2">
                    {billData.allItems?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium leading-tight">
                            {item.name}
                            {item.quantity > 1 && (
                              <span className="text-muted-foreground ml-1">×{item.quantity}</span>
                            )}
                          </p>
                        </div>
                        <p className="font-medium flex-shrink-0">
                          {fmt(item.quantity * item.unitPrice)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{fmt(billData.subTotalAmount)}</span>
                    </div>

                    {/* Branch charges */}
                    {billData.branchCharges?.map((charge, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span>{charge.name}{charge.type === 'percentage' ? ` (${charge.value}%)` : ''}</span>
                        <span>{fmt(charge.amount)}</span>
                      </div>
                    ))}

                    {/* Tax breakdown — category-wise (mixed GST + VAT) or simple */}
                    {billData.taxAmount > 0 && (
                      <>
                        {billData.categoryCalculations && billData.categoryCalculations.length > 0 ? (
                          <>
                            {billData.categoryCalculations.map((calc, i) => {
                              if (calc.totalTaxAmount === 0) return null;
                              const label = calc.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                              const taxLabel = calc.taxType === 'vat' ? 'VAT' : 'GST';
                              const rate = calc.taxType === 'gst' ? calc.gstRate : calc.vatRate;
                              return (
                                <div key={i} className="flex justify-between text-muted-foreground">
                                  <span>{label} {taxLabel}{rate ? ` (${rate}%)` : ''}</span>
                                  <span>{fmt(calc.totalTaxAmount)}</span>
                                </div>
                              );
                            })}
                            {/* GST sub-breakdown when mixed */}
                            {(billData.totalGstAmount ?? 0) > 0 && (billData.cgstAmount > 0 || billData.sgstAmount > 0 || billData.igstAmount > 0) && (
                              <>
                                {billData.cgstAmount > 0 && (
                                  <div className="flex justify-between text-muted-foreground pl-3">
                                    <span>CGST</span><span>{fmt(billData.cgstAmount)}</span>
                                  </div>
                                )}
                                {billData.sgstAmount > 0 && (
                                  <div className="flex justify-between text-muted-foreground pl-3">
                                    <span>SGST</span><span>{fmt(billData.sgstAmount)}</span>
                                  </div>
                                )}
                                {billData.igstAmount > 0 && (
                                  <div className="flex justify-between text-muted-foreground pl-3">
                                    <span>IGST</span><span>{fmt(billData.igstAmount)}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {billData.cgstAmount > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>CGST</span><span>{fmt(billData.cgstAmount)}</span>
                              </div>
                            )}
                            {billData.sgstAmount > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>SGST</span><span>{fmt(billData.sgstAmount)}</span>
                              </div>
                            )}
                            {billData.igstAmount > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>IGST</span><span>{fmt(billData.igstAmount)}</span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex justify-between text-muted-foreground font-medium">
                          <span>Total Tax</span><span>{fmt(billData.taxAmount)}</span>
                        </div>
                      </>
                    )}

                    {billData.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span><span>-{fmt(billData.discountAmount)}</span>
                      </div>
                    )}
                    {billData.roundOffAmount !== 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Round Off</span>
                        <span>{billData.roundOffAmount >= 0 ? '+' : ''}{fmt(Math.abs(billData.roundOffAmount))}</span>
                      </div>
                    )}

                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span className="text-primary">{fmt(billData.totalAmount)}</span>
                    </div>
                    {billData.pendingAmount > 0 && billData.pendingAmount < billData.totalAmount && (
                      <div className="flex justify-between text-amber-600">
                        <span>Still Pending</span><span>{fmt(billData.pendingAmount)}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-2">
            <Button
              className="w-full h-11 font-bold"
              onClick={() => setPaymentOpen(true)}
              disabled={!currentTill || !billData || selectedSession.allOrdersPaid}
            >
              <Receipt className="h-4 w-4 mr-2" />
              {selectedSession.allOrdersPaid ? 'Already Paid' : `Collect ${fmt(billData?.totalAmount ?? 0)}`}
            </Button>
            {!currentTill && (
              <p className="text-xs text-center text-amber-600">Open till first to process payment</p>
            )}
          </div>
        </div>
      )}

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        totalAmount={billData?.totalAmount ?? 0}
        onConfirmPayment={handlePaySession}
        isProcessing={isProcessing}
      />
    </div>
  );
}
