import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  Receipt,
  ShoppingCart,
  Clock,
  CheckCircle,
  Users,
  Utensils,
} from 'lucide-react';
import {
  useGetTableSessionPublicQuery,
  useGetConsolidatedBillQuery,
  useGetPublicRestaurantQuery,
} from '@/store/api/restaurantsApi';
import {
  useCreateCashfreeSessionPaymentIntentMutation,
  useVerifyCashfreePublicPaymentMutation,
} from '@/store/api/cashfreeApi';
import { initializeCashfree, openCashfreeCheckout } from '@/utils/cashfree';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import type { Order } from '@/store/api/types';

interface ConsolidatedBill {
  restaurant: any;
  bill: {
    tableNumber: string;
    orders: Order[];
    totalAmount: number;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
  };
}

const CustomerTableSessionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tableId = searchParams.get('tableId');
  const tableNumber = searchParams.get('table');

  // API Queries
  const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } =
    useGetTableSessionPublicQuery(
      { slug: slug!, tableId: tableId! },
      { skip: !slug || !tableId, pollingInterval: 5000 }
    );

  const { data: billData, isLoading: isBillLoading, refetch: refetchBill } =
    useGetConsolidatedBillQuery(
      { slug: slug!, tableId: tableId! },
      { skip: !slug || !tableId }
    );

  const { data: restaurantData } = useGetPublicRestaurantQuery(slug!, {
    skip: !slug,
  });

  // Mutations
  const [createSessionPaymentIntent, { isLoading: isCreatingPayment }] =
    useCreateCashfreeSessionPaymentIntentMutation();

  // Socket for real-time updates
  const { isConnected } = useOrderSocket();

  // State
  const [showOrderDetails, setShowOrderDetails] = useState<{ [orderId: string]: boolean }>({});

  // Initialize Cashfree
  useEffect(() => {
    initializeCashfree({
      mode: import.meta.env.VITE_CASHFREE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
    }).catch(error => {
      console.error('Failed to initialize Cashfree:', error);
    });
  }, []);

  // Computed values
  const unpaidOrders = useMemo(() => {
    if (!sessionData?.orders) return [];
    return sessionData.orders.filter(
      order => order.paymentStatus !== 'paid' && order.status !== 'cancelled'
    );
  }, [sessionData]);

  const paidOrders = useMemo(() => {
    if (!sessionData?.orders) return [];
    return sessionData.orders.filter(order => order.paymentStatus === 'paid');
  }, [sessionData]);

  const totalUnpaidAmount = useMemo(() => {
    return unpaidOrders.reduce((sum, order) => sum + order.total, 0);
  }, [unpaidOrders]);

  const totalPaidAmount = useMemo(() => {
    return paidOrders.reduce((sum, order) => sum + order.total, 0);
  }, [paidOrders]);

  const canMakeSessionPayment = useMemo(() => {
    return unpaidOrders.length > 0 && totalUnpaidAmount > 0;
  }, [unpaidOrders, totalUnpaidAmount]);

  // Handle session payment
  const handleSessionPayment = useCallback(async () => {
    if (!canMakeSessionPayment || !slug || !tableId) return;

    try {
      // Create session payment intent
      const response = await createSessionPaymentIntent({
        slug,
        tableId,
        sessionData: {
          customerSessionId: sessionData?.customerSessionId || `session_${Date.now()}`,
          customerDetails: {
            customerName: 'Table Customer',
            customerEmail: 'customer@example.com',
            customerPhone: '9999999999',
          }
        }
      }).unwrap();

      console.log('Cashfree session payment response:', response);

      // Show payment summary
      toast({
        title: 'Processing Payment',
        description: `Paying ₹${(totalUnpaidAmount / 100).toFixed(2)} for ${unpaidOrders.length} orders`,
      });

      // Open Cashfree checkout
      await openCashfreeCheckout({
        paymentSessionId: response.paymentSessionId,
        redirectTarget: '_self'
      });

    } catch (error: any) {
      console.error('Session payment error:', error);
      toast({
        title: 'Payment Error',
        description: error?.data?.message || 'Failed to process session payment.',
        variant: 'destructive',
      });
    }
  }, [
    canMakeSessionPayment,
    slug,
    tableId,
    createSessionPaymentIntent,
    sessionData,
    totalUnpaidAmount,
    unpaidOrders.length,
    toast
  ]);

  // Toggle order details
  const toggleOrderDetails = useCallback((orderId: string) => {
    setShowOrderDetails(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  }, []);

  // Loading states
  if (isSessionLoading || isBillLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData && !billData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
              <p className="text-gray-600 mb-4">
                {tableNumber
                  ? `No orders found for table ${tableNumber}.`
                  : 'No orders found for this session.'
                }
              </p>
              <Button onClick={() => navigate(`/c/${slug}`)}>
                Start Ordering
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const allOrders = sessionData?.orders || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {tableNumber ? `Table ${tableNumber}` : 'Table Session'}
          </h1>
          <p className="text-gray-600 mt-1">
            {restaurantData?.name} • {allOrders.length} order(s)
          </p>
        </div>

        {/* Session Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <ShoppingCart className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{allOrders.length}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{unpaidOrders.length}</p>
              <p className="text-sm text-gray-600">Pending Payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{paidOrders.length}</p>
              <p className="text-sm text-gray-600">Paid Orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Session Payment Card */}
        {canMakeSessionPayment && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-green-800">
                <CreditCard className="h-5 w-5" />
                Session Payment Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-green-800">
                    Pay for {unpaidOrders.length} unpaid orders:
                  </span>
                  <span className="text-2xl font-bold text-green-900">
                    ₹{(totalUnpaidAmount / 100).toFixed(2)}
                  </span>
                </div>
                <Button
                  onClick={handleSessionPayment}
                  disabled={isCreatingPayment}
                  className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
                >
                  {isCreatingPayment ? 'Processing...' : 'Pay All Orders'}
                </Button>
                <p className="text-sm text-green-700 text-center">
                  ✓ Automatic restaurant settlement • ✓ Single payment for all orders
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        <div className="space-y-4">
          {/* Unpaid Orders */}
          {unpaidOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Pending Payment ({unpaidOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {unpaidOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    showDetails={showOrderDetails[order.id]}
                    onToggleDetails={() => toggleOrderDetails(order.id)}
                    isPaid={false}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Paid Orders */}
          {paidOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Paid Orders ({paidOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paidOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    showDetails={showOrderDetails[order.id]}
                    onToggleDetails={() => toggleOrderDetails(order.id)}
                    isPaid={true}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/c/${slug}`)}
            className="w-full"
          >
            Continue Ordering
          </Button>

          {allOrders.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                toast({
                  title: 'Receipt Generated',
                  description: 'Session receipt is being prepared...',
                });
              }}
              className="w-full"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Get Session Receipt
            </Button>
          )}
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-yellow-600" />
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

// Order Card Component
interface OrderCardProps {
  order: Order;
  showDetails: boolean;
  onToggleDetails: () => void;
  isPaid: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, showDetails, onToggleDetails, isPaid }) => {
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      ready: 'bg-purple-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Order #{order.orderNumber}</h3>
          <Badge variant="secondary" className={getStatusColor(order.status)}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
          {isPaid && (
            <Badge variant="secondary" className="bg-green-500">
              Paid
            </Badge>
          )}
        </div>
        <div className="text-right">
          <p className="font-semibold">₹{(order.total / 100).toFixed(2)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDetails}
            className="text-xs"
          >
            {showDetails ? 'Hide' : 'Show'} Items
          </Button>
        </div>
      </div>

      {showDetails && order.items && (
        <div className="space-y-2 pt-3 border-t">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.name}
                {item.notes && <span className="text-gray-500"> ({item.notes})</span>}
              </span>
              <span>₹{((item.quantity * item.pricing.unitAmount) / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Settlement Status for Paid Orders */}
      {isPaid && order.paymentMeta?.cashfree?.settlementType === 'split_payment' && (
        <div className="bg-green-50 p-2 rounded text-xs text-green-800">
          ✓ Paid with automatic restaurant settlement
        </div>
      )}
    </div>
  );
};

export default CustomerTableSessionPage;