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
  useCreateSessionPaymentIntentMutation,
  restaurantsApi,
} from '@/store/api/restaurantsApi';
import { generateThermalReceiptPDF } from '@/components/ThermalReceiptPDF';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import {
  useCreatePaymentIntentMutation,
  useVerifyPaymentMutation,
} from '@/store/api/ordersApi';
import {
  Plus,
  Receipt,
  CreditCard,
  Clock,
  CheckCircle,
  ChefHat,
  X,
  Utensils,
  Users,
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

// Razorpay type declaration
declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function CustomerTableSessionPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const tableId = searchParams.get('tableId') || '';

  const [createSessionPaymentIntent, { isLoading: isCreatingPayment }] =
    useCreateSessionPaymentIntentMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [getConsolidatedBill] = restaurantsApi.useLazyGetConsolidatedBillQuery();

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

  // Real-time updates for any order in the session
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

  // Extract data safely
  const tableSession = sessionData?.tableSession;
  const restaurant = sessionData?.restaurant;
  const orders = tableSession?.orders || [];
  const totals = tableSession?.totals || { totalAmount: 0 };
  const orderCount = tableSession?.orderCount || 0;
  const hasUnpaidOrders = tableSession?.hasUnpaidOrders || false;
  const allOrdersPaid = tableSession?.allOrdersPaid || false;
  const sessionClosed = tableSession?.sessionClosed || false;

  // Calculate session status
  const sessionStatus = useMemo(() => {
    if (!tableSession || orders.length === 0) {
      return null;
    }

    if (sessionClosed) {
      return {
        title: 'Session Completed',
        subtitle: 'Thank you for your visit!',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        icon: '🎉',
      };
    }

    if (allOrdersPaid) {
      return {
        title: 'Session Complete',
        subtitle: 'All orders paid',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
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
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        icon: '🍽️',
      };
    }

    if (cookingOrders.length > 0) {
      return {
        title: 'Preparing Your Food',
        subtitle: `${cookingOrders.length} order${
          cookingOrders.length > 1 ? 's' : ''
        } cooking`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        icon: '👨‍🍳',
      };
    }

    return {
      title: 'Orders Received',
      subtitle: "We'll start preparing soon",
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      icon: '📝',
    };
  }, [tableSession, orders, allOrdersPaid]);

  // Handle session payment
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
      // Get consolidated bill data BEFORE payment to store for receipt
      const billResult = await getConsolidatedBill({ slug, tableId });

      const paymentData = await createSessionPaymentIntent({
        slug,
        tableId,
      }).unwrap();

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => initializePayment(paymentData, billResult);
        document.head.appendChild(script);
      } else {
        initializePayment(paymentData, billResult);
      }
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

  const initializePayment = (paymentData: any, billResult: any) => {
    const options = {
      key: paymentData.razorpayKey,
      amount: paymentData.amount,
      currency: paymentData.currency,
      name: restaurant?.name || 'Restaurant',
      description: `Table Session Payment - ${paymentData.orderCount} orders`,
      order_id: paymentData.razorpayOrderId,
      handler: async (response: any) => {
        try {
          // Verify payment for all orders in the session
          for (const orderId of paymentData.orderIds) {
            await verifyPayment({
              restaurantId: paymentData.restaurant.id,
              orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }).unwrap();
          }

          toast({
            title: 'Payment Successful! 🎉',
            description: `Session payment of ${formatCurrency(
              paymentData.totalAmount
            )} completed`,
          });

          // Generate combined receipt and navigate to it
          try {
            // Store complete bill data for receipt page
            const billData = 'data' in billResult ? billResult.data : null;
            localStorage.setItem(
              'lastPaymentSession',
              JSON.stringify({
                slug,
                tableId,
                orderIds: paymentData.orderIds,
                totalAmount: paymentData.totalAmount,
                billData, // Store complete bill data for receipt
                timestamp: new Date().toISOString(),
              })
            );

            // Navigate to combined receipt page
            setTimeout(() => {
              navigate(`/c/${slug}/table/${tableId}/receipt`);
            }, 2000);
          } catch (error) {
            console.error('Error storing payment session:', error);
            // Still navigate even if localStorage fails
            setTimeout(() => {
              navigate(`/c/${slug}/table/${tableId}/receipt`);
            }, 2000);
          }
        } catch (error: any) {
          console.error('Payment verification failed:', error);
          toast({
            title: 'Payment Verification Failed',
            description:
              'Payment may have succeeded but verification failed. Please contact support.',
            variant: 'destructive',
          });
        }
      },
      prefill: {
        name: 'Guest Customer',
      },
      theme: {
        color: '#6366f1',
      },
      modal: {
        ondismiss: () => {
          console.log('Payment modal closed by user');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  useEffect(() => {
    refetch();
  }, []);

  if (sessionLoading) {
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
          <p className="text-lg text-muted-foreground">
            Loading your table session...
          </p>
        </motion.div>
      </div>
    );
  }

  if (sessionError || !tableSession) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className="text-xl font-bold mb-2">No Active Session</h2>
          <p className="text-muted-foreground mb-4">
            You don't have any active orders at this table.
          </p>
          <Button
            onClick={() => navigate(`/c/${slug}?tableId=${tableId}`)}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Start Ordering
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-2xl px-4 py-8 space-y-6"
      >
        {/* Header with Table Info */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold mb-2">
            Table {tableSession.tableNumber}
          </h1>
          <p className="text-muted-foreground">
            {restaurant.name} • {orderCount} Order{orderCount > 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Session Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`border-2 ${sessionStatus.bgColor}`}>
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">{sessionStatus.icon}</div>
              <h2 className={`text-xl font-bold mb-1 ${sessionStatus.color}`}>
                {sessionStatus.title}
              </h2>
              <p className="text-muted-foreground">{sessionStatus.subtitle}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Amount */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2">
            <CardContent className="p-6">
              {/* Bill Summary */}
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Session Bill Summary
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Order Amount:</span>
                    <span>
                      {formatCurrency(
                        totals.subTotalAmount || totals.totalAmount
                      )}
                    </span>
                  </div>
                  {totals.taxAmount > 0 && (
                    <>
                      {totals.cgstAmount > 0 && (
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>CGST:</span>
                          <span>{formatCurrency(totals.cgstAmount)}</span>
                        </div>
                      )}
                      {totals.sgstAmount > 0 && (
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>SGST:</span>
                          <span>{formatCurrency(totals.sgstAmount)}</span>
                        </div>
                      )}
                      {totals.igstAmount > 0 && (
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>IGST:</span>
                          <span>{formatCurrency(totals.igstAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Total Tax:</span>
                        <span>{formatCurrency(totals.taxAmount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Final Total */}
              <div className="text-center border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Final Amount
                </p>
                <p className="text-3xl font-bold mb-3">
                  {formatCurrency(totals.totalAmount)}
                </p>
                {hasUnpaidOrders && (
                  <Badge
                    variant="outline"
                    className="border-orange-300 text-orange-700"
                  >
                    Payment Pending
                  </Badge>
                )}
                {allOrdersPaid && (
                  <Badge variant="default" className="bg-green-500">
                    ✓ Fully Paid
                  </Badge>
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
          {/* Pay Now Button - Show when payment is pending and session not closed */}
          {hasUnpaidOrders && !sessionClosed && (
            <Button
              size="lg"
              className="col-span-2 h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
              onClick={handleSessionPayment}
              disabled={isCreatingPayment}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {isCreatingPayment
                ? 'Processing...'
                : `Pay Session Total - ${formatCurrency(totals.totalAmount)}`}
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            className="col-span-2 h-12"
            onClick={async () => {
              try {
                // Get consolidated bill data with tax calculation
                const result = await getConsolidatedBill({ slug, tableId });

                if ('data' in result && result.data) {
                  // Generate PDF using @react-pdf/renderer
                  const pdfBlob = await generateThermalReceiptPDF({
                    restaurant: result.data.restaurant,
                    bill: result.data.bill,
                  });

                  // Create download link
                  const url = URL.createObjectURL(pdfBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `table-${tableSession.tableNumber}-bill.pdf`;
                  document.body.appendChild(link);
                  link.click();

                  // Cleanup
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                } else {
                  throw new Error(result.error?.toString() || 'Failed to get bill data');
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
            <Receipt className="mr-2 h-4 w-4" />
            Download Bill - {formatCurrency(totals.totalAmount)}
          </Button>

          {/* Order More Items - Only show when session is not closed */}
          {!sessionClosed && (
            <Button
              variant="default"
              size="lg"
              className="col-span-2 h-12 bg-primary"
              onClick={() =>
                navigate(`/c/${slug}?tableId=${tableId}&addMore=true`)
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Order More Items
            </Button>
          )}
        </motion.div>

        {/* Call Waiter Button */}
        {restaurant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CallWaiterButton
              tableId={tableId}
              restaurantId={restaurant.id}
              orderId={orders[0]?.id} // Use first order ID for waiter call
            />
          </motion.div>
        )}

        {/* Orders List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-bold">Your Orders</h3>
          {orders.map((order) => {
            const statusDisplay = getOrderStatusDisplay(order);
            const StatusIcon = statusDisplay.icon;

            return (
              <Card key={order.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <StatusIcon
                        className={`h-5 w-5 ${statusDisplay.color}`}
                      />
                      <div>
                        <h4 className="font-semibold">#{order.orderNumber}</h4>
                        <p className={`text-sm ${statusDisplay.color}`}>
                          {statusDisplay.text}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      {order.paymentStatus === 'paid' ? (
                        <Badge
                          variant="default"
                          className="bg-green-500 text-xs"
                        >
                          Paid
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-orange-300 text-orange-700 text-xs"
                        >
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Toggle Order Details */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      setShowOrderDetails(
                        showOrderDetails === order.id ? null : order.id
                      )
                    }
                  >
                    {showOrderDetails === order.id ? (
                      <>
                        <X className="mr-2 h-3 w-3" />
                        Hide Items
                      </>
                    ) : (
                      <>
                        <Utensils className="mr-2 h-3 w-3" />
                        View Items ({order.items.length})
                      </>
                    )}
                  </Button>

                  {/* Order Items Details */}
                  <AnimatePresence>
                    {showOrderDetails === order.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 pt-3 border-t space-y-2"
                      >
                        {order.items.map((item, index) => (
                          <div
                            key={`${item.name}-${index}`}
                            className="flex justify-between text-sm"
                          >
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <span className="text-muted-foreground ml-2">
                                ₹{item.pricing.unitAmount} × {item.quantity}
                              </span>
                            </div>
                            <span className="font-medium">
                              ₹
                              {(
                                item.pricing.unitAmount * item.quantity
                              ).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-muted-foreground space-y-2 pt-4"
        >
          <p>
            Need help? Show your table number{' '}
            <strong>{tableSession.tableNumber}</strong> to staff
          </p>
          <p className="text-xs">This page updates automatically</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
