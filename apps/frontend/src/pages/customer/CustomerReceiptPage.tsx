import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  AlertTriangle,
  Download,
  ShoppingCart,
  CheckCircle2,
  Receipt,
  MapPin,
  Phone,
  Building2,
} from 'lucide-react';
import { useGetDetailedSessionBillQuery } from '@/store/api/billingApi';
import { downloadThermalReceipt } from '@/components/DetailedThermalReceiptPDF';
import { clearCustomerSessionData } from '@/utils/sessionCleanup';

const CustomerReceiptPage = () => {
  const { sessionId, slug } = useParams<{
    sessionId?: string;
    slug?: string;
  }>();
  const navigate = useNavigate();

  // Get detailed bill for the session
  const {
    data: detailedBill,
    isLoading,
    error,
  } = useGetDetailedSessionBillQuery(
    sessionId
      ? { sessionId, includeUnpaid: true }
      : { sessionId: '', includeUnpaid: true },
    { skip: !sessionId }
  );

  // Helper functions
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
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadReceipt = async () => {
    if (!detailedBill) return;

    try {
      await downloadThermalReceipt(detailedBill, 'Digital Payment');
    } catch (err) {
      console.error('Error generating receipt:', err);
      alert('Failed to generate receipt. Please try again.');
    }
  };

  const handleOrderAgain = () => {
    if (slug && detailedBill?.session?.tableId) {
      navigate(`/c/${slug}/table/${detailedBill.session.tableId}`);
    } else if (slug) {
      navigate(`/c/${slug}`);
    }
  };

  // Clean up session data on mount
  React.useEffect(() => {
    if (sessionId) {
      clearCustomerSessionData({
        sessionId,
        clearAll: true,
      });

      try {
        localStorage.removeItem('lastPaymentSession');
        localStorage.removeItem('browserSessionId');

        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (
            key.includes(sessionId) ||
            key.startsWith('cart_') ||
            key.startsWith('session_') ||
            key.includes('customerSession') ||
            key.includes('tableSession')
          ) {
            localStorage.removeItem(key);
          }
        });

        console.log('🧹 Complete session cleanup completed for:', sessionId);
      } catch (error) {
        console.error('Error during session cleanup:', error);
      }
    }
  }, [sessionId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-600 font-medium">
            Loading your receipt...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !detailedBill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Receipt Not Found
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            We couldn't find your receipt. The link may have expired or is
            invalid. Please ask your server for a new receipt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto p-1 py-1">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-sm py-3 px-3 mb-1 shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3 text-white">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Payment Successful!</h2>
              <p className="text-sm text-emerald-50">
                Your order has been completed
              </p>
            </div>
          </div>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Restaurant Header */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {detailedBill.restaurant.name}
                  </h1>
                  {detailedBill.restaurant.address && (
                    <div className="flex items-start gap-2 text-slate-300 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {detailedBill.restaurant.address.line1},{' '}
                        {detailedBill.restaurant.address.city},{' '}
                        {detailedBill.restaurant.address.state}{' '}
                        {detailedBill.restaurant.address.postalCode}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleDownloadReceipt}
                  className="ml-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors backdrop-blur-sm"
                  title="Download Receipt"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-300">
                {detailedBill.restaurant.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{detailedBill.restaurant.phone}</span>
                  </div>
                )}
                {detailedBill.restaurant.gstin && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>GSTIN: {detailedBill.restaurant.gstin}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-slate-50 border-b border-slate-200">
            <div className="px-6 py-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Table
                </p>
                <p className="text-base font-semibold text-slate-900">
                  {detailedBill.session.tableNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Date & Time
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {formatDate(detailedBill.calculatedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Session ID
                </p>
                <p className="text-sm font-mono font-medium text-slate-900">
                  #{detailedBill.session.sessionId.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Order Items ({detailedBill.allItems.length})
              </h3>
            </div>

            <div className="space-y-3">
              {detailedBill.allItems.map((item, index) => {
                const pricePerUnitWithTax = item.totalWithTax / item.quantity;

                return (
                  <div
                    key={index}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                  >
                    <div className="flex justify-between items-start gap-4 mb-1">
                      <h4 className="font-medium text-slate-900 text-sm leading-tight flex-1">
                        {item.name}
                      </h4>
                      <span className="font-semibold text-slate-900 text-sm tabular-nums">
                        {formatCurrency(item.totalWithTax)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                      <span>
                        {item.quantity} × {formatCurrency(pricePerUnitWithTax)}
                      </span>
                      {item.totalTaxAmount > 0 && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                          GST ({item.gstRate}%):{' '}
                          {formatCurrency(item.totalTaxAmount)}
                        </span>
                      )}
                    </div>

                    {item.hsnCode && (
                      <p className="text-xs text-slate-500 mt-1">
                        HSN: {item.hsnCode}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="px-6 py-5 border-t border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Bill Summary
            </h3>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatCurrency(detailedBill.subTotalAmount)}
                </span>
              </div>

              {/* Branch Charges - Dynamic Display */}
              {detailedBill.branchCharges && detailedBill.branchCharges.length > 0 && (
                <>
                  {detailedBill.branchCharges.map((charge, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">
                        {charge.name}
                        {charge.type === 'percentage' && (
                          <span className="text-xs text-slate-500 ml-1">
                            ({charge.value}%)
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatCurrency(charge.amount)}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {/* Mixed Tax Breakdown - Show category-wise if available */}
              {detailedBill.categoryCalculations && detailedBill.categoryCalculations.length > 0 ? (
                <>
                  {/* Category-wise tax breakdown */}
                  {detailedBill.categoryCalculations.map((categoryCalc, index) => {
                    if (categoryCalc.totalTaxAmount === 0) return null;

                    const categoryName = categoryCalc.category
                      .replace('_', ' ')
                      .replace(/\b\w/g, l => l.toUpperCase());

                    return (
                      <div key={index} className="flex justify-between items-center text-sm border-l-2 border-emerald-200 pl-3 py-1">
                        <span className="text-slate-600">
                          {categoryName} {categoryCalc.taxType === 'vat' ? 'VAT' : 'GST'}
                          {categoryCalc.taxType === 'gst' && categoryCalc.gstRate && ` (${categoryCalc.gstRate}%)`}
                          {categoryCalc.taxType === 'vat' && categoryCalc.vatRate && ` (${categoryCalc.vatRate}%)`}
                        </span>
                        <span className="font-medium text-slate-900 tabular-nums">
                          {formatCurrency(categoryCalc.totalTaxAmount)}
                        </span>
                      </div>
                    );
                  })}

                  {/* GST breakdown if GST items exist */}
                  {(detailedBill.totalGstAmount || 0) > 0 && (
                    <>
                      <div className="border-t border-slate-200 mt-2 pt-2">
                        <div className="flex justify-between items-center text-sm font-medium text-emerald-700">
                          <span>GST Breakdown:</span>
                          <span>{formatCurrency(detailedBill.totalGstAmount || 0)}</span>
                        </div>
                      </div>

                      {detailedBill.cgstAmount > 0 && (
                        <div className="flex justify-between items-center text-xs text-slate-600 pl-4">
                          <span>CGST</span>
                          <span>{formatCurrency(detailedBill.cgstAmount)}</span>
                        </div>
                      )}

                      {detailedBill.sgstAmount > 0 && (
                        <div className="flex justify-between items-center text-xs text-slate-600 pl-4">
                          <span>SGST</span>
                          <span>{formatCurrency(detailedBill.sgstAmount)}</span>
                        </div>
                      )}

                      {detailedBill.igstAmount > 0 && (
                        <div className="flex justify-between items-center text-xs text-slate-600 pl-4">
                          <span>IGST</span>
                          <span>{formatCurrency(detailedBill.igstAmount)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* VAT breakdown if VAT items exist */}
                  {(detailedBill.totalVatAmount || 0) > 0 && (
                    <div className="border-t border-slate-200 mt-2 pt-2">
                      <div className="flex justify-between items-center text-sm font-medium text-amber-700">
                        <span>State VAT (Alcohol):</span>
                        <span>{formatCurrency(detailedBill.totalVatAmount || 0)}</span>
                      </div>
                    </div>
                  )}

                  {/* Total Tax */}
                  <div className="border-t border-slate-200 mt-2 pt-2">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-700">Total Tax</span>
                      <span className="text-slate-900 tabular-nums">
                        {formatCurrency((detailedBill.totalGstAmount || 0) + (detailedBill.totalVatAmount || 0))}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Original simple GST breakdown */}
                  {detailedBill.cgstAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">CGST</span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatCurrency(detailedBill.cgstAmount)}
                      </span>
                    </div>
                  )}

                  {detailedBill.sgstAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">SGST</span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatCurrency(detailedBill.sgstAmount)}
                      </span>
                    </div>
                  )}

                  {detailedBill.igstAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">IGST</span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatCurrency(detailedBill.igstAmount)}
                      </span>
                    </div>
                  )}

                  {detailedBill.taxAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Total Tax</span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatCurrency(detailedBill.taxAmount)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {detailedBill.discountAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Discount</span>
                  <span className="font-medium text-emerald-600 tabular-nums">
                    -{formatCurrency(detailedBill.discountAmount)}
                  </span>
                </div>
              )}

              {detailedBill.roundOffAmount !== 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Round Off</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {detailedBill.roundOffAmount >= 0 ? '+' : ''}
                    {formatCurrency(detailedBill.roundOffAmount)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-slate-900">
              <span className="font-bold text-slate-900 text-base">
                Total Amount
              </span>
              <span className="font-bold text-slate-900 text-lg tabular-nums">
                {formatCurrency(detailedBill.totalAmount)}
              </span>
            </div>

            {detailedBill.taxType && (
              <p className="text-xs text-slate-500 mt-3">
                Tax Type:{' '}
                {detailedBill.taxType === 'intra-state'
                  ? 'Intra-State (CGST+SGST)'
                  : 'Inter-State (IGST)'}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-5 bg-white space-y-3">
            <button
              onClick={handleDownloadReceipt}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30"
            >
              <Download className="w-4 h-4" />
              Download Receipt
            </button>

            {slug && detailedBill.session?.tableId && (
              <button
                onClick={handleOrderAgain}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30"
              >
                <ShoppingCart className="w-4 h-4" />
                Back to Menu
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-sm text-slate-600 font-medium">
            Thank you for dining with us!
          </p>
          <p className="text-xs text-slate-400">Powered by RestoHand</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerReceiptPage;
