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
  Sparkles,
} from 'lucide-react';
import { useGetDetailedSessionBillQuery } from '@/store/api/billingApi';
import { downloadThermalReceipt } from '@/components/DetailedThermalReceiptPDF';
import { clearCustomerSessionData } from '@/utils/sessionCleanup';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

  .receipt-elegant-root {
    --clr-bg: #fafafa;
    --clr-surface: #ffffff;
    --clr-border: #e5e7eb;
    --clr-text: #1a1a1a;
    --clr-text-muted: #6b7280;
    --clr-primary: #0f172a;
    
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    min-height: 100vh;
    padding: 24px 16px 40px;
  }

  .receipt-container {
    max-width: 640px;
    margin: 0 auto;
  }

  /* Success Banner */
  .receipt-success-banner {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 8px 24px rgba(5, 150, 105, 0.2);
  }

  .receipt-success-content {
    display: flex;
    align-items: center;
    gap: 14px;
    color: white;
  }

  .receipt-success-icon {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .receipt-success-text h2 {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 4px 0;
  }

  .receipt-success-text p {
    font-size: 14px;
    margin: 0;
    opacity: 0.9;
  }

  /* Main Receipt Card */
  .receipt-card {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  /* Restaurant Header */
  .receipt-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  .receipt-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=');
    opacity: 0.3;
    pointer-events: none;
  }

  .receipt-header-content {
    position: relative;
    z-index: 1;
  }

  .receipt-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }

  .receipt-restaurant-info {
    flex: 1;
    min-width: 0;
  }

  .receipt-restaurant-name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    color: white;
    margin: 0 0 8px 0;
    line-height: 1.2;
  }

  .receipt-restaurant-address {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    line-height: 1.5;
  }

  .receipt-download-btn {
    width: 44px;
    height: 44px;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .receipt-download-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.05);
  }

  .receipt-restaurant-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }

  .receipt-meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Session Info Bar */
  .receipt-session-info {
    background: #f9fafb;
    border-bottom: 1px solid var(--clr-border);
    padding: 16px 24px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .receipt-info-item {
    text-align: center;
  }

  .receipt-info-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--clr-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .receipt-info-value {
    font-size: 15px;
    font-weight: 600;
    color: var(--clr-primary);
  }

  .receipt-info-value.mono {
    font-family: 'Inter', monospace;
    font-size: 13px;
  }

  /* Items Section */
  .receipt-items-section {
    padding: 24px;
  }

  .receipt-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: var(--clr-text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 16px;
  }

  .receipt-items-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .receipt-item-card {
    background: #f9fafb;
    border: 1px solid var(--clr-border);
    border-radius: 12px;
    padding: 14px;
  }

  .receipt-item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
  }

  .receipt-item-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--clr-text);
    line-height: 1.3;
    flex: 1;
    min-width: 0;
  }

  .receipt-item-total {
    font-size: 15px;
    font-weight: 700;
    color: var(--clr-text);
    font-family: 'Inter', monospace;
    flex-shrink: 0;
  }

  .receipt-item-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: var(--clr-text-muted);
  }

  .receipt-item-gst {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    color: #047857;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
  }

  .receipt-item-hsn {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 6px;
  }

  /* Bill Summary */
  .receipt-summary-section {
    padding: 24px;
    background: #f9fafb;
    border-top: 1px solid var(--clr-border);
  }

  .receipt-summary-rows {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }

  .receipt-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }

  .receipt-summary-label {
    color: var(--clr-text-muted);
    font-weight: 500;
  }

  .receipt-summary-value {
    font-weight: 600;
    color: var(--clr-text);
    font-family: 'Inter', monospace;
  }

  .receipt-summary-row.highlight {
    padding-left: 12px;
    border-left: 3px solid #86efac;
  }

  .receipt-summary-row.tax-breakdown {
    font-size: 13px;
    padding-left: 16px;
    color: var(--clr-text-muted);
  }

  .receipt-summary-divider {
    height: 1px;
    background: var(--clr-border);
    margin: 12px 0;
  }

  .receipt-summary-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 2px solid var(--clr-primary);
  }

  .receipt-total-label {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--clr-primary);
  }

  .receipt-total-amount {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--clr-primary);
  }

  .receipt-tax-note {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 12px;
  }

  /* Action Buttons */
  .receipt-actions {
    padding: 24px;
    background: white;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .receipt-btn {
    width: 100%;
    padding: 16px 24px;
    border-radius: 14px;
    border: none;
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .receipt-btn.primary {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.2);
  }

  .receipt-btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.3);
  }

  .receipt-btn.secondary {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    color: white;
    box-shadow: 0 4px 16px rgba(5, 150, 105, 0.2);
  }

  .receipt-btn.secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(5, 150, 105, 0.3);
  }

  .receipt-btn:active {
    transform: translateY(0);
  }

  /* Footer */
  .receipt-footer {
    text-align: center;
    margin-top: 24px;
  }

  .receipt-footer-thank {
    font-size: 15px;
    font-weight: 600;
    color: var(--clr-text);
    margin-bottom: 6px;
  }

  .receipt-footer-powered {
    font-size: 12px;
    color: #9ca3af;
  }

  /* Loading State */
  .receipt-loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  }

  .receipt-loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .receipt-loading-text {
    font-size: 15px;
    color: var(--clr-text-muted);
    font-weight: 600;
  }

  /* Error State */
  .receipt-error {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    padding: 32px;
  }

  .receipt-error-content {
    text-align: center;
    max-width: 400px;
  }

  .receipt-error-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }

  .receipt-error-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 24px;
    font-weight: 700;
    color: var(--clr-primary);
    margin: 0 0 12px 0;
  }

  .receipt-error-desc {
    font-size: 15px;
    color: var(--clr-text-muted);
    line-height: 1.6;
    margin: 0;
  }
