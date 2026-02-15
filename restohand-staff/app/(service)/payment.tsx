import { PaymentRoundingDialog } from '@/components/PaymentRoundingDialog';
import { Colors } from '@/constants/theme';
import {
  useGenerateReceiptQrQuery,
  useGenerateSessionReceiptQrMutation,
  useGetOrderQuery,
  useUpdateOrderPaymentMutation,
} from '@/store/api/ordersApi';
import {
  useGetSessionWithBillQuery,
} from '@/store/api/customerSessionsApi';
import {
  useGetDetailedSessionBillQuery,
  type DetailedBillCalculation,
} from '@/store/api/billingApi';
import {
  useGetCombinedTableInvoiceQuery,
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
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

const formatCurrency = (amount: number, showDecimals: boolean = true) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);

export default function ServicePaymentScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { orderId, tableId, orderData, allOrdersData, totalBillAmount, sessionId } =
    useLocalSearchParams();
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRoundingDialog, setShowRoundingDialog] = useState(false);
  const [showReceiptQr, setShowReceiptQr] = useState(false);
  const [shouldGenerateOrderQr, setShouldGenerateOrderQr] = useState(false);

  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [updatedOrdersState, setUpdatedOrdersState] = useState<any>(null);

  const orderFromParams = orderData ? JSON.parse(orderData as string) : null;
  const allOrdersFromParams = allOrdersData
    ? JSON.parse(allOrdersData as string)
    : null;
  const combinedBillAmount = totalBillAmount
    ? parseFloat(totalBillAmount as string)
    : null;

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

  // Get session-based billing if sessionId is provided (moved before ordersToProcess)
  const {
    data: sessionBilling,
    isLoading: sessionBillingLoading,
    refetch: refetchSessionBilling,
  } = useGetSessionWithBillQuery(sessionId as string, {
    skip: !sessionId,
  });

  // Get detailed session billing with item breakdown (like OrdersPage)
  const {
    data: detailedSessionBill,
    isLoading: detailedBillLoading,
    refetch: refetchDetailedBill,
  } = useGetDetailedSessionBillQuery(
    sessionId ? { sessionId: sessionId as string, includeUnpaid: true } : { sessionId: '', includeUnpaid: true },
    { skip: !sessionId }
  );

  const order = currentOrder || orderFromQuery || orderFromParams;
  const ordersToProcess =
    updatedOrdersState ||
    (sessionBilling?.orders && sessionBilling.orders.length > 0 ? sessionBilling.orders : null) ||
    allOrdersFromParams ||
    (order ? [order] : []);

  const { data: restaurant, refetch: refetchRestaurant } =
    useGetRestaurantQuery(restaurantId ?? skipToken, { skip: !restaurantId });

  const { data: enhancedTables, refetch: refetchTables } =
    useListEnhancedTablesQuery(restaurantId ? { restaurantId } : skipToken, {
      skip: !restaurantId,
    });

  const selectedTable = useMemo(() => {
    return enhancedTables?.find((table) => table.id === tableId) ?? null;
  }, [enhancedTables, tableId]);

  const {
    data: sessionInvoice,
    isLoading: sessionInvoiceLoading,
    refetch: refetchSessionInvoice,
  } = useGetCombinedTableInvoiceQuery(
    restaurant?.slug && tableId
      ? {
          slug: restaurant.slug,
          tableId: tableId as string,
        }
      : skipToken,
    {
      skip: !restaurant?.slug || !tableId,
    }
  );

  const combinedBillDetails = useMemo(() => {
    // Prioritize session billing over table-based billing
    if (sessionBilling?.bill) {
      const bill = sessionBilling.bill;
      return {
        subTotalAmount: bill.subTotalAmount,
        taxAmount: bill.taxAmount,
        cgstAmount: bill.cgstAmount,
        sgstAmount: bill.sgstAmount,
        igstAmount: bill.igstAmount,
        discountAmount: bill.discountAmount || 0,
        totalAmount: bill.totalAmount,
        roundOffAmount: bill.roundOffAmount,
        orderNumbers: sessionBilling.orders.map((order: any) => order.orderNumber),
        orderCount: sessionBilling.orders.length,
        isSessionBased: true,
      };
    }

    if (sessionInvoice?.bill) {
      const bill = sessionInvoice.bill;
      return {
        subTotalAmount: bill.subtotal,
        taxAmount: bill.taxAmount,
        cgstAmount: bill.cgstAmount,
        sgstAmount: bill.sgstAmount,
        igstAmount: bill.igstAmount,
        discountAmount: bill.discountAmount || 0,
        totalAmount: bill.totalAmount,
        roundOffAmount: bill.roundOffAmount,
        orderNumbers: bill.orders.map((order: any) => order.orderNumber),
        orderCount: bill.orders.length,
        isSessionBased: false,
      };
    }

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
      orderNumbers: [] as string[],
      orderCount: ordersToProcess.length,
    };

    ordersToProcess.forEach((ord: any) => {
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
  }, [sessionBilling, sessionInvoice, ordersToProcess]);

  const finalTotalAmount =
    sessionBilling?.bill?.totalAmount ||
    sessionInvoice?.bill?.totalAmount ||
    combinedBillAmount ||
    combinedBillDetails?.totalAmount ||
    order?.totalAmount ||
    0;

  useEffect(() => {
    if (orderFromParams && !currentOrder) {
      setCurrentOrder(orderFromParams);
    } else if (orderFromQuery && !currentOrder) {
      setCurrentOrder(orderFromQuery);
    }
  }, [orderFromParams, orderFromQuery, currentOrder]);

  const allOrdersPaid = useMemo(() => {
    return ordersToProcess.every((ord: any) => ord.paymentStatus === 'paid');
  }, [ordersToProcess]);

  // Generate QR for the primary order after payment
  const primaryOrderForQr = ordersToProcess[0];

  // FRESH DATA: Fetch the latest order data to ensure we have customerSessionId
  const { data: freshOrderData } = useGetOrderQuery(
    {
      restaurantId: restaurantId!,
      orderId: primaryOrderForQr?.id!,
    },
    {
      skip: !restaurantId || !primaryOrderForQr?.id,
    }
  );

  // Use fresh data if available, fallback to cached data
  const orderWithSession = freshOrderData || primaryOrderForQr;
  const hasSessionId = orderWithSession?.customerSessionId;

  // Debug logging
  console.log('DEBUG QR Generation:', {
    primaryOrder: primaryOrderForQr,
    freshOrderData,
    orderWithSession,
    customerSessionId: orderWithSession?.customerSessionId,
    hasSessionId,
    allOrdersPaid,
  });

  // Use session-based QR generation if order has a session
  const [generateSessionReceiptQr, { data: sessionReceiptQr, isLoading: isGeneratingSessionQr }] = useGenerateSessionReceiptQrMutation();


  // Fallback to individual order QR if no session (only when triggered)
  const { data: orderReceiptQr, isLoading: isGeneratingOrderQr } = useGenerateReceiptQrQuery(
    {
      restaurantId: restaurantId!,
      orderId: primaryOrderForQr?.id || (orderId as string),
    },
    {
      skip: !shouldGenerateOrderQr || !restaurantId || !primaryOrderForQr?.id || hasSessionId,
    }
  );

  const receiptQr = sessionReceiptQr || orderReceiptQr;
  const isGeneratingQr = isGeneratingSessionQr || isGeneratingOrderQr;

  // Function to generate QR when button is clicked
  const handleGenerateQr = async () => {
    if (!allOrdersPaid || !restaurantId) return;

    try {
      // Prioritize session-based QR generation when sessionId is available
      if (sessionId && sessionBilling?.session) {
        // Generate session-based QR
        const tableNumber = sessionBilling.session.tableNumber;
        const result = await generateSessionReceiptQr({
          restaurantId,
          customerSessionId: sessionId as string,
          tableNumber,
        }).unwrap();

        // Show QR modal immediately after successful generation
        if (result) {
          setShowReceiptQr(true);
        }
      } else if (hasSessionId && orderWithSession) {
        // Generate session-based QR from order data
        const tableNumber = orderWithSession.tableNumber;
        const result = await generateSessionReceiptQr({
          restaurantId,
          customerSessionId: orderWithSession.customerSessionId,
          tableNumber,
        }).unwrap();

        // Show QR modal immediately after successful generation
        if (result) {
          setShowReceiptQr(true);
        }
      } else {
        // Generate individual order QR by enabling the query
        setShouldGenerateOrderQr(true);
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const [updatePayment] = useUpdateOrderPaymentMutation();

  const handleRefresh = async () => {
    await Promise.all([
      refetchOrder(),
      refetchRestaurant(),
      refetchTables(),
      refetchSessionInvoice(),
      refetchSessionBilling(),
      refetchDetailedBill(),
    ]);
  };

  const handleMarkAsPaid = async (method: 'cash' | 'card') => {
    if (!finalTotalAmount || !restaurantId || ordersToProcess.length === 0) {
      Alert.alert('Error', 'Missing order or restaurant data');
      return;
    }

    if (method === 'cash') {
      setShowRoundingDialog(true);
      return;
    }

    await processPayment(method, finalTotalAmount, 0);
  };

  const processPayment = async (
    method: 'cash' | 'card',
    finalAmount: number,
    roundOffAmount: number
  ) => {
    setIsProcessing(true);
    try {
      const results = [];
      for (const orderToUpdate of ordersToProcess) {
        const proportionalAmount =
          ordersToProcess.length > 1
            ? (orderToUpdate.totalAmount /
                (combinedBillDetails?.totalAmount || 1)) *
              finalAmount
            : finalAmount;
        const proportionalRounding =
          ordersToProcess.length > 1
            ? (orderToUpdate.totalAmount /
                (combinedBillDetails?.totalAmount || 1)) *
              roundOffAmount
            : roundOffAmount;

        const result = await updatePayment({
          restaurantId: restaurantId!,
          orderId: orderToUpdate._id || orderToUpdate.id,
          paymentStatus: 'paid',
          provider: method === 'card' ? 'card' : 'cash',
        }).unwrap();
        results.push(result);
      }

      const updatedOrders = ordersToProcess.map((ord: any) => ({
        ...ord,
        paymentStatus: 'paid',
      }));

      setUpdatedOrdersState(updatedOrders);
      if (updatedOrders.length > 0) {
        setCurrentOrder(updatedOrders[0]);
      }

      // QR will be automatically generated by the query when order becomes paid
    } catch (error: any) {
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

  const getOrderStatusInfo = () => {
    if (!order) return null;

    if (allOrdersPaid) {
      return {
        icon: 'checkmark-circle',
        text:
          ordersToProcess.length > 1
            ? 'All Payments Complete'
            : 'Payment Complete',
        color: '#16a34a',
        bgColor: isDark ? '#064E3B' : '#f0fdf4',
      };
    }

    return {
      icon: 'time',
      text: ordersToProcess.length > 1 ? 'Payments Pending' : 'Payment Pending',
      color: '#fff',
      bgColor: isDark ? '#A6631E' : '#fff7ed',
    };
  };

  if (orderLoading && !orderFromParams) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
              borderBottomColor: isDark ? '#374151' : '#e5e7eb',
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: theme.text }]}>
              Loading...
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order || !restaurant) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
              borderBottomColor: isDark ? '#374151' : '#e5e7eb',
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: theme.text }]}>
              Order Not Found
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            Unable to load order details
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getOrderStatusInfo();
  const tableNumber =
    selectedTable?.displayName || selectedTable?.tableNumber || tableId;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.background,
            borderBottomColor: isDark ? '#374151' : '#e5e7eb',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.text }]}>Payment</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            {sessionBilling
              ? `Customer Session • ${sessionBilling.orders.length} orders`
              : `Order #${order.orderNumber}`}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: isDark ? '#374151' : '#f3f4f6' },
          ]}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        {statusInfo && (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: statusInfo.bgColor,
                borderColor: isDark ? statusInfo.color : 'rgba(0, 0, 0, 0.05)',
              },
            ]}
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
                <Text style={[styles.statusSubtext, { color: theme.icon }]}>
                  Table {tableNumber} • {formatCurrency(finalTotalAmount)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: allOrdersPaid ? '#16a34a' : '#dc2626' },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {allOrdersPaid ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Receipt QR Code */}
        {allOrdersPaid && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Customer Receipt
            </Text>
            <TouchableOpacity
              style={[
                styles.receiptButton,
                {
                  backgroundColor: theme.background,
                  borderColor: isDark ? '#374151' : '#e5e7eb',
                },
              ]}
              onPress={() => {
                if (receiptQr && !isGeneratingQr) {
                  // QR already generated, show it immediately
                  setShowReceiptQr(true);
                } else if (!isGeneratingQr) {
                  // Generate new QR code (will show modal automatically)
                  handleGenerateQr();
                }
              }}
              disabled={isGeneratingQr}
            >
              <Ionicons name="qr-code" size={24} color={theme.brand} />
              <View style={styles.receiptButtonContent}>
                <Text
                  style={[styles.receiptButtonTitle, { color: theme.text }]}
                >
                  {isGeneratingQr
                    ? 'Generating QR Code...'
                    : receiptQr
                      ? 'Show Receipt QR Code'
                      : 'Generate Receipt QR Code'
                  }
                </Text>
                <Text
                  style={[styles.receiptButtonSubtitle, { color: theme.icon }]}
                >
                  {isGeneratingQr
                    ? 'Please wait...'
                    : receiptQr
                      ? 'Let customer scan to get their receipt'
                      : 'Click to generate QR code for customer receipt'
                  }
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={theme.icon} />
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Methods */}
        {!allOrdersPaid && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Choose Payment Method
              </Text>
              <View style={styles.paymentMethods}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    {
                      backgroundColor:
                        paymentMethod === 'card'
                          ? theme.brand
                          : theme.background,
                      borderColor:
                        paymentMethod === 'card'
                          ? theme.brand
                          : isDark
                          ? '#374151'
                          : '#e5e7eb',
                    },
                  ]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <Ionicons
                    name="card"
                    size={24}
                    color={paymentMethod === 'card' ? '#ffffff' : theme.brand}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      {
                        color:
                          paymentMethod === 'card' ? '#ffffff' : theme.text,
                      },
                    ]}
                  >
                    Card Payment
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    {
                      backgroundColor:
                        paymentMethod === 'cash' ? '#059669' : theme.background,
                      borderColor:
                        paymentMethod === 'cash'
                          ? '#059669'
                          : isDark
                          ? '#374151'
                          : '#e5e7eb',
                    },
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
                      {
                        color:
                          paymentMethod === 'cash' ? '#ffffff' : theme.text,
                      },
                    ]}
                  >
                    Cash Payment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Card Payment Section */}
            {paymentMethod === 'card' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Card Payment
                </Text>
                <View
                  style={[
                    styles.cardCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: isDark ? '#374151' : '#e5e7eb',
                      borderWidth: 1,
                      borderRadius: 12,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.cardAmountContainer,
                      { backgroundColor: isDark ? '#1F2937' : '#f9fafb' },
                    ]}
                  >
                    <Text style={styles.cardIcon}>💳</Text>
                    <Text style={[styles.cardAmount, { color: theme.text }]}>
                      {formatCurrency(finalTotalAmount)}
                    </Text>
                    <Text style={[styles.cardLabel, { color: theme.icon }]}>
                      Process card payment
                    </Text>
                  </View>
                  <View style={styles.instructionsContainer}>
                    <Text
                      style={[styles.instructionsText, { color: theme.icon }]}
                    >
                      Payment is collected outside the system
                    </Text>
                    <Text
                      style={[
                        styles.instructionsSubtext,
                        { color: theme.icon },
                      ]}
                    >
                      Simply mark as paid after collecting payment
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Cash Payment Section */}
            {paymentMethod === 'cash' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Cash Payment
                </Text>
                <View
                  style={[
                    styles.cashCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: isDark ? '#374151' : '#e5e7eb',
                      borderWidth: 1,
                      borderRadius: 12,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.cashAmountContainer,
                      { backgroundColor: isDark ? '#1F2937' : '#f9fafb' },
                    ]}
                  >
                    <Text style={styles.cashIcon}>💵</Text>
                    <Text style={[styles.cashAmount, { color: theme.text }]}>
                      {formatCurrency(finalTotalAmount)}
                    </Text>
                    <Text style={[styles.cashLabel, { color: theme.icon }]}>
                      Collect cash from customer
                    </Text>
                  </View>
                  <View style={styles.instructionsContainer}>
                    <Text
                      style={[styles.instructionsText, { color: theme.icon }]}
                    >
                      Click "Mark as Paid" to choose the exact amount to collect
                    </Text>
                    <Text
                      style={[
                        styles.instructionsSubtext,
                        { color: theme.icon },
                      ]}
                    >
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
                onPress={() => handleMarkAsPaid(paymentMethod)}
                disabled={isProcessing}
              >
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <Text style={styles.markPaidButtonText}>
                  {isProcessing
                    ? 'Processing...'
                    : `Mark as Paid - ${
                        paymentMethod === 'card' ? 'Card' : 'Cash'
                      }`}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Detailed Session Bill - Matching OrdersPage Design */}
        {detailedSessionBill && (
          <View style={styles.section}>
            {/* Restaurant Info Section */}
            <View style={[styles.restaurantInfoSection, { backgroundColor: isDark ? '#1F2937' : '#f9fafb' }]}>
              <Text style={[styles.sectionHeader, { color: theme.text }]}>
                Restaurant Details
              </Text>
              <Text style={[styles.restaurantName, { color: theme.text }]}>
                {detailedSessionBill.restaurant.name}
              </Text>
              {detailedSessionBill.restaurant.address && (
                <Text style={[styles.restaurantAddress, { color: theme.icon }]}>
                  {detailedSessionBill.restaurant.address.line1}, {detailedSessionBill.restaurant.address.city}
                </Text>
              )}
              {detailedSessionBill.restaurant.phone && (
                <Text style={[styles.restaurantContact, { color: theme.icon }]}>
                  Phone: {detailedSessionBill.restaurant.phone}
                </Text>
              )}
              {detailedSessionBill.restaurant.gstin && (
                <Text style={[styles.restaurantContact, { color: theme.icon }]}>
                  GSTIN: {detailedSessionBill.restaurant.gstin}
                </Text>
              )}
            </View>

            {/* All Items Section */}
            <View style={styles.allItemsSection}>
              <Text style={[styles.sectionHeader, { color: theme.text }]}>
                All Items ({detailedSessionBill.allItems.length})
              </Text>
              <View style={styles.itemsList}>
                {detailedSessionBill.allItems.map((item, index) => {
                  const pricePerUnitWithTax = item.totalWithTax / item.quantity;
                  return (
                    <View key={index} style={[styles.itemCard, {
                      backgroundColor: theme.background,
                      borderColor: isDark ? '#374151' : '#e5e7eb'
                    }]}>
                      <View style={styles.itemCardContent}>
                        <View style={styles.itemMainInfo}>
                          <Text style={[styles.itemCardName, { color: theme.text }]}>
                            {item.name}
                          </Text>
                          <Text style={[styles.itemCalculation, { color: theme.icon }]}>
                            {item.quantity} × {formatCurrency(pricePerUnitWithTax)} = {formatCurrency(item.totalWithTax)}
                          </Text>
                          {item.totalTaxAmount > 0 && (
                            <Text style={[styles.gstInfo, { color: theme.icon }]}>
                              {item.gstRate > 0 ? (
                                `GST @ ${item.gstRate}% • Tax: ${formatCurrency(item.totalTaxAmount)}`
                              ) : (
                                `VAT (25%) • Tax: ${formatCurrency(item.totalTaxAmount)}`
                              )}
                            </Text>
                          )}
                          {item.hsnCode && (
                            <Text style={[styles.hsnCode, { color: theme.icon }]}>
                              HSN: {item.hsnCode}
                            </Text>
                          )}
                        </View>
                        <View style={styles.itemPriceInfo}>
                          <Text style={[styles.itemCardTotal, { color: theme.text }]}>
                            {formatCurrency(item.totalWithTax)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Orders Breakdown Section */}
            <View style={styles.ordersBreakdownSection}>
              <Text style={[styles.sectionHeader, { color: theme.text }]}>
                Orders ({detailedSessionBill.orderBreakdown.length})
              </Text>
              {detailedSessionBill.orderBreakdown.map((order) => (
                <View key={order.orderId} style={[styles.orderBreakdownCard, { backgroundColor: isDark ? '#1F2937' : '#f9fafb' }]}>
                  <View style={styles.orderBreakdownHeader}>
                    <View style={styles.orderMainInfo}>
                      <Text style={[styles.orderBreakdownNumber, { color: theme.text }]}>
                        #{order.orderNumber}
                      </Text>
                      <Text style={[styles.orderBreakdownDetails, { color: theme.icon }]}>
                        Payment: {order.paymentStatus} • {order.itemCount} items
                      </Text>
                      <Text style={[styles.orderBreakdownDate, { color: theme.icon }]}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN')} {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={[styles.orderBreakdownAmount, { color: theme.text }]}>
                      {formatCurrency(order.totalAmount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Detailed Bill Summary - Matching OrdersPage style */}
            <View style={[styles.sessionTotalSection, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}>
              <View style={styles.sessionTotalHeader}>
                <Text style={[styles.sessionTotalLabel, { color: theme.text }]}>
                  Session Total
                </Text>
                <Text style={[styles.sessionTotalAmount, { color: theme.text }]}>
                  {formatCurrency(detailedSessionBill.totalAmount)}
                </Text>
              </View>

              <View style={styles.sessionTotalBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: theme.icon }]}>
                    Subtotal
                  </Text>
                  <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                    {formatCurrency(detailedSessionBill.subTotalAmount)}
                  </Text>
                </View>

                {/* Branch Charges - Dynamic Display */}
                {detailedSessionBill.branchCharges && detailedSessionBill.branchCharges.length > 0 && (
                  <>
                    {detailedSessionBill.branchCharges.map((charge, index) => {
                      let chargeName = charge.name;
                      if (charge.type === 'percentage') {
                        chargeName += ` (${charge.value}%)`;
                      }

                      return (
                        <View key={index} style={styles.breakdownRow}>
                          <Text style={[styles.breakdownLabel, { color: theme.icon }]}>
                            {chargeName}
                          </Text>
                          <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                            {formatCurrency(charge.amount)}
                          </Text>
                        </View>
                      );
                    })}
                  </>
                )}

                {/* Dynamic Tax breakdown - handle both mixed and simple tax scenarios */}
                {detailedSessionBill.taxAmount > 0 && (
                  <>
                    {/* Check if we have category-wise tax calculations */}
                    {detailedSessionBill.categoryCalculations && detailedSessionBill.categoryCalculations.length > 0 ? (
                      <>
                        {/* Category-wise tax breakdown */}
                        {detailedSessionBill.categoryCalculations.map((categoryCalc, index) => {
                          if (categoryCalc.totalTaxAmount === 0) return null;

                          const categoryName = categoryCalc.category
                            .replace('_', ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase());

                          const taxTypeLabel = categoryCalc.taxType === 'vat' ? 'VAT' : 'GST';
                          const taxRate =
                            categoryCalc.taxType === 'gst'
                              ? categoryCalc.gstRate
                              : categoryCalc.vatRate;

                          const displayText = `${categoryName} ${taxTypeLabel}${
                            taxRate ? ` (${taxRate}%)` : ''
                          }`;

                          return (
                            <View key={index} style={styles.breakdownRow}>
                              <Text style={[styles.breakdownLabel, { color: theme.icon }]}>
                                {displayText}
                              </Text>
                              <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                                {formatCurrency(categoryCalc.totalTaxAmount)}
                              </Text>
                            </View>
                          );
                        })}

                        {/* GST breakdown if GST items exist */}
                        {(detailedSessionBill.totalGstAmount || 0) > 0 &&
                         (detailedSessionBill.cgstAmount > 0 || detailedSessionBill.sgstAmount > 0 || detailedSessionBill.igstAmount > 0) && (
                          <>
                            <View style={styles.breakdownRow}>
                              <Text style={[styles.breakdownLabel, { color: theme.text, fontWeight: '600' }]}>
                                GST Breakdown
                              </Text>
                              <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                                {/* Empty for header */}
                              </Text>
                            </View>

                            {detailedSessionBill.cgstAmount > 0 && (
                              <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabel, { color: theme.icon, paddingLeft: 16 }]}>
                                  CGST
                                </Text>
                                <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                                  {formatCurrency(detailedSessionBill.cgstAmount)}
                                </Text>
                              </View>
                            )}

                            {detailedSessionBill.sgstAmount > 0 && (
                              <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabel, { color: theme.icon, paddingLeft: 16 }]}>
                                  SGST
                                </Text>
                                <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                                  {formatCurrency(detailedSessionBill.sgstAmount)}
                                </Text>
                              </View>
                            )}

                            {detailedSessionBill.igstAmount > 0 && (
                              <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabel, { color: theme.icon, paddingLeft: 16 }]}>
                                  IGST
                                </Text>
                                <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                                  {formatCurrency(detailedSessionBill.igstAmount)}
                                </Text>
                              </View>
                            )}
                          </>
                        )}

                      </>
                    ) : (
                      <>
                        {/* Original simple GST breakdown for backward compatibility */}
                        {detailedSessionBill.cgstAmount > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: theme.icon }]}>
                              CGST
                            </Text>
                            <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                              {formatCurrency(detailedSessionBill.cgstAmount)}
                            </Text>
                          </View>
                        )}

                        {detailedSessionBill.sgstAmount > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: theme.icon }]}>
                              SGST
                            </Text>
                            <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                              {formatCurrency(detailedSessionBill.sgstAmount)}
                            </Text>
                          </View>
                        )}

                        {detailedSessionBill.igstAmount > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: theme.icon }]}>
                              IGST
                            </Text>
                            <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                              {formatCurrency(detailedSessionBill.igstAmount)}
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    {/* Total tax - always show */}
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: theme.text, fontWeight: '600' }]}>
                        Total Tax
                      </Text>
                      <Text style={[styles.breakdownAmount, { color: theme.text, fontWeight: '600' }]}>
                        {formatCurrency(detailedSessionBill.taxAmount)}
                      </Text>
                    </View>
                  </>
                )}

                {detailedSessionBill.discountAmount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: theme.icon }]}>
                      Discount
                    </Text>
                    <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                      -{formatCurrency(detailedSessionBill.discountAmount)}
                    </Text>
                  </View>
                )}

                {detailedSessionBill.roundOffAmount !== 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: theme.icon }]}>
                      Round Off
                    </Text>
                    <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                      {detailedSessionBill.roundOffAmount >= 0 ? '+' : ''}{formatCurrency(detailedSessionBill.roundOffAmount)}
                    </Text>
                  </View>
                )}

                {detailedSessionBill.pendingAmount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: '#f59e0b', fontWeight: '600' }]}>
                      Pending
                    </Text>
                    <Text style={[styles.breakdownAmount, { color: '#f59e0b', fontWeight: '600' }]}>
                      {formatCurrency(detailedSessionBill.pendingAmount)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Tax Type */}
              {detailedSessionBill.taxType && (
                <View style={[styles.taxTypeSection, { borderTopColor: isDark ? '#3b82f6' : '#bfdbfe' }]}>
                  <Text style={[styles.taxTypeText, { color: theme.icon }]}>
                    Tax Type: {detailedSessionBill.taxType === 'intra-state' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={[styles.helpText, { color: theme.icon }]}>
            {ordersToProcess.length > 1
              ? `Show orders ${combinedBillDetails?.orderNumbers.join(
                  ', '
                )} to kitchen staff if needed`
              : `Show order #${order.orderNumber} to kitchen staff if needed`}
          </Text>
          <Text style={[styles.helpText, { color: theme.icon }]}>
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
          <View
            style={[
              styles.qrModalContent,
              { backgroundColor: theme.background },
            ]}
          >
            <View
              style={[
                styles.qrModalHeader,
                { borderBottomColor: isDark ? '#374151' : '#e5e7eb' },
              ]}
            >
              <Text style={[styles.qrModalTitle, { color: theme.text }]}>
                Receipt QR Code
              </Text>
              <TouchableOpacity
                style={styles.qrCloseButton}
                onPress={() => setShowReceiptQr(false)}
              >
                <Ionicons name="close" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>

            {receiptQr ? (
              <View style={styles.qrContent}>
                <Image
                  source={{ uri: receiptQr.qrCodeDataUrl }}
                  style={styles.qrCodeImage}
                  resizeMode="contain"
                />
                <Text style={[styles.qrInstructions, { color: theme.text }]}>
                  Ask your customer to scan this QR code to download their
                  receipt
                </Text>
                <Text style={[styles.qrOrderInfo, { color: theme.brand }]}>
                  {ordersToProcess.length > 1
                    ? `Orders #${
                        receiptQr.orderNumbers?.join(', #') ||
                        receiptQr.orderNumber
                      }`
                    : `Order #${receiptQr.orderNumber}`}
                </Text>
                <Text style={[styles.qrExpiryInfo, { color: theme.icon }]}>
                  Valid until{' '}
                  {new Date(receiptQr.expiresAt).toLocaleDateString('en-IN')}
                </Text>
              </View>
            ) : (
              <View style={styles.qrLoadingContainer}>
                <ActivityIndicator size="large" color={theme.brand} />
                <Text style={[styles.qrLoadingText, { color: theme.icon }]}>
                  Generating QR code...
                </Text>
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
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 6,
  },
  headerContent: {
    flex: 1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
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
    fontSize: 15,
    textAlign: 'center',
  },
  statusCard: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    margin: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  receiptButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  receiptButtonContent: {
    flex: 1,
  },
  receiptButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  receiptButtonSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 10,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardCard: {
    padding: 14,
    gap: 12,
  },
  cardAmountContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    gap: 6,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  cardLabel: {
    fontSize: 13,
  },
  cashCard: {
    padding: 14,
    gap: 12,
  },
  cashAmountContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    gap: 6,
  },
  cashIcon: {
    fontSize: 28,
  },
  cashAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  cashLabel: {
    fontSize: 13,
  },
  instructionsContainer: {
    gap: 6,
  },
  instructionsText: {
    fontSize: 13,
    textAlign: 'center',
  },
  instructionsSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  markPaidButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  orderCard: {
    borderRadius: 12,
    padding: 14,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemDetails: {
    fontSize: 13,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  helpContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 4,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContent: {
    borderRadius: 14,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  qrCloseButton: {
    padding: 6,
  },
  qrContent: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  qrCodeImage: {
    width: 220,
    height: 220,
  },
  qrInstructions: {
    fontSize: 15,
    textAlign: 'center',
  },
  qrOrderInfo: {
    fontSize: 14,
    fontWeight: '600',
  },
  qrExpiryInfo: {
    fontSize: 12,
  },
  qrLoadingContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  qrLoadingText: {
    fontSize: 15,
  },
  orderHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  orderSeparator: {
    height: 1,
    marginVertical: 10,
  },
  billBreakdown: {
    marginTop: 6,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '500',
  },
  sessionIndicator: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sessionIndicatorText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
  },

  // Order Details Breakdown Styles
  orderDetailSection: {
    marginVertical: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingLeft: 8,
  },
  itemRowInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemRowName: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemRowDetails: {
    fontSize: 11,
    marginTop: 2,
  },
  itemRowTotal: {
    fontSize: 13,
    fontWeight: '500',
  },
  orderSubtotal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  orderSubtotalText: {
    fontSize: 12,
    textAlign: 'right',
  },

  // New styles for OrdersPage-like design
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  restaurantInfoSection: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
  },
  restaurantAddress: {
    fontSize: 13,
    marginTop: 2,
  },
  restaurantContact: {
    fontSize: 13,
    marginTop: 1,
  },
  allItemsSection: {
    marginBottom: 16,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemCardName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemCalculation: {
    fontSize: 13,
    marginTop: 4,
  },
  gstInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  hsnCode: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPriceInfo: {
    alignItems: 'flex-end',
  },
  itemCardTotal: {
    fontSize: 15,
    fontWeight: '600',
  },
  ordersBreakdownSection: {
    marginBottom: 16,
  },
  orderBreakdownCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  orderBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderMainInfo: {
    flex: 1,
  },
  orderBreakdownNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  orderBreakdownDetails: {
    fontSize: 13,
    marginTop: 4,
  },
  orderBreakdownDate: {
    fontSize: 13,
    marginTop: 2,
  },
  orderBreakdownAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  sessionTotalSection: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  sessionTotalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTotalLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  sessionTotalAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  sessionTotalBreakdown: {
    gap: 4,
  },
  taxTypeSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  taxTypeText: {
    fontSize: 12,
  },
});
