import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Receipt,
  ChevronDown,
  ChevronUp,
  Bell,
  X
} from 'lucide-react';
import {
  useGetPublicOrderQuery,
  useGetPublicRestaurantQuery,
  useCancelPublicOrderMutation,
} from '@/store/api/restaurantsApi';
import {
  useCreateCashfreePublicPaymentIntentMutation,
  useVerifyCashfreePublicPaymentMutation,
} from '@/store/api/cashfreeApi';
import { initializeCashfree, openCashfreeCheckout } from '@/utils/cashfree';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { useDeviceOrders } from '@/hooks/useDeviceOrders';
import type { Order } from '@/store/api/types';

interface DeviceOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

const CustomerOrderStatusPageNew: React.FC = () => {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
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
  const [cancelOrder, { isLoading: isCancelling }] = useCancelPublicOrderMutation();
  const [createPaymentIntent, { isLoading: isCreatingPayment }] = useCreateCashfreePublicPaymentIntentMutation();
  const [verifyPayment] = useVerifyCashfreePublicPaymentMutation();
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showItems, setShowItems] = useState(false);

  // Socket connection for real-time order updates
  const { isConnected } = useOrderSocket();

  // Device orders management
  const {
    deviceId: deviceIdFromHook,
    orders: deviceOrdersFromHook,
    addOrder,
    updateOrder,
  } = useDeviceOrders();

  useEffect(() => {
    setDeviceId(deviceIdFromHook);
    setDeviceOrders(deviceOrdersFromHook);
  }, [deviceIdFromHook, deviceOrdersFromHook]);

  // Handle socket events for order updates
  const handleSocketEvent = useCallback(
    (incoming: Order) => {
      if (incoming.id === orderId) {
        refetch();
      }

      // Update device orders
      updateOrder(incoming.id, {
        orderId: incoming.id,
        orderNumber: incoming.orderNumber,
        status: incoming.status,
        totalAmount: incoming.total,
        createdAt: incoming.createdAt,
      });
    },
    [orderId, refetch, updateOrder]
  );

  // Initialize order in device storage
  useEffect(() => {
    if (order && deviceId) {
      addOrder({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.total,
        createdAt: order.createdAt,
      });
    }
  }, [order, deviceId, addOrder]);

  // Initialize Cashfree
  useEffect(() => {
    initializeCashfree({
      mode: import.meta.env.VITE_CASHFREE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
    }).catch(error => {
      console.error('Failed to initialize Cashfree:', error);
    });
  }, []);

  // Handle Cashfree payment
  const handleCashfreePayment = useCallback(async () => {
    if (!order || !slug || order.paymentStatus === 'paid') return;

    try {
      // Create payment intent
      const response = await createPaymentIntent({
        slug,
        orderId: order.id,
        customerDetails: {
          customerName: 'Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '9999999999',
        }
      }).unwrap();

      console.log('Cashfree payment intent response:', response);

      // Open Cashfree checkout
      await openCashfreeCheckout({
        paymentSessionId: response.paymentSessionId,
        redirectTarget: '_self'
      });

    } catch (error: any) {
      console.error('Cashfree payment error:', error);
      toast({
        title: 'Payment Error',
        description: error?.data?.message || 'Failed to initiate payment.',
        variant: 'destructive',
      });
    }
  }, [order, slug, createPaymentIntent, toast]);

  const handleCancelOrder = useCallback(async () => {
    if (!order || !canCancelOrder) {
      return;
    }

    try {
      await cancelOrder({ slug: slug!, orderId: order.id }).unwrap();
      toast({
        title: 'Order cancelled',
        description: `Order #${order.orderNumber} has been cancelled.`,
      });
      refetch();
    } catch (error: any) {
      console.error('Cancel order error:', error);
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to cancel order.',
        variant: 'destructive',
      });
    }
  }, [order, cancelOrder, slug, toast, refetch]);

  // Compute derived state
  const canCancelOrder = useMemo(() => {
    if (!order) return false;
    return order.status === 'confirmed' || order.status === 'pending';
  }, [order]);

  const statusConfig = useMemo(() => {
    if (!order) return null;

    const configs = {
      pending: {
        color: 'bg-yellow-500',
        text: 'Pending',
        description: 'Order is being processed',
        progress: 10,
      },
      confirmed: {
        color: 'bg-blue-500',
        text: 'Confirmed',
        description: 'Order confirmed by restaurant',
        progress: 25,
      },
      preparing: {
        color: 'bg-orange-500',
        text: 'Preparing',
        description: 'Your order is being prepared',
        progress: 50,
      },
      ready: {
        color: 'bg-green-500',
        text: 'Ready',
        description: 'Your order is ready for pickup',
        progress: 75,
      },
      completed: {
        color: 'bg-emerald-500',
        text: 'Completed',
        description: 'Order completed',
        progress: 100,
      },
      cancelled: {
        color: 'bg-red-500',
        text: 'Cancelled',
        description: 'Order has been cancelled',
        progress: 0,
      },
    };

    return configs[order.status] || configs.pending;
  }, [order]);

  const paymentStatusConfig = useMemo(() => {
    if (!order) return null;

    const configs = {
      pending: { color: 'bg-yellow-500', text: 'Payment Pending' },
      paid: { color: 'bg-green-500', text: 'Payment Successful' },
      failed: { color: 'bg-red-500', text: 'Payment Failed' },
      cancelled: { color: 'bg-gray-500', text: 'Payment Cancelled' },
    };

    return configs[order.paymentStatus] || configs.pending;
  }, [order]);

  const showPayButton = useMemo(() => {
    if (!order) return false;
    return order.paymentStatus === 'pending' && order.status !== 'cancelled';
  }, [order]);

  const showCancelButton = useMemo(() => {
    if (!order) return false;
    return canCancelOrder && order.paymentStatus === 'pending';
  }, [order, canCancelOrder]);

  // Loading and error states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
              <p className="text-gray-600 mb-4">
                The order you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate(`/c/${slug}`)}>
                Back to Menu
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Order #{order.orderNumber}
          </h1>
          <p className="text-gray-600 mt-1">
            {restaurantData?.name}
          </p>
        </div>

        {/* Order Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusConfig?.color}`}></div>
              Order Status: {statusConfig?.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={statusConfig?.progress || 0} className="w-full" />
            <p className="text-sm text-gray-600">{statusConfig?.description}</p>

            {/* Payment Status */}
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm font-medium">Payment Status:</span>
              <Badge variant="secondary" className={paymentStatusConfig?.color}>
                {paymentStatusConfig?.text}
              </Badge>
            </div>

            {/* Settlement Info for Split Payments */}
            {order.paymentStatus === 'paid' && order.paymentMeta?.cashfree?.settlementType === 'split_payment' && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    Payment processed with automatic settlement
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Restaurant will receive payment automatically within minutes
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowItems(!showItems)}
                className="flex items-center gap-2"
              >
                {showItems ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showItems ? 'Hide' : 'Show'} Items
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showItems && (
              <div className="space-y-3">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-start border-b pb-2 last:border-b-0">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1">Note: {item.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{(item.quantity * item.pricing.unitAmount / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t font-semibold text-lg">
              <span>Total Amount:</span>
              <span>₹{(order.total / 100).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Pay Now Button - Updated for Cashfree */}
          {showPayButton && (
            <Button
              onClick={handleCashfreePayment}
              disabled={isCreatingPayment}
              className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {isCreatingPayment ? 'Processing...' : `Pay ₹${(order.total / 100).toFixed(2)}`}
            </Button>
          )}

          {/* Cancel Order Button */}
          {showCancelButton && (
            <Button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              variant="outline"
              className="w-full border-red-200 text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/c/${slug}`)}
              className="flex-1"
            >
              Back to Menu
            </Button>
            {order.paymentStatus === 'paid' && (
              <Button
                variant="outline"
                onClick={() => setShowReceiptDialog(true)}
                className="flex-1"
              >
                <Receipt className="h-4 w-4 mr-2" />
                View Receipt
              </Button>
            )}
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Reconnecting to get live updates...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrderStatusPageNew;