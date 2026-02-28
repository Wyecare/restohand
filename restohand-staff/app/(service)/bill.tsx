import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { useGetOrderQuery } from '@/store/api/ordersApi';
import { useGetRestaurantQuery } from '@/store/api/restaurantsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { skipToken } from '@reduxjs/toolkit/query';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function ServiceBillScreen() {
  const { orderId, orderData } = useLocalSearchParams();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const billRef = useRef<View>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Parse order data from route params
  const orderFromParams = orderData ? JSON.parse(orderData as string) : null;

  // Get order details (only if not passed via params)
  const { data: orderFromQuery } = useGetOrderQuery(
    restaurantId && orderId && !orderFromParams
      ? { restaurantId, orderId: orderId as string }
      : skipToken,
    { skip: !restaurantId || !orderId || !!orderFromParams }
  );

  // Use order from params if available, otherwise from query
  const order = orderFromParams || orderFromQuery;

  // Get restaurant details
  const { data: restaurant } = useGetRestaurantQuery(
    restaurantId ?? skipToken,
    { skip: !restaurantId }
  );

  const generatePDF = async () => {
    if (!order || !restaurant) return;

    setIsGeneratingPDF(true);
    try {
      if (Platform.OS === 'web') {
        // Web platform: use window.print() or create a simple text share
        const billText = `
🧾 BILL - ${restaurant.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Order #: ${order.orderNumber}
Date: ${formatDate(order.createdAt)}
${order.tableNumber ? `Table: ${order.tableNumber}` : ''}
${order.customerName ? `Customer: ${order.customerName}` : ''}

ITEMS:
${order.items.map(item =>
  `• ${item.name} x${item.quantity} - ${formatCurrency(item.pricing.unitAmount * item.quantity)}`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: ${formatCurrency(order.subTotalAmount || order.totalAmount)}
${order.cgstAmount && order.cgstAmount > 0 ? `CGST (2.5%): ${formatCurrency(order.cgstAmount)}` : ''}
${order.sgstAmount && order.sgstAmount > 0 ? `SGST (2.5%): ${formatCurrency(order.sgstAmount)}` : ''}
${order.igstAmount && order.igstAmount > 0 ? `IGST (5%): ${formatCurrency(order.igstAmount)}` : ''}
${order.discountAmount && order.discountAmount > 0 ? `Discount: -${formatCurrency(order.discountAmount)}` : ''}
${order.roundOffAmount && Math.abs(order.roundOffAmount) > 0.004 ? `Round Off: ${formatCurrency(order.roundOffAmount)}` : ''}

TOTAL: ${formatCurrency(order.totalAmount)}
${order.finalAmount && order.finalAmount !== order.totalAmount ? `Amount Collected: ${formatCurrency(order.finalAmount)}` : ''}

Payment: ${order.paymentStatus === 'paid' ? '✅ PAID' : '❌ PENDING'}
${order.taxType === 'inter-state' ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'} • Inclusive of all taxes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for dining with us!
Powered by RestoHand
`;

        // For web, share as text
        if (navigator.share) {
          await navigator.share({
            text: billText,
            title: `Bill - Order #${order.orderNumber}`,
          });
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(billText);
          Alert.alert(
            'Bill Copied',
            'Bill text has been copied to clipboard',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Mobile platform: use captureRef
        if (!billRef.current) return;

        const uri = await captureRef(billRef.current, {
          format: 'jpg',
          quality: 0.8,
          result: 'tmpfile',
        });

        await Share.share({
          url: uri,
          message: `Bill for Order #${order.orderNumber}`,
          title: `Bill - Order #${order.orderNumber}`,
        });

        Alert.alert(
          'Bill Generated',
          'Bill image has been shared successfully',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert(
        'Error generating PDF',
        error instanceof Error ? error.message : 'Failed to generate bill. Please try again.'
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const shareBill = async () => {
    if (!order) return;

    const billText = `
🧾 BILL - ${restaurant?.name || 'Restaurant'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Order #: ${order.orderNumber}
Date: ${formatDate(order.createdAt)}
Table: ${order.tableNumber || 'N/A'}
Customer: ${order.customerName || 'Walk-in'}

ITEMS:
${order.items.map(item =>
  `• ${item.name} x${item.quantity} - ${formatCurrency(item.pricing.unitAmount * item.quantity)}`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ${formatCurrency(order.totalAmount)}
Payment: ${order.paymentStatus === 'paid' ? '✅ PAID' : '❌ PENDING'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for dining with us!
Powered by RestoHand
`;

    try {
      await Share.share({
        message: billText,
        title: `Bill - Order #${order.orderNumber}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

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
          <Text style={styles.title}>Bill Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load bill details</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Bill</Text>
          <Text style={styles.subtitle}>Order #{order.orderNumber}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={shareBill} style={styles.actionButton}>
            <Ionicons name="share" size={24} color="#4910bc" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={generatePDF}
            style={styles.actionButton}
            disabled={isGeneratingPDF}
          >
            <Ionicons name="download" size={24} color="#4910bc" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bill Content */}
        <View style={styles.billContainer}>
          <View ref={billRef} style={styles.bill}>
            {/* Restaurant Header */}
            <View style={styles.billHeader}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              {restaurant.address && (
                <Text style={styles.restaurantAddress}>
                  {restaurant.address.line1}
                  {restaurant.address.line2 && `, ${restaurant.address.line2}`}
                </Text>
              )}
              {restaurant.phone && (
                <Text style={styles.restaurantPhone}>📞 {restaurant.phone}</Text>
              )}
              {restaurant.gstNumber && (
                <Text style={styles.gstNumber}>GST: {restaurant.gstNumber}</Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* Order Details */}
            <View style={styles.orderDetails}>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Order #:</Text>
                <Text style={styles.orderValue}>{order.orderNumber}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Date:</Text>
                <Text style={styles.orderValue}>{formatDate(order.createdAt)}</Text>
              </View>
              {order.tableNumber && (
                <View style={styles.orderRow}>
                  <Text style={styles.orderLabel}>Table:</Text>
                  <Text style={styles.orderValue}>{order.tableNumber}</Text>
                </View>
              )}
              {order.customerName && (
                <View style={styles.orderRow}>
                  <Text style={styles.orderLabel}>Customer:</Text>
                  <Text style={styles.orderValue}>{order.customerName}</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.itemsTitle}>ITEMS</Text>
              {order.items.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.billItem}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetails}>
                      {formatCurrency(item.pricing.unitAmount)} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={styles.itemAmount}>
                    {formatCurrency(item.pricing.unitAmount * item.quantity)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(order.subTotalAmount || order.totalAmount)}
                </Text>
              </View>

              {/* GST breakdown - matching customer format */}
              {order.cgstAmount && order.cgstAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>CGST (2.5%):</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(order.cgstAmount)}
                  </Text>
                </View>
              )}

              {order.sgstAmount && order.sgstAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>SGST (2.5%):</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(order.sgstAmount)}
                  </Text>
                </View>
              )}

              {order.igstAmount && order.igstAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>IGST (5%):</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(order.igstAmount)}
                  </Text>
                </View>
              )}

              {/* Discount */}
              {order.discountAmount && order.discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount:</Text>
                  <Text style={[styles.totalValue, { color: '#16a34a' }]}>
                    -{formatCurrency(order.discountAmount)}
                  </Text>
                </View>
              )}

              {/* Round Off - only show if significant */}
              {order.roundOffAmount && Math.abs(order.roundOffAmount) > 0.004 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Round Off:</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(order.roundOffAmount)}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>TOTAL:</Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(order.totalAmount)}
                </Text>
              </View>
              {order.finalAmount && order.finalAmount !== order.totalAmount && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Amount Collected:</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(order.finalAmount)}
                  </Text>
                </View>
              )}

              {/* Tax type info */}
              <Text style={styles.taxInfo}>
                {order.taxType === 'inter-state' ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'}
                {' '}• Inclusive of all taxes
              </Text>
            </View>

            {/* Payment Status */}
            <View style={styles.paymentSection}>
              <View
                style={[
                  styles.paymentStatus,
                  {
                    backgroundColor:
                      order.paymentStatus === 'paid' ? '#dcfce7' : '#fee2e2',
                  },
                ]}
              >
                <Ionicons
                  name={order.paymentStatus === 'paid' ? 'checkmark-circle' : 'time'}
                  size={20}
                  color={order.paymentStatus === 'paid' ? '#16a34a' : '#dc2626'}
                />
                <Text
                  style={[
                    styles.paymentText,
                    {
                      color: order.paymentStatus === 'paid' ? '#16a34a' : '#dc2626',
                    },
                  ]}
                >
                  {order.paymentStatus === 'paid' ? 'PAID' : 'PENDING PAYMENT'}
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.billFooter}>
              <Text style={styles.footerText}>Thank you for dining with us!</Text>
              <Text style={styles.footerSubtext}>Powered by RestoHand</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.replace('/(service)')}
          >
            <Ionicons name="restaurant" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Back to Tables</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={generatePDF}
            disabled={isGeneratingPDF}
          >
            <Ionicons name="download" size={20} color="#4910bc" />
            <Text style={styles.secondaryButtonText}>
              {isGeneratingPDF ? 'Generating...' : 'Download Bill'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
  billContainer: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bill: {
    padding: 24,
    backgroundColor: '#ffffff',
  },
  billHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  restaurantPhone: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  gstNumber: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  orderDetails: {
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  orderValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  itemDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  totalsSection: {
    marginBottom: 16,
  },
  taxInfo: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  paymentText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  billFooter: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionSection: {
    padding: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#4910bc',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#4910bc',
  },
  secondaryButtonText: {
    color: '#4910bc',
    fontSize: 16,
    fontWeight: '600',
  },
});