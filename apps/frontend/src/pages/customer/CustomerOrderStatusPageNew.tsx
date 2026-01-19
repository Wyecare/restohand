import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CreditCard, Receipt, FileText, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  useGetPublicOrderQuery,
  useGetPublicRestaurantQuery,
  useCancelPublicOrderMutation,
} from '@/store/api/restaurantsApi';
import {
  useCreatePaymentIntentMutation,
  useVerifyPaymentMutation,
  useGenerateBillQuery,
} from '@/store/api/ordersApi';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import type { Order } from '@/store/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/billing';

// Razorpay type declaration
declare global {
  interface Window {
    Razorpay?: any;
  }
}

// Simplified status display with better descriptions
const getStatusInfo = (order: Order) => {
  const { status, progress } = order;

  if (status === 'cancelled') {
    return {
      gif: '/gifs/cancel.gif',
      title: 'Order Cancelled',
      message: 'This order has been cancelled',
      color: 'text-red-500',
      phase: 'cancelled',
    };
  }

  if (status === 'completed') {
    return {
      gif: '/gifs/completed.gif',
      title: 'Order Complete! 🎉',
      message: 'Enjoy your meal! Thanks for dining with us.',
      color: 'text-green-500',
      phase: 'completed',
    };
  }

  if (status === 'ready' || progress === 100) {
    return {
      gif: '/gifs/ready.gif',
      title: 'Food is Ready! 🍽️',
      message: 'Your order is ready for pickup',
      color: 'text-green-500',
      phase: 'ready',
    };
  }

  if (status === 'in_progress' || progress >= 40) {
    return {
      gif: '/gifs/cooking.gif',
      title: 'Cooking in Progress 👨‍🍳',
      message: 'Our chefs are preparing your delicious food',
      color: 'text-orange-500',
      phase: 'cooking',
    };
  }

  // pending or accepted
  return {
    gif: '/gifs/food-pending.gif',
    title: 'Order Received ✓',
    message: "We've got your order! Kitchen will start soon.",
    color: 'text-blue-500',
    phase: 'pending',
  };
};

