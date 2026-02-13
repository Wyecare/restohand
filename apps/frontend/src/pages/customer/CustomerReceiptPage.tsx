import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertTriangle, Download, ShoppingCart, CheckCircle } from 'lucide-react';
import { useGetDetailedSessionBillQuery } from '@/store/api/billingApi';
import { downloadThermalReceipt } from '@/components/DetailedThermalReceiptPDF';
import { clearCustomerSessionData } from '@/utils/sessionCleanup';

/* ─── Clean Modern Styles ─────────────────────────────────────────── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .receipt-root {
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    color: #1e293b;
  }

  .receipt-container {
    max-width: 520px;
    margin: 0 auto;
    padding: 20px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .success-banner {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.3);
  }

  .success-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
  }

  .success-subtitle {
    font-size: 13px;
    margin: 2px 0 0 0;
    opacity: 0.9;
  }

  .receipt-card {
    background: white;
    border-radius: 20px;
    padding: 0;
    margin-bottom: 20px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.8);
    overflow: hidden;
    position: relative;
  }

  .floating-download-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    box-shadow: 0 4px 12px -2px rgba(59, 130, 246, 0.4);
    transition: all 0.2s;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .floating-download-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px -2px rgba(59, 130, 246, 0.5);
  }

  .restaurant-header {
    background: linear-gradient(135deg, #475569 0%, #334155 100%);
    color: white;
    padding: 24px;
    text-align: center;
  }

  .restaurant-name {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
  }

  .restaurant-address {
    font-size: 14px;
    opacity: 0.9;
    line-height: 1.5;
    margin: 0;
  }

  .restaurant-contact {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 12px;
    font-size: 12px;
    opacity: 0.8;
  }

  .session-info {
    background: #f1f5f9;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .session-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
  }

  .session-detail {
    text-align: center;
  }

  .session-label {
    font-size: 12px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 4px 0;
    font-weight: 500;
  }

  .session-value {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .items-section {
    padding: 24px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .item-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .item-name {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .item-total {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
    font-family: 'SF Mono', 'Monaco', monospace;
  }

  .item-details {
    font-size: 13px;
    color: #64748b;
    margin: 4px 0;
  }

  .item-tax {
    font-size: 12px;
    color: #059669;
    background: #ecfdf5;
    padding: 4px 8px;
    border-radius: 6px;
    display: inline-block;
    margin-top: 4px;
  }

  .bill-summary {
    padding: 24px;
    border-top: 1px solid #e2e8f0;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    font-size: 14px;
  }

  .summary-label {
    color: #64748b;
  }

  .summary-value {
    font-family: 'SF Mono', 'Monaco', monospace;
    font-weight: 500;
    color: #1e293b;
  }

  .total-row {
    border-top: 2px solid #1e293b;
    margin-top: 12px;
    padding-top: 16px;
    font-size: 18px;
    font-weight: 600;
  }

  .total-row .summary-value {
    font-weight: 700;
  }

  .action-buttons {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 20px;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    font-family: inherit;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.3);
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px 0 rgba(59, 130, 246, 0.4);
  }

  .btn-secondary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.3);
  }

  .btn-secondary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px 0 rgba(16, 185, 129, 0.4);
  }

  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  }

  .loading-text {
    font-size: 16px;
    color: #64748b;
    margin: 0;
  }

  .error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 32px;
    text-align: center;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  }

  .error-icon {
    color: #f59e0b;
    margin-bottom: 20px;
  }

  .error-title {
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 12px 0;
  }

  .error-message {
    font-size: 16px;
    color: #64748b;
    margin: 0;
    max-width: 400px;
    line-height: 1.6;
  }

  .footer {
    margin-top: auto;
    text-align: center;
    padding: 24px 0;
    color: #94a3b8;
    font-size: 14px;
  }
`;

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
    error
  } = useGetDetailedSessionBillQuery(
    sessionId ? { sessionId, includeUnpaid: true } : { sessionId: '', includeUnpaid: true },
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
    // Get tableId from URL params (since we're on /c/:slug/session/:sessionId/receipt, we need to extract from somewhere)
    // Or use the tableId from the session data
    if (slug && detailedBill?.session?.tableId) {
      navigate(`/c/${slug}/table/${detailedBill.session.tableId}`);
    } else if (slug) {
      // Fallback to just the restaurant menu if no tableId available
      navigate(`/c/${slug}`);
    }
  };

  // Clean up session data on mount
  React.useEffect(() => {
    if (sessionId) {
      // Clear session data immediately when receipt loads (payment is complete)
      clearCustomerSessionData({
        sessionId,
        clearAll: true // Clear all session-related data since payment is done
      });

      // Also clear any remaining payment session data
      try {
        localStorage.removeItem('lastPaymentSession');
        localStorage.removeItem('browserSessionId');

        // Clear any cart/session data that might be stored
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
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
      <div className="receipt-root">
        <style>{STYLE}</style>
        <div className="loading-screen">
          <LoadingSpinner size="lg" />
          <p className="loading-text">Loading your receipt...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !detailedBill) {
    return (
      <div className="receipt-root">
        <style>{STYLE}</style>
        <div className="error-screen">
          <AlertTriangle size={48} className="error-icon" />
          <h1 className="error-title">Receipt Not Found</h1>
          <p className="error-message">
            We couldn't find your receipt. The link may have expired or is invalid.
            Please ask your server for a new receipt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-root">
      <style>{STYLE}</style>
      <div className="receipt-container">
        {/* Success Banner */}
        <div className="success-banner">
          <CheckCircle size={20} />
          <div>
            <h2 className="success-title">Payment Successful!</h2>
            <p className="success-subtitle">Your order has been completed</p>
          </div>
        </div>

        {/* Receipt Card */}
        <div className="receipt-card">
          {/* Floating Download Button */}
          <button
            className="floating-download-btn"
            onClick={handleDownloadReceipt}
            title="Download Receipt"
          >
            <Download size={18} />
          </button>
          {/* Restaurant Header */}
          <div className="restaurant-header">
            <h1 className="restaurant-name">{detailedBill.restaurant.name}</h1>
            {detailedBill.restaurant.address && (
              <p className="restaurant-address">
                {detailedBill.restaurant.address.line1}, {detailedBill.restaurant.address.city}
                <br />
                {detailedBill.restaurant.address.state} {detailedBill.restaurant.address.postalCode}
              </p>
            )}
            <div className="restaurant-contact">
              {detailedBill.restaurant.phone && (
                <span>📞 {detailedBill.restaurant.phone}</span>
              )}
              {detailedBill.restaurant.gstin && (
                <span>GSTIN: {detailedBill.restaurant.gstin}</span>
              )}
            </div>
          </div>

          {/* Session Info */}
          <div className="session-info">
            <div className="session-details">
              <div className="session-detail">
                <p className="session-label">Table</p>
                <p className="session-value">{detailedBill.session.tableNumber}</p>
              </div>
              <div className="session-detail">
                <p className="session-label">Date</p>
                <p className="session-value">{formatDate(detailedBill.calculatedAt)}</p>
              </div>
              <div className="session-detail">
                <p className="session-label">Session</p>
                <p className="session-value">#{detailedBill.session.sessionId.slice(-6).toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="items-section">
            <h3 className="section-title">
              Items ({detailedBill.allItems.length})
            </h3>
            {detailedBill.allItems.map((item, index) => {
              const pricePerUnitWithTax = item.totalWithTax / item.quantity;

              return (
                <div key={index} className="item-card">
                  <div className="item-header">
                    <h4 className="item-name">{item.name}</h4>
                    <span className="item-total">{formatCurrency(item.totalWithTax)}</span>
                  </div>
                  <p className="item-details">
                    {item.quantity} × {formatCurrency(pricePerUnitWithTax)}
                  </p>
                  {item.totalTaxAmount > 0 && (
                    <span className="item-tax">
                      GST ({item.gstRate}%) included: {formatCurrency(item.totalTaxAmount)}
                    </span>
                  )}
                  {item.hsnCode && (
                    <p className="item-details">HSN: {item.hsnCode}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bill Summary */}
          <div className="bill-summary">
            <h3 className="section-title">Bill Summary</h3>

            <div className="summary-row">
              <span className="summary-label">Subtotal</span>
              <span className="summary-value">{formatCurrency(detailedBill.subTotalAmount)}</span>
            </div>

            {detailedBill.cgstAmount > 0 && (
              <div className="summary-row">
                <span className="summary-label">CGST</span>
                <span className="summary-value">{formatCurrency(detailedBill.cgstAmount)}</span>
              </div>
            )}

            {detailedBill.sgstAmount > 0 && (
              <div className="summary-row">
                <span className="summary-label">SGST</span>
                <span className="summary-value">{formatCurrency(detailedBill.sgstAmount)}</span>
              </div>
            )}

            {detailedBill.igstAmount > 0 && (
              <div className="summary-row">
                <span className="summary-label">IGST</span>
                <span className="summary-value">{formatCurrency(detailedBill.igstAmount)}</span>
              </div>
            )}

            {detailedBill.taxAmount > 0 && (
              <div className="summary-row">
                <span className="summary-label">Total Tax</span>
                <span className="summary-value">{formatCurrency(detailedBill.taxAmount)}</span>
              </div>
            )}

            {detailedBill.discountAmount > 0 && (
              <div className="summary-row">
                <span className="summary-label">Discount</span>
                <span className="summary-value">-{formatCurrency(detailedBill.discountAmount)}</span>
              </div>
            )}

            {detailedBill.roundOffAmount !== 0 && (
              <div className="summary-row">
                <span className="summary-label">Round Off</span>
                <span className="summary-value">
                  {detailedBill.roundOffAmount >= 0 ? '+' : ''}{formatCurrency(detailedBill.roundOffAmount)}
                </span>
              </div>
            )}

            <div className="summary-row total-row">
              <span className="summary-label">Total Amount</span>
              <span className="summary-value">{formatCurrency(detailedBill.totalAmount)}</span>
            </div>

            {detailedBill.taxType && (
              <div className="summary-row" style={{ marginTop: '12px', fontSize: '12px' }}>
                <span className="summary-label">
                  Tax Type: {detailedBill.taxType === 'intra-state' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleDownloadReceipt}
            >
              <Download size={16} />
              Download Receipt
            </button>

            {slug && detailedBill.session?.tableId && (
              <button
                className="btn btn-secondary"
                onClick={handleOrderAgain}
              >
                <ShoppingCart size={16} />
                Back to Menu
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <p>Thank you for dining with us!</p>
          <p>Powered by RestoHand</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerReceiptPage;
