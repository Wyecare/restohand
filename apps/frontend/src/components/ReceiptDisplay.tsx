import { useState } from 'react';
import { Download, Star, CheckCircle2, ShoppingCart } from 'lucide-react';
import { generateProfessionalInvoicePDF } from '@/components/ProfessionalInvoicePDF';

/* ─── Styles injected once ─────────────────────────────────────────── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  .rh-receipt-root {
    --clr-text:      #1a1a1a;
    --clr-muted:     #7a756e;
    --clr-accent:    #1a1a1a;
    --clr-success:   #16a34a;
    --clr-error:     #dc2626;
    --clr-star:      #e8a838;
    --clr-btn-bg:    #1a1a1a;
    --clr-btn-text:  #fff;
    --clr-btn-hover: #333;
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 100vh;
  }

  /* ── layout ── */
  .rh-wrap          { max-width: 480px; margin: 0 auto; padding: 24px 16px 48px; }

  /* ── header strip ── */
  .rh-header        { text-align: center; padding: 28px 0 20px; }
  .rh-header h1     { font-size: 22px; font-weight: 600; color: var(--clr-text); letter-spacing: -0.3px; margin: 0; }
  .rh-header .rh-addr { font-size: 13px; color: var(--clr-muted); margin-top: 6px; line-height: 1.5; }
  .rh-header .rh-meta-row { display: flex; justify-content: center; gap: 18px; margin-top: 10px; }
  .rh-header .rh-meta-row span { font-size: 12px; color: var(--clr-muted); }
  .rh-header .rh-meta-row strong { color: var(--clr-text); font-weight: 500; }

  /* ── card ── */
  .rh-card          { border-radius: 10px; padding: 18px; margin-bottom: 12px; }
  .rh-card-title    { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: var(--clr-muted); margin: 0 0 14px; }

  /* ── dividers ── */
  .rh-divider       { border: none; border-top: 1px dashed var(--clr-border); margin: 14px 0; }
  .rh-divider-solid { border: none; border-top: 1px solid var(--clr-border); margin: 10px 0; }

  /* ── order number badge ── */
  .rh-order-badge   { display: inline-block; background: #f0ede8; border: 1px solid var(--clr-border); border-radius: 5px; padding: 3px 9px; font-size: 12px; font-weight: 500; color: var(--clr-muted); font-family: 'DM Mono', monospace; margin-bottom: 10px; }

  /* ── item row ── */
  .rh-item-row      { display: flex; align-items: baseline; justify-content: space-between; padding: 5px 0; }
  .rh-item-row      + .rh-item-row { border-top: 1px solid #f0ede8; }
  .rh-item-left     { display: flex; align-items: baseline; gap: 8px; }
  .rh-item-name     { font-size: 14px; color: var(--clr-text); font-weight: 400; }
  .rh-item-qty      { font-size: 12px; color: var(--clr-muted); font-family: 'DM Mono', monospace; }
  .rh-item-price    { font-size: 14px; color: var(--clr-text); font-weight: 500; font-family: 'DM Mono', monospace; }

  /* ── summary rows ── */
  .rh-sum-row       { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: var(--clr-muted); }
  .rh-sum-row span:last-child { font-family: 'DM Mono', monospace; }
  .rh-sum-row.rh-total { padding-top: 8px; margin-top: 4px; border-top: 2px solid var(--clr-text); font-size: 16px; font-weight: 600; color: var(--clr-text); }
  .rh-sum-row.rh-total span:last-child { font-family: 'DM Mono', monospace; font-weight: 600; }

  /* ── order sub-total ── */
  .rh-order-subtotal { text-align: right; font-size: 12px; color: var(--clr-muted); margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--clr-border); }
  .rh-order-subtotal strong { color: var(--clr-text); font-weight: 500; }

  /* ── success banner ── */
  .rh-success-banner { display: flex; align-items: center; gap: 10px; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
  .rh-success-banner svg { flex-shrink: 0; color: var(--clr-success); }
  .rh-success-banner .rh-sb-title { font-size: 14px; font-weight: 600; color: var(--clr-success); }
  .rh-success-banner .rh-sb-sub   { font-size: 12px; color: #15803d; margin-top: 1px; }

  /* ── download btn ── */
  .rh-dl-btn        { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: var(--clr-btn-bg); color: var(--clr-btn-text); border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; transition: background 0.15s; margin-bottom: 12px; }
  .rh-dl-btn:hover  { background: var(--clr-btn-hover); }

  /* ── feedback ── */
  .rh-stars         { display: flex; gap: 4px; margin-top: 8px; }
  .rh-star-btn      { background: none; border: none; cursor: pointer; padding: 2px; color: #d1ccc5; transition: color 0.15s; }
  .rh-star-btn.active { color: var(--clr-star); }
  .rh-star-btn:hover  { color: var(--clr-star); }
  .rh-feedback-label { font-size: 13px; color: var(--clr-muted); margin: 14px 0 6px; display: block; }
  .rh-feedback-ta   { width: 100%; border-radius: 6px; padding: 10px 12px; font-size: 13px; color: var(--clr-text); font-family: inherit; resize: vertical; min-height: 72px; outline: none; box-sizing: border-box; }
  .rh-feedback-ta:focus { border-color: #a89f95; }
  .rh-feedback-ta::placeholder { color: #b5b0a8; }
  .rh-submit-btn    { display: flex; align-items: center; justify-content: center; width: 100%; padding: 11px; background: var(--clr-btn-bg); color: var(--clr-btn-text); border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; margin-top: 12px; transition: background 0.15s, opacity 0.15s; }
  .rh-submit-btn:hover:not(:disabled)  { background: var(--clr-btn-hover); }
  .rh-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── footer ── */
  .rh-footer        { text-align: center; padding-top: 20px; }
  .rh-footer p     { font-size: 12px; color: #b5b0a8; margin: 2px 0; }
`;

interface RestaurantInfo {
  name: string;
  address?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  gstin?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderData {
  orderNumber: string;
  items: OrderItem[];
  orderTotal: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface BillData {
  subtotal?: number;
  subTotalAmount?: number;
  taxAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  discountAmount?: number;
  roundOffAmount?: number;
  totalAmount?: number;
  billGeneratedAt?: string;
  calculatedAt?: string;
  tableNumber?: string;
}

interface SessionData {
  sessionId: string;
  tableNumber: string;
  tableId: string;
  customerNumber?: number;
  startedAt: string;
}

export interface ReceiptDisplayProps {
  type: 'session' | 'table' | 'order';
  restaurantInfo: RestaurantInfo;
  orders: OrderData[];
  bill: BillData;
  session?: SessionData;
  showPaymentSuccess?: boolean;
  onOrderAgain?: () => void;
  onDownloadPdf?: () => void;
  slug?: string;
  showFeedback?: boolean;
  onSubmitFeedback?: (feedback: { rating?: number; comment?: string }) => void;
}

export const ReceiptDisplay = ({
  type,
  restaurantInfo,
  orders,
  bill,
  session,
  showPaymentSuccess = false,
  onOrderAgain,
  onDownloadPdf,
  slug,
  showFeedback = false,
  onSubmitFeedback,
}: ReceiptDisplayProps) => {
  const [feedback, setFeedback] = useState<{
    rating?: number;
    comment?: string;
  }>({});

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleDownloadPdf = async () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }

    try {
      // Default PDF generation for table bills
      const invoiceData = {
        restaurant: {
          name: restaurantInfo.name,
          legalEntity: restaurantInfo.name?.toUpperCase(),
          address: restaurantInfo.address,
          phone: restaurantInfo.phone,
          email: restaurantInfo.email,
          gstin: restaurantInfo.gstin || 'UNREGISTERED',
          fssai: 'Not Available',
          pan: 'Not Available',
          cin: 'Not Available',
        },
        customer: {
          name: 'Guest Customer',
          address: `Table ${bill.tableNumber || session?.tableNumber}`,
          gstin: 'UNREGISTERED',
        },
        invoice: {
          number: `INV-${Date.now().toString().slice(-8)}`,
          date: new Date().toISOString(),
          orderId: orders[0]?.orderNumber || '',
          orderNumber: orders[0]?.orderNumber || '',
          tableNumber: bill.tableNumber || session?.tableNumber,
          paymentMethod: 'Digital payment',
        },
        bill: {
          ...bill,
          orders: orders.map(order => ({
            ...order,
            items: order.items.map(item => {
              const totalItems = orders.reduce((sum, o) => sum + o.items.length, 0) || 1;
              const itemCgst = (bill.cgstAmount || 0) / totalItems;
              const itemSgst = (bill.sgstAmount || 0) / totalItems;
              const itemIgst = (bill.igstAmount || 0) / totalItems;
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
          amountInWords: `${bill.totalAmount?.toFixed(2)} Only`,
        },
      };

      const pdfBlob = await generateProfessionalInvoicePDF(invoiceData);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-${bill.tableNumber || session?.tableNumber}-bill.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading bill:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleSubmitFeedback = () => {
    if (onSubmitFeedback) {
      onSubmitFeedback(feedback);
    } else {
      console.log('Submitting feedback:', feedback);
    }
  };

  const subtotal = bill.subtotal || bill.subTotalAmount || 0;
  const formattedDate = formatDate(bill.billGeneratedAt || bill.calculatedAt);

  return (
    <div className="rh-receipt-root">
      <style>{STYLE}</style>
      <div className="rh-wrap">
        {/* Success banner */}
        {showPaymentSuccess && (
          <div className="rh-success-banner">
            <CheckCircle2 size={20} />
            <div>
              <div className="rh-sb-title">Payment Successful</div>
              <div className="rh-sb-sub">
                Your payment has been processed.
              </div>
            </div>
          </div>
        )}

        {/* Restaurant header */}
        <div className="rh-header">
          <h1>{restaurantInfo.name}</h1>
          <div className="rh-addr">
            {restaurantInfo.address && (
              <>
                {restaurantInfo.address.line1}
                <br />
                {restaurantInfo.address.city},{' '}
                {restaurantInfo.address.state}{' '}
                {restaurantInfo.address.postalCode}
              </>
            )}
          </div>
          <div className="rh-meta-row">
            {restaurantInfo.phone && (
              <span>
                📞 <strong>{restaurantInfo.phone}</strong>
              </span>
            )}
            {restaurantInfo.gstin && (
              <span>
                GSTIN <strong>{restaurantInfo.gstin}</strong>
              </span>
            )}
          </div>
          {type === 'session' && session && (
            <div className="rh-meta-row">
              <span>Session: <strong>#{session.sessionId.slice(-6).toUpperCase()}</strong></span>
              <span>Table: <strong>{session.tableNumber}</strong></span>
            </div>
          )}
        </div>

        {/* Table + date info for table bills */}
        {type === 'table' && (
          <div
            className="rh-card"
            style={{
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--clr-text)',
              }}
            >
              Table {bill.tableNumber}
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--clr-muted)',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {formattedDate}
            </span>
          </div>
        )}

        {/* Date info for session bills */}
        {type === 'session' && (
          <div className="rh-meta-row">
            <span>Date: <strong>{formattedDate}</strong></span>
          </div>
        )}

        {/* Orders */}
        {orders.map((orderItem, index) => (
          <div className="rh-card" key={index}>
            <div className="rh-order-badge">#{orderItem.orderNumber || `Order ${index + 1}`}</div>

            {/* For session view, show simplified order info */}
            {type === 'session' ? (
              <>
                <div className="rh-item-row">
                  <span className="rh-item-name">{orderItem.orderNumber}</span>
                  <span className="rh-item-price">₹{orderItem.orderTotal.toFixed(2)}</span>
                </div>
                <div className="rh-item-row">
                  <span>Status: {orderItem.status}</span>
                  <span>Payment: {orderItem.paymentStatus}</span>
                </div>
              </>
            ) : (
              /* For table view, show detailed items */
              <>
                {orderItem.items.map((item, itemIndex) => (
                  <div className="rh-item-row" key={itemIndex}>
                    <div className="rh-item-left">
                      <span className="rh-item-name">{item.name}</span>
                      <span className="rh-item-qty">×{item.quantity}</span>
                    </div>
                    <span className="rh-item-price">
                      ₹{item.lineTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="rh-order-subtotal">
                  Order total <strong>₹{orderItem.orderTotal.toFixed(2)}</strong>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Bill Summary */}
        <div className="rh-card">
          <div className="rh-card-title">Bill Summary</div>
          <div className="rh-sum-row">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {(bill.cgstAmount || 0) > 0 && (
            <div className="rh-sum-row">
              <span>CGST</span>
              <span>₹{bill.cgstAmount!.toFixed(2)}</span>
            </div>
          )}
          {(bill.sgstAmount || 0) > 0 && (
            <div className="rh-sum-row">
              <span>SGST</span>
              <span>₹{bill.sgstAmount!.toFixed(2)}</span>
            </div>
          )}
          {(bill.igstAmount || 0) > 0 && (
            <div className="rh-sum-row">
              <span>IGST</span>
              <span>₹{bill.igstAmount!.toFixed(2)}</span>
            </div>
          )}
          {(bill.discountAmount || 0) > 0 && (
            <div className="rh-sum-row">
              <span>Discount</span>
              <span>-₹{bill.discountAmount!.toFixed(2)}</span>
            </div>
          )}
          {(bill.roundOffAmount || 0) !== 0 && (
            <div className="rh-sum-row">
              <span>Round Off</span>
              <span>{bill.roundOffAmount! >= 0 ? '+' : ''}₹{bill.roundOffAmount!.toFixed(2)}</span>
            </div>
          )}
          {(bill.taxAmount || 0) > 0 && (
            <div className="rh-sum-row">
              <span>Total Tax</span>
              <span>₹{bill.taxAmount!.toFixed(2)}</span>
            </div>
          )}
          <div className="rh-sum-row rh-total">
            <span>Grand Total</span>
            <span>₹{(bill.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <button className="rh-dl-btn" onClick={handleDownloadPdf}>
          <Download size={16} /> Download PDF
        </button>

        {onOrderAgain && (
          <button
            className="rh-dl-btn"
            onClick={onOrderAgain}
            style={{ marginBottom: '16px', backgroundColor: '#16a34a' }}
          >
            <ShoppingCart size={16} /> Order Again
          </button>
        )}

        {/* Feedback */}
        {showFeedback && (
          <div className="rh-card">
            <div
              className="rh-card-title"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Star size={14} fill="var(--clr-star)" color="var(--clr-star)" />{' '}
              Rate Your Experience
            </div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--clr-muted)',
                margin: '0 0 0',
              }}
            >
              How was your dining experience?
            </p>
            <div className="rh-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`rh-star-btn ${
                    (feedback.rating || 0) >= star ? 'active' : ''
                  }`}
                  onClick={() =>
                    setFeedback((prev) => ({ ...prev, rating: star }))
                  }
                >
                  <Star
                    size={22}
                    fill={
                      (feedback.rating || 0) >= star
                        ? 'var(--clr-star)'
                        : 'none'
                    }
                  />
                </button>
              ))}
            </div>
            <label className="rh-feedback-label">
              Anything else?{' '}
              <span style={{ color: '#b5b0a8' }}>(optional)</span>
            </label>
            <textarea
              className="rh-feedback-ta"
              value={feedback.comment || ''}
              onChange={(e) =>
                setFeedback((prev) => ({ ...prev, comment: e.target.value }))
              }
              placeholder="Tell us about your experience…"
            />
            <button
              className="rh-submit-btn"
              disabled={!feedback.rating}
              onClick={handleSubmitFeedback}
            >
              Submit Feedback
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="rh-footer">
          <p>Thank you for dining with us!</p>
          <p>Powered by RestoHand</p>
        </div>
      </div>
    </div>
  );
};