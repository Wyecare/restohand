/* eslint-disable react-hooks/exhaustive-deps */
import * as React from 'react';
import {
  RefreshCcw,
  CheckCircle,
  Clock,
  CreditCard,
  Receipt,
  Download,
  ChevronRight,
  X,
  DollarSign,
  XCircle,
  AlertTriangle,
  Trash2,
  Loader2,
  Building2,
  Package,
  CalendarClock,
  FileText,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  useFindSessionsQuery,
  useCloseSessionMutation,
  useListGhostSessionsQuery,
  useCleanupGhostSessionsMutation,
  type CustomerSession,
} from '@/store/api/customerSessionsApi';
import { useUpdateOrderPaymentMutation } from '@/store/api/ordersApi';
import { useGetDetailedSessionBillQuery } from '@/store/api/billingApi';
import { downloadThermalReceipt } from '@/components/DetailedThermalReceiptPDF';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { skipToken } from '@reduxjs/toolkit/query';
import { useBranchContext } from '@/contexts/BranchContext';
import { useToast } from '@/components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatusKey = CustomerSession['status'] | 'all';

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_STATUS_FILTERS: Array<{ value: SessionStatusKey; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'closed',    label: 'Closed' },
  { value: 'abandoned', label: 'Abandoned' },
];

interface SessionMeta {
  label: string;
  dot: string;
  badge: string;
  border: string;
}

