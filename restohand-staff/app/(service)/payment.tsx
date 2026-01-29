import {
  useGetOrderQuery,
  useUpdateOrderPaymentMutation,
  useGenerateReceiptQrQuery,
  useGenerateCombinedReceiptQrMutation,
} from '@/store/api/ordersApi';
import { PaymentRoundingDialog } from '@/components/PaymentRoundingDialog';
import {
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
} from '@/store/api/restaurantsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { skipToken } from '@reduxjs/toolkit/query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const formatCurrency = (amount: number, showDecimals: boolean = true) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);

export default function ServicePaymentScreen() {
  const { orderId, tableId, orderData, allOrdersData, totalBillAmount } = useLocalSearchParams();
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRoundingDialog, setShowRoundingDialog] = useState(false);
  const [showReceiptQr, setShowReceiptQr] = useState(false);

  // State to hold current order data
  const [currentOrder, setCurrentOrder] = useState(null);
  // State to hold updated orders after payment
  const [updatedOrdersState, setUpdatedOrdersState] = useState(null);

  // Parse order data from route params (fallback to RTK query if not available)
  const orderFromParams = orderData ? JSON.parse(orderData as string) : null;

  // Parse multiple orders data for combined payment
  const allOrdersFromParams = allOrdersData ? JSON.parse(allOrdersData as string) : null;
  const combinedBillAmount = totalBillAmount ? parseFloat(totalBillAmount as string) : null;

  // Get order details (always fetch to ensure we can refetch after payment)
  const {
    data: orderFromQuery,
    isLoading: orderLoading,
    refetch: refetchOrder,
  } = useGetOrderQuery(
    restaurantId && orderId
      ? { restaurantId, orderId: orderId as string }
      : skipToken,
    { skip: !restaurantId || !orderId }
  );

  // Use order priority: updated state > fresh query > params
  const order = currentOrder || orderFromQuery || orderFromParams;

  // Always process orders as array - simplified logic
  const ordersToProcess = updatedOrdersState || allOrdersFromParams || (order ? [order] : []);

  // Calculate combined bill details
  const combinedBillDetails = useMemo(() => {
    if (!ordersToProcess.length) return null;

    const combined = {
      subTotalAmount: 0,
      taxAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      discountAmount: 0,
      grossAmount: 0,
      totalAmount: 0,
      roundOffAmount: 0,
      orderNumbers: [],
      orderCount: ordersToProcess.length,
    };

    ordersToProcess.forEach((ord) => {
      combined.subTotalAmount += ord.subTotalAmount || 0;
      combined.taxAmount += ord.taxAmount || 0;
      combined.cgstAmount += ord.cgstAmount || 0;
      combined.sgstAmount += ord.sgstAmount || 0;
      combined.igstAmount += ord.igstAmount || 0;
      combined.discountAmount += ord.discountAmount || 0;
      combined.grossAmount += ord.grossAmount || 0;
      combined.totalAmount += ord.totalAmount || 0;
      combined.roundOffAmount += ord.roundOffAmount || 0;
      combined.orderNumbers.push(ord.orderNumber);
    });

    return combined;
  }, [ordersToProcess]);

  // Use combined total if available, otherwise fallback to single order
  const finalTotalAmount = combinedBillAmount || combinedBillDetails?.totalAmount || order?.totalAmount || 0;

  // Initialize current order when component loads
  useEffect(() => {
    if (orderFromParams && !currentOrder) {
      setCurrentOrder(orderFromParams);
    } else if (orderFromQuery && !currentOrder) {
      setCurrentOrder(orderFromQuery);
    }
  }, [orderFromParams, orderFromQuery, currentOrder]);

  // Get restaurant details
  const { data: restaurant, refetch: refetchRestaurant } =
    useGetRestaurantQuery(restaurantId ?? skipToken, { skip: !restaurantId });

  // Get table details
  const { data: enhancedTables, refetch: refetchTables } =
    useListEnhancedTablesQuery(restaurantId ? { restaurantId } : skipToken, {
      skip: !restaurantId,
    });

  console.log(
    restaurantId,
    orderId,
    order?.paymentStatus,
    'checking receipt qr fetch'
  );

  // Check if all orders in the array are paid
  const allOrdersPaid = useMemo(() => {
    return ordersToProcess.every((ord: any) => ord.paymentStatus === 'paid');
  }, [ordersToProcess]);

  // Add combined receipt QR mutation
  const [generateCombinedReceiptQr, { data: combinedReceiptQr, isLoading: isCombinedQrLoading }] = useGenerateCombinedReceiptQrMutation();

  // Generate receipt QR (single order only - combined receipts handled in processPayment)
  const primaryOrderForQr = ordersToProcess[0];
  const { data: singleReceiptQr, refetch: generateSingleQr } = useGenerateReceiptQrQuery(
    { restaurantId: restaurantId!, orderId: primaryOrderForQr?._id || primaryOrderForQr?.id || (orderId as string) },
    { skip: !restaurantId || !primaryOrderForQr || !allOrdersPaid || ordersToProcess.length > 1 || !(primaryOrderForQr._id || primaryOrderForQr.id || orderId) }
  );

  // Use the appropriate receipt QR based on whether we have multiple orders
  const receiptQr = ordersToProcess.length > 1 ? combinedReceiptQr : singleReceiptQr;

  const selectedTable = useMemo(() => {
    return enhancedTables?.find((table) => table.id === tableId) ?? null;
  }, [enhancedTables, tableId]);

  const [updatePayment] = useUpdateOrderPaymentMutation();

  // Refresh function to update order, restaurant, and table data
  const handleRefresh = async () => {
    await Promise.all([refetchOrder(), refetchRestaurant(), refetchTables()]);
  };

  // Generate UPI payment string
  const upiString = useMemo(() => {
    if (!restaurant?.upi?.vpa || !finalTotalAmount) return '';

    const amount = finalTotalAmount.toFixed(2);
    const orderInfo = ordersToProcess.length > 1
      ? `Orders ${combinedBillDetails?.orderNumbers.join(', ')}`
      : `Order ${ordersToProcess[0]?.orderNumber}`;

    const params = new URLSearchParams({
      pa: restaurant.upi.vpa,
      pn: restaurant.upi.displayName || restaurant.name,
      am: amount,
      cu: 'INR',
      tn: orderInfo,
    });

    return `upi://pay?${params.toString()}`;
  }, [restaurant, finalTotalAmount, ordersToProcess.length, combinedBillDetails, ordersToProcess]);

  const handleMarkAsPaid = async (method: 'cash' | 'upi') => {
    console.log('handleMarkAsPaid called with method:', method);

    if (!finalTotalAmount || !restaurantId || ordersToProcess.length === 0) {
      Alert.alert('Error', 'Missing order or restaurant data');
      return;
    }

    // For cash payments, show rounding dialog
    if (method === 'cash') {
      setShowRoundingDialog(true);
      return;
    }

    // For UPI payments, use exact amount (no rounding)
    await processPayment(method, finalTotalAmount, 0);
  };

  const processPayment = async (
    method: 'cash' | 'upi',
    finalAmount: number,
    roundOffAmount: number
  ) => {
    setIsProcessing(true);
    try {
      console.log('Making API call to update payment...', {
        method,
        finalAmount,
        roundOffAmount,
        orderCount: ordersToProcess.length,
      });

      console.log('ordersToProcess:', ordersToProcess);

      // Always process orders as an array (simplified logic)
      const results = [];
      for (const orderToUpdate of ordersToProcess) {
        // Calculate proportional amount for this order
        const proportionalAmount = ordersToProcess.length > 1
          ? (orderToUpdate.totalAmount / (combinedBillDetails?.totalAmount || 1)) * finalAmount
          : finalAmount;
        const proportionalRounding = ordersToProcess.length > 1
          ? (orderToUpdate.totalAmount / (combinedBillDetails?.totalAmount || 1)) * roundOffAmount
          : roundOffAmount;

        const result = await updatePayment({
          restaurantId: restaurantId!,
          orderId: orderToUpdate._id || orderToUpdate.id,
          paymentStatus: 'paid',
          provider: method === 'upi' ? 'upi' : 'cash',
        }).unwrap();
        results.push(result);
      }
      console.log('All payments updated successfully:', results);

      // Update local state - mark all orders as paid
      const updatedOrders = ordersToProcess.map((ord: any) => ({
        ...ord,
        paymentStatus: 'paid'
      }));

      // Update both the orders list and current order state
      setUpdatedOrdersState(updatedOrders);
      if (updatedOrders.length > 0) {
        setCurrentOrder(updatedOrders[0]);
      }

      // Generate receipt QR - combined for multiple orders, single for one order
      if (ordersToProcess.length > 1) {
        const orderIds = ordersToProcess.map((ord: any) => ord.id || ord._id);
        const tableNum = selectedTable?.tableNumber || selectedTable?.displayName;
        await generateCombinedReceiptQr({
          restaurantId: restaurantId!,
          orderIds,
          tableNumber: tableNum,
        });
      }
      // For single orders, the useGenerateReceiptQrQuery hook will handle it automatically

      // Payment successful - user can now see QR code option or navigate to bill manually
    } catch (error: any) {
      console.error('Payment update failed:', error);
      Alert.alert(
        'Payment Update Failed',
        error?.message || 'Failed to update payment status'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoundingConfirm = (
    finalAmount: number,
    roundOffAmount: number
  ) => {
    setShowRoundingDialog(false);
    processPayment('cash', finalAmount, roundOffAmount);
  };

  const handleOpenUPI = async () => {
    if (!upiString) {
      Alert.alert('Error', 'UPI payment not configured');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(upiString);
      if (supported) {
        await Linking.openURL(upiString);
      } else {
        Alert.alert(
          'No UPI Apps Found',
          'Please install a UPI app like PhonePe, Paytm, or Google Pay'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open UPI app');
    }
  };

  const getOrderStatusInfo = () => {
    if (!order) return null;

    if (allOrdersPaid) {
      return {
        icon: 'checkmark-circle',
        text: ordersToProcess.length > 1 ? 'All Payments Complete' : 'Payment Complete',
        color: '#16a34a',
        bgColor: '#f0fdf4',
      };
    }

    return {
      icon: 'time',
      text: ordersToProcess.length > 1 ? 'Payments Pending' : 'Payment Pending',
      color: '#ea580c',
      bgColor: '#fff7ed',
    };
  };

  if (orderLoading && !orderFromParams) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Order Not Found</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Unable to load order details</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getOrderStatusInfo();
  const tableNumber =
    selectedTable?.displayName || selectedTable?.tableNumber || tableId;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Payment</Text>
          <Text style={styles.subtitle}>Order #{order.orderNumber}</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        {statusInfo && (
          <View
            style={[styles.statusCard, { backgroundColor: statusInfo.bgColor }]}
          >
            <View style={styles.statusContent}>
              <Ionicons
                name={statusInfo.icon as any}
                size={24}
                color={statusInfo.color}
              />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.text}
                </Text>
                <Text style={styles.statusSubtext}>
                  Table {tableNumber} • {formatCurrency(finalTotalAmount)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      allOrdersPaid ? '#16a34a' : '#dc2626',
                  },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {allOrdersPaid ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Receipt QR Code - Show only if paid */}
        {allOrdersPaid && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Receipt</Text>
            <TouchableOpacity
              style={styles.receiptButton}
              onPress={() => setShowReceiptQr(true)}
            >
              <Ionicons name="qr-code" size={24} color="#3b82f6" />
              <View style={styles.receiptButtonContent}>
                <Text style={styles.receiptButtonTitle}>
                  Show Receipt QR Code
                </Text>
                <Text style={styles.receiptButtonSubtitle}>
                  Let customer scan to get their receipt
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* View Bill Button - Show only if paid */}
        {/* {order.paymentStatus === 'paid' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.viewBillButton}
              onPress={() =>
                router.push({
                  pathname: '/(service)/bill',
                  params: {
                    orderId: order._id,
                    orderData: JSON.stringify(order),
                  },
                })
              }
            >
              <Ionicons name="document-text" size={20} color="#ffffff" />
              <Text style={styles.viewBillButtonText}>
                View Bill & Print Receipt
              </Text>
            </TouchableOpacity>
          </View>
        )} */}

        {/* Payment Methods - Show only if not paid */}
        {!allOrdersPaid && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose Payment Method</Text>
              <View style={styles.paymentMethods}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    paymentMethod === 'upi' && styles.activeMethodButton,
                  ]}
                  onPress={() => setPaymentMethod('upi')}
                >
                  <Ionicons
                    name="phone-portrait"
                    size={24}
                    color={paymentMethod === 'upi' ? '#ffffff' : '#2563eb'}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      paymentMethod === 'upi' && styles.activeMethodText,
                    ]}
                  >
                    UPI Payment
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    paymentMethod === 'cash' && styles.activeMethodButton,
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Ionicons
                    name="cash"
                    size={24}
                    color={paymentMethod === 'cash' ? '#ffffff' : '#059669'}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      paymentMethod === 'cash' && styles.activeMethodText,
                    ]}
                  >
                    Cash Payment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* UPI Payment Section */}
            {paymentMethod === 'upi' && restaurant.upi?.vpa && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>UPI Payment</Text>
                <View style={styles.upiCard}>
                  {/* UPI ID */}
                  <View style={styles.upiIdContainer}>
                    <Text style={styles.upiLabel}>UPI ID</Text>
                    <View style={styles.upiIdCard}>
                      <Text style={styles.upiId}>{restaurant.upi.vpa}</Text>
                    </View>
                  </View>

                  {/* Amount */}
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Amount to pay</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(finalTotalAmount)}
                    </Text>
                  </View>

                  {/* Open UPI App Button */}
                  <TouchableOpacity
                    style={styles.upiButton}
                    onPress={handleOpenUPI}
                  >
                    <Ionicons name="phone-portrait" size={20} color="#ffffff" />
                    <Text style={styles.upiButtonText}>Open UPI App</Text>
                  </TouchableOpacity>

                  {/* Instructions */}
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsText}>
                      Customer will pay the exact amount digitally
                    </Text>
                    <Text style={styles.instructionsSubtext}>
                      UPI/digital payments use precise amounts (no rounding)
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Cash Payment Section */}
            {paymentMethod === 'cash' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cash Payment</Text>
                <View style={styles.cashCard}>
                  <View style={styles.cashAmountContainer}>
                    <Text style={styles.cashIcon}>💵</Text>
                    <Text style={styles.cashAmount}>
                      {formatCurrency(finalTotalAmount)}
                    </Text>
                    <Text style={styles.cashLabel}>
                      Collect cash from customer
                    </Text>
                  </View>
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsText}>
                      Click "Mark as Paid" to choose the exact amount to collect
                    </Text>
                    <Text style={styles.instructionsSubtext}>
                      You'll be able to round up/down for cash convenience
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Mark as Paid Button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.markPaidButton}
                onPress={() => {
                  console.log('Mark as Paid button pressed!');
                  handleMarkAsPaid(paymentMethod);
                }}
                disabled={isProcessing}
              >
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <Text style={styles.markPaidButtonText}>
                  {isProcessing
                    ? 'Processing...'
                    : `Mark as Paid (${paymentMethod.toUpperCase()})`}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {ordersToProcess.length > 1 ? `Order Items (${ordersToProcess.length} Orders)` : 'Order Items'}
          </Text>
          <View style={styles.orderCard}>
            {/* Show items from all orders */}
            {ordersToProcess.map((orderData: any, orderIndex: any) => (
              <View key={`order-${orderIndex}`}>
                {ordersToProcess.length > 1 && (
                  <Text style={styles.orderHeader}>Order #{orderData.orderNumber}</Text>
                )}
                {orderData.items.map((item: any, itemIndex: any) => (
                  <View key={`${orderIndex}-${item.name}-${itemIndex}`} style={styles.orderItem}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDetails}>
                        ₹{item.pricing.unitAmount} × {item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      ₹{(item.pricing.unitAmount * item.quantity).toFixed(0)}
                    </Text>
                  </View>
                ))}
                {ordersToProcess.length > 1 && orderIndex < ordersToProcess.length - 1 && (
                  <View style={styles.orderSeparator} />
                )}
              </View>
            ))}

            {/* Combined Bill Breakdown */}
            {ordersToProcess.length > 1 && combinedBillDetails && (
              <View style={styles.billBreakdown}>
                <View style={styles.divider} />
                <Text style={styles.breakdownTitle}>Bill Summary</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal</Text>
                  <Text style={styles.breakdownAmount}>
                    {formatCurrency(combinedBillDetails.subTotalAmount)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tax (CGST + SGST)</Text>
                  <Text style={styles.breakdownAmount}>
                    {formatCurrency(combinedBillDetails.cgstAmount + combinedBillDetails.sgstAmount)}
                  </Text>
                </View>
                {combinedBillDetails.discountAmount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Discount</Text>
                    <Text style={styles.breakdownAmount}>
                      -{formatCurrency(combinedBillDetails.discountAmount)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(finalTotalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            {ordersToProcess.length > 1
              ? `Show orders ${combinedBillDetails?.orderNumbers.join(', ')} to kitchen staff if needed`
              : `Show order #${order.orderNumber} to kitchen staff if needed`
            }
          </Text>
          <Text style={styles.helpText}>
            This screen will update automatically after payment
          </Text>
        </View>
      </ScrollView>

      {/* Payment Rounding Dialog */}
      {order && (
        <PaymentRoundingDialog
          visible={showRoundingDialog}
          exactAmount={finalTotalAmount}
          onClose={() => setShowRoundingDialog(false)}
          onConfirm={handleRoundingConfirm}
        />
      )}

      {/* Receipt QR Modal */}
      <Modal
        visible={showReceiptQr}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReceiptQr(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Receipt QR Code</Text>
              <TouchableOpacity
                style={styles.qrCloseButton}
                onPress={() => setShowReceiptQr(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {receiptQr ? (
              <View style={styles.qrContent}>
                <Image
                  source={{ uri: receiptQr.qrCodeDataUrl }}
                  style={styles.qrCodeImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrInstructions}>
                  Ask your customer to scan this QR code to download their
                  receipt
                </Text>
                <Text style={styles.qrOrderInfo}>
                  {ordersToProcess.length > 1
                    ? `Orders #${receiptQr.orderNumbers?.join(', #') || receiptQr.orderNumber}`
                    : `Order #${receiptQr.orderNumber}`
                  }
                </Text>
                <Text style={styles.qrExpiryInfo}>
                  Valid until{' '}
                  {new Date(receiptQr.expiresAt).toLocaleDateString('en-IN')}
                </Text>
              </View>
            ) : (
              <View style={styles.qrLoadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.qrLoadingText}>Generating QR code...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
  statusCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  receiptButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  receiptButtonContent: {
    flex: 1,
  },
  receiptButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  receiptButtonSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  viewBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  viewBillButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  activeMethodButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activeMethodText: {
    color: '#ffffff',
  },
  upiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  upiIdContainer: {
    gap: 8,
  },
  upiLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  upiIdCard: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
  },
  upiId: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#1f2937',
  },
  amountContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    gap: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  upiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  upiButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cashCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  cashAmountContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    gap: 8,
  },
  cashIcon: {
    fontSize: 32,
  },
  cashAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cashLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  instructionsContainer: {
    gap: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  instructionsSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  markPaidButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  itemDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  helpContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // QR Modal Styles
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  qrCloseButton: {
    padding: 8,
  },
  qrContent: {
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  qrCodeImage: {
    width: 250,
    height: 250,
  },
  qrInstructions: {
    fontSize: 16,
    textAlign: 'center',
    color: '#1f2937',
  },
  qrOrderInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  qrExpiryInfo: {
    fontSize: 12,
    color: '#6b7280',
  },
  qrLoadingContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  qrLoadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  orderHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  billBreakdown: {
    marginTop: 8,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
});
