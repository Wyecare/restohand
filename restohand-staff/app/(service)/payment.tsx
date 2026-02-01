import { PaymentRoundingDialog } from "@/components/PaymentRoundingDialog";
import { Colors } from "@/constants/theme";
import {
  useGenerateCombinedReceiptQrMutation,
  useGenerateReceiptQrQuery,
  useGetOrderQuery,
  useUpdateOrderPaymentMutation,
} from "@/store/api/ordersApi";
import {
  useGetCombinedTableInvoiceQuery,
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
} from "@/store/api/restaurantsApi";
import { useAppSelector } from "@/store/hooks";
import { selectActiveRestaurantId } from "@/store/slices/authSlice";
import { Ionicons } from "@expo/vector-icons";
import { skipToken } from "@reduxjs/toolkit/query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";

const formatCurrency = (amount: number, showDecimals: boolean = true) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);

export default function ServicePaymentScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const { orderId, tableId, orderData, allOrdersData, totalBillAmount } =
    useLocalSearchParams();
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRoundingDialog, setShowRoundingDialog] = useState(false);
  const [showReceiptQr, setShowReceiptQr] = useState(false);

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
    { skip: !restaurantId || !orderId },
  );

  const order = currentOrder || orderFromQuery || orderFromParams;
  const ordersToProcess =
    updatedOrdersState || allOrdersFromParams || (order ? [order] : []);

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
    },
  );

  const combinedBillDetails = useMemo(() => {
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
  }, [sessionInvoice, ordersToProcess]);

  const finalTotalAmount =
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
    return ordersToProcess.every((ord: any) => ord.paymentStatus === "paid");
  }, [ordersToProcess]);

  const [
    generateCombinedReceiptQr,
    { data: combinedReceiptQr, isLoading: isCombinedQrLoading },
  ] = useGenerateCombinedReceiptQrMutation();

  const primaryOrderForQr = ordersToProcess[0];
  const { data: singleReceiptQr, refetch: generateSingleQr } =
    useGenerateReceiptQrQuery(
      {
        restaurantId: restaurantId!,
        orderId:
          primaryOrderForQr?._id ||
          primaryOrderForQr?.id ||
          (orderId as string),
      },
      {
        skip:
          !restaurantId ||
          !primaryOrderForQr ||
          !allOrdersPaid ||
          ordersToProcess.length > 1 ||
          !(primaryOrderForQr._id || primaryOrderForQr.id || orderId),
      },
    );

  const receiptQr =
    ordersToProcess.length > 1 ? combinedReceiptQr : singleReceiptQr;

  const [updatePayment] = useUpdateOrderPaymentMutation();

  const handleRefresh = async () => {
    await Promise.all([
      refetchOrder(),
      refetchRestaurant(),
      refetchTables(),
      refetchSessionInvoice(),
    ]);
  };

  const handleMarkAsPaid = async (method: "cash" | "card") => {
    if (!finalTotalAmount || !restaurantId || ordersToProcess.length === 0) {
      Alert.alert("Error", "Missing order or restaurant data");
      return;
    }

    if (method === "cash") {
      setShowRoundingDialog(true);
      return;
    }

    await processPayment(method, finalTotalAmount, 0);
  };

  const processPayment = async (
    method: "cash" | "card",
    finalAmount: number,
    roundOffAmount: number,
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
          paymentStatus: "paid",
          provider: method === "card" ? "card" : "cash",
        }).unwrap();
        results.push(result);
      }

      const updatedOrders = ordersToProcess.map((ord: any) => ({
        ...ord,
        paymentStatus: "paid",
      }));

      setUpdatedOrdersState(updatedOrders);
      if (updatedOrders.length > 0) {
        setCurrentOrder(updatedOrders[0]);
      }

      if (ordersToProcess.length > 1) {
        const orderIds = ordersToProcess.map((ord: any) => ord.id || ord._id);
        const tableNum =
          selectedTable?.tableNumber || selectedTable?.displayName;
        await generateCombinedReceiptQr({
          restaurantId: restaurantId!,
          orderIds,
          tableNumber: tableNum,
        });
      }
    } catch (error: any) {
      Alert.alert(
        "Payment Update Failed",
        error?.message || "Failed to update payment status",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoundingConfirm = (
    finalAmount: number,
    roundOffAmount: number,
  ) => {
    setShowRoundingDialog(false);
    processPayment("cash", finalAmount, roundOffAmount);
  };

  const getOrderStatusInfo = () => {
    if (!order) return null;

    if (allOrdersPaid) {
      return {
        icon: "checkmark-circle",
        text:
          ordersToProcess.length > 1
            ? "All Payments Complete"
            : "Payment Complete",
        color: "#16a34a",
        bgColor: isDark ? "#064E3B" : "#f0fdf4",
      };
    }

    return {
      icon: "time",
      text: ordersToProcess.length > 1 ? "Payments Pending" : "Payment Pending",
      color: "#ea580c",
      bgColor: isDark ? "#7C2D12" : "#fff7ed",
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
              borderBottomColor: isDark ? "#374151" : "#e5e7eb",
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
              borderBottomColor: isDark ? "#374151" : "#e5e7eb",
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
            borderBottomColor: isDark ? "#374151" : "#e5e7eb",
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
            Order #{order.orderNumber}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: isDark ? "#374151" : "#f3f4f6" },
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
                borderColor: isDark ? statusInfo.color : "rgba(0, 0, 0, 0.05)",
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
                  { backgroundColor: allOrdersPaid ? "#16a34a" : "#dc2626" },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {allOrdersPaid ? "Paid" : "Pending"}
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
                  borderColor: isDark ? "#374151" : "#e5e7eb",
                },
              ]}
              onPress={() => setShowReceiptQr(true)}
            >
              <Ionicons name="qr-code" size={24} color={theme.brand} />
              <View style={styles.receiptButtonContent}>
                <Text
                  style={[styles.receiptButtonTitle, { color: theme.text }]}
                >
                  Show Receipt QR Code
                </Text>
                <Text
                  style={[styles.receiptButtonSubtitle, { color: theme.icon }]}
                >
                  Let customer scan to get their receipt
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
                        paymentMethod === "card"
                          ? theme.brand
                          : theme.background,
                      borderColor:
                        paymentMethod === "card"
                          ? theme.brand
                          : isDark
                            ? "#374151"
                            : "#e5e7eb",
                    },
                  ]}
                  onPress={() => setPaymentMethod("card")}
                >
                  <Ionicons
                    name="card"
                    size={24}
                    color={paymentMethod === "card" ? "#ffffff" : theme.brand}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      {
                        color:
                          paymentMethod === "card" ? "#ffffff" : theme.text,
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
                        paymentMethod === "cash" ? "#059669" : theme.background,
                      borderColor:
                        paymentMethod === "cash"
                          ? "#059669"
                          : isDark
                            ? "#374151"
                            : "#e5e7eb",
                    },
                  ]}
                  onPress={() => setPaymentMethod("cash")}
                >
                  <Ionicons
                    name="cash"
                    size={24}
                    color={paymentMethod === "cash" ? "#ffffff" : "#059669"}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      {
                        color:
                          paymentMethod === "cash" ? "#ffffff" : theme.text,
                      },
                    ]}
                  >
                    Cash Payment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Card Payment Section */}
            {paymentMethod === "card" && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Card Payment
                </Text>
                <View
                  style={[
                    styles.cardCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: isDark ? "#374151" : "#e5e7eb",
                      borderWidth: 1,
                      borderRadius: 12,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.cardAmountContainer,
                      { backgroundColor: isDark ? "#1F2937" : "#f9fafb" },
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
            {paymentMethod === "cash" && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Cash Payment
                </Text>
                <View
                  style={[
                    styles.cashCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: isDark ? "#374151" : "#e5e7eb",
                      borderWidth: 1,
                      borderRadius: 12,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.cashAmountContainer,
                      { backgroundColor: isDark ? "#1F2937" : "#f9fafb" },
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
                    ? "Processing..."
                    : `Mark as Paid - ${paymentMethod === "card" ? "Card" : "Cash"}`}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {ordersToProcess.length > 1
              ? `Order Items (${ordersToProcess.length} Orders)`
              : "Order Items"}
          </Text>
          <View
            style={[
              styles.orderCard,
              {
                backgroundColor: theme.background,
                borderColor: isDark ? "#374151" : "#e5e7eb",
                borderWidth: 1,
              },
            ]}
          >
            {ordersToProcess.map((orderData: any, orderIndex: any) => (
              <View key={`order-${orderIndex}`}>
                {ordersToProcess.length > 1 && (
                  <Text
                    style={[
                      styles.orderHeader,
                      {
                        color: theme.text,
                        borderBottomColor: isDark ? "#374151" : "#f3f4f6",
                      },
                    ]}
                  >
                    Order #{orderData.orderNumber}
                  </Text>
                )}
                {orderData.items.map((item: any, itemIndex: any) => (
                  <View
                    key={`${orderIndex}-${item.name}-${itemIndex}`}
                    style={[
                      styles.orderItem,
                      { borderBottomColor: isDark ? "#374151" : "#f3f4f6" },
                    ]}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: theme.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemDetails, { color: theme.icon }]}>
                        ₹{item.pricing.unitAmount} × {item.quantity}
                      </Text>
                    </View>
                    <Text style={[styles.itemTotal, { color: theme.text }]}>
                      ₹{(item.pricing.unitAmount * item.quantity).toFixed(0)}
                    </Text>
                  </View>
                ))}
                {ordersToProcess.length > 1 &&
                  orderIndex < ordersToProcess.length - 1 && (
                    <View
                      style={[
                        styles.orderSeparator,
                        { backgroundColor: isDark ? "#374151" : "#e5e7eb" },
                      ]}
                    />
                  )}
              </View>
            ))}

            {combinedBillDetails &&
              (ordersToProcess.length > 1 || sessionInvoice) && (
                <View style={styles.billBreakdown}>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: isDark ? "#374151" : "#e5e7eb" },
                    ]}
                  />
                  <Text style={[styles.breakdownTitle, { color: theme.text }]}>
                    {sessionInvoice ? "Session Bill Summary" : "Bill Summary"}
                  </Text>
                  <View style={styles.breakdownRow}>
                    <Text
                      style={[styles.breakdownLabel, { color: theme.icon }]}
                    >
                      Subtotal
                    </Text>
                    <Text
                      style={[styles.breakdownAmount, { color: theme.text }]}
                    >
                      {formatCurrency(combinedBillDetails.subTotalAmount)}
                    </Text>
                  </View>
                  {combinedBillDetails.taxAmount > 0 && (
                    <>
                      {combinedBillDetails.cgstAmount > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text
                            style={[
                              styles.breakdownLabel,
                              { color: theme.icon },
                            ]}
                          >
                            CGST
                          </Text>
                          <Text
                            style={[
                              styles.breakdownAmount,
                              { color: theme.text },
                            ]}
                          >
                            {formatCurrency(combinedBillDetails.cgstAmount)}
                          </Text>
                        </View>
                      )}
                      {combinedBillDetails.sgstAmount > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text
                            style={[
                              styles.breakdownLabel,
                              { color: theme.icon },
                            ]}
                          >
                            SGST
                          </Text>
                          <Text
                            style={[
                              styles.breakdownAmount,
                              { color: theme.text },
                            ]}
                          >
                            {formatCurrency(combinedBillDetails.sgstAmount)}
                          </Text>
                        </View>
                      )}
                      {combinedBillDetails.igstAmount > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text
                            style={[
                              styles.breakdownLabel,
                              { color: theme.icon },
                            ]}
                          >
                            IGST
                          </Text>
                          <Text
                            style={[
                              styles.breakdownAmount,
                              { color: theme.text },
                            ]}
                          >
                            {formatCurrency(combinedBillDetails.igstAmount)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.breakdownRow}>
                        <Text
                          style={[styles.breakdownLabel, { color: theme.icon }]}
                        >
                          Total Tax
                        </Text>
                        <Text
                          style={[
                            styles.breakdownAmount,
                            { color: theme.text },
                          ]}
                        >
                          {formatCurrency(combinedBillDetails.taxAmount)}
                        </Text>
                      </View>
                    </>
                  )}
                  {combinedBillDetails.discountAmount > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text
                        style={[styles.breakdownLabel, { color: theme.icon }]}
                      >
                        Discount
                      </Text>
                      <Text
                        style={[styles.breakdownAmount, { color: theme.text }]}
                      >
                        -{formatCurrency(combinedBillDetails.discountAmount)}
                      </Text>
                    </View>
                  )}
                  {sessionInvoice && (
                    <View
                      style={[
                        styles.sessionIndicator,
                        { backgroundColor: isDark ? "#064E3B" : "#dcfce7" },
                      ]}
                    >
                      <Text style={styles.sessionIndicatorText}>
                        ✓ Smart GST Calculation Applied
                      </Text>
                    </View>
                  )}
                </View>
              )}

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? "#374151" : "#e5e7eb" },
              ]}
            />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>
                Total
              </Text>
              <Text style={[styles.totalAmount, { color: theme.text }]}>
                {formatCurrency(finalTotalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={[styles.helpText, { color: theme.icon }]}>
            {ordersToProcess.length > 1
              ? `Show orders ${combinedBillDetails?.orderNumbers.join(", ")} to kitchen staff if needed`
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
                { borderBottomColor: isDark ? "#374151" : "#e5e7eb" },
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
                    ? `Orders #${receiptQr.orderNumbers?.join(", #") || receiptQr.orderNumber}`
                    : `Order #${receiptQr.orderNumber}`}
                </Text>
                <Text style={[styles.qrExpiryInfo, { color: theme.icon }]}>
                  Valid until{" "}
                  {new Date(receiptQr.expiresAt).toLocaleDateString("en-IN")}
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
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "700",
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
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
  },
  statusCard: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
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
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  section: {
    margin: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  receiptButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  receiptButtonContent: {
    flex: 1,
  },
  receiptButtonTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  receiptButtonSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  paymentMethods: {
    flexDirection: "row",
    gap: 10,
  },
  methodButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  methodText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardCard: {
    padding: 14,
    gap: 12,
  },
  cardAmountContainer: {
    alignItems: "center",
    padding: 20,
    borderRadius: 10,
    gap: 6,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: "700",
  },
  cardLabel: {
    fontSize: 13,
  },
  cashCard: {
    padding: 14,
    gap: 12,
  },
  cashAmountContainer: {
    alignItems: "center",
    padding: 20,
    borderRadius: 10,
    gap: 6,
  },
  cashIcon: {
    fontSize: 28,
  },
  cashAmount: {
    fontSize: 22,
    fontWeight: "700",
  },
  cashLabel: {
    fontSize: 13,
  },
  instructionsContainer: {
    gap: 6,
  },
  instructionsText: {
    fontSize: 13,
    textAlign: "center",
  },
  instructionsSubtext: {
    fontSize: 12,
    textAlign: "center",
  },
  markPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  markPaidButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  orderCard: {
    borderRadius: 12,
    padding: 14,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "500",
  },
  itemDetails: {
    fontSize: 13,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: "700",
  },
  helpContainer: {
    alignItems: "center",
    padding: 20,
    gap: 4,
  },
  helpText: {
    fontSize: 12,
    textAlign: "center",
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalContent: {
    borderRadius: 14,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  qrModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  qrCloseButton: {
    padding: 6,
  },
  qrContent: {
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  qrCodeImage: {
    width: 220,
    height: 220,
  },
  qrInstructions: {
    fontSize: 15,
    textAlign: "center",
  },
  qrOrderInfo: {
    fontSize: 14,
    fontWeight: "600",
  },
  qrExpiryInfo: {
    fontSize: 12,
  },
  qrLoadingContainer: {
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  qrLoadingText: {
    fontSize: 15,
  },
  orderHeader: {
    fontSize: 13,
    fontWeight: "600",
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
    fontWeight: "600",
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: "500",
  },
  sessionIndicator: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  sessionIndicatorText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "600",
  },
});
