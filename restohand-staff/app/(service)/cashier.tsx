import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearAuthState,
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import { Colors } from '@/constants/theme';
import {
  useGetCurrentTillQuery,
  useGetTillHistoryQuery,
  useOpenTillMutation,
  useCloseTillMutation,
  useRecordTillTransactionMutation,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  type TillSession,
} from '@/store/api/tillApi';
import { useListOrdersQuery, useCreateOrderMutation, useUpdateOrderPaymentMutation, useCalculateCartTotalMutation } from '@/store/api/ordersApi';
import {
  useFindSessionsQuery,
  useCloseSessionMutation,
  type CustomerSession,
} from '@/store/api/customerSessionsApi';
import {
  useGetDetailedSessionBillQuery,
  type DetailedBillCalculation,
} from '@/store/api/billingApi';
import { useCashierSocket } from '@/hooks/useCashierSocket';
import {
  useListMenuCategoriesByBranchQuery,
  useListMenuItemsByBranchQuery,
  useListMenuModifiersByBranchQuery,
  type MenuCategory,
  type MenuItem,
  type MenuModifier,
} from '@/store/api/menuApi';
import { useListRestaurantTablesByBranchQuery } from '@/store/api/restaurantsApi';
import type { Order } from '@/store/api/types';

type ActiveTab = 'pos' | 'incoming' | 'sessions' | 'till';
type PaymentMethod = 'cash' | 'card' | 'upi';

interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedModifiers: Array<{
    modifierId: string;
    modifierName: string;
    selectedOptions: Array<{ optionId: string; optionName: string; priceAdjustment: number }>;
  }>;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// Till Open Modal