export default function CustomerOrderStatusPageNew() {
  const { slug = '', orderId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, refetch } = useGetPublicOrderQuery(
    { slug, orderId },
    { skip: !slug || !orderId, pollingInterval: 5000 }
  );
  const { data: restaurantData } = useGetPublicRestaurantQuery(slug, {
    skip: !slug,
  });

  // Get bill data
  const { data: billData, refetch: refetchBill } = useGenerateBillQuery(
    { restaurantId: data?.restaurantId || '', orderId },
    { skip: !data?.restaurantId }
  );

  const { toast } = useToast();

  const order = data;
  const [cancelOrder, { isLoading: isCancelling }] = useCancelPublicOrderMutation();
  const [createPaymentIntent, { isLoading: isCreatingPayment }] = useCreatePaymentIntentMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [showItems, setShowItems] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  const handleSocketEvent = useCallback(
    (incoming: Order) => {
      if (incoming.id === orderId) {
        refetch();
        refetchBill();
      }
    },
    [orderId, refetch, refetchBill]
  );

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!orderId });

  const tableFromQuery = searchParams.get('table') ?? undefined;
  const cancellableStatuses: Array<Order['status']> = [
    'pending',
    'accepted',
    'in_progress',
  ];
  const canCancelOrder = !!order && cancellableStatuses.includes(order.status);

  // Can add more items if order is not completed or cancelled
  const canAddMoreItems = !!order &&
    order.status !== 'completed' &&
    order.status !== 'cancelled';

  // Show payment button when order is ready/completed and not paid
  const showPaymentButton = !!order &&
    (order.status === 'ready' || order.status === 'completed') &&
    order.paymentStatus !== 'paid';

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => console.log('Razorpay script loaded');
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      toast({
        title: 'Payment Error',
        description: 'Failed to load payment system. Please refresh the page.',
        variant: 'destructive',
      });
    };
    document.body.appendChild(script);
    return () => {
      // Don't remove the script as it might be needed by other components
    };
  }, [toast]);

  // Handle Razorpay payment
  const handleRazorpayPayment = useCallback(async () => {
    if (!order || !restaurantData?.id || order.paymentStatus === 'paid') return;

    setIsPaymentProcessing(true);
    try {
      // Create payment intent
      const response = await createPaymentIntent({
        restaurantId: restaurantData.id,
        orderId: order.id,
      }).unwrap();

      // Check if Razorpay is loaded
      if (!window.Razorpay) {
        toast({
          title: 'Payment Error',
          description: 'Payment system not ready. Please refresh the page and try again.',
          variant: 'destructive',
        });
        return;
      }

      const options = {
        key: response.razorpayKey,
        amount: response.amount,
        currency: response.currency,
        order_id: response.razorpayOrderId,
        name: restaurantData.name,
        description: `Order #${order.orderNumber}`,
        theme: {
          color: '#000000',
        },
        handler: async function (razorpayResponse: any) {
          try {
            await verifyPayment({
              restaurantId: restaurantData.id,
              orderId: order.id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
            }).unwrap();

            toast({
              title: 'Payment Successful!',
              description: 'Your payment has been processed successfully.',
            });

            // Refresh order data
            refetch();
          } catch (verifyError: any) {
            toast({
              title: 'Payment Verification Failed',
              description: verifyError?.data?.message || 'Please contact support if money was deducted.',
              variant: 'destructive',
            });
          }
        },
        modal: {
          ondismiss: function () {
            setIsPaymentProcessing(false);
            toast({
              title: 'Payment Cancelled',
              description: 'Payment was cancelled by user.',
              variant: 'destructive',
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error?.data?.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPaymentProcessing(false);
    }
  }, [order, createPaymentIntent, verifyPayment, toast, restaurantData, refetch]);


  const handleCancelOrder = useCallback(async () => {
    if (!order || !canCancelOrder) return;

    const confirmed = window.confirm(
      'Cancel this order? The kitchen will be notified immediately.'
    );
    if (!confirmed) return;

    try {
      await cancelOrder({ slug, orderId }).unwrap();
      toast({ title: 'Order cancelled' });
    } catch (error) {
      toast({
        title: 'Unable to cancel order',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    }
  }, [cancelOrder, canCancelOrder, order, orderId, slug, toast]);

  const handleAddMoreItems = useCallback(() => {
    const tableSuffix = tableFromQuery ? `?table=${encodeURIComponent(tableFromQuery)}` : '';
    navigate(`/c/${slug}${tableSuffix}`);
  }, [navigate, slug, tableFromQuery]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <img
            src="/gifs/food-pending.gif"
            alt="Loading"
            className="w-48 h-48 mx-auto mb-4 rounded-2xl"
          />
          <p className="text-lg text-muted-foreground">Loading your order...</p>
        </motion.div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">
            We couldn't find this order. It may have been removed or the link is incorrect.
          </p>
          <Button onClick={() => navigate(`/c/${slug}`)}>Back to Menu</Button>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-2xl px-4 py-8 space-y-6"
      >
        {/* Main Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden border-2 shadow-xl">
            <CardContent className="p-8 text-center space-y-6">
              {/* Status Animation */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="flex justify-center"
              >
                <img
                  src={statusInfo.gif}
                  alt="Order status"
                  className="w-56 h-56 rounded-3xl shadow-lg"
                />
              </motion.div>

              {/* Order Number */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                <h1 className="text-5xl font-black tracking-tight">
                  #{order.orderNumber}
                </h1>
              </div>

              {/* Status Message */}
              <div>
                <h2 className={`text-2xl font-bold ${statusInfo.color} mb-2`}>
                  {statusInfo.title}
                </h2>
                <p className="text-muted-foreground text-lg">{statusInfo.message}</p>
              </div>

              {/* Order Progress Timeline */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className={`flex flex-col items-center gap-1 ${
                    ['pending', 'cooking', 'ready', 'completed'].includes(statusInfo.phase) ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      ['pending', 'cooking', 'ready', 'completed'].includes(statusInfo.phase) ? 'bg-green-600' : 'bg-muted-foreground'
                    }`} />
                    <span>Received</span>
                  </div>
                  <div className={`flex-1 h-px mx-2 ${
                    ['cooking', 'ready', 'completed'].includes(statusInfo.phase) ? 'bg-green-600' : 'bg-muted-foreground'
                  }`} />
                  <div className={`flex flex-col items-center gap-1 ${
                    ['cooking', 'ready', 'completed'].includes(statusInfo.phase) ? 'text-orange-600' : 'text-muted-foreground'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      ['cooking', 'ready', 'completed'].includes(statusInfo.phase) ? 'bg-orange-600' : 'bg-muted-foreground'
                    }`} />
                    <span>Cooking</span>
                  </div>
                  <div className={`flex-1 h-px mx-2 ${
                    ['ready', 'completed'].includes(statusInfo.phase) ? 'bg-green-600' : 'bg-muted-foreground'
                  }`} />
                  <div className={`flex flex-col items-center gap-1 ${
                    ['ready', 'completed'].includes(statusInfo.phase) ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      ['ready', 'completed'].includes(statusInfo.phase) ? 'bg-green-600' : 'bg-muted-foreground'
                    }`} />
                    <span>Ready</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="pt-4">
                {order.paymentStatus === 'paid' ? (
                  <Badge variant="default" className="text-base px-4 py-2 bg-green-500">
                    ✓ Payment Complete
                  </Badge>
                ) : (
                  <div className="rounded-xl bg-orange-50 text-orange-900 border-2 border-orange-200 p-4 dark:bg-orange-950/20 dark:text-orange-100 dark:border-orange-800">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">
                        {statusInfo.phase === 'ready' || statusInfo.phase === 'completed'
                          ? 'Ready to Pay'
                          : 'Payment Pending'
                        }
                      </span>
                    </div>
                    <p className="text-sm mt-1 opacity-80">
                      {statusInfo.phase === 'ready' || statusInfo.phase === 'completed'
                        ? 'Your food is ready! Pay when convenient.'
                        : 'Enjoy your meal, pay when ready to leave.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Payment Button - Show when food is ready */}
          {showPaymentButton && (
            <Button
              onClick={handleRazorpayPayment}
              disabled={isCreatingPayment || isPaymentProcessing}
              size="lg"
              className="col-span-2 h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {(isCreatingPayment || isPaymentProcessing) ? 'Processing...' : `Pay ${formatCurrency(order.totalAmount)}`}
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowItems(!showItems)}
            className="h-12"
          >
            {showItems ? 'Hide' : 'View'} Items
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowBill(!showBill)}
            className="h-12"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Bill
          </Button>

          {/* Add More Items button */}
          {canAddMoreItems && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleAddMoreItems}
              className="col-span-2 h-12"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add More Items
            </Button>
          )}

          {/* Cancel Order button */}
          {canCancelOrder && (
            <Button
              variant="destructive"
              size="lg"
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="col-span-2 h-12"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          )}
        </motion.div>

        {/* Items List (Collapsible) */}
        <AnimatePresence>
          {showItems && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Your Items</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowItems(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ₹{item.pricing.unitAmount} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-lg font-bold">
                        ₹{(item.pricing.unitAmount * item.quantity).toFixed(0)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bill Details (Collapsible) */}
        <AnimatePresence>
          {showBill && billData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Bill Details</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBill(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Restaurant Info */}
                  <div className="border-b pb-3">
                    <h4 className="font-semibold">{billData.restaurant.name}</h4>
                    {billData.restaurant.phone && (
                      <p className="text-sm text-muted-foreground">{billData.restaurant.phone}</p>
                    )}
                    {billData.tableNumber && (
                      <p className="text-sm text-muted-foreground">Table: {billData.tableNumber}</p>
                    )}
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {billData.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span>₹{item.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{billData.subtotal.toFixed(2)}</span>
                    </div>
                    {billData.cgstAmount > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>CGST</span>
                        <span>₹{billData.cgstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {billData.sgstAmount > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>SGST</span>
                        <span>₹{billData.sgstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {billData.igstAmount > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>IGST</span>
                        <span>₹{billData.igstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {billData.roundOffAmount !== 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Round Off</span>
                        <span>₹{billData.roundOffAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span>₹{billData.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Instructions */}
        {order.paymentStatus !== 'paid' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
          >
            <div className="text-blue-900 dark:text-blue-100 space-y-2">
              <p className="font-medium text-sm">
                {statusInfo.phase === 'ready' || statusInfo.phase === 'completed'
                  ? '💡 Ready to pay?'
                  : '💡 Payment Information'
                }
              </p>
              <p className="text-xs">
                {statusInfo.phase === 'ready' || statusInfo.phase === 'completed'
                  ? 'Your food is ready! Pay with UPI or ask staff for assistance. You can also pay later when leaving.'
                  : 'Enjoy your meal while we prepare your food. You can pay anytime - now, when food is ready, or before leaving.'
                }
              </p>
            </div>
          </motion.div>
        )}

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground space-y-2 pt-4"
        >
          <p>
            Need help? Show order <strong>#{order.orderNumber}</strong> to any staff member
          </p>
          <p className="text-xs">This page updates automatically • Refresh anytime</p>
        </motion.div>
      </motion.div>
    </div>
  );
}