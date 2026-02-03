import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Receipt } from '@/components/customer/Receipt';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Download, Star, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  useGetOrderPublicQuery,
  useGetCombinedReceiptPublicQuery,
  useGetReceiptByNumberPublicQuery,
} from '@/store/api/ordersApi';
import {
  useGetTableSessionPublicQuery,
  useGetConsolidatedBillQuery,
} from '@/store/api/restaurantsApi';
import { generateReceiptPDF } from '@/components/customer/ReceiptPDF';
import { generateThermalReceiptPDF } from '@/components/ThermalReceiptPDF';
import type { PublicRestaurant } from '@/store/api/types';

/* ─── Styles injected once ─────────────────────────────────────────── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  .rh-receipt-root {
    --clr-bg:        #f0ede8;
    --clr-paper:     #faf9f7;
    --clr-border:    #e2ddd6;
    --clr-text:      #1a1a1a;
    --clr-muted:     #7a756e;
    --clr-accent:    #1a1a1a;
    --clr-success:   #16a34a;
    --clr-success-bg:#f0fdf4;
    --clr-success-bd:#bbf7d0;
    --clr-error:     #dc2626;
    --clr-error-bg:  #fef2f2;
    --clr-error-bd:  #fecaca;
    --clr-star:      #e8a838;
    --clr-btn-bg:    #1a1a1a;
    --clr-btn-text:  #fff;
    --clr-btn-hover: #333;
    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--clr-bg);
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
  .rh-card          { background: var(--clr-paper); border: 1px solid var(--clr-border); border-radius: 10px; padding: 18px; margin-bottom: 12px; }
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
  .rh-success-banner { display: flex; align-items: center; gap: 10px; background: var(--clr-success-bg); border: 1px solid var(--clr-success-bd); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
  .rh-success-banner svg { flex-shrink: 0; color: var(--clr-success); }
  .rh-success-banner .rh-sb-title { font-size: 14px; font-weight: 600; color: var(--clr-success); }
  .rh-success-banner .rh-sb-sub   { font-size: 12px; color: #15803d; margin-top: 1px; }

  /* ── error screen ── */
  .rh-error-screen  { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 32px; text-align: center; font-family: 'DM Sans', system-ui, sans-serif; background: var(--clr-bg); }
  .rh-error-screen svg { color: #ca8a04; margin-bottom: 16px; }
  .rh-error-screen h1  { font-size: 20px; font-weight: 600; color: var(--clr-text); margin: 0 0 8px; }
  .rh-error-screen p   { font-size: 14px; color: var(--clr-muted); margin: 0; max-width: 300px; line-height: 1.5; }
  .rh-error-screen p+p { margin-top: 6px; font-size: 13px; }

  /* ── loading screen ── */
  .rh-loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 12px; font-family: 'DM Sans', system-ui, sans-serif; background: var(--clr-bg); }
  .rh-loading-screen p { font-size: 14px; color: var(--clr-muted); margin: 0; }

  /* ── download btn ── */
  .rh-dl-btn        { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: var(--clr-btn-bg); color: var(--clr-btn-text); border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; transition: background 0.15s; margin-bottom: 12px; }
  .rh-dl-btn:hover  { background: var(--clr-btn-hover); }

  /* ── feedback ── */
  .rh-stars         { display: flex; gap: 4px; margin-top: 8px; }
  .rh-star-btn      { background: none; border: none; cursor: pointer; padding: 2px; color: #d1ccc5; transition: color 0.15s; }
  .rh-star-btn.active { color: var(--clr-star); }
  .rh-star-btn:hover  { color: var(--clr-star); }
  .rh-feedback-label { font-size: 13px; color: var(--clr-muted); margin: 14px 0 6px; display: block; }
  .rh-feedback-ta   { width: 100%; border: 1px solid var(--clr-border); border-radius: 6px; padding: 10px 12px; font-size: 13px; color: var(--clr-text); font-family: inherit; resize: vertical; min-height: 72px; background: var(--clr-paper); outline: none; box-sizing: border-box; }
  .rh-feedback-ta:focus { border-color: #a89f95; }
  .rh-feedback-ta::placeholder { color: #b5b0a8; }
  .rh-submit-btn    { display: flex; align-items: center; justify-content: center; width: 100%; padding: 11px; background: var(--clr-btn-bg); color: var(--clr-btn-text); border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; margin-top: 12px; transition: background 0.15s, opacity 0.15s; }
  .rh-submit-btn:hover:not(:disabled)  { background: var(--clr-btn-hover); }
  .rh-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── footer ── */
  .rh-footer        { text-align: center; padding-top: 20px; }
  .rh-footer p     { font-size: 12px; color: #b5b0a8; margin: 2px 0; }
`;

/* ─── Component ─────────────────────────────────────────────────────── */
const CustomerReceiptPage = () => {
  const { orderId, slug, tableId } = useParams<{
    orderId?: string;
    slug?: string;
    tableId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get('t') || searchParams.get('token');
  const shouldAutoPrint = searchParams.get('print') === 'true';

  const [feedback, setFeedback] = useState<{
    rating?: number;
    comment?: string;
  }>({});

  const handleSubmitFeedback = async () => {
    // TODO: Implement feedback submission
    console.log('Submitting feedback:', feedback);
  };

  const isCombinedReceipt = location.pathname === '/combined-receipt';

  const isTableBill =
    (location.pathname.includes('/table-bill/') ||
      (location.pathname.includes('/table/') &&
        location.pathname.includes('/receipt'))) &&
    slug &&
    tableId;

  const isReceiptNumber = orderId && /[A-Z]/.test(orderId);

  /* ── queries ── */
  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
  } = useGetOrderPublicQuery(
    { orderId: orderId!, token: token! },
    { skip: isCombinedReceipt || isReceiptNumber || !orderId || !token }
  );

  const {
    data: receipt,
    isLoading: receiptLoading,
    error: receiptError,
  } = useGetReceiptByNumberPublicQuery(
    { receiptNumber: orderId!, token: token! },
    { skip: isCombinedReceipt || !isReceiptNumber || !orderId || !token }
  );

  const {
    data: combinedReceipt,
    isLoading: combinedLoading,
    error: combinedError,
  } = useGetCombinedReceiptPublicQuery(
    { token: token! },
    { skip: !isCombinedReceipt || !token }
  );

  const {
    data: tableSessionData,
    isLoading: tableSessionLoading,
    error: tableSessionError,
  } = useGetTableSessionPublicQuery(
    { slug: slug!, tableId: tableId! },
    { skip: !isTableBill }
  );

  const [storedBillData, setStoredBillData] = useState<any>(null);

  useEffect(() => {
    if (isTableBill) {
      try {
        const stored = localStorage.getItem('lastPaymentSession');
        if (stored) {
          const sessionData = JSON.parse(stored);
          if (
            sessionData.slug === slug &&
            sessionData.tableId === tableId &&
            sessionData.billData &&
            Date.now() - new Date(sessionData.timestamp).getTime() < 3600000
          ) {
            setStoredBillData(sessionData.billData);
          }
        }
      } catch (error) {
        console.error('Error reading stored bill data:', error);
      }
    }
  }, [isTableBill, slug, tableId]);

  const {
    data: consolidatedBillData,
    isLoading: consolidatedBillLoading,
    error: consolidatedBillError,
  } = useGetConsolidatedBillQuery(
    { slug: slug!, tableId: tableId! },
    { skip: !isTableBill || !!storedBillData }
  );

  const isLoading = isTableBill
    ? tableSessionLoading || consolidatedBillLoading
    : isCombinedReceipt
    ? combinedLoading
    : isReceiptNumber
    ? receiptLoading
    : orderLoading;

  const error = isTableBill
    ? tableSessionError || consolidatedBillError
    : isCombinedReceipt
    ? combinedError
    : isReceiptNumber
    ? receiptError
    : orderError;

  const orders = isTableBill
    ? tableSessionData?.tableSession?.orders || null
    : isCombinedReceipt
    ? combinedReceipt
      ? [combinedReceipt]
      : null
    : isReceiptNumber
    ? receipt
      ? [receipt]
      : null
    : order
    ? [order]
    : null;

  /* ── auto-print ── */
  useEffect(() => {
    if (
      shouldAutoPrint &&
      !isLoading &&
      !error &&
      consolidatedBillData &&
      isTableBill
    ) {
      const downloadPdf = async () => {
        try {
          const billUrl = `/api/public/restaurants/${slug}/table/${tableId}/bill`;
          window.open(billUrl, '_blank');
          setTimeout(() => {
            window.close();
          }, 1000);
        } catch (err) {
          console.error('Error downloading PDF:', err);
        }
      };
      downloadPdf();
    }
  }, [
    shouldAutoPrint,
    isLoading,
    error,
    consolidatedBillData,
    isTableBill,
    slug,
    tableId,
  ]);

  /* ── loading ── */
  if (isLoading) {
    return (
      <div className="rh-receipt-root">
        <style>{STYLE}</style>
        <div className="rh-loading-screen">
          <LoadingSpinner size="lg" />
          <p>Loading your receipt…</p>
        </div>
      </div>
    );
  }

  /* ── TABLE BILL view ── */
  if (isTableBill && (consolidatedBillData || storedBillData)) {
    const billData = storedBillData || consolidatedBillData;
    const { restaurant, bill } = billData;

    const extendedRestaurant = restaurant as PublicRestaurant & {
      address?: {
        line1: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
      phone?: string;
      gstin?: string;
    };

    const formattedDate = new Date(bill.billGeneratedAt).toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }
    );

    return (
      <div className="rh-receipt-root">
        <style>{STYLE}</style>
        <div className="rh-wrap">
          {/* Success banner */}
          {storedBillData && (
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
            <h1>{extendedRestaurant.name}</h1>
            <div className="rh-addr">
              {extendedRestaurant.address && (
                <>
                  {extendedRestaurant.address.line1}
                  <br />
                  {extendedRestaurant.address.city},{' '}
                  {extendedRestaurant.address.state}{' '}
                  {extendedRestaurant.address.postalCode}
                </>
              )}
            </div>
            <div className="rh-meta-row">
              {extendedRestaurant.phone && (
                <span>
                  📞 <strong>{extendedRestaurant.phone}</strong>
                </span>
              )}
              {extendedRestaurant.gstin && (
                <span>
                  GSTIN <strong>{extendedRestaurant.gstin}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Table + date */}
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

          {/* Orders */}
          {bill.orders.map((orderItem: any, index: number) => (
            <div className="rh-card" key={index}>
              <div className="rh-order-badge">#{orderItem.orderNumber}</div>
              {orderItem.items.map((item: any, itemIndex: number) => (
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
            </div>
          ))}

          {/* Bill summary */}
          <div className="rh-card">
            <div className="rh-card-title">Bill Summary</div>
            <div className="rh-sum-row">
              <span>Subtotal</span>
              <span>₹{bill.subtotal.toFixed(2)}</span>
            </div>
            {bill.cgstAmount > 0 && (
              <div className="rh-sum-row">
                <span>CGST</span>
                <span>₹{bill.cgstAmount.toFixed(2)}</span>
              </div>
            )}
            {bill.sgstAmount > 0 && (
              <div className="rh-sum-row">
                <span>SGST</span>
                <span>₹{bill.sgstAmount.toFixed(2)}</span>
              </div>
            )}
            {bill.igstAmount > 0 && (
              <div className="rh-sum-row">
                <span>IGST</span>
                <span>₹{bill.igstAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="rh-sum-row">
              <span>Total Tax</span>
              <span>₹{bill.taxAmount.toFixed(2)}</span>
            </div>
            <div className="rh-sum-row rh-total">
              <span>Grand Total</span>
              <span>₹{bill.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Download */}
          <button
            className="rh-dl-btn"
            onClick={async () => {
              try {
                const pdfBlob = await generateThermalReceiptPDF({
                  restaurant,
                  bill,
                });
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `table-${bill.tableNumber}-bill.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error('Error downloading bill:', err);
                alert('Failed to generate PDF. Please try again.');
              }
            }}
          >
            <Download size={16} /> Download Bill
          </button>

          {/* Feedback */}
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

          {/* Footer */}
          <div className="rh-footer">
            <p>Thank you for dining with us!</p>
            <p>Powered by RestoHand</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── error / not found ── */
  if (error || (!isTableBill && (!orders || orders.length === 0))) {
    return (
      <div className="rh-receipt-root">
        <style>{STYLE}</style>
        <div className="rh-error-screen">
          <AlertTriangle size={48} />
          <h1>Receipt Not Found</h1>
          <p>
            We couldn't find your receipt. The link may have expired or is
            invalid.
          </p>
          <p>Please ask your server for a new receipt.</p>
        </div>
      </div>
    );
  }

  /* ── extract restaurant info (single / combined order view) ── */
  const restaurantInfo =
    isTableBill && tableSessionData?.restaurant
      ? {
          name: tableSessionData.restaurant.name,
          address: tableSessionData.restaurant.address,
          phone: tableSessionData.restaurant.contactPhone,
          email: tableSessionData.restaurant.contactEmail,
          gstNumber: tableSessionData.restaurant.gstin,
        }
      : orders?.[0]
      ? {
          name: 'Restaurant',
          address: undefined,
          phone: undefined,
          email: undefined,
          gstNumber: undefined,
        }
      : undefined;

  /* ── aggregate totals helper ── */
  const combinedSubtotal = orders!.reduce(
    (s, o) => s + (o.subTotalAmount || 0),
    0
  );
  const combinedTax = orders!.reduce((s, o) => s + (o.taxAmount || 0), 0);
  const combinedTotal = orders!.reduce((s, o) => s + (o.totalAmount || 0), 0);

  /* ── SINGLE / COMBINED ORDER view ── */
  return (
    <div className="rh-receipt-root">
      <style>{STYLE}</style>
      <div className="rh-wrap">
        {/* Header */}
        {restaurantInfo && (
          <div className="rh-header">
            <h1>{restaurantInfo.name}</h1>
            {restaurantInfo.address && (
              <div className="rh-addr">
                {restaurantInfo.address.line1}
                <br />
                {restaurantInfo.address.city}, {restaurantInfo.address.state}{' '}
                {restaurantInfo.address.postalCode}
              </div>
            )}
            <div className="rh-meta-row">
              {restaurantInfo.phone && (
                <span>
                  📞 <strong>{restaurantInfo.phone}</strong>
                </span>
              )}
              {restaurantInfo.gstNumber && (
                <span>
                  GSTIN <strong>{restaurantInfo.gstNumber}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Individual orders */}
        {orders!.map((orderItem) => (
          <div className="rh-card" key={orderItem.id}>
            <div className="rh-order-badge">#{orderItem.orderNumber}</div>
            <Receipt order={orderItem} restaurantInfo={restaurantInfo} />
          </div>
        ))}

        {/* Combined totals — only show when multiple orders */}
        {orders!.length > 1 && (
          <div className="rh-card">
            <div className="rh-card-title">Bill Summary</div>
            <div className="rh-sum-row">
              <span>Subtotal</span>
              <span>₹{combinedSubtotal.toFixed(2)}</span>
            </div>
            <div className="rh-sum-row">
              <span>Tax (GST)</span>
              <span>₹{combinedTax.toFixed(2)}</span>
            </div>
            <div className="rh-sum-row rh-total">
              <span>Grand Total</span>
              <span>₹{combinedTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Download */}
        <button
          className="rh-dl-btn"
          onClick={async () => {
            try {
              const pdfBlob = await generateReceiptPDF({
                order:
                  isCombinedReceipt || isTableBill ? undefined : orders?.[0],
                orders: isCombinedReceipt || isTableBill ? orders : undefined,
                isCombinedReceipt: isCombinedReceipt || isTableBill,
                restaurantInfo,
              });
              const url = URL.createObjectURL(pdfBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = isTableBill
                ? `table-${
                    tableSessionData?.tableSession?.tableNumber || 'session'
                  }-bill.pdf`
                : isCombinedReceipt
                ? `combined-receipt-${orders?.[0]?.tableNumber || 'table'}.pdf`
                : `receipt-${orders?.[0]?.orderNumber || 'order'}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            } catch (err) {
              console.error('Error generating PDF:', err);
              alert('Failed to generate PDF. Please try again.');
            }
          }}
        >
          <Download size={16} /> Download PDF
        </button>

        {/* Feedback */}
        <div className="rh-card">
          <div
            className="rh-card-title"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Star size={14} fill="var(--clr-star)" color="var(--clr-star)" />{' '}
            Rate Your Experience
          </div>
          <p style={{ fontSize: 13, color: 'var(--clr-muted)', margin: 0 }}>
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
                    (feedback.rating || 0) >= star ? 'var(--clr-star)' : 'none'
                  }
                />
              </button>
            ))}
          </div>
          <label className="rh-feedback-label">
            Anything else? <span style={{ color: '#b5b0a8' }}>(optional)</span>
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

        {/* Footer */}
        <div className="rh-footer">
          <p>Thank you for dining with us!</p>
          <p>Powered by RestoHand</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerReceiptPage;
