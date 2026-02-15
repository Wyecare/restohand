'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { generateProfessionalInvoicePDF } from '@/components/ProfessionalInvoicePDF';

// Helper function to convert numbers to words
const convertToWords = (amount: number): string => {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

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

  if (amount === 0) return 'Zero Rupees Only';

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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CallWaiterButton } from '@/components/customer/CallWaiterButton';
import type { Order } from '@/store/api/types';
import type {
  ModifierSelection,
  OptionSelection,
} from '@/store/slices/cartSlice';
import { useGetSessionBillQuery } from '@/store/api/customerSessionsApi';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

const getOrderStatusDisplay = (order: any) => {
  const { status } = order;

  if (status === 'ready') {
    return {
      icon: CheckCircle,
      text: 'Ready',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    };
  }

  if (status === 'in_progress') {
    return {
      icon: ChefHat,
      text: 'Cooking',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    };
  }

  return {
    icon: Clock,
    text: 'Ordered',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  };
};

/* ── Compact Styles ── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;600&display=swap');

  .rh-cart-root {
    --clr-bg:        #f8f9fa;
    --clr-paper:     #ffffff;
    --clr-border:    #e5e7eb;
    --clr-text:      #111827;
    --clr-muted:     #6b7280;
    --clr-success:   #16a34a;
    --clr-success-bg:#f0fdf4;
    --clr-warning:   #ea580c;
    --clr-warning-bg:#fff7ed;
    --clr-info:      #0284c7;
    --clr-info-bg:   #f0f9ff;
    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--clr-bg);
    min-height: 100vh;
    padding-bottom: 32px;
  }

  .rh-cart-wrap {
    max-width: 520px;
    margin: 0 auto;
    padding: 16px;
  }

  /* Compact Header */
  .rh-cart-header {
    text-align: center;
    padding: 12px 0;
    margin-bottom: 12px;
  }
  .rh-cart-header h1 {
    font-size: 20px;
    font-weight: 700;
    color: var(--clr-text);
    margin: 0 0 4px;
  }
  .rh-cart-header p {
    font-size: 12px;
    color: var(--clr-muted);
    margin: 0;
  }

  /* Card */
  .rh-cart-card {
    background: var(--clr-paper);
    border: 1px solid var(--clr-border);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  /* Compact Status Banner */
  .rh-status-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    text-align: left;
  }
  .rh-status-icon {
    font-size: 32px;
    flex-shrink: 0;
  }
  .rh-status-content {
    flex: 1;
    min-width: 0;
  }
  .rh-status-title {
    font-size: 15px;
    font-weight: 700;
    margin: 0 0 2px;
  }
  .rh-status-subtitle {
    font-size: 12px;
    color: var(--clr-muted);
    margin: 0;
  }
  .rh-status-banner.success { background: var(--clr-success-bg); border-color: #bbf7d0; }
  .rh-status-banner.success .rh-status-title { color: var(--clr-success); }
  .rh-status-banner.warning { background: var(--clr-warning-bg); border-color: #fed7aa; }
  .rh-status-banner.warning .rh-status-title { color: var(--clr-warning); }
  .rh-status-banner.info { background: var(--clr-info-bg); border-color: #bae6fd; }
  .rh-status-banner.info .rh-status-title { color: var(--clr-info); }

  /* Summary */
  .rh-summary-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
    color: var(--clr-muted);
  }
  .rh-summary-row span:last-child {
    font-family: 'DM Mono', monospace;
    font-weight: 500;
  }

  /* Total Section - More Compact */
  .rh-total-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 2px solid var(--clr-border);
    padding-top: 12px;
    margin-top: 12px;
  }
  .rh-total-left {
    text-align: left;
  }
  .rh-total-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--clr-muted);
    margin-bottom: 2px;
  }
  .rh-total-amount {
    font-size: 24px;
    font-weight: 700;
    color: var(--clr-text);
    font-family: 'DM Mono', monospace;
  }
  .rh-total-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .rh-total-badge.pending {
    background: #fff7ed;
    color: #ea580c;
    border: 1px solid #fed7aa;
  }
  .rh-total-badge.paid {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  /* Action Buttons - Horizontal on Desktop */
  .rh-btn-group {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }
  @media (min-width: 520px) {
    .rh-btn-group.multi {
      grid-template-columns: 1fr 1fr;
    }
  }
  .rh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 700;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }
  .rh-btn:active {
    transform: scale(0.98);
  }
  .rh-btn.primary {
    background: #16a34a;
    color: white;
  }
  .rh-btn.primary:hover {
    background: #15803d;
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
    background: #f3f4f6;
  }
  .rh-btn.accent {
    background: #111827;
    color: white;
  }
  .rh-btn.accent:hover {
    background: #1f2937;
  }

  /* Section Title */
  .rh-section-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--clr-text);
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Compact Order Card */
  .rh-order-card {
    background: var(--clr-paper);
    border: 1px solid var(--clr-border);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 10px;
  }
  .rh-order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .rh-order-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }
  .rh-order-number {
    font-size: 14px;
    font-weight: 700;
    color: var(--clr-text);
    margin: 0;
  }
  .rh-order-status-text {
    font-size: 11px;
    margin: 0;
    font-weight: 600;
  }
  .rh-order-right {
    text-align: right;
    flex-shrink: 0;
  }
  .rh-order-amount {
    font-size: 15px;
    font-weight: 700;
    color: var(--clr-text);
    font-family: 'DM Mono', monospace;
    margin-bottom: 4px;
  }
  .rh-order-payment-badge {
    font-size: 9px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 5px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .rh-order-payment-badge.pending {
    background: #fff7ed;
    color: #ea580c;
  }
  .rh-order-payment-badge.paid {
    background: #f0fdf4;
    color: #16a34a;
  }

  /* Toggle Button */
  .rh-toggle-btn {
    width: 100%;
    padding: 8px;
    font-size: 12px;
    font-weight: 600;
    background: #f3f4f6;
    color: var(--clr-text);
    border: 1px solid var(--clr-border);
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: inherit;
    transition: all 0.15s;
  }
  .rh-toggle-btn:hover {
    background: #e5e7eb;
  }

  /* Items List */
  .rh-items-list {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--clr-border);
  }
  .rh-item-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    font-size: 13px;
  }
  .rh-item-name {
    font-weight: 600;
    color: var(--clr-text);
  }
  .rh-item-qty {
    color: var(--clr-muted);
    font-size: 12px;
    margin-top: 2px;
  }
  .rh-item-total {
    font-family: 'DM Mono', monospace;
    color: var(--clr-text);
    font-weight: 600;
    flex-shrink: 0;
  }

  /* Help Section */
  .rh-help-section {
    text-align: center;
    padding-top: 16px;
  }
  .rh-help-section p {
    font-size: 11px;
    color: #9ca3af;
    margin: 4px 0;
  }
  .rh-help-section strong {
    color: var(--clr-text);
    font-weight: 600;
  }

  /* Loading/Error */
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
    width: 160px;
    height: 160px;
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
    font-weight: 700;
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
  const { slug = '', sessionId } = useParams();

  console.log(sessionId, 'mairuu', slug, 'slug in session page');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const tableId = searchParams.get('tableId') || '';

  const [createSessionPaymentIntent, { isLoading: isCreatingPayment }] =
    useCreateCashfreeSessionPaymentIntentMutation();
  const [verifyPayment] = useVerifyPaymentMutation();

  const [showOrderDetails, setShowOrderDetails] = useState<string | null>(null);

  const {
    data: sessionData,
    isLoading: sessionLoading,
    isError: sessionError,
    refetch,
  } = useGetSessionBillQuery(sessionId || '', {
    skip: !sessionId,
  });
  console.log(sessionData, 'session data in session page');

  const session = sessionData?.session;
  const bill = sessionData?.bill;
  const orders = sessionData?.orders || [];

  const handleSocketEvent = useMemo(
    () => (incoming: Order) => {
      if (
        orders.some((order: any) => order.orderNumber === incoming.orderNumber)
      ) {
        refetch();
      }
    },
    [orders, refetch]
  );

  useOrdersSocket({
    onEvent: handleSocketEvent,
    enabled: !!orders?.length,
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
  const hasUnpaidOrders = !session?.allOrdersPaid;
  const allOrdersPaid = session?.allOrdersPaid || false;
  const sessionClosed = session?.status === 'closed';

  const sessionStatus = useMemo(() => {
    if (!session || orders.length === 0) {
      return null;
    }

    if (sessionClosed) {
      return {
        title: 'Order Completed',
        subtitle: 'Thank you!',
        className: 'success',
        icon: '🎉',
      };
    }

    if (allOrdersPaid) {
      return {
        title: 'All Paid',
        subtitle: 'Cart fully settled',
        className: 'success',
        icon: '✅',
      };
    }

    const readyOrders = orders.filter((order) => order.status === 'ready');
    const cookingOrders = orders.filter(
      (order) => order.status === 'in_progress'
    );

    if (readyOrders.length > 0) {
      return {
        title: `${readyOrders.length} Order${
          readyOrders.length > 1 ? 's' : ''
        } Ready`,
        subtitle: 'Collect your food',
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
  }, [session, orders, allOrdersPaid, sessionClosed]);

  const handleSessionPayment = async () => {
    const sessionTableId = session?.tableId || tableId;
    const currentSessionId = sessionData?.session?.sessionId || sessionId;

    if (!sessionTableId || !currentSessionId) {
      toast({
        title: 'Error',
        description: 'Session information not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log(
        'Creating payment intent for session:',
        currentSessionId,
        'tableId:',
        sessionTableId
      );

      // Create session payment intent directly (backend handles bill calculation)
      const paymentData = await createSessionPaymentIntent({
        slug,
        tableId: sessionTableId,
        sessionData: {
          customerSessionId: currentSessionId,
          customerDetails: {
            customerName: 'Table Customer',
            customerEmail: 'customer@example.com',
            customerPhone: '9999999999',
          },
        },
      }).unwrap();

      try {
        localStorage.setItem(
          'lastPaymentSession',
          JSON.stringify({
            slug,
            sessionId: currentSessionId,
            tableId: sessionTableId,
            orderIds: paymentData.orderIds,
            totalAmount: paymentData.totalAmount,
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
    if (slug && (session?.tableId || tableId)) {
      refetch();
    }
  }, [slug, session?.tableId, tableId, refetch]);

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

  if (sessionError || !session) {
    return (
      <div className="rh-cart-root">
        <style>{STYLE}</style>
        <div className="rh-error-screen">
          <div className="rh-error-icon">🍽️</div>
          <h2>No Active Cart</h2>
          <p>You don't have any active orders at this table.</p>
          <button
            className="rh-btn accent"
            onClick={() =>
              navigate(`/c/${slug}?tableId=${session?.tableId || tableId}`)
            }
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
        {/* Status Banner - Horizontal Layout */}
        {sessionStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div
              className={`rh-cart-card rh-status-banner ${sessionStatus.className}`}
            >
              <div className="rh-status-icon">{sessionStatus.icon}</div>
              <div className="rh-status-content">
                <h2 className="rh-status-title">{sessionStatus.title}</h2>
                <p className="rh-status-subtitle">{sessionStatus.subtitle}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cart Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rh-cart-card">
            <div style={{ marginBottom: 8 }}>
              <div className="rh-summary-row">
                <span>Subtotal</span>
                <span>{formatCurrency(bill?.subTotalAmount || 0)}</span>
              </div>

              {/* Branch Charges - Dynamic Display */}
              {bill?.branchCharges && bill.branchCharges.length > 0 && (
                <>
                  {bill.branchCharges.map((charge, index) => (
                    <div key={index} className="rh-summary-row">
                      <span>
                        {charge.name}
                        {charge.type === 'percentage' && (
                          <span style={{ fontSize: '11px', opacity: 0.7 }}>
                            {' '}({charge.value}%)
                          </span>
                        )}
                      </span>
                      <span>{formatCurrency(charge.amount || 0)}</span>
                    </div>
                  ))}
                </>
              )}

              {(bill?.taxAmount || 0) > 0 && (
                <div className="rh-summary-row">
                  <span>Tax</span>
                  <span>{formatCurrency(bill?.taxAmount || 0)}</span>
                </div>
              )}
            </div>

            <div className="rh-total-section">
              <div className="rh-total-left">
                <p className="rh-total-label">Total</p>
                <p className="rh-total-amount">
                  {formatCurrency(bill?.totalAmount || 0)}
                </p>
              </div>
              <div>
                {hasUnpaidOrders && (
                  <span className="rh-total-badge pending">Pending</span>
                )}
                {allOrdersPaid && (
                  <span className="rh-total-badge paid">Paid</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {hasUnpaidOrders && !sessionClosed && (
            <div className="rh-btn-group" style={{ marginBottom: 12 }}>
              <button
                className="rh-btn primary"
                onClick={handleSessionPayment}
                disabled={isCreatingPayment}
              >
                <CreditCard size={16} />
                {isCreatingPayment
                  ? 'Processing...'
                  : `Pay ${formatCurrency(bill?.totalAmount || 0)}`}
              </button>
            </div>
          )}

          <div className={`rh-btn-group ${!sessionClosed ? 'multi' : ''}`}>
            {!sessionClosed && (
              <button
                className="rh-btn accent"
                onClick={() =>
                  navigate(
                    `/c/${slug}?tableId=${
                      session?.tableId || tableId
                    }&addMore=true`
                  )
                }
              >
                <Plus size={14} />
                Order More
              </button>
            )}
          </div>
        </motion.div>

        {/* Call Waiter */}
        {session && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CallWaiterButton
              tableId={session?.tableId || tableId}
              restaurantId={session.restaurantId}
              orderId={orders[0]?.orderNumber}
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
            const statusDisplay = getOrderStatusDisplay(order as any);
            const StatusIcon = statusDisplay.icon;

            return (
              <div key={order.orderNumber} className="rh-order-card">
                <div className="rh-order-header">
                  <div className="rh-order-left">
                    <StatusIcon size={18} className={statusDisplay.color} />
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
                    <span
                      className={`rh-order-payment-badge ${
                        order.paymentStatus === 'paid' ? 'paid' : 'pending'
                      }`}
                    >
                      {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>

                <button
                  className="rh-toggle-btn"
                  onClick={() =>
                    setShowOrderDetails(
                      showOrderDetails === order.orderNumber
                        ? null
                        : order.orderNumber
                    )
                  }
                >
                  {showOrderDetails === order.orderNumber ? (
                    <>
                      <ChevronUp size={14} />
                      Hide Items
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      View {(order as any).items?.length || 0} Items
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {showOrderDetails === order.orderNumber && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rh-items-list"
                    >
                      {(order as any).items?.map((item: any, index: any) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="rh-item-row"
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 4,
                              }}
                            >
                              <span className="rh-item-name">{item.name}</span>
                              {item.activePriceTagId && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200"
                                >
                                  Special
                                </Badge>
                              )}
                            </div>
                            <div className="rh-item-qty">
                              ₹{item.pricing.unitAmount} × {item.quantity}
                            </div>
                            {item.selectedModifiers &&
                              item.selectedModifiers.length > 0 && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: '#6b7280',
                                    marginTop: 4,
                                  }}
                                >
                                  {item.selectedModifiers.map(
                                    (
                                      modifier: ModifierSelection,
                                      modIndex: number
                                    ) => (
                                      <div key={modIndex}>
                                        <span style={{ fontWeight: 600 }}>
                                          {modifier.modifierName}:
                                        </span>{' '}
                                        {modifier.selectedOptions.map(
                                          (
                                            option: OptionSelection,
                                            optIndex: number
                                          ) => (
                                            <span key={optIndex}>
                                              {option.optionName}
                                              {option.priceAdjustment !== 0 && (
                                                <span
                                                  style={{
                                                    color: '#16a34a',
                                                    marginLeft: 4,
                                                  }}
                                                >
                                                  (+₹
                                                  {option.priceAdjustment.toFixed(
                                                    2
                                                  )}
                                                  )
                                                </span>
                                              )}
                                              {optIndex <
                                                modifier.selectedOptions
                                                  .length -
                                                  1 && ', '}
                                            </span>
                                          )
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            {item.notes && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#6b7280',
                                  marginTop: 4,
                                  fontStyle: 'italic',
                                }}
                              >
                                Note: {item.notes}
                              </div>
                            )}
                          </div>
                          <span className="rh-item-total">
                            ₹
                            {(item.pricing.unitAmount * item.quantity).toFixed(
                              2
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
            Table <strong>{session?.tableNumber}</strong> • Updates
            automatically
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
