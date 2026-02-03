'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetTableSessionPublicQuery,
  restaurantsApi,
} from '@/store/api/restaurantsApi';
import { generateThermalReceiptPDF } from '@/components/ThermalReceiptPDF';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { useVerifyPaymentMutation } from '@/store/api/ordersApi';
import { useCreateCashfreeSessionPaymentIntentMutation } from '@/store/api/cashfreeApi';
import { initializeCashfree, openCashfreeCheckout } from '@/utils/cashfree';
import {
  Plus,
  Receipt,
  CreditCard,
  Clock,
  CheckCircle,
  ChefHat,
  X,
  Utensils,
  Download,
  ShoppingCart,
} from 'lucide-react';
import { CallWaiterButton } from '@/components/customer/CallWaiterButton';
import type { Order } from '@/store/api/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const getOrderStatusDisplay = (order: Order) => {
  const { status, progress } = order;

  if (status === 'ready' || progress === 100) {
    return {
      icon: CheckCircle,
      text: 'Ready',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
    };
  }

  if (status === 'in_progress' || progress >= 40) {
    return {
      icon: ChefHat,
      text: 'Cooking',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
    };
  }

  return {
    icon: Clock,
    text: 'Ordered',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  };
};

/* ── Styles injected once ── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  .rh-cart-root {
    --clr-bg:        #f0ede8;
    --clr-paper:     #faf9f7;
    --clr-border:    #e2ddd6;
    --clr-text:      #1a1a1a;
    --clr-muted:     #7a756e;
    --clr-accent:    #1a1a1a;
    --clr-success:   #16a34a;
    --clr-success-bg:#f0fdf4;
    --clr-success-bd:#bbf7d0;
    --clr-warning:   #ea580c;
    --clr-warning-bg:#fff7ed;
    --clr-warning-bd:#fed7aa;
    --clr-info:      #0284c7;
    --clr-info-bg:   #f0f9ff;
    --clr-info-bd:   #bae6fd;
    --clr-btn-primary: #1a1a1a;
    --clr-btn-primary-hover: #333;
    --clr-btn-success: #16a34a;
    --clr-btn-success-hover: #15803d;
    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--clr-bg);
    min-height: 100vh;
  }

  .rh-cart-wrap {
    max-width: 520px;
    margin: 0 auto;
    padding: 20px 16px 48px;
  }

  /* ── header ── */
  .rh-cart-header {
    text-align: center;
    padding: 20px 0 16px;
  }
  .rh-cart-header h1 {
    font-size: 24px;
    font-weight: 600;
    color: var(--clr-text);
    letter-spacing: -0.4px;
    margin: 0 0 4px;
  }
  .rh-cart-header p {
    font-size: 13px;
    color: var(--clr-muted);
    margin: 0;
  }

  /* ── card ── */
  .rh-cart-card {
    background: var(--clr-paper);
    border: 1px solid var(--clr-border);
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 12px;
  }

  /* ── status banner ── */
  .rh-status-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 18px;
  }
  .rh-status-icon {
    font-size: 36px;
    margin-bottom: 8px;
  }
  .rh-status-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 3px;
  }
  .rh-status-subtitle {
    font-size: 13px;
    color: var(--clr-muted);
    margin: 0;
  }
  .rh-status-banner.success { border-color: var(--clr-success-bd); background: var(--clr-success-bg); }
  .rh-status-banner.success .rh-status-title { color: var(--clr-success); }
  .rh-status-banner.warning { border-color: var(--clr-warning-bd); background: var(--clr-warning-bg); }
  .rh-status-banner.warning .rh-status-title { color: var(--clr-warning); }
  .rh-status-banner.info { border-color: var(--clr-info-bd); background: var(--clr-info-bg); }
  .rh-status-banner.info .rh-status-title { color: var(--clr-info); }

  /* ── summary row ── */
  .rh-summary-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;
    color: var(--clr-muted);
  }
  .rh-summary-row span:last-child {
    font-family: 'DM Mono', monospace;
  }
  .rh-summary-row.bold {
    font-weight: 500;
    color: var(--clr-text);
  }

  /* ── total section ── */
  .rh-total-section {
    text-align: center;
    border-top: 1px solid var(--clr-border);
    padding-top: 12px;
    margin-top: 10px;
  }
  .rh-total-label {
    font-size: 12px;
    color: var(--clr-muted);
    margin-bottom: 4px;
  }
  .rh-total-amount {
    font-size: 28px;
    font-weight: 600;
    color: var(--clr-text);
    font-family: 'DM Mono', monospace;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }
  .rh-total-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .rh-total-badge.pending {
    background: var(--clr-warning-bg);
    color: var(--clr-warning);
    border: 1px solid var(--clr-warning-bd);
  }
  .rh-total-badge.paid {
    background: var(--clr-success-bg);
    color: var(--clr-success);
    border: 1px solid var(--clr-success-bd);
  }

  /* ── action buttons ── */
  .rh-btn-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
  }
  .rh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 18px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, transform 0.05s;
  }
  .rh-btn:active {
    transform: scale(0.98);
  }
  .rh-btn.primary {
    background: var(--clr-btn-success);
    color: white;
  }
  .rh-btn.primary:hover {
    background: var(--clr-btn-success-hover);
  }
  .rh-btn.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .rh-btn.secondary {
    background: var(--clr-paper);
    color: var(--clr-text);
    border: 1px solid var(--clr-border);
  }
  .rh-btn.secondary:hover {
    background: #f5f3f0;
  }
  .rh-btn.accent {
    background: var(--clr-btn-primary);
    color: white;
  }
  .rh-btn.accent:hover {
    background: var(--clr-btn-primary-hover);
  }

  /* ── section title ── */
  .rh-section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--clr-text);
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* ── order card ── */
  .rh-order-card {
    background: var(--clr-paper);
    border: 1px solid var(--clr-border);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 10px;
  }
  .rh-order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .rh-order-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rh-order-status-icon {
    flex-shrink: 0;
  }
  .rh-order-number {
    font-size: 14px;
    font-weight: 600;
    color: var(--clr-text);
    margin: 0 0 2px;
  }
  .rh-order-status-text {
    font-size: 12px;
    margin: 0;
  }
  .rh-order-right {
    text-align: right;
  }
  .rh-order-amount {
    font-size: 15px;
    font-weight: 600;
    color: var(--clr-text);
    font-family: 'DM Mono', monospace;
    margin-bottom: 4px;
  }
  .rh-order-payment-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 5px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .rh-order-payment-badge.pending {
    background: var(--clr-warning-bg);
    color: var(--clr-warning);
    border: 1px solid var(--clr-warning-bd);
  }
  .rh-order-payment-badge.paid {
    background: var(--clr-success-bg);
    color: var(--clr-success);
    border: 1px solid var(--clr-success-bd);
  }

  /* ── toggle items button ── */
  .rh-toggle-btn {
    width: 100%;
    padding: 8px;
    font-size: 12px;
    font-weight: 500;
    background: #f5f3f0;
    color: var(--clr-text);
    border: 1px solid var(--clr-border);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: inherit;
    transition: background 0.15s;
  }
  .rh-toggle-btn:hover {
    background: #ebe8e3;
  }

  /* ── order items list ── */
  .rh-items-list {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--clr-border);
  }
  .rh-item-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;
  }
  .rh-item-name {
    font-weight: 500;
    color: var(--clr-text);
  }
  .rh-item-qty {
    color: var(--clr-muted);
    margin-left: 6px;
    font-size: 12px;
  }
  .rh-item-total {
    font-family: 'DM Mono', monospace;
    color: var(--clr-text);
  }

  /* ── help text ── */
  .rh-help-section {
    text-align: center;
    padding-top: 16px;
  }
  .rh-help-section p {
    font-size: 12px;
    color: #b5b0a8;
    margin: 4px 0;
  }
  .rh-help-section strong {
    color: var(--clr-text);
    font-weight: 500;
  }

  /* ── loading / error screens ── */
  .rh-loading-screen, .rh-error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
    padding: 32px;
  }
  .rh-loading-screen img {
    width: 192px;
    height: 192px;
    border-radius: 16px;
    margin-bottom: 16px;
  }
  .rh-loading-screen p {
    font-size: 14px;
    color: var(--clr-muted);
  }
  .rh-error-screen .rh-error-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  .rh-error-screen h2 {
    font-size: 20px;
    font-weight: 600;
    color: var(--clr-text);
    margin: 0 0 8px;
  }
  .rh-error-screen p {
    font-size: 14px;
    color: var(--clr-muted);
    margin: 0 0 20px;
  }
