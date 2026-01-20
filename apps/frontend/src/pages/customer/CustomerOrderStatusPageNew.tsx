'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CreditCard, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  useGetPublicOrderQuery,
  useGetPublicRestaurantQuery,
  useCancelPublicOrderMutation,
} from '@/store/api/restaurantsApi';
import { useCreatePaymentIntentMutation, useVerifyPaymentMutation } from '@/store/api/ordersApi';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import type { Order } from '@/store/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ReceiptDialog } from '@/components/customer/ReceiptDialog';
import { CallWaiterButton } from '@/components/customer/CallWaiterButton';

// Razorpay type declaration
declare global {
  interface Window {
    Razorpay?: any;
  }
}

// Simplified status display
const getStatusInfo = (order: Order) => {
  const { status, progress } = order;

  if (status === 'cancelled') {
    return {
      gif: '/gifs/cancel.gif',
      title: 'Order Cancelled',
      message: 'This order has been cancelled',
      color: 'text-red-500',
    };
  }

  if (status === 'completed') {
    return {
      gif: '/gifs/completed.gif',
      title: 'Order Complete! 🎉',
      message: 'Thanks for ordering with us!',
      color: 'text-green-500',
    };
  }

  if (status === 'ready' || progress === 100) {
    return {
      gif: '/gifs/ready.gif',
      title: 'Your Order is Ready! 🍽️',
      message: 'Please collect your order',
      color: 'text-green-500',
    };
  }

  if (status === 'in_progress' || progress >= 40) {
    return {
      gif: '/gifs/cooking.gif',
      title: 'Cooking Your Food 👨‍🍳',
      message: 'Your order is being prepared',
      color: 'text-orange-500',
    };
  }

  // pending or accepted
  return {
    gif: '/gifs/food-pending.gif',
    title: 'Order Received ✓',
    message: "We'll start preparing soon",
    color: 'text-blue-500',
  };
};