const SESSION_META: Record<CustomerSession['status'], SessionMeta> = {
  active: {
    label: 'Active',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    border: 'border-l-amber-400',
  },
  closed: {
    label: 'Closed',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    border: 'border-l-emerald-400',
  },
  abandoned: {
    label: 'Abandoned',
    dot: 'bg-slate-300',
    badge: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
    border: 'border-l-slate-200',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CustomerSession['status'] }) {
  const meta = SESSION_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function PaymentBadge({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <CheckCircle className="h-3 w-3" /> All paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Circle className="h-3 w-3" /> Unpaid
    </span>
  );
}

// ─── Side Panel ───────────────────────────────────────────────────────────────

interface SidePanelProps {
  session: CustomerSession | null;
  onClose: () => void;
  onMarkAllPaid: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
  onDownloadReceipt: (session: CustomerSession) => void;
  isActing: boolean;
  pdfLoading: boolean;
}

function SessionSidePanel({
  session,
  onClose,
  onMarkAllPaid,
  onCloseSession,
  onDownloadReceipt,
  isActing,
  pdfLoading,
}: SidePanelProps) {
  const isOpen = !!session;

  const { data: detailedBill, isLoading: billLoading } =
    useGetDetailedSessionBillQuery(
      session
        ? { sessionId: session.sessionId, includeUnpaid: true }
        : skipToken
    );

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
  className={`fixed inset-x-0 bottom-0 bg-black/20 z-30 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
  style={{ top: '50px' }}
  onClick={onClose}
/>

        <div
          className={`fixed right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ top: '50px' }}
        >

        {session && (
          <>
            {/* Header */}
            <div className={`border-l-4 ${SESSION_META[session.status].border} border-b border-slate-100`}>
              <div className="flex items-start justify-between p-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Session</span>
                    <StatusBadge status={session.status} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Table {session.tableNumber}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Started {formatDateTime(session.startedAt)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* Summary Tiles */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Orders</p>
                  <p className="text-lg font-bold text-slate-800">{session.totalOrders}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Total</p>
                  <p className="text-base font-bold text-slate-800">{formatCurrency(session.totalAmount)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Pending</p>
                  <p className={`text-base font-bold ${session.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {session.pendingAmount > 0 ? formatCurrency(session.pendingAmount) : '₹0'}
                  </p>
                </div>
              </div>

              {/* Detailed Bill */}
              {billLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : detailedBill ? (
                <>
                  {/* Restaurant Info */}
                  <section>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Restaurant
                    </h3>
                    <div className="bg-slate-50 rounded-lg p-3 space-y-0.5">
                      <p className="text-sm font-semibold text-slate-800">{detailedBill.restaurant.name}</p>
                      {detailedBill.restaurant.address && (
                        <p className="text-xs text-slate-500">
                          {detailedBill.restaurant.address.line1}, {detailedBill.restaurant.address.city}
                        </p>
                      )}
                      {detailedBill.restaurant.phone && (
                        <p className="text-xs text-slate-500">{detailedBill.restaurant.phone}</p>
                      )}
                      {detailedBill.restaurant.gstin && (
                        <p className="text-xs text-slate-500">GSTIN: {detailedBill.restaurant.gstin}</p>
                      )}
                    </div>
                  </section>

                  {/* Items */}
                  <section>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" /> Items ({detailedBill.allItems.length})
                    </h3>
                    <div className="space-y-2">
                      {detailedBill.allItems.map((item, index) => {
                        const pricePerUnit = item.totalWithTax / item.quantity;
                        return (
                          <div key={index} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center font-bold shrink-0">
                                    {item.quantity}
                                  </span>
                                  <span className="text-sm font-medium text-slate-800 truncate">{item.name}</span>
                                </div>
                                {/* Modifiers */}
                                {item.selectedModifiers?.length > 0 && (
                                  <div className="mt-1 ml-7 space-y-0.5">
                                    {item.selectedModifiers.map((mod, mi) => (
                                      <div key={mi} className="text-xs text-blue-600">
                                        <span className="font-medium">{mod.modifierName}:</span>{' '}
                                        {mod.selectedOptions.map((opt, oi) => (
                                          <span key={oi}>
                                            {opt.optionName}
                                            {opt.priceAdjustment > 0 && (
                                              <span className="text-emerald-600 ml-1">(+{formatCurrency(opt.priceAdjustment)})</span>
                                            )}
                                            {oi < mod.selectedOptions.length - 1 && ', '}
                                          </span>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Tax */}
                                {item.totalTaxAmount > 0 && (
                                  <div className="mt-1 ml-7 text-xs text-slate-400">
                                    {item.gstRate > 0
                                      ? `GST ${item.gstRate}% incl.: ${formatCurrency(item.totalTaxAmount)}`
                                      : `VAT 25% incl.: ${formatCurrency(item.totalTaxAmount)}`}
                                    {item.hsnCode && ` · HSN: ${item.hsnCode}`}
                                  </div>
                                )}
                                <p className="text-xs text-slate-400 ml-7 mt-0.5">
                                  {item.quantity} × {formatCurrency(pricePerUnit)}
                                </p>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <p className="text-sm font-semibold text-slate-700">{formatCurrency(item.totalWithTax)}</p>
                                <p className="text-xs text-slate-400">incl. tax</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Orders Breakdown */}
                  <section>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Orders ({detailedBill.orderBreakdown.length})
                    </h3>
                    <div className="space-y-2">
                      {detailedBill.orderBreakdown.map((order) => (
                        <div key={order.orderId} className="bg-slate-50 rounded-lg p-3 flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800 font-mono">#{order.orderNumber}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {order.itemCount} items · {formatDateTime(order.createdAt)}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 ${order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {order.paymentStatus === 'paid'
                                ? <><CheckCircle className="h-3 w-3" /> Paid</>
                                : <><Circle className="h-3 w-3" /> Unpaid</>
                              }
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-800">{formatCurrency(order.totalAmount)}</p>
                            {order.pendingAmount > 0 && (
                              <p className="text-xs text-amber-600 mt-0.5">
                                Pending: {formatCurrency(order.pendingAmount)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Bill Summary */}
                  <section>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" /> Bill Summary
                    </h3>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-medium text-slate-700">{formatCurrency(detailedBill.subTotalAmount)}</span>
                      </div>

                      {/* Branch charges */}
                      {detailedBill.branchCharges?.map((charge, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-500">
                            {charge.name}{charge.type === 'percentage' ? ` (${charge.value}%)` : ''}
                          </span>
                          <span className="font-medium text-slate-700">{formatCurrency(charge.amount)}</span>
                        </div>
                      ))}

                      {/* Tax breakdown */}
                      {detailedBill.taxAmount > 0 && (
                        <>
                          {detailedBill.categoryCalculations?.length > 0
                            ? detailedBill.categoryCalculations.map((cc, i) => {
                                if (cc.totalTaxAmount === 0) return null;
                                const catName = cc.category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                                const taxLabel = cc.taxType === 'vat' ? 'VAT' : 'GST';
                                const rate = cc.taxType === 'gst' ? cc.gstRate : cc.vatRate;
                                return (
                                  <div key={i} className="flex justify-between">
                                    <span className="text-slate-500">{catName} {taxLabel}{rate ? ` (${rate}%)` : ''}</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(cc.totalTaxAmount)}</span>
                                  </div>
                                );
                              })
                            : <>
                                {detailedBill.cgstAmount > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">CGST</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(detailedBill.cgstAmount)}</span>
                                  </div>
                                )}
                                {detailedBill.sgstAmount > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">SGST</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(detailedBill.sgstAmount)}</span>
                                  </div>
                                )}
                                {detailedBill.igstAmount > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">IGST</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(detailedBill.igstAmount)}</span>
                                  </div>
                                )}
                              </>
                          }
                          <div className="flex justify-between font-semibold text-slate-700">
                            <span>Total Tax</span>
                            <span>{formatCurrency(detailedBill.taxAmount)}</span>
                          </div>
                        </>
                      )}

                      {detailedBill.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount</span>
                          <span>-{formatCurrency(detailedBill.discountAmount)}</span>
                        </div>
                      )}
                      {detailedBill.roundOffAmount !== 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>Round Off</span>
                          <span>{detailedBill.roundOffAmount >= 0 ? '+' : ''}{formatCurrency(detailedBill.roundOffAmount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base">
                        <span className="text-slate-800">Grand Total</span>
                        <span className="text-slate-900">{formatCurrency(detailedBill.totalAmount)}</span>
                      </div>

                      {detailedBill.pendingAmount > 0 && (
                        <div className="flex justify-between font-semibold text-amber-600">
                          <span>Pending</span>
                          <span>{formatCurrency(detailedBill.pendingAmount)}</span>
                        </div>
                      )}

                      {detailedBill.taxType && (
                        <p className="text-xs text-slate-400 pt-1">
                          Tax: {detailedBill.taxType === 'intra-state' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Timeline */}
                  <section>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" /> Timeline
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          <span className="text-sm text-slate-500">Started</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-slate-700">{formatTime(session.startedAt)}</span>
                          <span className="text-xs text-slate-400 ml-1.5">{formatDate(session.startedAt)}</span>
                        </div>
                      </div>
                      {session.closedAt && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            <span className="text-sm text-slate-500">Closed</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-slate-700">{formatTime(session.closedAt)}</span>
                            <span className="text-xs text-slate-400 ml-1.5">{formatDate(session.closedAt)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">
                  Failed to load session details
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {(session.status === 'active' || session.status === 'closed') && (
              <div className="border-t border-slate-100 p-4 space-y-2 bg-white">
                {session.status === 'active' && !session.allOrdersPaid && session.pendingAmount > 0 && (
                  <Button
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium h-10"
                    disabled={isActing}
                    onClick={() => onMarkAllPaid(session.sessionId)}
                  >
                    {isActing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                    Mark All as Paid
                  </Button>
                )}
                {session.status === 'active' && (
                  <Button
                    variant="outline"
                    className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-medium h-10"
                    disabled={isActing}
                    onClick={() => onCloseSession(session.sessionId)}
                  >
                    {isActing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Close Session
                  </Button>
                )}
                {session.status === 'closed' && (
                  <Button
                    variant="outline"
                    className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-medium h-10"
                    disabled={pdfLoading}
                    onClick={() => onDownloadReceipt(session)}
                  >
                    {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    {pdfLoading ? 'Generating...' : 'Download Receipt'}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── FilterTab ────────────────────────────────────────────────────────────────

interface FilterTabProps {
  value: SessionStatusKey;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterTab({ value, label, count, isActive, onClick }: FilterTabProps) {
  const isUrgent = value === 'active' && count > 0;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 ${
        isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[1.25rem] text-center ${
          isActive ? 'bg-white/20 text-white' : isUrgent ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────

interface SessionRowProps {
  session: CustomerSession;
  isSelected: boolean;
  onClick: () => void;
}

function SessionRow({ session, isSelected, onClick }: SessionRowProps) {
  const meta = SESSION_META[session.status];
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-4 px-4 py-3.5 cursor-pointer border-l-4 ${meta.border} border-b border-slate-100 last:border-b-0 transition-colors duration-100 ${
        isSelected ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/70'
      }`}
    >
      {/* Left: session info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-slate-900">
            Table {session.tableNumber}
          </span>
          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
            {session.totalOrders} {session.totalOrders === 1 ? 'order' : 'orders'}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Started {timeAgo(session.startedAt)}
          {session.closedAt && ` · Closed ${timeAgo(session.closedAt)}`}
        </p>
      </div>

      {/* Right: meta */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800">{formatCurrency(session.totalAmount)}</p>
          <div className="flex justify-end mt-0.5">
            <PaymentBadge paid={session.allOrdersPaid} />
          </div>
        </div>
        <StatusBadge status={session.status} />
        <ChevronRight className={`h-4 w-4 transition-transform duration-150 shrink-0 ${
          isSelected ? 'text-slate-600 rotate-90' : 'text-slate-300 group-hover:text-slate-400'
        }`} />
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-l-4 border-l-slate-100 border-b border-slate-100 animate-pulse">
      <div className="flex-1">
        <div className="h-3.5 bg-slate-100 rounded w-20 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-36" />
      </div>
      <div className="h-3 bg-slate-100 rounded w-16" />
      <div className="h-5 bg-slate-100 rounded-full w-16" />
      <div className="h-4 w-4 bg-slate-100 rounded" />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Receipt className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600 mb-1">
        {filtered ? 'No sessions match this filter' : 'No sessions yet'}
      </p>
      <p className="text-xs text-slate-400 max-w-xs">
        {filtered ? 'Try selecting a different status above' : 'Sessions will appear here when customers are seated'}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  // ✅ branchId declared FIRST — fixes the ReferenceError
  const branchId = currentBranch?._id;

  const [statusFilter, setStatusFilter] = React.useState<SessionStatusKey>('all');
  const [selectedSession, setSelectedSession] = React.useState<CustomerSession | null>(null);
  const [isActing, setIsActing] = React.useState(false);
  const [pdfLoading, setPdfLoading] = React.useState(false);

  // Mutations
  const [closeSession] = useCloseSessionMutation();
  const [updateOrderPayment] = useUpdateOrderPaymentMutation();
  const [cleanupGhostSessions, { isLoading: isCleaningUp }] = useCleanupGhostSessionsMutation();

  // ✅ branchId is now available when this query runs
  const { data: ghostSessions = [], refetch: refetchGhost } = useListGhostSessionsQuery(
    restaurantId && branchId
      ? { restaurantId, branchId }
      : skipToken
  );

  const sessionQueryArgs =
    restaurantId && branchId
      ? {
          restaurantId,
          branchId,
          status: statusFilter !== 'all' ? (statusFilter as CustomerSession['status']) : undefined,
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

  // Keep selected session in sync with fresh data
  React.useEffect(() => {
    if (selectedSession && sessions.length) {
      const updated = sessions.find((s) => s.sessionId === selectedSession.sessionId);
      if (updated) setSelectedSession(updated);
    }
  }, [sessions]);

  // Counts for filter tabs
  const counts = React.useMemo(() => {
    const map: Partial<Record<CustomerSession['status'], number>> = {};
    sessions.forEach((s) => { map[s.status] = (map[s.status] ?? 0) + 1; });
    return { all: sessionsData?.total ?? sessions.length, ...map } as Record<string, number>;
  }, [sessions, sessionsData?.total]);

  // Revenue from closed sessions
  const totalCollected = React.useMemo(
    () => sessions.filter((s) => s.allOrdersPaid).reduce((sum, s) => sum + s.totalAmount, 0),
    [sessions]
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMarkAllPaid = async (sessionId: string) => {
    if (!restaurantId) return;
    setIsActing(true);
    try {
      const { billingApi } = await import('@/store/api/billingApi');
      const { store } = await import('@/store');
      const result = await store.dispatch(
        billingApi.endpoints.getDetailedSessionBill.initiate({
          sessionId,
          includeUnpaid: true,
        })
      ).unwrap();

      if (result) {
        const unpaidOrders = result.orderBreakdown.filter(
          (o: { paymentStatus: string }) => o.paymentStatus !== 'paid'
        );
        for (const order of unpaidOrders) {
          await updateOrderPayment({
            restaurantId,
            orderId: order.orderId,
            paymentStatus: 'paid',
          }).unwrap();
        }
        toast({ title: `Marked ${unpaidOrders.length} orders as paid` });
        refetchSessions();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to mark orders as paid',
      });
    } finally {
      setIsActing(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    if (!restaurantId) return;
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm('Close this session? This action cannot be undone.');
    if (!confirmed) return;

    setIsActing(true);
    try {
      await closeSession({
        sessionId,
        reason: 'staff_closed',
        notes: 'Closed manually by staff',
      }).unwrap();
      toast({ title: 'Session closed successfully' });
      setSelectedSession(null);
      refetchSessions();
    } catch (error: any) {
      if (error?.status === 404 && error?.data?.message?.includes('deleted due to no active orders')) {
        toast({ title: 'Session deleted (no active orders)' });
        setSelectedSession(null);
        refetchSessions();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error?.data?.message || 'Failed to close session',
        });
      }
    } finally {
      setIsActing(false);
    }
  };

  const handleDownloadReceipt = async (session: CustomerSession) => {
    setPdfLoading(true);
    try {
      const { billingApi } = await import('@/store/api/billingApi');
      const { store } = await import('@/store');
      const billData = await store.dispatch(
        billingApi.endpoints.getDetailedSessionBill.initiate({
          sessionId: session.sessionId,
          includeUnpaid: true,
        })
      ).unwrap();

      if (!billData) {
        alert('Failed to fetch session data. Please try again.');
        return;
      }
      await downloadThermalReceipt(billData, 'Digital Payment');
    } catch (err) {
      alert('Failed to generate receipt. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCleanupGhosts = async () => {
    if (!restaurantId) return;
    const confirmed = window.confirm(
      `Delete ${ghostSessions.length} ghost session${ghostSessions.length !== 1 ? 's' : ''}? These are active sessions with no orders.`
    );
    if (!confirmed) return;
    try {
      const result = await cleanupGhostSessions({ restaurantId, branchId }).unwrap();
      toast({ title: `Deleted ${result.deletedCount} empty session${result.deletedCount !== 1 ? 's' : ''}` });
      refetchSessions();
      refetchGhost();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Cleanup failed',
        description: error?.data?.message || 'Failed to clean up ghost sessions',
      });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className=" mx-auto px-4 py-6 space-y-4">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Receipt className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">
                {currentBranch?.name ?? 'Branch'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sessions</h1>
          </div>

          <div className="flex items-center gap-3">
            {totalCollected > 0 && (
              <div className="hidden sm:block text-right">
                <p className="text-xs text-slate-400">Collected</p>
                <p className="text-sm font-bold text-slate-800">{formatCurrency(totalCollected)}</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSessions()}
              className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-100"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Ghost Sessions Banner */}
        {ghostSessions.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {ghostSessions.length} ghost session{ghostSessions.length !== 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Active sessions with no orders — likely created when a waiter navigated away before ordering.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0 ml-3"
              onClick={handleCleanupGhosts}
              disabled={isCleaningUp}
            >
              {isCleaningUp ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
              {isCleaningUp ? 'Cleaning…' : 'Clean Up'}
            </Button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {SESSION_STATUS_FILTERS.map((f) => (
            <FilterTab
              key={f.value}
              value={f.value}
              label={f.label}
              count={counts[f.value] ?? 0}
              isActive={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
            />
          ))}
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* List header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {statusFilter === 'all'
                  ? 'All Sessions'
                  : SESSION_META[statusFilter as CustomerSession['status']]?.label ?? 'Sessions'}
              </span>
              {!sessionsLoading && (
                <span className="text-xs text-slate-400">
                  {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                  {sessionsData?.total && sessionsData.total > sessions.length
                    ? ` of ${sessionsData.total}`
                    : ''}
                </span>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400 pr-8">
              <span>Amount</span>
              <span>Status</span>
            </div>
          </div>

          {/* Rows */}
          {sessionsLoading ? (
            <>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</>
          ) : sessions.length === 0 ? (
            <EmptyState filtered={statusFilter !== 'all'} />
          ) : (
            <>{sessions.map((session) => (
              <SessionRow
                key={session.sessionId}
                session={session}
                isSelected={selectedSession?.sessionId === session.sessionId}
                onClick={() =>
                  setSelectedSession((prev) =>
                    prev?.sessionId === session.sessionId ? null : session
                  )
                }
              />
            ))}</>
          )}

          {/* Pagination footer */}
          {!sessionsLoading && sessionsData && sessionsData.total > sessions.length && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Showing {sessions.length} of {sessionsData.total} sessions
              </span>
              <span className="text-xs text-slate-400">
                Page {sessionsData.page} · {sessionsData.limit} per page
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center">
          Click any session to view the full bill and take action
        </p>
      </div>

      {/* Side Panel */}
      <SessionSidePanel
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onMarkAllPaid={handleMarkAllPaid}
        onCloseSession={handleCloseSession}
        onDownloadReceipt={handleDownloadReceipt}
        isActing={isActing}
        pdfLoading={pdfLoading}
      />
    </div>
  );
}