`;

export default function CustomerTableSessionPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const tableId = searchParams.get('tableId') || '';

  const [createSessionPaymentIntent, { isLoading: isCreatingPayment }] =
    useCreateCashfreeSessionPaymentIntentMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [getConsolidatedBill] =
    restaurantsApi.useLazyGetConsolidatedBillQuery();

  const [showOrderDetails, setShowOrderDetails] = useState<string | null>(null);

  const {
    data: sessionData,
    isLoading: sessionLoading,
    isError: sessionError,
    refetch,
  } = useGetTableSessionPublicQuery(
    { slug, tableId },
    { skip: !slug || !tableId }
  );

  const handleSocketEvent = useMemo(
    () => (incoming: Order) => {
      if (
        sessionData?.tableSession?.orders?.some(
          (order) => order.id === incoming.id
        )
      ) {
        refetch();
      }
    },
    [sessionData?.tableSession?.orders, refetch]
  );

  useOrdersSocket({
    onEvent: handleSocketEvent,
    enabled: !!sessionData?.tableSession?.orders?.length,
  });

  useEffect(() => {
    initializeCashfree({
      mode:
        import.meta.env.VITE_CASHFREE_ENVIRONMENT === 'production'
          ? 'production'
          : 'sandbox',
    }).catch((error) => {
      console.error('Failed to initialize Cashfree:', error);
    });
  }, []);

  const tableSession = sessionData?.tableSession;
  const restaurant = sessionData?.restaurant;
  const orders = tableSession?.orders || [];
  const totals = tableSession?.totals || { totalAmount: 0 };
  const orderCount = tableSession?.orderCount || 0;
  const hasUnpaidOrders = tableSession?.hasUnpaidOrders || false;
  const allOrdersPaid = tableSession?.allOrdersPaid || false;
  const sessionClosed = tableSession?.sessionClosed || false;

  const sessionStatus = useMemo(() => {
    if (!tableSession || orders.length === 0) {
      return null;
    }

    if (sessionClosed) {
      return {
        title: 'Order Completed',
        subtitle: 'Thank you for your visit!',
        className: 'success',
        icon: '🎉',
      };
    }

    if (allOrdersPaid) {
      return {
        title: 'All Paid',
        subtitle: 'Your cart is fully settled',
        className: 'success',
        icon: '✅',
      };
    }

    const readyOrders = orders.filter(
      (order) => order.status === 'ready' || order.progress === 100
    );
    const cookingOrders = orders.filter(
      (order) =>
        order.status === 'in_progress' ||
        (order.progress >= 40 && order.progress < 100)
    );

    if (readyOrders.length > 0) {
      return {
        title: `${readyOrders.length} Order${
          readyOrders.length > 1 ? 's' : ''
        } Ready`,
        subtitle: 'Please collect your food',
        className: 'success',
        icon: '🍽️',
      };
    }

    if (cookingOrders.length > 0) {
      return {
        title: 'Preparing Your Food',
        subtitle: `${cookingOrders.length} order${
          cookingOrders.length > 1 ? 's' : ''
        } cooking`,
        className: 'warning',
        icon: '👨‍🍳',
      };
    }

    return {
      title: 'Orders Received',
      subtitle: "We'll start preparing soon",
      className: 'info',
      icon: '📝',
    };
  }, [tableSession, orders, allOrdersPaid, sessionClosed]);

  const handleSessionPayment = async () => {
    if (!tableId) {
      toast({
        title: 'Error',
        description: 'Table ID not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      const billResult = await getConsolidatedBill({ slug, tableId });

      const paymentData = await createSessionPaymentIntent({
        slug,
        tableId,
        sessionData: {
          customerSessionId:
            sessionData?.tableSession?.customerSessionId ||
            `session_${Date.now()}`,
          customerDetails: {
            customerName: 'Table Customer',
            customerEmail: 'customer@example.com',
            customerPhone: '9999999999',
          },
        },
      }).unwrap();

      try {
        const billData = 'data' in billResult ? billResult.data : null;
        localStorage.setItem(
          'lastPaymentSession',
          JSON.stringify({
            slug,
            tableId,
            orderIds: paymentData.orderIds,
            totalAmount: paymentData.totalAmount,
            billData,
            timestamp: new Date().toISOString(),
            paymentProvider: 'cashfree',
          })
        );
      } catch (error) {
        console.error('Error storing payment session data:', error);
      }

      await openCashfreeCheckout({
        paymentSessionId: paymentData.paymentSessionId,
        redirectTarget: '_self',
      });
    } catch (error: any) {
      console.error('Payment intent creation failed:', error);
      toast({
        title: 'Payment Failed',
        description:
          error?.data?.message || 'Unable to create payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (slug && tableId) {
      refetch();
    }
  }, [slug, tableId, refetch]);

  if (sessionLoading) {
    return (
      <div className="rh-cart-root">
        <style>{STYLE}</style>
        <div className="rh-loading-screen">
          <img src="/gifs/food-pending.gif" alt="Loading" />
          <p>Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (sessionError || !tableSession) {
    return (
      <div className="rh-cart-root">
        <style>{STYLE}</style>
        <div className="rh-error-screen">
          <div className="rh-error-icon">🍽️</div>
          <h2>No Active Cart</h2>
          <p>You don't have any active orders at this table.</p>
          <button
            className="rh-btn accent"
            onClick={() => navigate(`/c/${slug}?tableId=${tableId}`)}
          >
            <Plus size={16} />
            Start Ordering
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rh-cart-root">
      <style>{STYLE}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rh-cart-wrap"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rh-cart-header"
        >
          <h1>Table {tableSession.tableNumber}</h1>
          <p>
            {restaurant.name} • {orderCount} Order{orderCount > 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div
            className={`rh-cart-card rh-status-banner ${sessionStatus.className}`}
          >
            <div className="rh-status-icon">{sessionStatus.icon}</div>
            <h2 className="rh-status-title">{sessionStatus.title}</h2>
            <p className="rh-status-subtitle">{sessionStatus.subtitle}</p>
          </div>
        </motion.div>

        {/* Cart Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rh-cart-card">
            <div style={{ marginBottom: 8 }}>
              <div className="rh-summary-row">
                <span>Order Amount</span>
                <span>
                  {formatCurrency(totals.subTotalAmount || totals.totalAmount)}
                </span>
              </div>
              {totals.taxAmount > 0 && (
                <>
                  {totals.cgstAmount > 0 && (
                    <div className="rh-summary-row" style={{ fontSize: 12 }}>
                      <span>CGST</span>
                      <span>{formatCurrency(totals.cgstAmount)}</span>
                    </div>
                  )}
                  {totals.sgstAmount > 0 && (
                    <div className="rh-summary-row" style={{ fontSize: 12 }}>
                      <span>SGST</span>
                      <span>{formatCurrency(totals.sgstAmount)}</span>
                    </div>
                  )}
                  {totals.igstAmount > 0 && (
                    <div className="rh-summary-row" style={{ fontSize: 12 }}>
                      <span>IGST</span>
                      <span>{formatCurrency(totals.igstAmount)}</span>
                    </div>
                  )}
                  <div className="rh-summary-row">
                    <span>Total Tax</span>
                    <span>{formatCurrency(totals.taxAmount)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="rh-total-section">
              <p className="rh-total-label">Cart Total</p>
              <p className="rh-total-amount">
                {formatCurrency(totals.totalAmount)}
              </p>
              {hasUnpaidOrders && (
                <span className="rh-total-badge pending">Payment Pending</span>
              )}
              {allOrdersPaid && (
                <span className="rh-total-badge paid">✓ Fully Paid</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rh-btn-group"
        >
          {hasUnpaidOrders && !sessionClosed && (
            <button
              className="rh-btn primary"
              onClick={handleSessionPayment}
              disabled={isCreatingPayment}
            >
              <CreditCard size={18} />
              {isCreatingPayment
                ? 'Processing...'
                : `Pay Now — ${formatCurrency(totals.totalAmount)}`}
            </button>
          )}

          <button
            className="rh-btn secondary"
            onClick={async () => {
              try {
                const result = await getConsolidatedBill({ slug, tableId });

                if ('data' in result && result.data) {
                  const pdfBlob = await generateThermalReceiptPDF({
                    restaurant: result.data.restaurant,
                    bill: result.data.bill,
                  });

                  const url = URL.createObjectURL(pdfBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `table-${tableSession.tableNumber}-bill.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                } else {
                  throw new Error(
                    result.error?.toString() || 'Failed to get bill data'
                  );
                }
              } catch (error) {
                console.error('Error downloading bill:', error);
                toast({
                  title: 'Download Failed',
                  description: 'Unable to download the bill. Please try again.',
                  variant: 'destructive',
                });
              }
            }}
          >
            <Download size={16} />
            Download Bill — {formatCurrency(totals.totalAmount)}
          </button>

          {!sessionClosed && (
            <button
              className="rh-btn accent"
              onClick={() =>
                navigate(`/c/${slug}?tableId=${tableId}&addMore=true`)
              }
            >
              <Plus size={16} />
              Order More Items
            </button>
          )}
        </motion.div>

        {/* Call Waiter */}
        {restaurant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CallWaiterButton
              tableId={tableId}
              restaurantId={restaurant.id}
              orderId={orders[0]?.id}
            />
          </motion.div>
        )}

        {/* Orders List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ marginTop: 20 }}
        >
          <h3 className="rh-section-title">Your Orders</h3>
          {orders.map((order) => {
            const statusDisplay = getOrderStatusDisplay(order);
            const StatusIcon = statusDisplay.icon;

            return (
              <div key={order.id} className="rh-order-card">
                <div className="rh-order-header">
                  <div className="rh-order-left">
                    <div className="rh-order-status-icon">
                      <StatusIcon size={20} className={statusDisplay.color} />
                    </div>
                    <div>
                      <h4 className="rh-order-number">#{order.orderNumber}</h4>
                      <p
                        className={`rh-order-status-text ${statusDisplay.color}`}
                      >
                        {statusDisplay.text}
                      </p>
                    </div>
                  </div>
                  <div className="rh-order-right">
                    <p className="rh-order-amount">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    {order.paymentStatus === 'paid' ? (
                      <span className="rh-order-payment-badge paid">Paid</span>
                    ) : (
                      <span className="rh-order-payment-badge pending">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <button
                  className="rh-toggle-btn"
                  onClick={() =>
                    setShowOrderDetails(
                      showOrderDetails === order.id ? null : order.id
                    )
                  }
                >
                  {showOrderDetails === order.id ? (
                    <>
                      <X size={14} />
                      Hide Items
                    </>
                  ) : (
                    <>
                      <Utensils size={14} />
                      View Items ({order.items.length})
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {showOrderDetails === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rh-items-list"
                    >
                      {order.items.map((item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="rh-item-row"
                        >
                          <div>
                            <span className="rh-item-name">{item.name}</span>
                            <span className="rh-item-qty">
                              ₹{item.pricing.unitAmount} × {item.quantity}
                            </span>
                          </div>
                          <span className="rh-item-total">
                            ₹
                            {(item.pricing.unitAmount * item.quantity).toFixed(
                              0
                            )}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rh-help-section"
        >
          <p>
            Need help? Show your table number{' '}
            <strong>{tableSession.tableNumber}</strong> to staff
          </p>
          <p>This page updates automatically</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