type DeviceOrder = {
  orderId: string;
  orderNumber: string;
  slug: string;
  totalAmount: number;
  createdAt: string;
  paymentMethod: Order['paymentMethod'];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export default function CustomerOrderStatusPage() {
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
  const { toast } = useToast();

  const order = data;
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceOrders, setDeviceOrders] = useState<DeviceOrder[]>([]);
  const [cancelOrder, { isLoading: isCancelling }] =
    useCancelPublicOrderMutation();
  const [createPaymentIntent, { isLoading: isCreatingPayment }] = useCreatePaymentIntentMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showItems, setShowItems] = useState(false);

  const handleSocketEvent = useCallback(
    (incoming: Order) => {
      if (incoming.id === orderId) {
        refetch();
      }
    },
    [orderId, refetch]
  );

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!orderId });

  const tableFromQuery = searchParams.get('table') ?? undefined;
  const cancellableStatuses: Array<Order['status']> = [
    'pending',
    'accepted',
    'in_progress',
  ];
  const canCancelOrder = !!order && cancellableStatuses.includes(order.status);
  const canStartNewOrder =
    !!order && (order.status === 'completed' || order.status === 'cancelled');

  // Allow customers to go back to menu if order is ready/completed
  const canReturnToMenu =
    !!order &&
    (order.status === 'ready' || order.status === 'completed');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existingId = localStorage.getItem('restohand:device-id');
    if (existingId) {
      setDeviceId(existingId);
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem('restohand:device-id', newId);
      setDeviceId(newId);
    }

    const historyRaw = localStorage.getItem('restohand:order-history');
    if (historyRaw) {
      try {
        const parsed = JSON.parse(historyRaw) as DeviceOrder[];
        setDeviceOrders(parsed);
      } catch (error) {
        console.error('Unable to parse order history', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!order || typeof window === 'undefined') return;

    const record: DeviceOrder = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      slug,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
    };

    setDeviceOrders((prev) => {
      const updated = [
        record,
        ...prev.filter((entry) => entry.orderId !== record.orderId),
      ];
      const trimmed = updated.slice(0, 5);
      localStorage.setItem('restohand:order-history', JSON.stringify(trimmed));
      return trimmed;
    });
  }, [order, slug]);

  // Restaurant info for receipt
  const restaurantInfo = useMemo(() => {
    if (!restaurantData) return undefined;
    return {
      name: restaurantData.name,
      address: restaurantData.address,
      phone: restaurantData.contactInfo?.phone,
      email: restaurantData.contactInfo?.email,
      gstNumber: restaurantData.gstNumber,
    };
  }, [restaurantData]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => console.log('Razorpay script loaded');
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
    };
    document.body.appendChild(script);
  }, []);

  // Handle Razorpay payment
  const handleRazorpayPayment = useCallback(async () => {
    if (!order || !restaurantData?.id || order.paymentStatus === 'paid') return;

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
          description: 'Payment system not ready. Please refresh the page.',
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
              description: verifyError?.data?.message || 'Please contact support.',
              variant: 'destructive',
            });
          }
        },
        modal: {
          ondismiss: function () {
            toast({
              title: 'Payment Cancelled',
              description: 'Payment was cancelled.',
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
        description: error?.data?.message || 'Failed to initiate payment.',
        variant: 'destructive',
      });
    }
  }, [order, createPaymentIntent, verifyPayment, toast, restaurantData, refetch]);

  const handleCancelOrder = useCallback(async () => {
    if (!order || !canCancelOrder) {
      return;
    }

    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            'Cancel this order? The kitchen will be notified immediately.'
          );
    if (!confirmed) return;

    try {
      await cancelOrder({ slug, orderId }).unwrap();
      toast({ title: 'Order cancelled' });
      handleStartNewOrder(true);
    } catch (error) {
      toast({
        title: 'Unable to cancel order',
        description:
          error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    }
  }, [cancelOrder, canCancelOrder, order, orderId, slug, toast]);

  const handleStartNewOrder = useCallback(
    (force = false) => {
      if (!force && !canStartNewOrder) {
        toast({
          title: 'Order still in progress',
          description: 'Please wait for the current order to finish.',
        });
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('restohand:order-history');
        localStorage.removeItem('restohand:device-id');
      }
      setDeviceOrders([]);
      setDeviceId(null);
      const tableSuffix = tableFromQuery
        ? `?table=${encodeURIComponent(tableFromQuery)}`
        : '';
      navigate(`/c/${slug}${tableSuffix}`);
    },
    [canStartNewOrder, navigate, slug, tableFromQuery, toast]
  );

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
            We couldn't find this order. It may have been removed or the link is
            incorrect.
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
              {/* GIF Animation */}
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
                <p className="text-sm text-muted-foreground mb-1">
                  Order Number
                </p>
                <h1 className="text-5xl font-black tracking-tight">
                  #{order.orderNumber}
                </h1>
              </div>

              {/* Status Message */}
              <div>
                <h2 className={`text-2xl font-bold ${statusInfo.color} mb-2`}>
                  {statusInfo.title}
                </h2>
                <p className="text-muted-foreground text-lg">
                  {statusInfo.message}
                </p>
              </div>

              {/* Payment Status */}
              {order.paymentStatus === 'paid' ? (
                <Badge
                  variant="default"
                  className="text-base px-4 py-2 bg-green-500"
                >
                  ✓ Payment Complete
                </Badge>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl bg-orange-50 text-orange-900 border-2 border-orange-200 p-4 dark:bg-orange-950/20 dark:text-orange-100 dark:border-orange-800"
                >
                  <p className="font-medium text-base">
                    💳 Payment Pending
                  </p>
                  <p className="text-sm mt-1 opacity-80">
                    Pay now with UPI or ask staff for assistance
                  </p>
                </motion.div>
              )}

              {/* Total Amount */}
              <div className="pt-4 border-t-2 border-dashed">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Amount
                </p>
                <p className="text-4xl font-bold">
                  {formatCurrency(order.totalAmount)}
                </p>
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
          {/* Pay Now Button - Show when payment is pending */}
          {order.paymentStatus !== 'paid' && (
            <Button
              onClick={handleRazorpayPayment}
              disabled={isCreatingPayment}
              size="lg"
              className="col-span-2 h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {isCreatingPayment ? 'Processing...' : `Pay ${formatCurrency(order.totalAmount)}`}
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
            onClick={() => setShowReceiptDialog(true)}
            className="h-12"
          >
            View Receipt
          </Button>

          {/* Add More Items button - show for active orders */}
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const tableSuffix = tableFromQuery
                  ? `?table=${encodeURIComponent(tableFromQuery)}`
                  : '';
                navigate(`/c/${slug}${tableSuffix}`);
              }}
              className="col-span-2 h-12"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add More Items
            </Button>
          )}

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

          {canStartNewOrder && (
            <Button
              variant="default"
              size="lg"
              onClick={handleStartNewOrder}
              className="col-span-2 h-12"
            >
              Start New Order
            </Button>
          )}

          {/* Back to Menu button for completed orders */}
          {!canStartNewOrder && canReturnToMenu && (
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                const tableSuffix = tableFromQuery
                  ? `?table=${encodeURIComponent(tableFromQuery)}`
                  : '';
                navigate(`/c/${slug}${tableSuffix}`);
              }}
              className="col-span-2 h-12"
            >
              <Plus className="mr-2 h-4 w-4" />
              Back to Menu
            </Button>
          )}

          {/* General Back to Menu button for ongoing orders */}
          {!canStartNewOrder &&
           !canReturnToMenu &&
           order.status !== 'cancelled' &&
           order.status !== 'completed' && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const tableSuffix = tableFromQuery
                  ? `?table=${encodeURIComponent(tableFromQuery)}`
                  : '';
                navigate(`/c/${slug}${tableSuffix}`);
              }}
              className="col-span-2 h-12"
            >
              <Plus className="mr-2 h-4 w-4" />
              Back to Menu
            </Button>
          )}
        </motion.div>

        {/* Call Waiter Button - Show when customer is at a table */}
        {restaurantData && tableFromQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CallWaiterButton
              tableId={tableFromQuery}
              restaurantId={restaurantData.id}
              orderId={order.id}
            />
          </motion.div>
        )}

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

        {/* Payment Instructions - Show after customer pays */}
        {order.paymentStatus !== 'paid' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
          >
            <div className="text-blue-900 dark:text-blue-100 space-y-2">
              <p className="font-medium text-sm">
                💡 After paying with UPI:
              </p>
              <p className="text-xs">
                Show your payment confirmation to any staff member. They will mark your order as paid and you'll get a receipt!
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
            Need help? Show order <strong>#{order.orderNumber}</strong> to staff
          </p>
          <p className="text-xs">This page updates automatically</p>
        </motion.div>

        {/* Receipt Dialog */}
        {order && (
          <ReceiptDialog
            open={showReceiptDialog}
            onOpenChange={setShowReceiptDialog}
            order={order}
            restaurantInfo={restaurantInfo}
          />
        )}
      </motion.div>
    </div>
  );
}