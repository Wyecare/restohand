import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearAuthState,
  selectActiveRestaurantId,
  selectAuthState,
} from '@/store/slices/authSlice';
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
import {
  useListOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderPaymentMutation,
  useCalculateCartTotalMutation,
} from '@/store/api/ordersApi';
import {
  useFindSessionsQuery,
  useCloseSessionMutation,
  type CustomerSession,
} from '@/store/api/customerSessionsApi';
import { useGetDetailedSessionBillQuery } from '@/store/api/billingApi';
import { useCashierSocket } from '@/hooks/useCashierSocket';
import {
  useListMenuCategoriesByBranchQuery,
  useListMenuItemsByBranchQuery,
  useListMenuModifiersByBranchQuery,
  type MenuCategory,
  type MenuItem,
} from '@/store/api/menuApi';
import { useListRestaurantTablesByBranchQuery } from '@/store/api/restaurantsApi';
import { useTableHeatmapSSE, type TableHeatmapData } from '@/hooks/useTableHeatmapSSE';
import type { Order, CalculateCartTotalResponse } from '@/store/api/types';

// ─── Constants ───────────────────────────────────────────────────────────────
const PURPLE = '#6B21E8';
const PURPLE_DARK = '#4C1D95';
const RIGHT_BG = '#EFEFEF';
const LEFT_BG = '#FFFFFF';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#888888';
const DIVIDER = '#EEEEEE';