// ─────────────────────────────────────────────────────────────
function TillOpenModal({
  visible,
  restaurantId,
  branchId,
  onOpened,
  theme,
  isDark,
}: {
  visible: boolean;
  restaurantId: string;
  branchId: string;
  onOpened: () => void;
  theme: (typeof Colors)['light'];
  isDark: boolean;
}) {
  const [float, setFloat] = useState('');
  const [notes, setNotes] = useState('');
  const [openTill, { isLoading }] = useOpenTillMutation();

  const handleOpen = async () => {
    const amount = parseFloat(float) || 0;
    try {
      await openTill({ restaurantId, branchId, openingFloat: amount, openingNotes: notes || undefined }).unwrap();
      setFloat('');
      setNotes('');
      onOpened();
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Failed to open till');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.modalFull, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.tillModalContent}>
            <View style={[styles.tillModalIcon, { backgroundColor: theme.brandPale }]}>
              <Ionicons name="cash-outline" size={40} color={theme.brand} />
            </View>
            <Text style={[styles.tillModalTitle, { color: theme.text }]}>Open Till</Text>
            <Text style={[styles.tillModalSub, { color: theme.icon }]}>
              Enter the opening float to start your shift
            </Text>

            <View style={[styles.inputGroup, { borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <Text style={[styles.inputPrefix, { color: theme.icon }]}>₹</Text>
              <TextInput
                style={[styles.floatInput, { color: theme.text }]}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.icon}
                value={float}
                onChangeText={setFloat}
                autoFocus
              />
            </View>

            <TextInput
              style={[styles.notesInput, { color: theme.text, borderColor: isDark ? '#374151' : '#E5E7EB', backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
              placeholder="Opening notes (optional)"
              placeholderTextColor={theme.icon}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.brand, opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleOpen}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="lock-open-outline" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Open Till</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Payment Modal
// ─────────────────────────────────────────────────────────────
function PaymentModal({
  visible,
  totalAmount,
  onClose,
  onConfirm,
  isProcessing,
  theme,
  isDark,
}: {
  visible: boolean;
  totalAmount: number;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
  isProcessing: boolean;
  theme: (typeof Colors)['light'];
  isDark: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState('');
  const change = method === 'cash' ? Math.max(0, parseFloat(cashGiven || '0') - totalAmount) : 0;

  const methods: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'cash', label: 'Cash', icon: 'cash-outline' },
    { id: 'card', label: 'Card', icon: 'card-outline' },
    { id: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="pageSheet">
      <View style={[styles.payModalOverlay]}>
        <SafeAreaView style={[styles.payModalSheet, { backgroundColor: theme.background }]}>
          <View style={styles.payModalHandle} />

          <View style={styles.payModalHeader}>
            <Text style={[styles.payModalTitle, { color: theme.text }]}>Collect Payment</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.icon} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.payModalAmount, { color: theme.brand }]}>
            ₹{totalAmount.toFixed(2)}
          </Text>

          {/* Method selector */}
          <View style={styles.methodRow}>
            {methods.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.methodChip,
                  { borderColor: isDark ? '#374151' : '#E5E7EB' },
                  method === m.id && { backgroundColor: theme.brand, borderColor: theme.brand },
                ]}
                onPress={() => setMethod(m.id)}
              >
                <Ionicons name={m.icon as any} size={20} color={method === m.id ? '#FFF' : theme.icon} />
                <Text style={[styles.methodLabel, { color: method === m.id ? '#FFF' : theme.text }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cash given */}
          {method === 'cash' && (
            <View style={styles.cashSection}>
              <Text style={[styles.cashLabel, { color: theme.icon }]}>Cash Given (₹)</Text>
              <View style={[styles.inputGroup, { borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
                <Text style={[styles.inputPrefix, { color: theme.icon }]}>₹</Text>
                <TextInput
                  style={[styles.floatInput, { color: theme.text }]}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={theme.icon}
                  value={cashGiven}
                  onChangeText={setCashGiven}
                  autoFocus
                />
              </View>
              {parseFloat(cashGiven) >= totalAmount && (
                <View style={[styles.changeRow, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                  <Ionicons name="cash" size={16} color="#10B981" />
                  <Text style={[styles.changeText, { color: '#10B981' }]}>
                    Change: ₹{change.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#10B981', opacity: isProcessing ? 0.7 : 1, marginTop: 24 }]}
            onPress={() => onConfirm(method)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Confirm {method.toUpperCase()}</Text>
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Cashier Screen
// ─────────────────────────────────────────────────────────────
export default function CashierScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const dispatch = useAppDispatch();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const session = useAppSelector((s) => s.auth.session);
  const idToken = useAppSelector((s) => s.auth.idToken);
  const branchId = session?.branchId ?? '';

  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [showTillOpen, setShowTillOpen] = useState(false);

  // Sessions state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [isPayProcessing, setIsPayProcessing] = useState(false);

  // Till close state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // POS state
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posSelectedCategoryId, setPosSelectedCategoryId] = useState<string | null>(null);
  const [posOrderType, setPosOrderType] = useState<'table' | 'walkin'>('table');
  const [posSelectedTableId, setPosSelectedTableId] = useState('');
  const [posCartOpen, setPosCartOpen] = useState(false);
  const [posPaymentOpen, setPosPaymentOpen] = useState(false);
  const [posIsProcessing, setPosIsProcessing] = useState(false);
  const [posBillTotals, setPosBillTotals] = useState<any>(null);
  const [posCreatedOrderId, setPosCreatedOrderId] = useState<string | null>(null);
  const [posCreatedOrderNumber, setPosCreatedOrderNumber] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────
  const { data: currentTill, isLoading: tillLoading, refetch: refetchTill } =
    useGetCurrentTillQuery(
      restaurantId ? { restaurantId, branchId: branchId || undefined } : skipToken,
      { pollingInterval: 30000 }
    );

  const { data: pendingOrdersData, refetch: refetchPending } = useListOrdersQuery(
    restaurantId ? { restaurantId, branchId: branchId || undefined, status: 'pending', limit: 50 } : skipToken,
    { refetchOnMountOrArgChange: true }
  );

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } =
    useFindSessionsQuery(
      restaurantId
        ? { restaurantId, branchId: branchId || undefined, status: 'active', page: 1, limit: 50 }
        : skipToken
    );

  const { data: billData, isLoading: billLoading } = useGetDetailedSessionBillQuery(
    selectedSessionId ? { sessionId: selectedSessionId, includeUnpaid: true } : skipToken
  );

  const { data: tillHistory, refetch: refetchHistory } = useGetTillHistoryQuery(
    restaurantId
      ? { restaurantId, branchId: branchId || undefined, page: 1, limit: 10 }
      : skipToken
  );

  // ── POS Queries ───────────────────────────────────────────
  const hasPosArgs = !!(restaurantId && branchId);
  const { data: posCategoriesData } = useListMenuCategoriesByBranchQuery(
    hasPosArgs ? { restaurantId: restaurantId!, branchId, limit: 100 } : skipToken
  );
  const { data: posItemsData } = useListMenuItemsByBranchQuery(
    hasPosArgs ? { restaurantId: restaurantId!, branchId, isAvailable: true, limit: 200 } : skipToken
  );
  const { data: posModifiersData } = useListMenuModifiersByBranchQuery(
    hasPosArgs ? { restaurantId: restaurantId!, branchId, isActive: true } : skipToken
  );
  const { data: posTablesData } = useListRestaurantTablesByBranchQuery(
    hasPosArgs ? { restaurantId: restaurantId!, branchId } : skipToken
  );

  const posCategories = posCategoriesData?.data ?? [];
  const posItems = posItemsData?.data ?? [];
  const posModifiers = posModifiersData?.data ?? [];
  const posTables = (posTablesData ?? []).filter((t) => t.isActive !== false);

  const posFilteredItems = posSelectedCategoryId
    ? posItems.filter((item) => item.categoryId === posSelectedCategoryId)
    : posItems;

  const posTotalQty = posCart.reduce((s, i) => s + i.quantity, 0);
  const posSubtotal = posCart.reduce((s, i) => s + i.unitPrice * i.quantity + i.selectedModifiers.reduce((ms, m) => ms + m.selectedOptions.reduce((os, o) => os + o.priceAdjustment, 0), 0) * i.quantity, 0);

  // ── Mutations ─────────────────────────────────────────────
  const [acceptOrder] = useAcceptOrderMutation();
  const [rejectOrder] = useRejectOrderMutation();
  const [closeTill, { isLoading: isClosing }] = useCloseTillMutation();
  const [updateOrderPayment] = useUpdateOrderPaymentMutation();
  const [closeSession] = useCloseSessionMutation();
  const [recordTransaction] = useRecordTillTransactionMutation();
  const [createOrder] = useCreateOrderMutation();
  const [calculateCart] = useCalculateCartTotalMutation();

  // ── Socket ────────────────────────────────────────────────
  useCashierSocket({
    token: idToken,
    onOrderPending: useCallback((order: Order) => {
      setPendingOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });
    }, []),
    onOrderUpdated: useCallback((order: Order) => {
      if (order.status !== 'pending') {
        setPendingOrders((prev) => prev.filter((o) => o.id !== order.id));
      }
    }, []),
  });

  // ── Seed pending from API ─────────────────────────────────
  useEffect(() => {
    const fetched = pendingOrdersData?.data ?? [];
    if (!fetched.length) return;
    setPendingOrders((prev) => {
      const ids = new Set(prev.map((o) => o.id));
      const newOnes = fetched.filter((o) => !ids.has(o.id));
      return newOnes.length ? [...newOnes, ...prev] : prev;
    });
  }, [pendingOrdersData]);

  // ── Auto show till open modal ─────────────────────────────
  useEffect(() => {
    if (!tillLoading && !currentTill) {
      setShowTillOpen(true);
    }
  }, [tillLoading, currentTill]);

  useFocusEffect(
    useCallback(() => {
      refetchTill();
      refetchPending();
      refetchSessions();
    }, [])
  );

  // ── Handlers ──────────────────────────────────────────────
  const handleAccept = async (order: Order) => {
    if (!restaurantId) return;
    try {
      await acceptOrder({ restaurantId, orderId: order.id }).unwrap();
      setPendingOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Failed to accept order');
    }
  };

  const handleReject = (order: Order) => {
    Alert.alert(
      'Reject Order',
      `Cancel order #${order.orderNumber}? This cannot be undone.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectOrder({ restaurantId: restaurantId!, orderId: order.id }).unwrap();
              setPendingOrders((prev) => prev.filter((o) => o.id !== order.id));
            } catch (err: any) {
              Alert.alert('Error', err?.data?.message ?? 'Failed to reject order');
            }
          },
        },
      ]
    );
  };

  const handleCollectPayment = async (method: PaymentMethod) => {
    if (!selectedSessionId || !billData || !restaurantId) return;
    setIsPayProcessing(true);
    try {
      const unpaidOrderIds = billData.orderBreakdown
        .filter((o) => o.paymentStatus !== 'paid')
        .map((o) => o.orderId);

      await Promise.all(
        unpaidOrderIds.map((orderId) =>
          updateOrderPayment({ restaurantId, orderId, paymentStatus: 'paid' }).unwrap()
        )
      );

      await closeSession({
        sessionId: selectedSessionId,
        reason: 'payment_completed',
        notes: `Paid via ${method}`,
      }).unwrap();

      if (currentTill) {
        const tillId = currentTill._id || currentTill.id;
        await recordTransaction({
          restaurantId,
          tillId,
          paymentMethod: method,
          amount: billData.totalAmount,
        }).unwrap();
      }

      setPaymentOpen(false);
      setSelectedSessionId(null);
      refetchSessions();
      refetchTill();
      Alert.alert('✓ Payment collected', `₹${billData.totalAmount.toFixed(2)} via ${method.toUpperCase()}`);
    } catch (err: any) {
      Alert.alert('Payment failed', err?.data?.message ?? 'Something went wrong');
    } finally {
      setIsPayProcessing(false);
    }
  };

  const handleCloseTill = async () => {
    if (!currentTill || !restaurantId) return;
    const tillId = currentTill._id || currentTill.id;
    try {
      await closeTill({
        restaurantId,
        tillId,
        closingCash: parseFloat(closingCash) || 0,
        closingNotes: closingNotes || undefined,
      }).unwrap();
      setShowCloseModal(false);
      setClosingCash('');
      setClosingNotes('');
      refetchTill();
      refetchHistory();
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Failed to close till');
    }
  };

  // ── POS Handlers ──────────────────────────────────────────
  const posAddItem = (item: MenuItem) => {
    const applicable = posModifiers.filter(
      (m) => m.isActive && (m.applicableMenuItems?.includes(item.id) || m.applicableCategories?.includes(item.categoryId ?? ''))
    );
    // For now, add directly without modifier modal (can be enhanced later)
    setPosCart((prev) => {
      const idx = prev.findIndex((c) => c.menuItemId === item.id && c.selectedModifiers.length === 0);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, unitPrice: item.pricing.amount, selectedModifiers: [] }];
    });
  };

  const posUpdateQty = (idx: number, delta: number) => {
    setPosCart((prev) => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + delta;
      if (newQty <= 0) updated.splice(idx, 1);
      else updated[idx] = { ...updated[idx], quantity: newQty };
      return updated;
    });
  };

  const posCharge = async () => {
    if (!restaurantId || posCart.length === 0) return;
    setPosIsProcessing(true);
    try {
      const table = posOrderType === 'table' ? posTables.find((t) => t.id === posSelectedTableId) : null;
      const order = await createOrder({
        restaurantId,
        tableId: table?.id,
        tableNumber: table?.tableNumber,
        items: posCart.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          quantity: c.quantity,
          pricing: { unitAmount: c.unitPrice, currency: 'INR' },
          notes: c.notes,
        })),
        paymentMethod: 'cash',
      }).unwrap();
      setPosCreatedOrderId(order.id);
      setPosCreatedOrderNumber(order.orderNumber);
      setPosCartOpen(false);
      setPosPaymentOpen(true);
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Failed to create order');
    } finally {
      setPosIsProcessing(false);
    }
  };

  const posConfirmPayment = async (method: PaymentMethod) => {
    if (!posCreatedOrderId || !restaurantId) return;
    setPosIsProcessing(true);
    try {
      await updateOrderPayment({ restaurantId, orderId: posCreatedOrderId, paymentStatus: 'paid', provider: method }).unwrap();
      if (currentTill) {
        await recordTransaction({
          restaurantId,
          tillId: currentTill._id || currentTill.id,
          paymentMethod: method,
          amount: posBillTotals?.totalAmount ?? posSubtotal,
        }).unwrap();
      }
      Alert.alert('✓ Payment complete', `Order #${posCreatedOrderNumber} paid via ${method.toUpperCase()}`);
      setPosPaymentOpen(false);
      setPosCart([]);
      setPosBillTotals(null);
      setPosCreatedOrderId(null);
      setPosCreatedOrderNumber(null);
      refetchTill();
    } catch (err: any) {
      Alert.alert('Payment failed', err?.data?.message ?? 'Something went wrong');
    } finally {
      setPosIsProcessing(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const fmt = (n: number) => `₹${n.toFixed(2)}`;
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const fmtDateTime = (d: string) => {
    const dt = new Date(d);
    return (
      dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
      ' ' +
      dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  };

  const pendingCount = pendingOrders.length;
  const sessions = sessionsData?.sessions ?? [];
  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId);

  if (!restaurantId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.text }]}>No restaurant selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render tabs ───────────────────────────────────────────

  const renderPos = () => (
    <View style={styles.tabContent}>
      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.catScroll, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}
        contentContainerStyle={styles.catScrollInner}
      >
        <TouchableOpacity
          style={[styles.catChip, !posSelectedCategoryId && { backgroundColor: theme.brand }]}
          onPress={() => setPosSelectedCategoryId(null)}
        >
          <Text style={[styles.catChipText, !posSelectedCategoryId && { color: '#FFF' }]}>All</Text>
        </TouchableOpacity>
        {posCategories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catChip, posSelectedCategoryId === cat.id && { backgroundColor: theme.brand }]}
            onPress={() => setPosSelectedCategoryId(cat.id)}
          >
            <Text style={[styles.catChipText, posSelectedCategoryId === cat.id && { color: '#FFF' }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items grid */}
      <FlatList
        data={posFilteredItems}
        keyExtractor={(item) => item.id}
        numColumns={isTablet ? 4 : 2}
        contentContainerStyle={styles.posGrid}
        renderItem={({ item }) => {
          const imgUrl = item.imageUrls?.[0];
          return (
            <TouchableOpacity
              style={[styles.posItemCard, { backgroundColor: theme.background, borderColor: isDark ? '#374151' : '#E5E7EB' }]}
              onPress={() => posAddItem(item)}
            >
              {imgUrl ? (
                <Image source={{ uri: imgUrl }} style={styles.posItemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.posItemImagePlaceholder, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                  <Ionicons name="fast-food-outline" size={28} color={isDark ? '#4B5563' : '#9CA3AF'} />
                </View>
              )}
              <View style={styles.posItemInfo}>
                <Text style={[styles.posItemName, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.posItemPrice, { color: theme.brand }]}>₹{item.pricing.amount.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="fast-food-outline" size={48} color={theme.icon} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No items</Text>
          </View>
        }
      />

      {/* Cart FAB */}
      {posTotalQty > 0 && (
        <TouchableOpacity
          style={[styles.cartFab, { backgroundColor: theme.brand }]}
          onPress={() => setPosCartOpen(true)}
        >
          <Ionicons name="cart" size={22} color="#FFF" />
          <Text style={styles.cartFabText}>{posTotalQty} item{posTotalQty !== 1 ? 's' : ''} · {fmt(posSubtotal)}</Text>
          <Ionicons name="chevron-up" size={18} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Cart Modal */}
      <Modal visible={posCartOpen} animationType="slide" transparent presentationStyle="pageSheet">
        <View style={styles.payModalOverlay}>
          <SafeAreaView style={[styles.payModalSheet, { backgroundColor: theme.background }]}>
            <View style={styles.payModalHandle} />
            <View style={styles.payModalHeader}>
              <Text style={[styles.payModalTitle, { color: theme.text }]}>Cart ({posTotalQty})</Text>
              <TouchableOpacity onPress={() => setPosCartOpen(false)}>
                <Ionicons name="close" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>

            {/* Order type */}
            <View style={styles.orderTypeRow}>
              {(['table', 'walkin'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.orderTypeBtn, posOrderType === t && { backgroundColor: theme.brand }]}
                  onPress={() => setPosOrderType(t)}
                >
                  <Text style={[styles.orderTypeBtnText, posOrderType === t && { color: '#FFF' }]}>
                    {t === 'table' ? 'Table' : 'Walk-in'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Table picker */}
            {posOrderType === 'table' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tablePickerScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row' }}>
                {posTables.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tableChip, posSelectedTableId === t.id && { backgroundColor: theme.brand, borderColor: theme.brand }]}
                    onPress={() => setPosSelectedTableId(t.id)}
                  >
                    <Text style={[styles.tableChipText, posSelectedTableId === t.id && { color: '#FFF' }]}>
                      T{t.tableNumber}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Cart items */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {posCart.map((item, idx) => (
                <View key={idx} style={[styles.cartRow, { borderBottomColor: isDark ? '#374151' : '#F3F4F6' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cartItemName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.cartItemPrice, { color: theme.icon }]}>₹{item.unitPrice.toFixed(2)} each</Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => posUpdateQty(idx, -1)}>
                      <Ionicons name="remove" size={16} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: theme.text }]}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => posUpdateQty(idx, 1)}>
                      <Ionicons name="add" size={16} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.cartItemTotal, { color: theme.text }]}>
                    {fmt(item.unitPrice * item.quantity)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.cartTotal, { borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <Text style={[styles.cartTotalLabel, { color: theme.icon }]}>Subtotal</Text>
              <Text style={[styles.cartTotalValue, { color: theme.brand }]}>{fmt(posSubtotal)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.brand, margin: 16, opacity: posIsProcessing ? 0.7 : 1 }]}
              onPress={posCharge}
              disabled={posIsProcessing || posCart.length === 0}
            >
              {posIsProcessing
                ? <ActivityIndicator color="#FFF" />
                : <><Ionicons name="card-outline" size={18} color="#FFF" /><Text style={styles.primaryBtnText}>Charge {fmt(posSubtotal)}</Text></>
              }
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>

      {/* POS Payment Modal */}
      <PaymentModal
        visible={posPaymentOpen}
        totalAmount={posSubtotal}
        onClose={() => setPosPaymentOpen(false)}
        onConfirm={posConfirmPayment}
        isProcessing={posIsProcessing}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );

  const renderIncoming = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabInner}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => { refetchPending(); }}
          tintColor={theme.brand}
        />
      }
    >
      {pendingOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={56} color={theme.icon} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>All clear!</Text>
          <Text style={[styles.emptySubtext, { color: theme.icon }]}>
            No orders waiting for approval.{'\n'}New orders appear here in real-time.
          </Text>
        </View>
      ) : (
        pendingOrders.map((order) => (
          <View
            key={order.id}
            style={[
              styles.orderCard,
              {
                backgroundColor: theme.background,
                borderColor: isDark ? '#92400E' : '#FCD34D',
                borderLeftColor: '#F59E0B',
              },
            ]}
          >
            {/* Card Header */}
            <View style={styles.orderCardHeader}>
              <View style={styles.orderCardLeft}>
                <Text style={[styles.orderNumber, { color: theme.text }]}>
                  #{order.orderNumber}
                </Text>
                {order.tableNumber && (
                  <View style={[styles.tableBadge, { backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE' }]}>
                    <Ionicons name="grid-outline" size={11} color={isDark ? '#60A5FA' : '#2563EB'} />
                    <Text style={[styles.tableBadgeText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                      T{order.tableNumber}
                    </Text>
                  </View>
                )}
                <Text style={[styles.orderTime, { color: theme.icon }]}>
                  {fmtTime(order.createdAt)}
                </Text>
              </View>
              <Text style={[styles.orderAmount, { color: theme.text }]}>
                {fmt(order.totalAmount)}
              </Text>
            </View>

            {/* Items */}
            <View style={styles.orderItems}>
              {order.items.slice(0, 4).map((item, idx) => (
                <Text key={idx} style={[styles.orderItem, { color: theme.icon }]}>
                  {item.quantity}× {item.name}
                </Text>
              ))}
              {order.items.length > 4 && (
                <Text style={[styles.orderItem, { color: theme.icon }]}>
                  +{order.items.length - 4} more items
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={[styles.rejectBtn]}
                onPress={() => handleReject(order)}
              >
                <Ionicons name="close" size={16} color="#EF4444" />
                <Text style={[styles.rejectBtnText]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleAccept(order)}
              >
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.acceptBtnText}>Accept → Kitchen</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderSessions = () => {
    const isTabletLayout = isTablet && selectedSession;

    return (
      <View style={styles.tabContent}>
        {isTabletLayout ? (
          /* Tablet: side-by-side */
          <View style={styles.tabletRow}>
            <SessionGrid
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              setSelectedSessionId={setSelectedSessionId}
              sessionsLoading={sessionsLoading}
              refetchSessions={refetchSessions}
              theme={theme}
              isDark={isDark}
              fmt={fmt}
              fmtTime={fmtTime}
              style={{ flex: 1 }}
            />
            <BillPanel
              selectedSession={selectedSession!}
              billData={billData ?? null}
              billLoading={billLoading}
              currentTill={currentTill ?? null}
              onCollect={() => setPaymentOpen(true)}
              theme={theme}
              isDark={isDark}
              fmt={fmt}
              fmtTime={fmtTime}
            />
          </View>
        ) : (
          /* Phone: list, tap opens bill */
          <>
            <SessionGrid
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              setSelectedSessionId={setSelectedSessionId}
              sessionsLoading={sessionsLoading}
              refetchSessions={refetchSessions}
              theme={theme}
              isDark={isDark}
              fmt={fmt}
              fmtTime={fmtTime}
            />
            {/* Bill sheet modal on phone */}
            <Modal
              visible={!!selectedSession}
              animationType="slide"
              transparent
              presentationStyle="pageSheet"
            >
              <View style={styles.payModalOverlay}>
                <SafeAreaView style={[styles.billSheet, { backgroundColor: theme.background }]}>
                  <View style={styles.payModalHandle} />
                  <View style={styles.billSheetHeader}>
                    <View>
                      <Text style={[styles.billSheetTitle, { color: theme.text }]}>
                        Table {selectedSession?.tableNumber}
                      </Text>
                      <Text style={[styles.billSheetSub, { color: theme.icon }]}>
                        Since {selectedSession ? fmtTime(selectedSession.startedAt) : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedSessionId(null)}>
                      <Ionicons name="close" size={24} color={theme.icon} />
                    </TouchableOpacity>
                  </View>
                  {selectedSession && (
                    <BillPanel
                      selectedSession={selectedSession}
                      billData={billData ?? null}
                      billLoading={billLoading}
                      currentTill={currentTill ?? null}
                      onCollect={() => setPaymentOpen(true)}
                      theme={theme}
                      isDark={isDark}
                      fmt={fmt}
                      fmtTime={fmtTime}
                    />
                  )}
                </SafeAreaView>
              </View>
            </Modal>
          </>
        )}
      </View>
    );
  };

  const renderTill = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={[styles.tabInner, { paddingBottom: 40 }]}
    >
      {/* Till Status Card */}
      <View style={[styles.tillCard, { backgroundColor: theme.background, borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
        <View style={styles.tillCardHeader}>
          <Text style={[styles.sectionTitle2, { color: theme.text }]}>Till Status</Text>
          {currentTill ? (
            <View style={[styles.badge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.badgeText, { color: '#10B981' }]}>Open</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Closed</Text>
            </View>
          )}
        </View>

        {currentTill ? (
          <>
            <View style={styles.tillMeta}>
              <View style={styles.tillMetaRow}>
                <Ionicons name="person-outline" size={14} color={theme.icon} />
                <Text style={[styles.tillMetaText, { color: theme.icon }]}>
                  {currentTill.cashierName ?? 'Unknown'}
                </Text>
              </View>
              <View style={styles.tillMetaRow}>
                <Ionicons name="time-outline" size={14} color={theme.icon} />
                <Text style={[styles.tillMetaText, { color: theme.icon }]}>
                  Opened {fmtDateTime(currentTill.openedAt)}
                </Text>
              </View>
              <View style={styles.tillMetaRow}>
                <Ionicons name="cash-outline" size={14} color={theme.icon} />
                <Text style={[styles.tillMetaText, { color: theme.icon }]}>
                  Opening float: {fmt(currentTill.openingFloat)}
                </Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {[
                { label: 'Cash', value: fmt(currentTill.transactions.cashTotal), icon: 'cash-outline', color: '#10B981' },
                { label: 'Card', value: fmt(currentTill.transactions.cardTotal), icon: 'card-outline', color: '#3B82F6' },
                { label: 'UPI', value: fmt(currentTill.transactions.upiTotal), icon: 'phone-portrait-outline', color: '#8B5CF6' },
                { label: 'Orders', value: String(currentTill.transactions.orderCount), icon: 'receipt-outline', color: '#F59E0B' },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                >
                  <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                  <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel2, { color: theme.icon }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Total collected */}
            <View style={[styles.totalRow, { borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <Text style={[styles.totalLabel, { color: theme.icon }]}>Total Collected</Text>
              <Text style={[styles.totalValue, { color: theme.brand }]}>
                {fmt(currentTill.transactions.totalCollected)}
              </Text>
            </View>

            {/* Close till */}
            <TouchableOpacity
              style={[styles.dangerBtn]}
              onPress={() => setShowCloseModal(true)}
            >
              <Ionicons name="lock-closed-outline" size={16} color="#EF4444" />
              <Text style={styles.dangerBtnText}>Close Till</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.tillEmpty}>
            <Ionicons name="cash-outline" size={40} color={theme.icon} style={{ opacity: 0.3, marginBottom: 12 }} />
            <Text style={[styles.emptySubtext, { color: theme.icon }]}>No till is open.</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.brand, marginTop: 16, alignSelf: 'center' }]}
              onPress={() => setShowTillOpen(true)}
            >
              <Ionicons name="lock-open-outline" size={16} color="#FFF" />
              <Text style={styles.primaryBtnText}>Open Till</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* History */}
      {tillHistory && tillHistory.sessions.length > 0 && (
        <View style={[styles.tillCard, { backgroundColor: theme.background, borderColor: isDark ? '#374151' : '#E5E7EB', marginTop: 16 }]}>
          <Text style={[styles.sectionTitle2, { color: theme.text, marginBottom: 12 }]}>
            Recent Sessions
          </Text>
          {tillHistory.sessions.map((s) => (
            <View
              key={s.id || s._id}
              style={[styles.historyRow, { borderBottomColor: isDark ? '#374151' : '#F3F4F6' }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.historyDate, { color: theme.text }]}>
                  {fmtDateTime(s.openedAt)}
                </Text>
                <Text style={[styles.historyCashier, { color: theme.icon }]}>
                  {s.cashierName ?? '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.historyAmount, { color: theme.text }]}>
                  {fmt(s.transactions.totalCollected)}
                </Text>
                <View style={[
                  styles.historyBadge,
                  { backgroundColor: s.status === 'open' ? (isDark ? '#064E3B' : '#ECFDF5') : (isDark ? '#1F2937' : '#F3F4F6') },
                ]}>
                  <Text style={[
                    styles.historyBadgeText,
                    { color: s.status === 'open' ? '#10B981' : theme.icon },
                  ]}>
                    {s.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  // ── Main render ───────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar backgroundColor={theme.brand} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.brand }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Cashier</Text>
            {session?.displayName && (
              <Text style={styles.headerSub}>{session.displayName}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {/* Till pill */}
            <View style={[
              styles.tillPill,
              { backgroundColor: currentTill ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)' },
            ]}>
              <View style={[styles.dot, { backgroundColor: currentTill ? '#10B981' : '#F59E0B' }]} />
              <Text style={[styles.tillPillText, { color: currentTill ? '#10B981' : '#F59E0B' }]}>
                {tillLoading ? '...' : currentTill ? 'Till Open' : 'Till Closed'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => { dispatch(clearAuthState()); router.replace('/(auth)/login'); }}
            >
              <Ionicons name="log-out-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'pos' && renderPos()}
        {activeTab === 'incoming' && renderIncoming()}
        {activeTab === 'sessions' && renderSessions()}
        {activeTab === 'till' && renderTill()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.background, borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
        {([
          { id: 'pos', label: 'POS', icon: 'storefront-outline', activeIcon: 'storefront' },
          { id: 'incoming', label: 'Incoming', icon: 'notifications-outline', activeIcon: 'notifications', badge: pendingCount },
          { id: 'sessions', label: 'Sessions', icon: 'people-outline', activeIcon: 'people' },
          { id: 'till', label: 'Till', icon: 'cash-outline', activeIcon: 'cash' },
        ] as const).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
            >
              <View>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={24}
                  color={isActive ? theme.brand : theme.icon}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, { color: isActive ? theme.brand : theme.icon }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Till Open Modal */}
      {branchId && (
        <TillOpenModal
          visible={showTillOpen}
          restaurantId={restaurantId}
          branchId={branchId}
          onOpened={() => { setShowTillOpen(false); refetchTill(); }}
          theme={theme}
          isDark={isDark}
        />
      )}

      {/* Payment Modal */}
      <PaymentModal
        visible={paymentOpen}
        totalAmount={billData?.totalAmount ?? 0}
        onClose={() => setPaymentOpen(false)}
        onConfirm={handleCollectPayment}
        isProcessing={isPayProcessing}
        theme={theme}
        isDark={isDark}
      />

      {/* Close Till Modal */}
      <Modal visible={showCloseModal} animationType="slide" transparent presentationStyle="pageSheet">
        <View style={styles.payModalOverlay}>
          <SafeAreaView style={[styles.payModalSheet, { backgroundColor: theme.background }]}>
            <View style={styles.payModalHandle} />
            <View style={styles.payModalHeader}>
              <Text style={[styles.payModalTitle, { color: theme.text }]}>Close Till</Text>
              <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                <Ionicons name="close" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>

            {currentTill && (
              <View style={[styles.tillSummaryBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.icon }]}>Opening Float</Text>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>{fmt(currentTill.openingFloat)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.icon }]}>Cash Sales</Text>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>{fmt(currentTill.transactions.cashTotal)}</Text>
                </View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.summaryLabel, { color: theme.icon }]}>Expected in Drawer</Text>
                  <Text style={[styles.summaryValue, { color: theme.brand, fontWeight: '700' }]}>
                    {fmt(currentTill.openingFloat + currentTill.transactions.cashTotal)}
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.cashLabel, { color: theme.icon, marginTop: 16 }]}>Actual Cash in Drawer (₹)</Text>
            <View style={[styles.inputGroup, { borderColor: isDark ? '#374151' : '#E5E7EB', marginBottom: 12 }]}>
              <Text style={[styles.inputPrefix, { color: theme.icon }]}>₹</Text>
              <TextInput
                style={[styles.floatInput, { color: theme.text }]}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.icon}
                value={closingCash}
                onChangeText={setClosingCash}
                autoFocus
              />
            </View>
            {closingCash && currentTill && (
              <Text style={[
                styles.varianceText,
                { color: parseFloat(closingCash) >= (currentTill.openingFloat + currentTill.transactions.cashTotal) ? '#10B981' : '#F59E0B' },
              ]}>
                Variance: ₹{(parseFloat(closingCash) - (currentTill.openingFloat + currentTill.transactions.cashTotal)).toFixed(2)}
              </Text>
            )}

            <TextInput
              style={[styles.notesInput, { color: theme.text, borderColor: isDark ? '#374151' : '#E5E7EB', backgroundColor: isDark ? '#1F2937' : '#F9FAFB', marginTop: 8 }]}
              placeholder="Closing notes (optional)"
              placeholderTextColor={theme.icon}
              value={closingNotes}
              onChangeText={setClosingNotes}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#EF4444', opacity: isClosing || !closingCash ? 0.6 : 1, marginTop: 20 }]}
              onPress={handleCloseTill}
              disabled={isClosing || !closingCash}
            >
              {isClosing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="lock-closed-outline" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Close Till</Text>
                </>
              )}
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Session Grid subcomponent
// ─────────────────────────────────────────────────────────────
function SessionGrid({
  sessions,
  selectedSessionId,
  setSelectedSessionId,
  sessionsLoading,
  refetchSessions,
  theme,
  isDark,
  fmt,
  fmtTime,
  style,
}: {
  sessions: CustomerSession[];
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  sessionsLoading: boolean;
  refetchSessions: () => void;
  theme: (typeof Colors)['light'];
  isDark: boolean;
  fmt: (n: number) => string;
  fmtTime: (d: string) => string;
  style?: object;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const cols = isTablet ? 3 : 2;
  const padding = 16;
  const gap = 12;
  const cardW = (width * (isTablet ? 0.5 : 1) - padding * 2 - gap * (cols - 1)) / cols;

  return (
    <ScrollView
      style={[styles.tabContent, style]}
      contentContainerStyle={styles.tabInner}
      refreshControl={
        <RefreshControl refreshing={sessionsLoading} onRefresh={refetchSessions} tintColor={theme.brand} />
      }
    >
      <View style={[styles.sessionHeader]}>
        <Text style={[styles.sectionTitle2, { color: theme.text }]}>
          Active Sessions ({sessions.length})
        </Text>
        <TouchableOpacity onPress={refetchSessions}>
          <Ionicons name="refresh" size={20} color={theme.brand} />
        </TouchableOpacity>
      </View>

      {sessionsLoading ? (
        <ActivityIndicator color={theme.brand} style={{ marginTop: 40 }} />
      ) : sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={theme.icon} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No active sessions</Text>
        </View>
      ) : (
        <View style={styles.sessionGrid}>
          {sessions.map((s) => {
            const isSelected = s.sessionId === selectedSessionId;
            return (
              <TouchableOpacity
                key={s.sessionId}
                style={[
                  styles.sessionCard,
                  { width: cardW, backgroundColor: theme.background, borderColor: isSelected ? theme.brand : (isDark ? '#374151' : '#E5E7EB') },
                  isSelected && { borderWidth: 2, shadowColor: theme.brand, shadowOpacity: 0.3, shadowRadius: 6 },
                ]}
                onPress={() => setSelectedSessionId(isSelected ? null : s.sessionId)}
              >
                <View style={styles.sessionCardTop}>
                  <Text style={[styles.sessionTable, { color: theme.text }]}>
                    T{s.tableNumber}
                  </Text>
                  <View style={[
                    styles.sessionBadge,
                    { backgroundColor: s.allOrdersPaid ? (isDark ? '#064E3B' : '#ECFDF5') : (isDark ? '#78350F' : '#FEF3C7') },
                  ]}>
                    <Text style={[styles.sessionBadgeText, { color: s.allOrdersPaid ? '#10B981' : '#F59E0B' }]}>
                      {s.allOrdersPaid ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.sessionTime, { color: theme.icon }]}>
                  {fmtTime(s.startedAt)}
                </Text>
                <Text style={[styles.sessionAmount, { color: theme.brand }]}>
                  {fmt(s.totalAmount)}
                </Text>
                <Text style={[styles.sessionOrders, { color: theme.icon }]}>
                  {s.totalOrders} order{s.totalOrders !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────
// Bill Panel subcomponent
// ─────────────────────────────────────────────────────────────
function BillPanel({
  selectedSession,
  billData,
  billLoading,
  currentTill,
  onCollect,
  theme,
  isDark,
  fmt,
  fmtTime,
}: {
  selectedSession: CustomerSession;
  billData: DetailedBillCalculation | null;
  billLoading: boolean;
  currentTill: TillSession | null;
  onCollect: () => void;
  theme: (typeof Colors)['light'];
  isDark: boolean;
  fmt: (n: number) => string;
  fmtTime: (d: string) => string;
}) {
  return (
    <View style={[styles.billPanel, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderLeftColor: isDark ? '#374151' : '#E5E7EB' }]}>
      <View style={styles.billPanelHeader}>
        <Text style={[styles.billTitle, { color: theme.text }]}>
          Table {selectedSession.tableNumber}
        </Text>
        <Text style={[styles.billSub, { color: theme.icon }]}>
          Since {fmtTime(selectedSession.startedAt)}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {billLoading ? (
          <ActivityIndicator color={theme.brand} style={{ marginTop: 40 }} />
        ) : billData ? (
          <View style={styles.billContent}>
            {/* Items */}
            {billData.allItems?.map((item, idx) => (
              <View key={idx} style={styles.billItem}>
                <Text style={[styles.billItemName, { color: theme.text }]} numberOfLines={2}>
                  {item.name}
                  {item.quantity > 1 && (
                    <Text style={{ color: theme.icon }}> ×{item.quantity}</Text>
                  )}
                </Text>
                <Text style={[styles.billItemAmount, { color: theme.text }]}>
                  {fmt(item.quantity * item.unitPrice)}
                </Text>
              </View>
            ))}

            <View style={[styles.divider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />

            {/* Totals */}
            <View style={styles.billRow}>
              <Text style={[styles.billRowLabel, { color: theme.icon }]}>Subtotal</Text>
              <Text style={[styles.billRowValue, { color: theme.text }]}>{fmt(billData.subTotalAmount)}</Text>
            </View>
            {billData.taxAmount > 0 && (
              <>
                {billData.cgstAmount > 0 && (
                  <View style={styles.billRow}>
                    <Text style={[styles.billRowLabel, { color: theme.icon }]}>CGST</Text>
                    <Text style={[styles.billRowValue, { color: theme.text }]}>{fmt(billData.cgstAmount)}</Text>
                  </View>
                )}
                {billData.sgstAmount > 0 && (
                  <View style={styles.billRow}>
                    <Text style={[styles.billRowLabel, { color: theme.icon }]}>SGST</Text>
                    <Text style={[styles.billRowValue, { color: theme.text }]}>{fmt(billData.sgstAmount)}</Text>
                  </View>
                )}
                {billData.igstAmount > 0 && (
                  <View style={styles.billRow}>
                    <Text style={[styles.billRowLabel, { color: theme.icon }]}>IGST</Text>
                    <Text style={[styles.billRowValue, { color: theme.text }]}>{fmt(billData.igstAmount)}</Text>
                  </View>
                )}
              </>
            )}
            {billData.discountAmount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billRowLabel, { color: '#10B981' }]}>Discount</Text>
                <Text style={[styles.billRowValue, { color: '#10B981' }]}>-{fmt(billData.discountAmount)}</Text>
              </View>
            )}
            {billData.roundOffAmount !== 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billRowLabel, { color: theme.icon }]}>Round Off</Text>
                <Text style={[styles.billRowValue, { color: theme.text }]}>
                  {billData.roundOffAmount > 0 ? '+' : ''}{fmt(Math.abs(billData.roundOffAmount))}
                </Text>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />

            <View style={styles.billRow}>
              <Text style={[styles.billTotalLabel, { color: theme.text }]}>Total</Text>
              <Text style={[styles.billTotalValue, { color: theme.brand }]}>{fmt(billData.totalAmount)}</Text>
            </View>

            {billData.pendingAmount > 0 && billData.pendingAmount < billData.totalAmount && (
              <View style={styles.billRow}>
                <Text style={[styles.billRowLabel, { color: '#F59E0B' }]}>Still Pending</Text>
                <Text style={[styles.billRowValue, { color: '#F59E0B' }]}>{fmt(billData.pendingAmount)}</Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.billFooter}>
        <TouchableOpacity
          style={[
            styles.collectBtn,
            {
              backgroundColor: selectedSession.allOrdersPaid ? '#9CA3AF' : '#10B981',
              opacity: !currentTill ? 0.5 : 1,
            },
          ]}
          onPress={onCollect}
          disabled={!currentTill || selectedSession.allOrdersPaid}
        >
          <Ionicons name="card-outline" size={18} color="#FFF" />
          <Text style={styles.collectBtnText}>
            {selectedSession.allOrdersPaid
              ? 'Already Paid'
              : `Collect ${billData ? fmt(billData.totalAmount) : ''}`}
          </Text>
        </TouchableOpacity>
        {!currentTill && (
          <Text style={[styles.noTillText, { color: '#F59E0B' }]}>
            Open till first to collect payment
          </Text>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, fontWeight: '600' },

  // POS
  catScroll: { flexGrow: 0, borderBottomWidth: 1 },
  catScrollInner: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  posGrid: { padding: 12, gap: 10 },
  posItemCard: {
    flex: 1, margin: 5, borderRadius: 12, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 }, android: { elevation: 1 } }),
  },
  posItemImage: { width: '100%', height: 100 },
  posItemImagePlaceholder: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center' },
  posItemInfo: { padding: 10 },
  posItemName: { fontSize: 13, fontWeight: '600', marginBottom: 4, lineHeight: 18 },
  posItemPrice: { fontSize: 15, fontWeight: '700' },
  cartFab: {
    position: 'absolute', bottom: 12, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  cartFabText: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  orderTypeRow: { flexDirection: 'row', margin: 16, gap: 8 },
  orderTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  orderTypeBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  tablePickerScroll: { flexGrow: 0, marginBottom: 8 },
  tableChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB' },
  tableChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  cartItemName: { fontSize: 14, fontWeight: '600' },
  cartItemPrice: { fontSize: 12, marginTop: 2 },
  cartItemTotal: { fontSize: 14, fontWeight: '700', marginLeft: 8, minWidth: 60, textAlign: 'right' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cartTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  cartTotalLabel: { fontSize: 14, fontWeight: '500' },
  cartTotalValue: { fontSize: 20, fontWeight: '800' },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  tillPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  tillPillText: { fontSize: 12, fontWeight: '700' },

  // Content
  content: { flex: 1 },
  tabContent: { flex: 1 },
  tabInner: { padding: 16, paddingBottom: 24 },

  // Bottom Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  // Dot + badge
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Incoming order cards
  orderCard: {
    borderRadius: 14, borderWidth: 1, borderLeftWidth: 4,
    padding: 14, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  orderCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  orderCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 },
  orderNumber: { fontSize: 16, fontWeight: '800' },
  tableBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  tableBadgeText: { fontSize: 11, fontWeight: '700' },
  orderTime: { fontSize: 12 },
  orderAmount: { fontSize: 17, fontWeight: '800' },
  orderItems: { marginBottom: 12, gap: 2 },
  orderItem: { fontSize: 13 },
  orderActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 5,
    borderWidth: 1.5, borderColor: '#EF4444',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 5,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Sessions
  tabletRow: { flex: 1, flexDirection: 'row' },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sessionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sessionCard: {
    borderRadius: 14, borderWidth: 1, padding: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  sessionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sessionTable: { fontSize: 18, fontWeight: '800' },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sessionBadgeText: { fontSize: 11, fontWeight: '700' },
  sessionTime: { fontSize: 11, marginBottom: 6 },
  sessionAmount: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  sessionOrders: { fontSize: 11 },

  // Bill sheet (phone modal)
  billSheet: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  billSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16 },
  billSheetTitle: { fontSize: 18, fontWeight: '800' },
  billSheetSub: { fontSize: 13, marginTop: 2 },

  // Bill panel (tablet sidebar)
  billPanel: { width: 300, borderLeftWidth: 1, display: 'flex', flexDirection: 'column' },
  billPanelHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  billTitle: { fontSize: 17, fontWeight: '800' },
  billSub: { fontSize: 12, marginTop: 2 },
  billContent: { padding: 16, gap: 8 },
  billItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  billItemName: { flex: 1, fontSize: 13, fontWeight: '500' },
  billItemAmount: { fontSize: 13, fontWeight: '600' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },
  billRowLabel: { fontSize: 13 },
  billRowValue: { fontSize: 13, fontWeight: '500' },
  billTotalLabel: { fontSize: 15, fontWeight: '700' },
  billTotalValue: { fontSize: 15, fontWeight: '800' },
  divider: { height: 1, marginVertical: 8 },
  billFooter: { padding: 16, gap: 8 },
  collectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 12, gap: 6,
  },
  collectBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  noTillText: { fontSize: 12, textAlign: 'center' },

  // Till
  tillCard: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  tillCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tillMeta: { gap: 6, marginBottom: 16 },
  tillMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tillMetaText: { fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, minWidth: '45%', borderRadius: 12, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel2: { fontSize: 11, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 22, fontWeight: '800' },
  tillEmpty: { alignItems: 'center', paddingVertical: 24 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
    borderWidth: 1.5, borderColor: '#EF4444',
  },
  dangerBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

  // History
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  historyDate: { fontSize: 13, fontWeight: '600' },
  historyCashier: { fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: '700' },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-end' },
  historyBadgeText: { fontSize: 11, fontWeight: '600' },

  // Till summary
  tillSummaryBox: { borderRadius: 10, padding: 12, gap: 8, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600' },
  varianceText: { fontSize: 13, fontWeight: '600', marginBottom: 4 },

  // Modals
  modalFull: { flex: 1 },
  tillModalContent: { flex: 1, justifyContent: 'center', padding: 32 },
  tillModalIcon: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  tillModalTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  tillModalSub: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },

  payModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  payModalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  payModalHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  payModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  payModalTitle: { fontSize: 20, fontWeight: '800' },
  payModalAmount: { fontSize: 36, fontWeight: '900', textAlign: 'center', marginBottom: 24 },

  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  methodChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, gap: 4, borderWidth: 1.5,
  },
  methodLabel: { fontSize: 13, fontWeight: '700' },

  cashSection: { gap: 8 },
  cashLabel: { fontSize: 13, fontWeight: '600' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10 },
  changeText: { fontSize: 15, fontWeight: '700' },

  // Shared inputs
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12,
  },
  inputPrefix: { fontSize: 18, marginRight: 4, fontWeight: '600' },
  floatInput: { flex: 1, fontSize: 28, fontWeight: '700', paddingVertical: 8 },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 64 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 14, gap: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  sectionTitle2: { fontSize: 16, fontWeight: '700' },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtext: { fontSize: 13, textAlign: 'center', lineHeight: 20, opacity: 0.8 },
});