`;

const CustomerReceiptPage = () => {
  const { sessionId, slug } = useParams<{
    sessionId?: string;
    slug?: string;
  }>();
  const navigate = useNavigate();

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

  if (isLoading) {
    return (
      <div className="receipt-elegant-root">
        <style>{STYLES}</style>
        <div className="receipt-loading">
          <div className="receipt-loading-content">
            <LoadingSpinner size="lg" />
            <p className="receipt-loading-text">Loading your receipt...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !detailedBill) {
    return (
      <div className="receipt-elegant-root">
        <style>{STYLES}</style>
        <div className="receipt-error">
          <div className="receipt-error-content">
            <div className="receipt-error-icon">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="receipt-error-title">Receipt Not Found</h1>
            <p className="receipt-error-desc">
              We couldn't find your receipt. The link may have expired or is
              invalid. Please ask your server for a new receipt.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-elegant-root">
      <style>{STYLES}</style>
      <div className="receipt-container">
        {/* Success Banner */}
        <div className="receipt-success-banner">
          <div className="receipt-success-content">
            <div className="receipt-success-icon">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="receipt-success-text">
              <h2>Payment Successful!</h2>
              <p>Your order has been completed</p>
            </div>
          </div>
        </div>

        {/* Main Receipt Card */}
        <div className="receipt-card">
          {/* Restaurant Header */}
          <div className="receipt-header">
            <div className="receipt-header-content">
              <div className="receipt-header-top">
                <div className="receipt-restaurant-info">
                  <h1 className="receipt-restaurant-name">
                    {detailedBill.restaurant.name}
                  </h1>
                  {detailedBill.restaurant.address && (
                    <div className="receipt-restaurant-address">
                      <MapPin
                        className="w-4 h-4 flex-shrink-0"
                        style={{ marginTop: '2px' }}
                      />
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
                  className="receipt-download-btn"
                  title="Download Receipt"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="receipt-restaurant-meta">
                {detailedBill.restaurant.phone && (
                  <div className="receipt-meta-item">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{detailedBill.restaurant.phone}</span>
                  </div>
                )}
                {detailedBill.restaurant.gstin && (
                  <div className="receipt-meta-item">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>GSTIN: {detailedBill.restaurant.gstin}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="receipt-session-info">
            <div className="receipt-info-item">
              <div className="receipt-info-label">Table</div>
              <div className="receipt-info-value">
                {detailedBill.session.tableNumber}
              </div>
            </div>
            <div className="receipt-info-item">
              <div className="receipt-info-label">Date & Time</div>
              <div className="receipt-info-value" style={{ fontSize: '13px' }}>
                {formatDate(detailedBill.calculatedAt)}
              </div>
            </div>
            <div className="receipt-info-item">
              <div className="receipt-info-label">Session</div>
              <div className="receipt-info-value mono">
                #{detailedBill.session.sessionId.slice(-6).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="receipt-items-section">
            <div className="receipt-section-title">
              <Receipt className="w-4 h-4" />
              Order Items ({detailedBill.allItems.length})
            </div>

            <div className="receipt-items-list">
              {detailedBill.allItems.map((item, index) => {
                const pricePerUnitWithTax = item.totalWithTax / item.quantity;

                return (
                  <div key={index} className="receipt-item-card">
                    <div className="receipt-item-header">
                      <h4 className="receipt-item-name">{item.name}</h4>
                      <span className="receipt-item-total">
                        {formatCurrency(item.totalWithTax)}
                      </span>
                    </div>

                    <div className="receipt-item-details">
                      <span>
                        {item.quantity} × {formatCurrency(pricePerUnitWithTax)}
                      </span>
                      {item.totalTaxAmount > 0 && (
                        <span className="receipt-item-gst">
                          GST ({item.gstRate}%):{' '}
                          {formatCurrency(item.totalTaxAmount)}
                        </span>
                      )}
                    </div>

                    {item.hsnCode && (
                      <p className="receipt-item-hsn">HSN: {item.hsnCode}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="receipt-summary-section">
            <div className="receipt-section-title">Bill Summary</div>

            <div className="receipt-summary-rows">
              <div className="receipt-summary-row">
                <span className="receipt-summary-label">Subtotal</span>
                <span className="receipt-summary-value">
                  {formatCurrency(detailedBill.subTotalAmount)}
                </span>
              </div>

              {detailedBill.branchCharges &&
                detailedBill.branchCharges.length > 0 && (
                  <>
                    {detailedBill.branchCharges.map((charge, index) => (
                      <div key={index} className="receipt-summary-row">
                        <span className="receipt-summary-label">
                          {charge.name}
                          {charge.type === 'percentage' && (
                            <span
                              style={{
                                fontSize: '12px',
                                opacity: 0.7,
                                marginLeft: '4px',
                              }}
                            >
                              ({charge.value}%)
                            </span>
                          )}
                        </span>
                        <span className="receipt-summary-value">
                          {formatCurrency(charge.amount)}
                        </span>
                      </div>
                    ))}
                  </>
                )}

              {detailedBill.categoryCalculations &&
              detailedBill.categoryCalculations.length > 0 ? (
                <>
                  {detailedBill.categoryCalculations.map(
                    (categoryCalc, index) => {
                      if (categoryCalc.totalTaxAmount === 0) return null;

                      const categoryName = categoryCalc.category
                        .replace('_', ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase());

                      return (
                        <div
                          key={index}
                          className="receipt-summary-row highlight"
                        >
                          <span className="receipt-summary-label">
                            {categoryName}{' '}
                            {categoryCalc.taxType === 'vat' ? 'VAT' : 'GST'}
                            {categoryCalc.taxType === 'gst' &&
                              categoryCalc.gstRate &&
                              ` (${categoryCalc.gstRate}%)`}
                            {categoryCalc.taxType === 'vat' &&
                              categoryCalc.vatRate &&
                              ` (${categoryCalc.vatRate}%)`}
                          </span>
                          <span className="receipt-summary-value">
                            {formatCurrency(categoryCalc.totalTaxAmount)}
                          </span>
                        </div>
                      );
                    }
                  )}

                  {(detailedBill.totalGstAmount || 0) > 0 && (
                    <>
                      <div className="receipt-summary-divider" />
                      {detailedBill.cgstAmount > 0 && (
                        <div className="receipt-summary-row tax-breakdown">
                          <span className="receipt-summary-label">CGST</span>
                          <span className="receipt-summary-value">
                            {formatCurrency(detailedBill.cgstAmount)}
                          </span>
                        </div>
                      )}
                      {detailedBill.sgstAmount > 0 && (
                        <div className="receipt-summary-row tax-breakdown">
                          <span className="receipt-summary-label">SGST</span>
                          <span className="receipt-summary-value">
                            {formatCurrency(detailedBill.sgstAmount)}
                          </span>
                        </div>
                      )}
                      {detailedBill.igstAmount > 0 && (
                        <div className="receipt-summary-row tax-breakdown">
                          <span className="receipt-summary-label">IGST</span>
                          <span className="receipt-summary-value">
                            {formatCurrency(detailedBill.igstAmount)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  {detailedBill.cgstAmount > 0 && (
                    <div className="receipt-summary-row">
                      <span className="receipt-summary-label">CGST</span>
                      <span className="receipt-summary-value">
                        {formatCurrency(detailedBill.cgstAmount)}
                      </span>
                    </div>
                  )}
                  {detailedBill.sgstAmount > 0 && (
                    <div className="receipt-summary-row">
                      <span className="receipt-summary-label">SGST</span>
                      <span className="receipt-summary-value">
                        {formatCurrency(detailedBill.sgstAmount)}
                      </span>
                    </div>
                  )}
                  {detailedBill.igstAmount > 0 && (
                    <div className="receipt-summary-row">
                      <span className="receipt-summary-label">IGST</span>
                      <span className="receipt-summary-value">
                        {formatCurrency(detailedBill.igstAmount)}
                      </span>
                    </div>
                  )}
                  {detailedBill.taxAmount > 0 && (
                    <div className="receipt-summary-row">
                      <span className="receipt-summary-label">Total Tax</span>
                      <span className="receipt-summary-value">
                        {formatCurrency(detailedBill.taxAmount)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {detailedBill.discountAmount > 0 && (
                <div className="receipt-summary-row">
                  <span className="receipt-summary-label">Discount</span>
                  <span
                    className="receipt-summary-value"
                    style={{ color: '#059669' }}
                  >
                    -{formatCurrency(detailedBill.discountAmount)}
                  </span>
                </div>
              )}

              {detailedBill.roundOffAmount !== 0 && (
                <div className="receipt-summary-row">
                  <span className="receipt-summary-label">Round Off</span>
                  <span className="receipt-summary-value">
                    {detailedBill.roundOffAmount >= 0 ? '+' : ''}
                    {formatCurrency(detailedBill.roundOffAmount)}
                  </span>
                </div>
              )}
            </div>

            <div className="receipt-summary-total">
              <span className="receipt-total-label">Total</span>
              <span className="receipt-total-amount">
                {formatCurrency(detailedBill.totalAmount)}
              </span>
            </div>

            {detailedBill.taxType && (
              <p className="receipt-tax-note">
                Tax Type:{' '}
                {detailedBill.taxType === 'intra-state'
                  ? 'Intra-State (CGST+SGST)'
                  : 'Inter-State (IGST)'}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="receipt-actions">
            <button
              onClick={handleDownloadReceipt}
              className="receipt-btn primary"
            >
              <Download className="w-5 h-5" />
              Download Receipt
            </button>

            {slug && detailedBill.session?.tableId && (
              <button
                onClick={handleOrderAgain}
                className="receipt-btn secondary"
              >
                <ShoppingCart className="w-5 h-5" />
                Back to Menu
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="receipt-footer">
          <p className="receipt-footer-thank">Thank you for dining with us!</p>
          <p className="receipt-footer-powered">Powered by RestoHand</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerReceiptPage;