type ActiveTab = 'sessions' | 'orders' | 'tables' | 'new';
type PaymentMethod = 'cash' | 'card' | 'upi';
type LeftPanelMode = 'idle' | 'session' | 'cart';

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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toFixed(2)}`;
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtDate = (d: string) => {
  const dt = new Date(d);
  return (
    dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ' ' +
    dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
};
const fmtDuration = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function getTableColor(table: TableHeatmapData): string {
  switch (table.status) {
    case 'available': return '#16A34A';
    case 'reserved': return '#2563EB';
    case 'cleaning': return '#6B7280';
    case 'occupied': {
      const h = (table.occupiedDuration ?? 0) / 3600000;
      if (h < 0.5) return '#EAB308';
      if (h < 1) return '#F97316';
      if (h < 1.5) return '#EA580C';
      if (h < 2) return '#DC2626';
      return '#991B1B';
    }
    default: return '#9CA3AF';
  }
}

function getStatusLabel(table: TableHeatmapData): string {
  switch (table.status) {
    case 'available': return 'Available';
    case 'reserved': return 'Reserved';
    case 'cleaning': return 'Cleaning';
    case 'occupied': {
      const h = (table.occupiedDuration ?? 0) / 3600000;
      if (h < 0.5) return 'Fresh';
      if (h < 1) return 'Medium';
      if (h < 2) return 'Long';
      return 'Critical';
    }
    default: return 'Unknown';
  }
}

// ─── Till Open Modal ──────────────────────────────────────────────────────────
function TillOpenModal({
  visible,
  restaurantId,
  branchId,
  onOpened,
}: {
  visible: boolean;
  restaurantId: string;
  branchId: string;
  onOpened: () => void;
}) {
  const [float, setFloat] = useState('');
  const [notes, setNotes] = useState('');
  const [openTill, { isLoading }] = useOpenTillMutation();

  const handle = async () => {
    try {
      await openTill({ restaurantId, branchId, openingFloat: parseFloat(float) || 0, openingNotes: notes || undefined }).unwrap();
      setFloat(''); setNotes('');
      onOpened();
    } catch (e: any) {
      Alert.alert('Error', e?.data?.message ?? 'Failed to open till');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[s.modalFull, { backgroundColor: LEFT_BG }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.tillModalContent}>
            <View style={[s.tillModalIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="cash-outline" size={40} color={PURPLE} />
            </View>
            <Text style={s.tillModalTitle}>Open Till</Text>
            <Text style={s.tillModalSub}>Enter the opening float to start your shift</Text>
            <View style={s.inputGroup}>
              <Text style={s.inputPrefix}>₹</Text>
              <TextInput
                style={s.floatInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={TEXT_SECONDARY}
                value={float}
                onChangeText={setFloat}
                autoFocus
              />
            </View>
            <TextInput
              style={s.notesInput}
              placeholder="Opening notes (optional)"
              placeholderTextColor={TEXT_SECONDARY}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: PURPLE, opacity: isLoading ? 0.7 : 1 }]}
              onPress={handle}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="lock-open-outline" size={18} color="#FFF" />
                  <Text style={s.actionBtnText}>Open Till</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({
  visible,
  totalAmount,
  onClose,
  onConfirm,
  isProcessing,
}: {
  visible: boolean;
  totalAmount: number;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
  isProcessing: boolean;
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
      <View style={s.sheetOverlay}>
        <SafeAreaView style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Collect Payment</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>
          <Text style={s.payAmount}>{fmt(totalAmount)}</Text>
          <View style={s.methodRow}>
            {methods.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[s.methodChip, method === m.id && { backgroundColor: PURPLE, borderColor: PURPLE }]}
                onPress={() => setMethod(m.id)}
              >
                <Ionicons name={m.icon as any} size={20} color={method === m.id ? '#FFF' : TEXT_SECONDARY} />
                <Text style={[s.methodLabel, { color: method === m.id ? '#FFF' : TEXT_PRIMARY }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {method === 'cash' && (
            <View style={s.cashSection}>
              <Text style={s.cashLabel}>Cash Given</Text>
              <View style={s.inputGroup}>
                <Text style={s.inputPrefix}>₹</Text>
                <TextInput
                  style={s.floatInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={TEXT_SECONDARY}
                  value={cashGiven}
                  onChangeText={setCashGiven}
                  autoFocus
                />
              </View>
              {parseFloat(cashGiven) >= totalAmount && (
                <View style={s.changeRow}>
                  <Ionicons name="cash" size={16} color="#10B981" />
                  <Text style={{ color: '#10B981', fontWeight: '700' }}>Change: {fmt(change)}</Text>
                </View>
              )}
            </View>
          )}
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#10B981', marginTop: 24, opacity: isProcessing ? 0.7 : 1 }]}
            onPress={() => onConfirm(method)}
            disabled={isProcessing}
          >
            {isProcessing ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                <Text style={s.actionBtnText}>Confirm {method.toUpperCase()}</Text>
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Till Modal ───────────────────────────────────────────────────────────────
function TillModal({
  visible,
  onClose,
  currentTill,
  restaurantId,
  branchId,
  onClosed,
}: {
  visible: boolean;
  onClose: () => void;
  currentTill: TillSession | null | undefined;
  restaurantId: string;
  branchId: string;
  onClosed: () => void;
}) {
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [closeTill, { isLoading }] = useCloseTillMutation();
  const { data: history } = useGetTillHistoryQuery(
    restaurantId ? { restaurantId, branchId, page: 1, limit: 5 } : skipToken
  );

  const handleClose = async () => {
    if (!currentTill || !restaurantId) return;
    try {
      await closeTill({
        restaurantId,
        tillId: currentTill._id || currentTill.id,
        closingCash: parseFloat(closingCash) || 0,
        closingNotes: notes || undefined,
      }).unwrap();
      setClosingCash(''); setNotes('');
      onClosed();
    } catch (e: any) {
      Alert.alert('Error', e?.data?.message ?? 'Failed to close till');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="pageSheet">
      <View style={s.sheetOverlay}>
        <SafeAreaView style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Till Management</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          {currentTill ? (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              {/* Current till stats */}
              <View style={s.tillStatsGrid}>
                {[
                  { label: 'Opening Float', value: fmt(currentTill.openingFloat) },
                  { label: 'Cash Sales', value: fmt(currentTill.cashSales ?? 0) },
                  { label: 'Card Sales', value: fmt(currentTill.cardSales ?? 0) },
                  { label: 'UPI Sales', value: fmt(currentTill.upiSales ?? 0) },
                  { label: 'Total Sales', value: fmt(currentTill.totalSales ?? 0) },
                  { label: 'Expected Cash', value: fmt((currentTill.openingFloat ?? 0) + (currentTill.cashSales ?? 0)) },
                ].map(({ label, value }) => (
                  <View key={label} style={s.tillStatCard}>
                    <Text style={s.tillStatValue}>{value}</Text>
                    <Text style={s.tillStatLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              <Text style={[s.sectionLabel, { marginTop: 8 }]}>Close Till</Text>
              <View style={s.inputGroup}>
                <Text style={s.inputPrefix}>₹</Text>
                <TextInput
                  style={s.floatInput}
                  keyboardType="numeric"
                  placeholder="Closing cash"
                  placeholderTextColor={TEXT_SECONDARY}
                  value={closingCash}
                  onChangeText={setClosingCash}
                />
              </View>
              <TextInput
                style={s.notesInput}
                placeholder="Closing notes (optional)"
                placeholderTextColor={TEXT_SECONDARY}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#DC2626', opacity: isLoading ? 0.7 : 1 }]}
                onPress={handleClose}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="lock-closed-outline" size={18} color="#FFF" />
                    <Text style={s.actionBtnText}>Close Till</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* History */}
              {(history?.sessions?.length ?? 0) > 0 && (
                <>
                  <Text style={s.sectionLabel}>Recent Sessions</Text>
                  {history!.sessions.map((sess, idx) => (
                    <View key={sess.id || sess._id || idx} style={s.histRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.histDate}>{fmtDate(sess.openedAt)}</Text>
                        <Text style={s.histSub}>Float: {fmt(sess.openingFloat)}</Text>
                      </View>
                      <Text style={[s.histAmount, { color: PURPLE }]}>{fmt(sess.totalSales ?? 0)}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          ) : (
            <View style={s.centerBox}>
              <Ionicons name="cash-outline" size={48} color={TEXT_SECONDARY} style={{ opacity: 0.4 }} />
              <Text style={s.emptyTitle}>No open till</Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CashierScreen() {
  const { width } = useWindowDimensions();
  const dispatch = useAppDispatch();

  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const authState = useAppSelector(selectAuthState);
  const session = authState.session;
  const idToken = authState.idToken;
  const branchId = session?.branchId ?? '';

  // ── Tab & panel state ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('sessions');
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('idle');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // ── Orders state ──────────────────────────────────────────────────────────
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

  // ── Till state ────────────────────────────────────────────────────────────
  const [showTillOpen, setShowTillOpen] = useState(false);
  const [showTillModal, setShowTillModal] = useState(false);

  // ── Session payment state ─────────────────────────────────────────────────
  const [sessionPaymentOpen, setSessionPaymentOpen] = useState(false);
  const [sessionPayProcessing, setSessionPayProcessing] = useState(false);

  // ── POS / New Order state ─────────────────────────────────────────────────
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posSelectedCategoryId, setPosSelectedCategoryId] = useState<string | null>(null);
  const [posRightView, setPosRightView] = useState<'categories' | 'items'>('categories');
  const [posOrderType, setPosOrderType] = useState<'table' | 'walkin'>('walkin');
  const [posSelectedTableId, setPosSelectedTableId] = useState('');
  const [posIsProcessing, setPosIsProcessing] = useState(false);
  const [posPaymentOpen, setPosPaymentOpen] = useState(false);
  const [posCreatedOrderId, setPosCreatedOrderId] = useState<string | null>(null);
  const [posCreatedOrderNumber, setPosCreatedOrderNumber] = useState<string | null>(null);
  // Billing — calculated via backend (includes GST, VAT, alcohol tax etc.)
  const [posBillTotals, setPosBillTotals] = useState<CalculateCartTotalResponse | null>(null);
  const [posBillCalculating, setPosBillCalculating] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const hasArgs = !!(restaurantId && branchId);

  const { data: currentTill, isLoading: tillLoading, refetch: refetchTill } =
    useGetCurrentTillQuery(hasArgs ? { restaurantId: restaurantId!, branchId } : skipToken, { pollingInterval: 60000 });

  const { data: pendingOrdersData, refetch: refetchPending } =
    useListOrdersQuery(
      hasArgs ? { restaurantId: restaurantId!, branchId, status: 'pending', limit: 50 } : skipToken,
      { refetchOnMountOrArgChange: true }
    );

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } =
    useFindSessionsQuery(
      hasArgs ? { restaurantId: restaurantId!, branchId, status: 'active', page: 1, limit: 100 } : skipToken
    );

  const { data: billData, isLoading: billLoading } =
    useGetDetailedSessionBillQuery(selectedSessionId ? { sessionId: selectedSessionId, includeUnpaid: true } : skipToken);

  const { data: posCategoriesData } = useListMenuCategoriesByBranchQuery(
    hasArgs ? { restaurantId: restaurantId!, branchId, limit: 100 } : skipToken
  );
  const { data: posItemsData } = useListMenuItemsByBranchQuery(
    hasArgs ? { restaurantId: restaurantId!, branchId, isAvailable: true, limit: 200 } : skipToken
  );
  const { data: posModifiersData } = useListMenuModifiersByBranchQuery(
    hasArgs ? { restaurantId: restaurantId!, branchId, isActive: true } : skipToken
  );
  const { data: posTablesData } = useListRestaurantTablesByBranchQuery(
    hasArgs ? { restaurantId: restaurantId!, branchId } : skipToken
  );

  // ── Table heatmap SSE ─────────────────────────────────────────────────────
  const {
    tables: heatmapTables,
    isConnected: sseConnected,
    connectionStatus,
    reconnect: sseReconnect,
    refreshManually: sseRefresh,
  } = useTableHeatmapSSE(hasArgs);

  // ── Derived ───────────────────────────────────────────────────────────────
  const posCategories = posCategoriesData?.data ?? [];
  const posItems = posItemsData?.data ?? [];
  const posModifiers = posModifiersData?.data ?? [];
  const posTables = (posTablesData ?? []).filter(t => t.isActive !== false);
  const sessions = sessionsData?.sessions ?? [];

  const posFilteredItems = posSelectedCategoryId
    ? posItems.filter(i => i.categoryId === posSelectedCategoryId)
    : posItems;
  const posTotalQty = posCart.reduce((s, i) => s + i.quantity, 0);
  const posSubtotal = posCart.reduce(
    (s, i) => s + i.unitPrice * i.quantity + i.selectedModifiers.reduce((ms, m) => ms + m.selectedOptions.reduce((os, o) => os + o.priceAdjustment, 0), 0) * i.quantity, 0
  );

  const pendingCount = pendingOrders.length;

  // Heatmap stats
  const tableStats = {
    available: heatmapTables.filter(t => t.status === 'available').length,
    occupied: heatmapTables.filter(t => t.status === 'occupied').length,
    reserved: heatmapTables.filter(t => t.status === 'reserved').length,
    critical: heatmapTables.filter(t => t.status === 'occupied' && (t.occupiedDuration ?? 0) >= 7200000).length,
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [acceptOrder] = useAcceptOrderMutation();
  const [rejectOrder] = useRejectOrderMutation();
  const [updateOrderPayment] = useUpdateOrderPaymentMutation();
  const [closeSession] = useCloseSessionMutation();
  const [recordTransaction] = useRecordTillTransactionMutation();
  const [createOrder] = useCreateOrderMutation();
  const [calculateCartTotal] = useCalculateCartTotalMutation();

  // ── Socket ────────────────────────────────────────────────────────────────
  useCashierSocket({
    token: idToken,
    onOrderPending: useCallback((order: Order) => {
      setPendingOrders(prev => prev.some(o => o.id === order.id) ? prev : [order, ...prev]);
    }, []),
    onOrderUpdated: useCallback((order: Order) => {
      if (order.status !== 'pending') {
        setPendingOrders(prev => prev.filter(o => o.id !== order.id));
      }
    }, []),
  });

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetched = pendingOrdersData?.data ?? [];
    if (!fetched.length) return;
    setPendingOrders(prev => {
      const ids = new Set(prev.map(o => o.id));
      const newOnes = fetched.filter(o => !ids.has(o.id));
      return newOnes.length ? [...newOnes, ...prev] : prev;
    });
  }, [pendingOrdersData]);

  useEffect(() => {
    if (!tillLoading && !currentTill) setShowTillOpen(true);
    else if (currentTill) setShowTillOpen(false);
  }, [tillLoading, currentTill]);

  useFocusEffect(useCallback(() => {
    refetchTill();
    refetchPending();
    refetchSessions();
  }, []));

  // ── Cart bill calculation (debounced, uses unified billing service) ─────────
  useEffect(() => {
    if (!restaurantId || posCart.length === 0) {
      setPosBillTotals(null);
      return;
    }
    const t = setTimeout(async () => {
      setPosBillCalculating(true);
      try {
        const result = await calculateCartTotal({
          restaurantId,
          items: posCart.map(c => ({
            menuItemId: c.menuItemId,
            name: c.name,
            quantity: c.quantity,
            pricing: { unitAmount: c.unitPrice, currency: 'INR' },
            selectedModifiers: c.selectedModifiers,
          })),
        }).unwrap();
        setPosBillTotals(result);
      } catch {
        // keep previous totals on error
      } finally {
        setPosBillCalculating(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [posCart, restaurantId]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleLogout = () => {
    dispatch(clearAuthState());
  };

  const handleAccept = async (order: Order) => {
    if (!restaurantId) return;
    try {
      await acceptOrder({ restaurantId, orderId: order.id }).unwrap();
      setPendingOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (e: any) {
      Alert.alert('Error', e?.data?.message ?? 'Failed to accept');
    }
  };

  const handleReject = (order: Order) => {
    Alert.alert('Reject Order', `Cancel #${order.orderNumber}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await rejectOrder({ restaurantId: restaurantId!, orderId: order.id }).unwrap();
            setPendingOrders(prev => prev.filter(o => o.id !== order.id));
          } catch (e: any) {
            Alert.alert('Error', e?.data?.message ?? 'Failed');
          }
        },
      },
    ]);
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setLeftPanelMode('session');
  };

  const handleTableTap = (table: TableHeatmapData) => {
    if (table.status === 'occupied' && table.activeSessionId) {
      // Show this table's session in the left panel
      setSelectedSessionId(table.activeSessionId);
      setLeftPanelMode('session');
    } else if (table.status === 'available') {
      // Switch to new order, pre-select this table
      setPosOrderType('table');
      setPosSelectedTableId(table.tableId);
      setActiveTab('new');
      setPosRightView('categories');
      setLeftPanelMode('cart');
    }
  };

  const handleCollectSessionPayment = async (method: PaymentMethod) => {
    if (!selectedSessionId || !billData || !restaurantId) return;
    setSessionPayProcessing(true);
    try {
      const unpaid = billData.orderBreakdown.filter(o => o.paymentStatus !== 'paid').map(o => o.orderId);
      await Promise.all(unpaid.map(id => updateOrderPayment({ restaurantId, orderId: id, paymentStatus: 'paid' }).unwrap()));
      await closeSession({ sessionId: selectedSessionId, reason: 'payment_completed', notes: `Paid via ${method}` }).unwrap();
      if (currentTill) {
        await recordTransaction({ restaurantId, tillId: currentTill._id || currentTill.id, paymentMethod: method, amount: billData.totalAmount }).unwrap();
      }
      setSessionPaymentOpen(false);
      setSelectedSessionId(null);
      setLeftPanelMode('idle');
      refetchSessions();
      refetchTill();
      sseRefresh();
      Alert.alert('✓ Paid', `${fmt(billData.totalAmount)} collected via ${method.toUpperCase()}`);
    } catch (e: any) {
      Alert.alert('Error', e?.data?.message ?? 'Payment failed');
    } finally {
      setSessionPayProcessing(false);
    }
  };

  // ── POS handlers ──────────────────────────────────────────────────────────
  const posAddItem = (item: MenuItem) => {
    setLeftPanelMode('cart');
    setPosCart(prev => {
      const idx = prev.findIndex(c => c.menuItemId === item.id && c.selectedModifiers.length === 0);
      if (idx >= 0) {
        const u = [...prev];
        u[idx] = { ...u[idx], quantity: u[idx].quantity + 1 };
        return u;
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, unitPrice: item.pricing.amount, selectedModifiers: [] }];
    });
  };

  const posUpdateQty = (idx: number, delta: number) => {
    setPosCart(prev => {
      const u = [...prev];
      const q = u[idx].quantity + delta;
      if (q <= 0) u.splice(idx, 1);
      else u[idx] = { ...u[idx], quantity: q };
      if (u.length === 0) setLeftPanelMode('idle');
      return u;
    });
  };

  const handleNewOrderTab = () => {
    setActiveTab('new');
    setPosRightView('categories');
    if (posCart.length > 0) setLeftPanelMode('cart');
  };

  const posCharge = async () => {
    if (!restaurantId || posCart.length === 0) return;
    setPosIsProcessing(true);
    try {
      const table = posOrderType === 'table' ? posTables.find(t => t.id === posSelectedTableId) : null;

      const order = await createOrder({
        restaurantId,
        branchId: branchId || undefined,
        tableId: table?.id,
        tableNumber: table?.tableNumber,
        items: posCart.map(c => ({
          menuItemId: c.menuItemId,
          name: c.name,
          quantity: c.quantity,
          pricing: { unitAmount: c.unitPrice, currency: 'INR' },
          selectedModifiers: c.selectedModifiers,
        })),
        paymentMethod: 'pending',
      }).unwrap();
      setPosCreatedOrderId(order.id);
      setPosCreatedOrderNumber(order.orderNumber);
      setPosPaymentOpen(true);
    } catch (e: any) {
      Alert.alert('Error', e?.data?.message ?? 'Failed to create order');
    } finally {
      setPosIsProcessing(false);
    }
  };

  const posConfirmPayment = async (method: PaymentMethod) => {
    if (!posCreatedOrderId || !restaurantId) return;
    setPosIsProcessing(true);
    // Use backend-calculated total (includes GST/VAT/alcohol tax), fall back to subtotal
    const billAmount = posBillTotals?.totalAmount ?? posSubtotal;
    try {
      await updateOrderPayment({ restaurantId, orderId: posCreatedOrderId, paymentStatus: 'paid', provider: method }).unwrap();
      if (currentTill) {
        await recordTransaction({
          restaurantId,
          tillId: currentTill._id || currentTill.id,
          paymentMethod: method,
          amount: billAmount,
        }).unwrap();
      }
      Alert.alert('✓ Paid', `Order #${posCreatedOrderNumber} paid via ${method.toUpperCase()}`);
      setPosPaymentOpen(false);
      setPosCart([]);
      setPosBillTotals(null);
      setPosCreatedOrderId(null);
      setPosCreatedOrderNumber(null);
      setLeftPanelMode('idle');
      setPosRightView('categories');
      refetchTill();
      sseRefresh();
    } catch (e: any) {
      Alert.alert('Error', e?.data?.message ?? 'Payment failed');
    } finally {
      setPosIsProcessing(false);
    }
  };

  // ── Left Panel ─────────────────────────────────────────────────────────────
  const renderLeftPanel = () => {
    // Cart mode (POS new order)
    if (leftPanelMode === 'cart' || (activeTab === 'new' && posCart.length > 0)) {
      return (
        <View style={s.leftPanel}>
          {/* Order type + table */}
          <View style={s.leftPanelHeader}>
            <Text style={s.leftPanelTitle}>New Order</Text>
          </View>
          <View style={s.orderTypeRow}>
            {(['walkin', 'table'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.orderTypeBtn, posOrderType === t && { backgroundColor: PURPLE }]}
                onPress={() => setPosOrderType(t)}
              >
                <Text style={[s.orderTypeBtnText, posOrderType === t && { color: '#FFF' }]}>
                  {t === 'table' ? 'Dine-In' : 'Walk-In'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {posOrderType === 'table' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6, flexDirection: 'row' }}>
              {posTables.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.tableChip, posSelectedTableId === t.id && { backgroundColor: PURPLE, borderColor: PURPLE }]}
                  onPress={() => setPosSelectedTableId(t.id)}
                >
                  <Text style={[s.tableChipText, posSelectedTableId === t.id && { color: '#FFF' }]}>T{t.tableNumber}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <ScrollView style={{ flex: 1 }}>
            {posCart.map((item, idx) => (
              <View key={idx} style={s.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cartItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.cartItemPrice}>{fmt(item.unitPrice)}</Text>
                </View>
                <View style={s.qtyRow}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => posUpdateQty(idx, -1)}>
                    <Ionicons name="remove" size={14} color={TEXT_PRIMARY} />
                  </TouchableOpacity>
                  <Text style={s.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => posUpdateQty(idx, 1)}>
                    <Ionicons name="add" size={14} color={TEXT_PRIMARY} />
                  </TouchableOpacity>
                </View>
                <Text style={s.cartItemTotal}>{fmt(item.unitPrice * item.quantity)}</Text>
              </View>
            ))}
            {posCart.length === 0 && (
              <View style={s.centerBox}>
                <Ionicons name="cart-outline" size={40} color={TEXT_SECONDARY} style={{ opacity: 0.4 }} />
                <Text style={s.emptySubtext}>Cart is empty</Text>
              </View>
            )}

            {/* Tax summary — from billing module */}
            {posBillTotals && posCart.length > 0 && (
              <View style={s.cartTaxSummary}>
                <View style={s.billSummaryRow}>
                  <Text style={s.billSummaryLabel}>Subtotal</Text>
                  <Text style={s.billSummaryValue}>{posBillCalculating ? '…' : fmt(posBillTotals.subtotal)}</Text>
                </View>
                {posBillTotals.cgstAmount > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={s.billSummaryLabel}>CGST</Text>
                    <Text style={s.billSummaryValue}>{fmt(posBillTotals.cgstAmount)}</Text>
                  </View>
                )}
                {posBillTotals.sgstAmount > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={s.billSummaryLabel}>SGST</Text>
                    <Text style={s.billSummaryValue}>{fmt(posBillTotals.sgstAmount)}</Text>
                  </View>
                )}
                {posBillTotals.igstAmount > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={s.billSummaryLabel}>IGST</Text>
                    <Text style={s.billSummaryValue}>{fmt(posBillTotals.igstAmount)}</Text>
                  </View>
                )}
                {(posBillTotals.totalVatAmount ?? 0) > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={[s.billSummaryLabel, { color: '#DC2626' }]}>VAT (Alcohol)</Text>
                    <Text style={[s.billSummaryValue, { color: '#DC2626' }]}>{fmt(posBillTotals.totalVatAmount!)}</Text>
                  </View>
                )}
                {(posBillTotals.discountAmount ?? 0) > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={[s.billSummaryLabel, { color: '#10B981' }]}>Discount</Text>
                    <Text style={[s.billSummaryValue, { color: '#10B981' }]}>-{fmt(posBillTotals.discountAmount!)}</Text>
                  </View>
                )}
                {posBillTotals.roundOffAmount !== 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={s.billSummaryLabel}>Round Off</Text>
                    <Text style={s.billSummaryValue}>{fmt(posBillTotals.roundOffAmount)}</Text>
                  </View>
                )}
              </View>
            )}
            {posBillCalculating && posCart.length > 0 && !posBillTotals && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ActivityIndicator size="small" color={PURPLE} />
                <Text style={[s.billSummaryLabel, { fontSize: 11 }]}>Calculating taxes…</Text>
              </View>
            )}
          </ScrollView>

          {/* Total bar */}
          <TouchableOpacity
            style={[s.totalBar, { opacity: posCart.length === 0 || posIsProcessing ? 0.6 : 1 }]}
            onPress={posCharge}
            disabled={posCart.length === 0 || posIsProcessing}
          >
            {posIsProcessing ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={s.totalBarLabel}>TOTAL</Text>
                {posBillCalculating
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={s.totalBarAmount}>{fmt(posBillTotals?.totalAmount ?? posSubtotal)}</Text>
                }
                <Text style={s.totalBarLabel}>CHARGE →</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // Session bill mode
    if (leftPanelMode === 'session' && selectedSessionId) {
      const sess = sessions.find(s2 => s2.sessionId === selectedSessionId);
      return (
        <View style={s.leftPanel}>
          <View style={s.leftPanelHeader}>
            <TouchableOpacity onPress={() => { setSelectedSessionId(null); setLeftPanelMode('idle'); }}>
              <Ionicons name="arrow-back" size={20} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={s.leftPanelTitle} numberOfLines={1}>
              Table {sess?.tableNumber ?? '—'}
            </Text>
          </View>

          {billLoading ? (
            <View style={s.centerBox}><ActivityIndicator color={PURPLE} /></View>
          ) : billData ? (
            <ScrollView style={{ flex: 1 }}>
              {/* Orders breakdown */}
              {billData.orderBreakdown.map(ord => (
                <View key={ord.orderId} style={s.orderBlock}>
                  <View style={s.orderBlockHeader}>
                    <Text style={s.orderBlockNum}>#{ord.orderNumber}</Text>
                    <View style={[s.payBadge, { backgroundColor: ord.paymentStatus === 'paid' ? '#ECFDF5' : '#FEF3C7' }]}>
                      <Text style={[s.payBadgeText, { color: ord.paymentStatus === 'paid' ? '#10B981' : '#F59E0B' }]}>
                        {ord.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
                      </Text>
                    </View>
                  </View>
                  {ord.items.map((item, i) => (
                    <View key={i} style={s.billItemRow}>
                      <Text style={s.billItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.billItemQty}>×{item.quantity}</Text>
                      <Text style={s.billItemTotal}>{fmt(item.totalWithTax)}</Text>
                    </View>
                  ))}
                </View>
              ))}

              {/* Summary */}
              <View style={[s.billSummary, { borderTopColor: DIVIDER }]}>
                <View style={s.billSummaryRow}>
                  <Text style={s.billSummaryLabel}>Subtotal</Text>
                  <Text style={s.billSummaryValue}>{fmt(billData.subTotalAmount)}</Text>
                </View>
                {billData.cgstAmount > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={s.billSummaryLabel}>CGST</Text>
                    <Text style={s.billSummaryValue}>{fmt(billData.cgstAmount)}</Text>
                  </View>
                )}
                {billData.sgstAmount > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={s.billSummaryLabel}>SGST</Text>
                    <Text style={s.billSummaryValue}>{fmt(billData.sgstAmount)}</Text>
                  </View>
                )}
                {billData.igstAmount > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={s.billSummaryLabel}>IGST</Text>
                    <Text style={s.billSummaryValue}>{fmt(billData.igstAmount)}</Text>
                  </View>
                )}
                {(billData as any).totalVatAmount > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={s.billSummaryLabel}>VAT (Alcohol)</Text>
                    <Text style={s.billSummaryValue}>{fmt((billData as any).totalVatAmount)}</Text>
                  </View>
                )}
                {billData.discountAmount > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={[s.billSummaryLabel, { color: '#10B981' }]}>Discount</Text>
                    <Text style={[s.billSummaryValue, { color: '#10B981' }]}>-{fmt(billData.discountAmount)}</Text>
                  </View>
                )}
                {billData.roundOffAmount !== 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={s.billSummaryLabel}>Round Off</Text>
                    <Text style={s.billSummaryValue}>{fmt(billData.roundOffAmount)}</Text>
                  </View>
                )}
                {billData.paidAmount > 0 && (
                  <View style={s.billSummaryRow}>
                    <Text style={[s.billSummaryLabel, { color: '#10B981' }]}>Paid</Text>
                    <Text style={[s.billSummaryValue, { color: '#10B981' }]}>{fmt(billData.paidAmount)}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={s.centerBox}>
              <Text style={s.emptySubtext}>No bill data</Text>
            </View>
          )}

          {/* Total bar */}
          {billData && billData.pendingAmount > 0 && (
            <TouchableOpacity
              style={[s.totalBar, { opacity: sessionPayProcessing ? 0.6 : 1 }]}
              onPress={() => setSessionPaymentOpen(true)}
              disabled={sessionPayProcessing}
            >
              <Text style={s.totalBarLabel}>TOTAL DUE</Text>
              <Text style={s.totalBarAmount}>{fmt(billData.pendingAmount)}</Text>
              <Text style={s.totalBarLabel}>PAY →</Text>
            </TouchableOpacity>
          )}
          {billData && billData.pendingAmount === 0 && (
            <View style={[s.totalBar, { backgroundColor: '#10B981' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={s.totalBarLabel}>FULLY PAID</Text>
            </View>
          )}
        </View>
      );
    }

    // Idle
    return (
      <View style={[s.leftPanel, s.centerBox]}>
        <Ionicons name="receipt-outline" size={48} color={TEXT_SECONDARY} style={{ opacity: 0.3 }} />
        <Text style={s.emptyTitle}>No order selected</Text>
        <Text style={s.emptySubtext}>Tap a session or table,{'\n'}or start a new order</Text>
        {currentTill && (
          <View style={s.tillStatusBadge}>
            <Ionicons name="cash-outline" size={14} color={PURPLE} />
            <Text style={s.tillStatusText}>Float: {fmt(currentTill.openingFloat)}</Text>
          </View>
        )}
      </View>
    );
  };

  // ── Right Panel Content ────────────────────────────────────────────────────
  const renderSessionsTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      refreshControl={<RefreshControl refreshing={sessionsLoading} onRefresh={refetchSessions} tintColor={PURPLE} />}
    >
      {sessions.length === 0 ? (
        <View style={[s.centerBox, { paddingVertical: 60 }]}>
          <Ionicons name="receipt-outline" size={48} color={TEXT_SECONDARY} style={{ opacity: 0.3 }} />
          <Text style={s.emptyTitle}>No active sessions</Text>
          <Text style={s.emptySubtext}>Sessions appear when customers order</Text>
        </View>
      ) : (
        sessions.map(sess => (
          <TouchableOpacity
            key={sess.sessionId}
            style={[s.sessionCard, selectedSessionId === sess.sessionId && s.sessionCardActive]}
            onPress={() => handleSelectSession(sess.sessionId)}
          >
            <View style={s.sessionCardRow}>
              <View style={s.sessionTableBadge}>
                <Text style={s.sessionTableNum}>T{sess.tableNumber}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sessionTitle}>Table {sess.tableNumber}</Text>
                <Text style={s.sessionSub}>{sess.totalOrders} order{sess.totalOrders !== 1 ? 's' : ''} · since {fmtTime(sess.startedAt)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.sessionAmount}>{fmt(sess.pendingAmount)}</Text>
                <Text style={s.sessionAmountLabel}>pending</Text>
              </View>
            </View>
            {sess.allOrdersPaid && (
              <View style={s.paidBanner}>
                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700' }}>ALL PAID</Text>
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderOrdersTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetchPending} tintColor={PURPLE} />}
    >
      {pendingOrders.length === 0 ? (
        <View style={[s.centerBox, { paddingVertical: 60 }]}>
          <Ionicons name="checkmark-circle-outline" size={48} color={TEXT_SECONDARY} style={{ opacity: 0.3 }} />
          <Text style={s.emptyTitle}>All clear!</Text>
          <Text style={s.emptySubtext}>No orders waiting for approval</Text>
        </View>
      ) : (
        pendingOrders.map(order => (
          <View key={order.id} style={s.orderCard}>
            <View style={s.orderCardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.orderCardNum}>#{order.orderNumber}</Text>
                {order.tableNumber && <Text style={s.orderCardSub}>Table {order.tableNumber}</Text>}
                <Text style={s.orderCardSub}>{order.items.length} item{order.items.length !== 1 ? 's' : ''} · {fmtTime(order.createdAt)}</Text>
              </View>
              <Text style={s.orderCardAmount}>{fmt(order.totalAmount)}</Text>
            </View>
            {/* Items preview */}
            {order.items.slice(0, 2).map((item, i) => (
              <Text key={i} style={s.orderCardItem} numberOfLines={1}>
                {item.quantity}× {item.name}
              </Text>
            ))}
            {order.items.length > 2 && <Text style={s.orderCardItem}>+{order.items.length - 2} more</Text>}
            <View style={s.orderCardActions}>
              <TouchableOpacity style={[s.orderActionBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]} onPress={() => handleAccept(order)}>
                <Ionicons name="checkmark" size={16} color="#10B981" />
                <Text style={[s.orderActionBtnText, { color: '#10B981' }]}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.orderActionBtn, { backgroundColor: '#FEF2F2', borderColor: '#DC2626' }]} onPress={() => handleReject(order)}>
                <Ionicons name="close" size={16} color="#DC2626" />
                <Text style={[s.orderActionBtnText, { color: '#DC2626' }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderTablesTab = () => {
    // Group by zone
    const zoneMap = heatmapTables.reduce((acc, t) => {
      const z = t.zone || 'Main Area';
      if (!acc[z]) acc[z] = [];
      acc[z].push(t);
      return acc;
    }, {} as Record<string, TableHeatmapData[]>);
    const zones = Object.keys(zoneMap).sort();

    return (
      <View style={{ flex: 1 }}>
        {/* Stats bar */}
        <View style={s.heatmapStats}>
          {[
            { label: 'Available', count: tableStats.available, color: '#16A34A' },
            { label: 'Occupied', count: tableStats.occupied, color: '#F97316' },
            { label: 'Reserved', count: tableStats.reserved, color: '#2563EB' },
            ...(tableStats.critical > 0 ? [{ label: 'Critical', count: tableStats.critical, color: '#991B1B' }] : []),
          ].map(stat => (
            <View key={stat.label} style={s.heatmapStat}>
              <View style={[s.heatmapStatDot, { backgroundColor: stat.color }]} />
              <Text style={s.heatmapStatCount}>{stat.count}</Text>
              <Text style={s.heatmapStatLabel}>{stat.label}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={[s.sseIndicator, { backgroundColor: sseConnected ? '#ECFDF5' : '#FEF2F2' }]}
            onPress={sseRefresh}
          >
            <Ionicons name={sseConnected ? 'wifi' : 'wifi-outline'} size={12} color={sseConnected ? '#10B981' : '#DC2626'} />
            <Text style={[s.sseText, { color: sseConnected ? '#10B981' : '#DC2626' }]}>
              {sseConnected ? 'Live' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
          {heatmapTables.length === 0 ? (
            <View style={[s.centerBox, { paddingVertical: 60 }]}>
              <Ionicons name="grid-outline" size={48} color={TEXT_SECONDARY} style={{ opacity: 0.3 }} />
              <Text style={s.emptyTitle}>No tables</Text>
              <Text style={s.emptySubtext}>
                {connectionStatus === 'connecting' ? 'Connecting...' : 'No table data available'}
              </Text>
            </View>
          ) : (
            zones.map(zone => (
              <View key={zone} style={s.zoneSection}>
                <Text style={s.zoneLabel}>{zone}</Text>
                <View style={s.heatmapGrid}>
                  {zoneMap[zone].map(table => {
                    const color = getTableColor(table);
                    const isSelected = table.activeSessionId === selectedSessionId && leftPanelMode === 'session';
                    return (
                      <TouchableOpacity
                        key={table.tableId}
                        style={[s.heatmapCell, { backgroundColor: color }, isSelected && s.heatmapCellSelected]}
                        onPress={() => handleTableTap(table)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.heatmapCellNum} numberOfLines={1}>
                          {table.displayName || table.tableNumber}
                        </Text>
                        <Text style={s.heatmapCellCapacity}>{table.capacity}</Text>
                        {table.status === 'occupied' && table.occupiedDuration && (
                          <Text style={s.heatmapCellDuration}>
                            {fmtDuration(table.occupiedDuration)}
                          </Text>
                        )}
                        {table.currentBillAmount > 0 && (
                          <Text style={s.heatmapCellBill}>
                            {fmt(table.currentBillAmount)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {/* Legend */}
          {heatmapTables.length > 0 && (
            <View style={s.heatmapLegend}>
              {[
                { color: '#16A34A', label: 'Available' },
                { color: '#EAB308', label: '<30m' },
                { color: '#F97316', label: '30m-1h' },
                { color: '#EA580C', label: '1-1.5h' },
                { color: '#DC2626', label: '1.5-2h' },
                { color: '#991B1B', label: '2h+' },
                { color: '#2563EB', label: 'Reserved' },
                { color: '#6B7280', label: 'Cleaning' },
              ].map(l => (
                <View key={l.label} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: l.color }]} />
                  <Text style={s.legendLabel}>{l.label}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderNewTab = () => {
    // ── Categories grid ────────────────────────────────────────────────────
    if (posRightView === 'categories') {
      return (
        <FlatList
          key="cats"
          data={posCategories}
          keyExtractor={cat => cat.id}
          numColumns={2}
          contentContainerStyle={s.catGrid}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={s.catCard}
              onPress={() => { setPosSelectedCategoryId(cat.id); setPosRightView('items'); }}
              activeOpacity={0.8}
            >
              {cat.imageUrl ? (
                <Image source={{ uri: cat.imageUrl }} style={s.catCardImg} resizeMode="cover" />
              ) : (
                <View style={s.catCardImgPlaceholder}>
                  <Ionicons name="restaurant-outline" size={36} color={PURPLE} />
                </View>
              )}
              <View style={s.catCardFooter}>
                <Text style={s.catCardName} numberOfLines={2}>{cat.name}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={[s.centerBox, { paddingVertical: 60 }]}>
              <Ionicons name="layers-outline" size={48} color={TEXT_SECONDARY} style={{ opacity: 0.3 }} />
              <Text style={s.emptyTitle}>No categories</Text>
            </View>
          }
        />
      );
    }

    // ── Items grid (after category selected) ───────────────────────────────
    const selectedCat = posCategories.find(c => c.id === posSelectedCategoryId);
    return (
      <View style={{ flex: 1 }}>
        {/* Back header */}
        <View style={s.itemsViewHeader}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => { setPosRightView('categories'); setPosSelectedCategoryId(null); }}
          >
            <Ionicons name="arrow-back" size={18} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={s.itemsViewTitle} numberOfLines={1}>{selectedCat?.name ?? 'Items'}</Text>
        </View>

        <FlatList
          key="items"
          data={posFilteredItems}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={s.itemsGrid}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const imgUrl = item.imageUrls?.[0];
            const inCart = posCart.find(c => c.menuItemId === item.id);
            return (
              <TouchableOpacity
                style={[s.itemCard, inCart && s.itemCardInCart]}
                onPress={() => posAddItem(item)}
                activeOpacity={0.8}
              >
                {imgUrl ? (
                  <Image source={{ uri: imgUrl }} style={s.itemCardImg} resizeMode="cover" />
                ) : (
                  <View style={s.itemCardImgPlaceholder}>
                    <Ionicons name="fast-food-outline" size={24} color="#9CA3AF" />
                  </View>
                )}
                <View style={s.itemCardBody}>
                  <Text style={s.itemCardName} numberOfLines={2}>{item.name}</Text>
                  <Text style={s.itemCardPrice}>{fmt(item.pricing.amount)}</Text>
                </View>
                {inCart && (
                  <View style={s.itemCardBadge}>
                    <Text style={s.itemCardBadgeText}>{inCart.quantity}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={[s.centerBox, { paddingVertical: 60 }]}>
              <Ionicons name="fast-food-outline" size={48} color={TEXT_SECONDARY} style={{ opacity: 0.3 }} />
              <Text style={s.emptyTitle}>No items in this category</Text>
            </View>
          }
        />
      </View>
    );
  };

  // ── Tab bar ───────────────────────────────────────────────────────────────
  const tabs: { id: ActiveTab; label: string; icon: string; activeIcon: string; badge?: number }[] = [
    { id: 'sessions', label: 'Sessions', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'orders', label: 'Orders', icon: 'notifications-outline', activeIcon: 'notifications', badge: pendingCount || undefined },
    { id: 'tables', label: 'Tables', icon: 'grid-outline', activeIcon: 'grid' },
    { id: 'new', label: '+ New', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  ];

  // ── Layout ────────────────────────────────────────────────────────────────
  if (!restaurantId) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: TEXT_SECONDARY }}>No restaurant selected</Text>
      </SafeAreaView>
    );
  }

  const leftWidth = Math.floor(width * 0.33);
  const rightWidth = width - leftWidth;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar backgroundColor={PURPLE_DARK} barStyle="light-content" />

      <TillOpenModal
        visible={showTillOpen}
        restaurantId={restaurantId}
        branchId={branchId}
        onOpened={() => { setShowTillOpen(false); refetchTill(); }}
      />

      <PaymentModal
        visible={sessionPaymentOpen}
        totalAmount={billData?.pendingAmount ?? 0}
        onClose={() => setSessionPaymentOpen(false)}
        onConfirm={handleCollectSessionPayment}
        isProcessing={sessionPayProcessing}
      />

      <PaymentModal
        visible={posPaymentOpen}
        totalAmount={posBillTotals?.totalAmount ?? posSubtotal}
        onClose={() => setPosPaymentOpen(false)}
        onConfirm={posConfirmPayment}
        isProcessing={posIsProcessing}
      />

      <TillModal
        visible={showTillModal}
        onClose={() => setShowTillModal(false)}
        currentTill={currentTill}
        restaurantId={restaurantId}
        branchId={branchId}
        onClosed={() => { setShowTillModal(false); refetchTill(); }}
      />

      <View style={s.splitContainer}>
        {/* ── LEFT PANEL ── */}
        <View style={[s.leftPanelWrap, { width: leftWidth }]}>
          {renderLeftPanel()}
        </View>

        {/* ── RIGHT PANEL ── */}
        <View style={[s.rightPanelWrap, { width: rightWidth }]}>
          {/* Header */}
          <View style={s.rightHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.rightHeaderTitle}>CASHIER</Text>
              {currentTill && (
                <Text style={s.rightHeaderSub}>Till open · {fmt(currentTill.totalSales ?? 0)} today</Text>
              )}
            </View>
            <TouchableOpacity style={s.headerIconBtn} onPress={() => setShowTillModal(true)}>
              <Ionicons name="cash-outline" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerIconBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Tab content */}
          <View style={s.rightContent}>
            {activeTab === 'sessions' && renderSessionsTab()}
            {activeTab === 'orders' && renderOrdersTab()}
            {activeTab === 'tables' && renderTablesTab()}
            {activeTab === 'new' && renderNewTab()}
          </View>

          {/* Bottom nav */}
          <View style={s.tabBar}>
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={s.tabItem}
                  onPress={() => tab.id === 'new' ? handleNewOrderTab() : setActiveTab(tab.id)}
                >
                  <View style={{ position: 'relative' }}>
                    <Ionicons
                      name={(active ? tab.activeIcon : tab.icon) as any}
                      size={22}
                      color={active ? PURPLE : TEXT_SECONDARY}
                    />
                    {tab.badge != null && tab.badge > 0 && (
                      <View style={s.tabBadge}>
                        <Text style={s.tabBadgeText}>{tab.badge > 9 ? '9+' : tab.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.tabLabel, { color: active ? PURPLE : TEXT_SECONDARY }]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PURPLE_DARK },
  splitContainer: { flex: 1, flexDirection: 'row' },

  // Left panel
  leftPanelWrap: { backgroundColor: LEFT_BG },
  leftPanel: { flex: 1, flexDirection: 'column' },
  leftPanelHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  leftPanelTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },

  // Right panel
  rightPanelWrap: { flex: 1, backgroundColor: RIGHT_BG, flexDirection: 'column' },
  rightHeader: {
    backgroundColor: PURPLE, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  rightHeaderTitle: { fontSize: 14, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  rightHeaderSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  rightContent: { flex: 1 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: LEFT_BG,
    borderTopWidth: 1, borderTopColor: DIVIDER,
    paddingBottom: Platform.OS === 'ios' ? 4 : 0,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  tabBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#DC2626', borderRadius: 8,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },

  // Cart / order type
  orderTypeRow: { flexDirection: 'row', gap: 8, margin: 12 },
  orderTypeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: DIVIDER, alignItems: 'center',
  },
  orderTypeBtnText: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY },
  tableChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1.5, borderColor: DIVIDER, backgroundColor: '#FFF',
  },
  tableChipText: { fontSize: 12, fontWeight: '700', color: TEXT_PRIMARY },

  // Cart rows
  cartRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  cartItemName: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY },
  cartItemPrice: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  cartItemTotal: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY, minWidth: 56, textAlign: 'right' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8 },
  qtyBtn: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1,
    borderColor: DIVIDER, alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY, minWidth: 20, textAlign: 'center' },

  // Total bar
  totalBar: {
    backgroundColor: PURPLE, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
  },
  totalBarLabel: { fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  totalBarAmount: { fontSize: 18, fontWeight: '900', color: '#FFF' },

  // Cart tax summary
  cartTaxSummary: {
    marginHorizontal: 14, marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: DIVIDER,
  },

  // Bill / session
  orderBlock: { marginHorizontal: 14, marginTop: 12 },
  orderBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  orderBlockNum: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY },
  payBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  payBadgeText: { fontSize: 9, fontWeight: '800' },
  billItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, gap: 4 },
  billItemName: { flex: 1, fontSize: 12, color: TEXT_PRIMARY },
  billItemQty: { fontSize: 11, color: TEXT_SECONDARY, width: 24, textAlign: 'right' },
  billItemTotal: { fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY, width: 56, textAlign: 'right' },
  billSummary: { margin: 14, paddingTop: 10, borderTopWidth: 1 },
  billSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  billSummaryLabel: { fontSize: 12, color: TEXT_SECONDARY },
  billSummaryValue: { fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY },

  // Sessions tab
  sessionCard: {
    backgroundColor: LEFT_BG, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: DIVIDER,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }, android: { elevation: 1 } }),
  },
  sessionCardActive: { borderColor: PURPLE, borderWidth: 2 },
  sessionCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionTableBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: PURPLE, justifyContent: 'center', alignItems: 'center',
  },
  sessionTableNum: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  sessionSub: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  sessionAmount: { fontSize: 16, fontWeight: '800', color: PURPLE },
  sessionAmountLabel: { fontSize: 10, color: TEXT_SECONDARY },
  paidBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: DIVIDER,
  },

  // Orders tab
  orderCard: {
    backgroundColor: LEFT_BG, borderRadius: 12, padding: 12,
    borderLeftWidth: 4, borderLeftColor: '#F59E0B',
    borderWidth: 1, borderColor: '#FCD34D',
  },
  orderCardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  orderCardNum: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  orderCardSub: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 1 },
  orderCardAmount: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  orderCardItem: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  orderCardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  orderActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  orderActionBtnText: { fontSize: 13, fontWeight: '700' },

  // Tables / heatmap
  heatmapStats: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: LEFT_BG, borderBottomWidth: 1, borderBottomColor: DIVIDER,
    flexWrap: 'wrap',
  },
  heatmapStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatmapStatDot: { width: 8, height: 8, borderRadius: 4 },
  heatmapStatCount: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  heatmapStatLabel: { fontSize: 10, color: TEXT_SECONDARY },
  sseIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 'auto',
  },
  sseText: { fontSize: 10, fontWeight: '700' },
  zoneSection: { marginBottom: 16 },
  zoneLabel: { fontSize: 11, fontWeight: '700', color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heatmapCell: {
    width: 72, height: 72, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', padding: 4,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  heatmapCellSelected: { borderWidth: 3, borderColor: '#FFF' },
  heatmapCellNum: { fontSize: 13, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  heatmapCellCapacity: { fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  heatmapCellDuration: { fontSize: 8, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 1 },
  heatmapCellBill: { fontSize: 8, color: '#FFF', fontWeight: '700', textAlign: 'center' },
  heatmapLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: DIVIDER },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { fontSize: 10, color: TEXT_SECONDARY },

  // POS / New tab — category grid
  catGrid: { padding: 10, gap: 10 },
  catCard: {
    flex: 1 / 2, borderRadius: 14, backgroundColor: LEFT_BG,
    overflow: 'hidden', borderWidth: 1, borderColor: DIVIDER,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  catCardImg: { width: '100%', aspectRatio: 1.4 },
  catCardImgPlaceholder: { width: '100%', aspectRatio: 1.4, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  catCardFooter: { paddingHorizontal: 12, paddingVertical: 10 },
  catCardName: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  // Items view
  itemsViewHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: LEFT_BG, borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: DIVIDER,
    alignItems: 'center', justifyContent: 'center',
  },
  itemsViewTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  itemsGrid: { padding: 10, gap: 8 },
  itemCard: {
    flex: 1 / 3, borderRadius: 12, backgroundColor: LEFT_BG,
    overflow: 'hidden', borderWidth: 1, borderColor: DIVIDER,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 }, android: { elevation: 1 } }),
  },
  itemCardInCart: { borderColor: PURPLE, borderWidth: 2 },
  itemCardImg: { width: '100%', height: 80 },
  itemCardImgPlaceholder: { width: '100%', height: 80, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  itemCardBody: { padding: 8 },
  itemCardName: { fontSize: 11, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 3, lineHeight: 15 },
  itemCardPrice: { fontSize: 12, fontWeight: '700', color: PURPLE },
  itemCardBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: PURPLE, borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  itemCardBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },

  // Generic
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  emptySubtext: { fontSize: 12, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 18 },
  tillStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#EDE9FE', borderRadius: 20,
  },
  tillStatusText: { fontSize: 12, fontWeight: '600', color: PURPLE },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Modals
  modalFull: { flex: 1 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: LEFT_BG, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 8 } }),
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: DIVIDER, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },

  // Payment
  payAmount: { fontSize: 36, fontWeight: '900', color: PURPLE, textAlign: 'center', paddingVertical: 8 },
  methodRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 16 },
  methodChip: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: DIVIDER,
  },
  methodLabel: { fontSize: 12, fontWeight: '600' },
  cashSection: { paddingHorizontal: 20, gap: 8 },
  cashLabel: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: '#ECFDF5' },

  // Till
  tillModalContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  tillModalIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  tillModalTitle: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY },
  tillModalSub: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center' },
  tillStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  tillStatCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#F9FAFB', borderRadius: 10,
    padding: 12, alignItems: 'center', gap: 2,
  },
  tillStatValue: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  tillStatLabel: { fontSize: 10, color: TEXT_SECONDARY, fontWeight: '600' },
  histRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  histDate: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY },
  histSub: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  histAmount: { fontSize: 15, fontWeight: '800' },

  // Inputs
  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: DIVIDER, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4, width: '100%',
  },
  inputPrefix: { fontSize: 18, fontWeight: '700', color: TEXT_SECONDARY, marginRight: 4 },
  floatInput: { flex: 1, fontSize: 22, fontWeight: '700', color: TEXT_PRIMARY, paddingVertical: 10 },
  notesInput: {
    width: '100%', borderWidth: 1.5, borderColor: DIVIDER,
    borderRadius: 12, padding: 12, fontSize: 14, color: TEXT_PRIMARY,
    backgroundColor: '#F9FAFB', textAlignVertical: 'top',
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, width: '100%',
  },
  actionBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
