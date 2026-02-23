'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
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
  Sparkles,
} from 'lucide-react';
import { CallWaiterButton } from '@/components/customer/CallWaiterButton';
import type { Order } from '@/store/api/types';
import type {
  ModifierSelection,
  OptionSelection,
} from '@/store/slices/cartSlice';
import { useGetSessionBillQuery } from '@/store/api/customerSessionsApi';
import { useGetDetailedSessionBillQuery } from '@/store/api/billingApi';
import { downloadThermalReceipt } from '@/components/DetailedThermalReceiptPDF';

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

/* ── Premium Elegant Session Styles ── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

  .session-elegant-root {
    --clr-bg: #fafafa;
    --clr-surface: #ffffff;
    --clr-border: #e5e7eb;
    --clr-text: #1a1a1a;
    --clr-text-muted: #6b7280;
    --clr-primary: #0f172a;
    --clr-success: #059669;
    --clr-warning: #ea580c;
    --clr-info: #0284c7;
    
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    min-height: 100vh;
    color: var(--clr-text);
    padding-bottom: 40px;
  }

  .session-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }

  /* Status Banner - Large and Celebratory */
  .session-status-banner {
    background: white;
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 20px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 2px solid transparent;
  }

  .session-status-banner.success {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border-color: #86efac;
  }

  .session-status-banner.warning {
    background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
    border-color: #fdba74;
  }

  .session-status-banner.info {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-color: #7dd3fc;
  }

  .session-status-icon {
    font-size: 56px;
    margin-bottom: 12px;
    animation: bounce-subtle 2s ease-in-out infinite;
  }

  @keyframes bounce-subtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .session-status-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 6px 0;
    color: var(--clr-primary);
  }

  .session-status-subtitle {
    font-size: 15px;
    color: var(--clr-text-muted);
    margin: 0;
    font-weight: 500;
  }

  /* Bill Summary Card */
  .session-bill-card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.06);
  }

  .session-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    font-size: 15px;
    color: var(--clr-text-muted);
    border-bottom: 1px solid #f3f4f6;
  }

  .session-summary-row:last-of-type {
    border-bottom: none;
  }

  .session-summary-label {
    font-weight: 500;
  }

  .session-summary-value {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    color: var(--clr-text);
  }

  /* Total Section - Prominent */
  .session-total-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 2px solid var(--clr-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .session-total-left {
    flex: 1;
  }

  .session-total-label {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--clr-text-muted);
    font-weight: 700;
    margin-bottom: 4px;
  }

  .session-total-amount {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 36px;
    font-weight: 700;
    color: var(--clr-primary);
    line-height: 1;
  }

  .session-payment-badge {
    padding: 8px 16px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .session-payment-badge.pending {
    background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
    color: #ea580c;
    border: 2px solid #fdba74;
  }

  .session-payment-badge.paid {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    color: #059669;
    border: 2px solid #86efac;
  }

  /* Action Buttons */
  .session-btn-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .session-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 24px;
    font-size: 16px;
    font-weight: 700;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .session-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  .session-btn:active {
    transform: translateY(0);
  }

  .session-btn.primary {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    color: white;
  }

  .session-btn.secondary {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
  }

  .session-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Orders Section */
  .session-section-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--clr-text);
    margin: 0 0 16px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .session-order-card {
    background: white;
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.06);
    transition: all 0.2s;
  }

  .session-order-card:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .session-order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 12px;
  }

  .session-order-left {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .session-order-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .session-order-icon-wrap.success {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  }

  .session-order-icon-wrap.warning {
    background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
  }

  .session-order-icon-wrap.info {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  }

  .session-order-info {
    flex: 1;
    min-width: 0;
  }

  .session-order-number {
    font-size: 16px;
    font-weight: 700;
    color: var(--clr-primary);
    margin: 0 0 4px 0;
  }

  .session-order-status {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
  }

  .session-order-right {
    text-align: right;
    flex-shrink: 0;
  }

  .session-order-amount {
    font-size: 18px;
    font-weight: 700;
    color: var(--clr-primary);
    font-family: 'Inter', sans-serif;
    margin-bottom: 6px;
  }

  .session-order-payment {
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 8px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    display: inline-block;
  }

  .session-order-payment.pending {
    background: #fff7ed;
    color: #ea580c;
  }

  .session-order-payment.paid {
    background: #f0fdf4;
    color: #059669;
  }

  /* Toggle Button */
  .session-toggle-btn {
    width: 100%;
    padding: 10px;
    font-size: 13px;
    font-weight: 600;
    background: #f9fafb;
    color: var(--clr-text);
    border: 1px solid var(--clr-border);
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: inherit;
    transition: all 0.2s;
  }

  .session-toggle-btn:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  /* Items List */
  .session-items-list {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--clr-border);
  }

  .session-item-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 1px solid #f9fafb;
  }

  .session-item-row:last-child {
    border-bottom: none;
  }

  .session-item-left {
    flex: 1;
    min-width: 0;
  }

  .session-item-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--clr-text);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .session-item-qty {
    font-size: 13px;
    color: var(--clr-text-muted);
    margin-bottom: 4px;
  }

  .session-item-modifiers {
    font-size: 12px;
    color: var(--clr-text-muted);
    line-height: 1.5;
  }

  .session-item-modifier-name {
    font-weight: 600;
    color: var(--clr-text);
  }

  .session-item-notes {
    font-size: 12px;
    color: var(--clr-text-muted);
    font-style: italic;
    margin-top: 4px;
  }

  .session-item-total {
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: var(--clr-text);
    flex-shrink: 0;
  }

  /* Footer */
  .session-footer {
    text-align: center;
    padding: 20px 0;
  }

  .session-footer-text {
    font-size: 13px;
    color: #9ca3af;
    margin: 0;
  }

  .session-footer-text strong {
    color: var(--clr-text);
    font-weight: 600;
  }

  /* Loading/Error States */
  .session-loading,
  .session-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
    padding: 32px;
  }

  .session-loading img {
    width: 180px;
    height: 180px;
    border-radius: 20px;
    margin-bottom: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .session-loading-text {
    font-size: 16px;
    color: var(--clr-text-muted);
    font-weight: 600;
  }

  .session-error-icon {
    font-size: 80px;
    margin-bottom: 24px;
  }

  .session-error-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--clr-primary);
    margin: 0 0 12px 0;
  }

  .session-error-desc {
    font-size: 16px;
    color: var(--clr-text-muted);
    margin: 0 0 24px 0;
    line-height: 1.6;
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
  const [isDownloadingBill, setIsDownloadingBill] = useState(false);

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

  const hasUnpaidOrders = !session?.allOrdersPaid;
  const allOrdersPaid = session?.allOrdersPaid || false;

  // Get detailed bill data for PDF generation when session is paid
  const {
    data: detailedBill,
    isLoading: detailedBillLoading,
  } = useGetDetailedSessionBillQuery(
    { sessionId: sessionId || '', includeUnpaid: true },
    {
      skip: !sessionId || !allOrdersPaid,
    }
  );

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
  const sessionClosed = session?.status === 'closed';

  const sessionStatus = useMemo(() => {
    if (!session || orders.length === 0) {
      return null;
    }

    if (sessionClosed) {
      return {
        title: 'Order Completed',
        subtitle: 'Thank you for dining with us!',
        className: 'success',
        icon: '🎉',
      };
    }

    if (allOrdersPaid) {
      return {
        title: 'All Paid',
        subtitle: 'Your bill is fully settled',
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
        subtitle: 'Your food is ready to collect!',
        className: 'success',
        icon: '🍽️',
      };
    }

    if (cookingOrders.length > 0) {
      return {
        title: 'Preparing Your Food',
        subtitle: `${cookingOrders.length} order${
          cookingOrders.length > 1 ? 's' : ''
        } being prepared`,
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

  const handleDownloadBill = async () => {
    if (!detailedBill) {
      toast({
        title: 'Error',
        description: 'Bill data not available',
        variant: 'destructive',
      });
      return;
    }

    setIsDownloadingBill(true);
    try {
      await downloadThermalReceipt(detailedBill, 'Digital Payment');
      toast({
        title: 'Success',
        description: 'Receipt downloaded successfully',
      });
    } catch (err) {
      console.error('Error generating receipt:', err);
      toast({
        title: 'Error',
        description: 'Failed to download receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingBill(false);
    }
  };

  const handleOrderAgain = () => {
    // Navigate back to the table menu to start a new session
    const tableIdToUse = session?.tableId || tableId;
    if (slug && tableIdToUse) {
      navigate(`/c/${slug}?tableId=${tableIdToUse}`);
    } else if (slug) {
      navigate(`/c/${slug}`);
    }
  };

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
      <div className="session-elegant-root">
        <style>{STYLE}</style>
        <div className="session-loading">
          <img src="/gifs/food-pending.gif" alt="Loading" />
          <p className="session-loading-text">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="session-elegant-root">
        <style>{STYLE}</style>
        <div className="session-error">
          <div className="session-error-icon">🍽️</div>
          <h2 className="session-error-title">No Active Cart</h2>
          <p className="session-error-desc">
            You don't have any active orders at this table.
          </p>
          <button
            className="session-btn secondary"
            onClick={() =>
              navigate(`/c/${slug}?tableId=${session?.tableId || tableId}`)
            }
          >
            <Plus size={18} />
            Start Ordering
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="session-elegant-root">
      <style>{STYLE}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="session-container"
      >
        {/* Status Banner */}
        {sessionStatus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className={`session-status-banner ${sessionStatus.className}`}>
              <div className="session-status-icon">{sessionStatus.icon}</div>
              <h2 className="session-status-title">{sessionStatus.title}</h2>
              <p className="session-status-subtitle">
                {sessionStatus.subtitle}
              </p>
            </div>
          </motion.div>
        )}

        {/* Bill Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="session-bill-card">
            <div className="session-summary-row">
              <span className="session-summary-label">Subtotal</span>
              <span className="session-summary-value">
                {formatCurrency(bill?.subTotalAmount || 0)}
              </span>
            </div>

            {bill?.branchCharges && bill.branchCharges.length > 0 && (
              <>
                {bill.branchCharges.map((charge, index) => (
                  <div key={index} className="session-summary-row">
                    <span className="session-summary-label">
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
                    <span className="session-summary-value">
                      {formatCurrency(charge.amount || 0)}
                    </span>
                  </div>
                ))}
              </>
            )}

            {(bill?.taxAmount || 0) > 0 && (
              <div className="session-summary-row">
                <span className="session-summary-label">Tax</span>
                <span className="session-summary-value">
                  {formatCurrency(bill?.taxAmount || 0)}
                </span>
              </div>
            )}

            <div className="session-total-section">
              <div className="session-total-left">
                <p className="session-total-label">Total</p>
                <p className="session-total-amount">
                  {formatCurrency(bill?.totalAmount || 0)}
                </p>
              </div>
              <div>
                {hasUnpaidOrders && (
                  <span className="session-payment-badge pending">Pending</span>
                )}
                {allOrdersPaid && (
                  <span className="session-payment-badge paid">Paid</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="session-btn-group">
            {hasUnpaidOrders && !sessionClosed && (
              <button
                className="session-btn primary"
                onClick={handleSessionPayment}
                disabled={isCreatingPayment}
              >
                <CreditCard size={20} />
                {isCreatingPayment
                  ? 'Processing...'
                  : `Pay ${formatCurrency(bill?.totalAmount || 0)}`}
              </button>
            )}

            {/* Download Bill Button - Only show when session is paid */}
            {allOrdersPaid && (
              <button
                className="session-btn primary"
                onClick={handleDownloadBill}
                disabled={isDownloadingBill || detailedBillLoading}
              >
                <Download size={20} />
                {isDownloadingBill
                  ? 'Downloading...'
                  : 'Download Receipt'}
              </button>
            )}

            {!sessionClosed && (
              <button
                className="session-btn secondary"
                onClick={() =>
                  navigate(
                    `/c/${slug}?tableId=${
                      session?.tableId || tableId
                    }&addMore=true`
                  )
                }
              >
                <Plus size={18} />
                Order More Items
              </button>
            )}

            {/* Order Again Button - Show when session is closed or fully paid */}
            {(sessionClosed || allOrdersPaid) && (
              <button
                className="session-btn secondary"
                onClick={handleOrderAgain}
              >
                <ShoppingCart size={18} />
                Order Again
              </button>
            )}
          </div>
        </motion.div>

        {/* Call Waiter */}
        {session && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
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
          transition={{ delay: 0.5 }}
          style={{ marginTop: 24 }}
        >
          <h3 className="session-section-title">Your Orders</h3>
          {orders.map((order, index) => {
            const statusDisplay = getOrderStatusDisplay(order as any);
            const StatusIcon = statusDisplay.icon;

            return (
              <motion.div
                key={order.orderNumber}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="session-order-card"
              >
                <div className="session-order-header">
                  <div className="session-order-left">
                    <div
                      className={`session-order-icon-wrap ${statusDisplay.bgColor.replace(
                        'bg-',
                        ''
                      )}`}
                    >
                      <StatusIcon size={20} className={statusDisplay.color} />
                    </div>
                    <div className="session-order-info">
                      <h4 className="session-order-number">
                        #{order.orderNumber}
                      </h4>
                      <p
                        className={`session-order-status ${statusDisplay.color}`}
                      >
                        {statusDisplay.text}
                      </p>
                    </div>
                  </div>
                  <div className="session-order-right">
                    <p className="session-order-amount">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <span
                      className={`session-order-payment ${
                        order.paymentStatus === 'paid' ? 'paid' : 'pending'
                      }`}
                    >
                      {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>

                <button
                  className="session-toggle-btn"
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
                      <ChevronUp size={16} />
                      Hide Items
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
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
                      className="session-items-list"
                    >
                      {(order as any).items?.map(
                        (item: any, itemIndex: any) => (
                          <div
                            key={`${item.name}-${itemIndex}`}
                            className="session-item-row"
                          >
                            <div className="session-item-left">
                              <div className="session-item-name">
                                {item.name}
                                {item.activePriceTagId && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200"
                                  >
                                    <Sparkles size={10} className="mr-1" />
                                    Special
                                  </Badge>
                                )}
                              </div>
                              <div className="session-item-qty">
                                ₹{item.pricing.unitAmount} × {item.quantity}
                              </div>
                              {item.selectedModifiers &&
                                item.selectedModifiers.length > 0 && (
                                  <div className="session-item-modifiers">
                                    {item.selectedModifiers.map(
                                      (
                                        modifier: ModifierSelection,
                                        modIndex: number
                                      ) => (
                                        <div key={modIndex}>
                                          <span className="session-item-modifier-name">
                                            {modifier.modifierName}:
                                          </span>{' '}
                                          {modifier.selectedOptions.map(
                                            (
                                              option: OptionSelection,
                                              optIndex: number
                                            ) => (
                                              <span key={optIndex}>
                                                {option.optionName}
                                                {option.priceAdjustment !==
                                                  0 && (
                                                  <span
                                                    style={{
                                                      color: '#059669',
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
                                <div className="session-item-notes">
                                  Note: {item.notes}
                                </div>
                              )}
                            </div>
                            <span className="session-item-total">
                              ₹
                              {(
                                item.pricing.unitAmount * item.quantity
                              ).toFixed(2)}
                            </span>
                          </div>
                        )
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="session-footer"
        >
          <p className="session-footer-text">
            Table <strong>{session?.tableNumber}</strong> • Updates
            automatically
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
