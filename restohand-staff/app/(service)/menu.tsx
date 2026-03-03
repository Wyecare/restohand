import {
  useGetPublicMenuWithAvailabilityQuery,
  useUpdateMenuItemMutation,
} from '@/store/api/menuApi';
import {
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useCalculateCartTotalMutation,
} from '@/store/api/ordersApi';
import {
  useGetSessionQuery,
  useGetSessionWithBillQuery,
} from '@/store/api/customerSessionsApi';
import {
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
} from '@/store/api/restaurantsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { ModifierSelectionModal } from '@/components/ModifierSelectionModal';
import { Ionicons } from '@expo/vector-icons';
import { skipToken } from '@reduxjs/toolkit/query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useOrdersSSE } from '@/hooks/useOrdersSSE';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface CartEntry {
  id: string;
  name: string;
  pricing: {
    amount: number;
    currency?: string;
  };
  quantity: number;
  activePriceTagId?: string;
  selectedModifiers?: Array<{
    modifierId: string;
    modifierName: string;
    selectedOptions: Array<{
      optionId: string;
      optionName: string;
      priceAdjustment: number;
      quantity?: number;
    }>;
  }>;
  notes?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 3,
  }).format(amount);

export default function ServiceMenuScreen() {
  const { tableId, restaurant_slug, sessionId: sessionIdParam, isNewSession } =
    useLocalSearchParams();
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  // resolvedSessionId starts from route param; gets set after first order is placed
  // so session queries activate immediately even for brand-new sessions
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(
    sessionIdParam ? (sessionIdParam as string) : null
  );

  // Get restaurant details
  const { data: restaurant } = useGetRestaurantQuery(
    restaurantId ?? skipToken,
    { skip: !restaurantId }
  );

  // Get public menu with availability info for staff
  const {
    data,
    isLoading,
    isError,
    refetch: refetchMenu,
  } = useGetPublicMenuWithAvailabilityQuery(
    { slug: restaurant?.slug ?? '' },
    { skip: !restaurant?.slug }
  );

  // Get table information
  const { data: enhancedTables, refetch: refetchTables } =
    useListEnhancedTablesQuery(restaurantId ? { restaurantId } : skipToken, {
      skip: !restaurantId,
    });

  const selectedTable = useMemo(() => {
    return enhancedTables?.find((table) => table.id === tableId) ?? null;
  }, [enhancedTables, tableId]);

  // Get session information
  const {
    data: sessionData,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useGetSessionQuery(resolvedSessionId ?? skipToken, {
    skip: !resolvedSessionId,
  });

  // Get session with orders — SSE handles most updates; poll at 15s as a safety net
  const { data: sessionWithBill, refetch: refetchSessionOrders } =
    useGetSessionWithBillQuery(resolvedSessionId ?? skipToken, {
      skip: !resolvedSessionId,
      pollingInterval: 15000,
    });

  // RTK mutation for creating orders and updating status
  const [createOrder] = useCreateOrderMutation();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [calculateCartTotal] = useCalculateCartTotalMutation();

  // SSE: real-time kitchen events refresh session orders immediately
  const handleSSEEvent = useCallback(() => {
    refetchSessionOrders();
    refetchTables();
    if (resolvedSessionId) refetchSession();
  }, [refetchSessionOrders, refetchTables, refetchSession, resolvedSessionId]);

  useOrdersSSE({ onEvent: handleSSEEvent, enabled: !!restaurantId });

  // Component state
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState<
    string | null
  >(null);
  // Track which order is being status-updated inline (replaces modal approach)
  const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState<string | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState<string | null>(
    null
  );
  const [showItemPopover, setShowItemPopover] = useState<string | null>(null);
  const [selectedItemForPopover, setSelectedItemForPopover] =
    useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    itemId: string;
    itemName: string;
    currentAvailability: boolean;
  } | null>(null);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] =
    useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [calculatedCart, setCalculatedCart] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Debounce ref for cart recalculation API calls
  const recalcDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modifier modal state
  const [modifierModalVisible, setModifierModalVisible] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<{
    id: string;
    name: string;
    price: number;
    modifiers: any[];
    activePriceTagId?: string;
  } | null>(null);

  // Check for existing active orders (session-based instead of table-based)
  const activeExistingOrders = useMemo(() => {
    const sessionOrders = sessionWithBill?.orders || [];
    return sessionOrders.filter(
      (order) =>
        order.paymentStatus !== 'paid' &&
        !['completed', 'cancelled'].includes(order.status)
    );
  }, [sessionWithBill?.orders]);

  // For backward compatibility, keep the first order
  const activeExistingOrder = useMemo(() => {
    return activeExistingOrders.length > 0 ? activeExistingOrders[0] : null;
  }, [activeExistingOrders]);

  // Calculate total bill for all active orders (session-based)
  const totalBillAmount = useMemo(() => {
    return (
      sessionWithBill?.bill?.totalAmount ||
      activeExistingOrders.reduce(
        (total, order) => total + order.totalAmount,
        0
      )
    );
  }, [sessionWithBill?.bill?.totalAmount, activeExistingOrders]);

  // Process menu data
  const categories = data?.menu.categories ?? [];
  const uncategorised = data?.menu.uncategorised ?? [];

  // Create enhanced menu items with computed properties
  const allProducts = useMemo(() => {
    const grouped = categories.flatMap((c) =>
      c.items.map((i) => ({
        ...i,
        _categoryId: c.id,
        _categoryName: c.name,
        _isVegetarian:
          i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
        _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
        _isPopular:
          i.tags?.includes('popular') || i.tags?.includes('bestseller'),
        _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
        _isAvailable: (i as any).isAvailable !== false,
        modifiers: (i as any).modifiers || [],
        activePriceTag: (i as any).activePriceTag || null,
      }))
    );
    return [
      ...grouped,
      ...uncategorised.map((i) => ({
        ...i,
        _categoryId: 'uncategorised',
        _categoryName: 'Others',
        _isVegetarian:
          i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
        _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
        _isPopular:
          i.tags?.includes('popular') || i.tags?.includes('bestseller'),
        _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
        _isAvailable: (i as any).isAvailable !== false,
        modifiers: (i as any).modifiers || [],
        activePriceTag: (i as any).activePriceTag || null,
      })),
    ];
  }, [categories, uncategorised]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item._categoryName.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allProducts, searchQuery]);

  // Get items for current category
  const displayItems = useMemo(() => {
    if (activeCategory === 'all') {
      return filteredProducts;
    }
    return filteredProducts.filter((p) => p._categoryId === activeCategory);
  }, [filteredProducts, activeCategory]);

  // Get available categories with items
  const availableCategories = useMemo(() => {
    const categoriesWithItems = categories.filter((c) =>
      filteredProducts.some((item) => item._categoryId === c.id)
    );

    const hasUncategorised = filteredProducts.some(
      (item) => item._categoryId === 'uncategorised'
    );

    return [
      { id: 'all', name: 'All', icon: '🍽️' },
      ...categoriesWithItems.map((c) => ({
        ...c,
        icon: c.icon || '🍴',
      })),
      ...(hasUncategorised
        ? [{ id: 'uncategorised', name: 'Others', icon: '✨' }]
        : []),
    ];
  }, [categories, filteredProducts]);

  // Cart calculations
  const totalItems = Object.values(cart).reduce(
    (sum, e) => sum + e.quantity,
    0
  );
  // Use calculated cart total if available, otherwise fallback to frontend calculation
  const totalAmount =
    calculatedCart?.totalAmount ??
    Object.values(cart).reduce(
      (sum, e) => sum + e.quantity * e.pricing.amount,
      0
    );

  // Debounced wrapper — prevents rapid add/remove from firing many API calls
  const debouncedRecalculate = (newCart: Record<string, CartEntry>) => {
    if (recalcDebounceRef.current) clearTimeout(recalcDebounceRef.current);
    recalcDebounceRef.current = setTimeout(() => recalculateCart(newCart), 400);
  };

  // Function to calculate cart totals using backend
  const recalculateCart = async (newCart: Record<string, CartEntry>) => {
    if (!restaurant || Object.keys(newCart).length === 0) {
      setCalculatedCart(null);
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);
    try {
      const cartItems = Object.values(newCart).map((entry) => ({
        menuItemId: entry.id,
        name: entry.name,
        quantity: entry.quantity,
        pricing: {
          unitAmount: entry.pricing.amount,
          currency: entry.pricing.currency || 'INR',
        },
        activePriceTagId: entry.activePriceTagId,
        selectedModifiers: entry.selectedModifiers,
      }));

      const result = await calculateCartTotal({
        restaurantId: restaurant.id,
        tableId: selectedTable?.id,
        items: cartItems,
      }).unwrap();

      setCalculatedCart(result);
    } catch (error) {
      console.error('Failed to calculate cart total:', error);
      // Don't set to null, keep any previous calculation
      // setCalculatedCart(null);
    } finally {
      setIsCalculating(false);
    }
  };

  // Utility functions for price tags and modifiers
  const getEffectivePrice = (item: any): number => {
    if (item.activePriceTag && item.activePriceTag.effectivePrice) {
      return item.activePriceTag.effectivePrice;
    }
    return item.pricing.amount;
  };

  // Returns the single next status action for an order (1-tap advance)
  const getNextStatusAction = (status: string): { status: string; label: string; icon: any } | null => {
    switch (status) {
      case 'pending':    return { status: 'accepted',   label: 'Accept',  icon: 'checkmark-circle' };
      case 'accepted':   return { status: 'in_progress', label: 'Cooking', icon: 'flame' };
      case 'in_progress': return { status: 'ready',      label: 'Ready',   icon: 'restaurant' };
      default: return null;
    }
  };

  // Modifier modal handlers
  const handleModifierConfirm = (
    selections: any[],
    totalPrice: number,
    notes?: string
  ) => {
    if (!selectedMenuItem) return;

    const cartItem: CartEntry = {
      id: selectedMenuItem.id,
      name: selectedMenuItem.name,
      pricing: { amount: totalPrice },
      quantity: 1,
      activePriceTagId: selectedMenuItem.activePriceTagId,
      selectedModifiers: selections,
      notes: notes,
    };

    // Create unique cart key for items with different modifications
    const cartKey = `${selectedMenuItem.id}-${JSON.stringify(selections)}-${
      notes || ''
    }`;

    const newCart = {
      ...cart,
      [cartKey]: cart[cartKey]
        ? { ...cart[cartKey], quantity: cart[cartKey].quantity + 1 }
        : cartItem,
    };

    setCart(newCart);
    debouncedRecalculate(newCart);
    setSelectedMenuItem(null);
  };

  // Enhanced cart management functions
  const handleAdd = (
    id: string,
    name: string,
    pricing: any,
    modifiers: any[] = [],
    activePriceTag: any = null
  ) => {
    // Check if item has modifiers
    if (modifiers && modifiers.length > 0) {
      setSelectedMenuItem({
        id,
        name,
        price: getEffectivePrice({ pricing, activePriceTag }),
        modifiers: modifiers,
        activePriceTagId: activePriceTag?.id,
      });
      setModifierModalVisible(true);
    } else {
      // Simple item without modifiers
      const effectivePrice = getEffectivePrice({ pricing, activePriceTag });
      const cartItem: CartEntry = {
        id,
        name,
        pricing: { amount: effectivePrice },
        quantity: (cart[id]?.quantity ?? 0) + 1,
        activePriceTagId: activePriceTag?.id,
      };

      const newCart = {
        ...cart,
        [id]: cartItem,
      };
      setCart(newCart);
      debouncedRecalculate(newCart);
    }
  };

  const handleRemove = (id: string) => {
    const current = cart[id];
    if (!current) return;

    let newCart: Record<string, CartEntry>;
    if (current.quantity === 1) {
      const { [id]: _, ...rest } = cart;
      newCart = rest;
    } else {
      newCart = {
        ...cart,
        [id]: { ...current, quantity: current.quantity - 1 },
      };
    }

    setCart(newCart);
    debouncedRecalculate(newCart);
  };

  // Place order function
  const handlePlaceOrder = async () => {
    if (!restaurant) return;

    if (Object.keys(cart).length === 0) {
      setSuccessModalData({
        title: 'Cart is empty',
        message: 'Add items to place an order',
      });
      setShowSuccessModal(true);
      return;
    }

    // If cart is still calculating, wait for it
    if (isCalculating) {
      setSuccessModalData({
        title: 'Calculating prices...',
        message: 'Please wait while we calculate the total',
      });
      setShowSuccessModal(true);
      return;
    }

    // Ensure cart calculation or fallback to simple total
    if (!calculatedCart && totalAmount <= 0) {
      setSuccessModalData({
        title: 'Error calculating total',
        message: 'Unable to calculate order total. Please try again.',
      });
      setShowSuccessModal(true);
      return;
    }

    setIsPlacingOrder(true);
    try {
      const payload = {
        restaurantId: restaurant.id,
        customerSessionId: resolvedSessionId ?? undefined,
        tableId: selectedTable?.id,
        paymentMethod: 'cash' as const,
        items: Object.values(cart).map((entry) => ({
          menuItemId: entry.id,
          name: entry.name,
          quantity: entry.quantity,
          pricing: {
            unitAmount: entry.pricing.amount,
            currency: entry.pricing.currency ?? 'INR',
          },
          activePriceTagId: entry.activePriceTagId,
          selectedModifiers: entry.selectedModifiers,
        })),
      };

      const order = await createOrder(payload).unwrap();

      // Persist session ID from the new/existing session so queries
      // activate immediately — critical for brand-new sessions
      if (order.sessionId && !resolvedSessionId) {
        setResolvedSessionId(order.sessionId);
      }

      setCart({});
      setCalculatedCart(null);

      // SSE will trigger a re-fetch; explicit refetch keeps UI snappy
      refetchTables();

      setSuccessModalData({
        title: 'Order placed! 🎉',
        message: `Order #${order.orderNumber} sent to kitchen`,
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      setSuccessModalData({
        title: 'Failed to place order',
        message: err?.message || 'Unexpected error',
      });
      setShowSuccessModal(true);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePaymentAction = () => {
    if (activeExistingOrders.length > 0) {
      router.push({
        pathname: '/(service)/payment',
        params: {
          sessionId: resolvedSessionId ?? undefined,
          orderId: activeExistingOrders[0].id,
          tableId: selectedTable?.id,
          orderData: JSON.stringify(activeExistingOrders[0]),
          allOrdersData: JSON.stringify(activeExistingOrders),
          totalBillAmount: totalBillAmount.toString(),
        },
      });
    }
  };

  // Inline 1-tap status advance (replaces the old modal flow)
  const handleStatusUpdate = async (order: any, status: string) => {
    if (!restaurant) return;
    setUpdatingStatusOrderId(order.id);
    try {
      await updateOrderStatus({
        restaurantId: restaurant.id,
        orderId: order.id,  // Fixed: was order._id (bug — session orders use .id)
        status: status as any,
      }).unwrap();
      refetchSessionOrders();
      refetchTables();
    } catch {
      setSuccessModalData({ title: 'Error', message: 'Failed to update order status' });
      setShowSuccessModal(true);
    } finally {
      setUpdatingStatusOrderId(null);
    }
  };

  const handleCancelOrder = (order: any) => {
    if (!restaurant) return;
    setSelectedOrderForCancel(order);
    setShowCancelOrderModal(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!restaurant || !selectedOrderForCancel) return;

    setShowCancelOrderModal(false);
    setIsCancellingOrder(selectedOrderForCancel.id);

    try {
      await updateOrderStatus({
        restaurantId: restaurant.id,
        orderId: selectedOrderForCancel.id,
        status: 'cancelled' as any,
        statusNote: 'Cancelled by waiter',
      }).unwrap();

      await refetchTables();

      setSuccessModalData({
        title: 'Order Cancelled',
        message: `Order #${selectedOrderForCancel.orderNumber} has been cancelled`,
      });
      setShowSuccessModal(true);
    } catch (error) {
      setSuccessModalData({
        title: 'Error',
        message: 'Failed to cancel order',
      });
      setShowSuccessModal(true);
    } finally {
      setIsCancellingOrder(null);
      setSelectedOrderForCancel(null);
    }
  };

  const handleToggleAvailability = (
    itemId: string,
    itemName: string,
    currentAvailability: boolean
  ) => {
    if (!restaurant) return;

    setConfirmDialogData({ itemId, itemName, currentAvailability });
    setShowConfirmDialog(true);
  };

  const handleConfirmToggle = async () => {
    if (!confirmDialogData || !restaurant) return;

    const { itemId, itemName, currentAvailability } = confirmDialogData;
    const newStatus = currentAvailability ? 'unavailable' : 'available';

    setShowConfirmDialog(false);
    setConfirmDialogData(null);
    setUpdatingAvailability(itemId);

    try {
      await updateMenuItem({
        restaurantId: restaurant.id,
        itemId,
        data: { isAvailable: !currentAvailability },
      }).unwrap();

      await refetchMenu();

      setSuccessModalData({
        title: 'Availability Updated',
        message: `"${itemName}" is now ${newStatus}`,
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      setSuccessModalData({
        title: 'Error',
        message: 'Failed to update item availability',
      });
      setShowSuccessModal(true);
    } finally {
      setUpdatingAvailability(null);
    }
  };

  const handleRefresh = async () => {
    const fetches: Promise<any>[] = [refetchMenu(), refetchTables()];
    if (resolvedSessionId) {
      fetches.push(refetchSession(), refetchSessionOrders());
    }
    await Promise.all(fetches);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: '#FFFFFF',
              borderBottomColor: '#e5e7eb',
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color='#0F172A' />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: '#0F172A' }]}>
              Loading Menu...
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color='#4910bc' />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !restaurant) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: '#FFFFFF',
              borderBottomColor: '#e5e7eb',
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color='#0F172A' />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: '#0F172A' }]}>
              Menu Not Available
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: '#64748B' }]}>
            Unable to load the menu. Please try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const tableNumber =
    selectedTable?.displayName ||
    selectedTable?.tableNumber ||
    `Table ${tableId}`;

  // Calculate customer session info for header
  const getSessionDisplayInfo = () => {
    if (sessionData) {
      const startTime = new Date(sessionData.startedAt);
      const diffMins = Math.floor((Date.now() - startTime.getTime()) / 60000);
      const duration = diffMins < 60
        ? `${diffMins}m`
        : `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
      return {
        sessionInfo: `Session • ${duration}`,
        isNewSession: false,
        orderCount: sessionData.totalOrders || 0,
      };
    }
    return {
      sessionInfo: resolvedSessionId ? 'Loading session…' : 'New Session',
      isNewSession: !resolvedSessionId,
      orderCount: 0,
    };
  };

  const sessionDisplayInfo = getSessionDisplayInfo();

  return (
    <SafeAreaView
      style={styles.container}
    >
      {/* Header */}
      <View
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color='#0F172A' />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: '#0F172A' }]}>
            {tableNumber}
          </Text>
          <View style={styles.tableInfo}>
            <View style={styles.sessionInfo}>
              <Ionicons
                name={sessionDisplayInfo.isNewSession ? 'add-circle' : 'time'}
                size={12}
                color={
                  sessionDisplayInfo.isNewSession ? '#4910bc' : '#64748B'
                }
              />
              <Text
                style={[
                  styles.sessionText,
                  {
                    color: sessionDisplayInfo.isNewSession
                      ? '#4910bc'
                      : '#64748B',
                    fontWeight: sessionDisplayInfo.isNewSession ? '600' : '500',
                  },
                ]}
              >
                {sessionDisplayInfo.sessionInfo}
              </Text>
              {sessionDisplayInfo.orderCount > 0 && (
                <Text style={[styles.orderCountText, { color: '#64748B' }]}>
                  • {sessionDisplayInfo.orderCount} orders
                </Text>
              )}
            </View>
            <View style={styles.tableMetaRow}>
              {selectedTable?.capacity && (
                <View style={styles.tableCapacityInfo}>
                  <Ionicons name="people" size={12} color='#64748B' />
                  <Text
                    style={[styles.tableCapacityText, { color: '#64748B' }]}
                  >
                    {selectedTable.capacity} seats
                  </Text>
                </View>
              )}
              {selectedTable?.zone && (
                <Text style={[styles.tableZoneText, { color: '#64748B' }]}>
                  • {selectedTable.zone}
                </Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={
              styles.iconButton}
            onPress={handleRefresh}
          >
            <Ionicons name="refresh" size={20} color='#0F172A' />
          </TouchableOpacity>
          <TouchableOpacity
            style={
              styles.iconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons
              name={showSearch ? 'close' : 'search'}
              size={20}
              color='#0F172A'
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Existing Orders Alert */}
      {activeExistingOrders.length > 0 && (
        <View
          style={[
            styles.existingOrderAlert,
            {
              backgroundColor: '#dbeafe',
              borderColor: '#4910bc',
            },
          ]}
        >
          <View style={styles.existingOrderContent}>
            <View style={styles.orderHeaderContainer}>
              <Text
                style={[
                  styles.existingOrderTitle,
                  { color: '#1e40af' },
                ]}
              >
                {activeExistingOrders.length === 1
                  ? `Active Order #${activeExistingOrders[0].orderNumber}`
                  : `${activeExistingOrders.length} Active Orders`}
              </Text>
              <Text style={styles.totalBillAmount}>
                Total: ₹{totalBillAmount}
              </Text>
            </View>

            <View style={styles.ordersContainer}>
              {activeExistingOrders.map((order) => (
                <View
                  key={order.id}
                  style={[
                    styles.orderRow,
                    {
                      backgroundColor: '#f8fafc',
                      borderLeftColor: '#4910bc',
                    },
                  ]}
                >
                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderNumber, { color: '#0F172A' }]}>
                      #{order.orderNumber}
                    </Text>
                    <View style={styles.existingOrderMeta}>
                      <Ionicons name="time" size={10} color='#4910bc' />
                      <Text
                        style={[
                          styles.existingOrderStatus,
                          { color: '#4910bc' },
                        ]}
                      >
                        {order.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderActions}>
                    <Text style={styles.orderAmount}>₹{order.totalAmount}</Text>
                    <View style={styles.orderButtonsContainer}>
                      {['pending', 'accepted'].includes(order.status) && (
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => handleCancelOrder(order)}
                          disabled={isCancellingOrder === order.id}
                        >
                          {isCancellingOrder === order.id ? (
                            <ActivityIndicator size={12} color="#ffffff" />
                          ) : (
                            <Ionicons name="close" size={12} color="#ffffff" />
                          )}
                        </TouchableOpacity>
                      )}
                      {(() => {
                        const nextAction = getNextStatusAction(order.status);
                        if (!nextAction) return null;
                        const isUpdating = updatingStatusOrderId === order.id;
                        return (
                          <TouchableOpacity
                            style={[styles.statusAdvanceBtn]}
                            onPress={() => handleStatusUpdate(order, nextAction.status)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <ActivityIndicator size={12} color="#ffffff" />
                            ) : (
                              <>
                                <Ionicons name={nextAction.icon} size={11} color="#ffffff" />
                                <Text style={styles.statusAdvanceBtnText}>{nextAction.label}</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {activeExistingOrders.some((order) => order.status === 'ready') && (
              <TouchableOpacity
                style={[styles.paymentButton, { backgroundColor: '#4910bc' }]}
                onPress={handlePaymentAction}
              >
                <Ionicons name="card" size={16} color="#ffffff" />
                <Text style={styles.paymentButtonText}>
                  Pay Total Bill (₹{totalBillAmount})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Search Bar */}
      {showSearch && (
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: '#FFFFFF',
              borderBottomColor: '#e5e7eb',
            },
          ]}
        >
          <View
            style={
              styles.searchInputContainer}
          >
            <Ionicons name="search" size={16} color='#64748B' />
            <TextInput
              style={[styles.searchInput, { color: '#0F172A' }]}
              placeholder="Search menu..."
              placeholderTextColor={'#64748B'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={16} color='#64748B' />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Category Pills */}
      <View
        style={[
          styles.categoryContainer,
          {
            backgroundColor: '#FFFFFF',
            borderBottomColor: '#e5e7eb',
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {availableCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryPill,
                {
                  backgroundColor:
                    activeCategory === category.id ? '#4910bc' : '#f3f4f6',
                  borderColor:
                    activeCategory === category.id ? '#4910bc' : '#e5e7eb',
                },
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  {
                    color:
                      activeCategory === category.id ? '#ffffff' : '#0F172A',
                  },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {displayItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: '#0F172A' }]}>
              No items found
            </Text>
            <Text style={[styles.emptyText, { color: '#64748B' }]}>
              Try adjusting your search
            </Text>
            <TouchableOpacity
              style={
                styles.clearFiltersButton}
              onPress={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
            >
              <Text style={[styles.clearFiltersText, { color: '#0F172A' }]}>
                Clear filters
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemsGrid}>
            {displayItems.map((item) => {
              const entry = cart[item.id];
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.menuItemCard,
                    {
                      backgroundColor: '#FFFFFF',
                      borderColor: '#e5e7eb',
                    },
                    !item._isAvailable && styles.unavailableItemCard,
                  ]}
                  onLongPress={() => {
                    setSelectedItemForPopover(item);
                    setShowItemPopover(item.id);
                  }}
                >
                  <View style={styles.itemImageContainer}>
                    {item.imageUrls?.[0] ? (
                      <Image
                        source={{ uri: item.imageUrls[0] }}
                        style={styles.itemImage}
                      />
                    ) : (
                      <View
                        style={
                          styles.placeholderImage}
                      >
                        <Text style={styles.placeholderIcon}>🍽️</Text>
                      </View>
                    )}

                    <View style={styles.vegIndicatorContainer}>
                      <View
                        style={[
                          styles.vegIndicator,
                          item._isVegetarian
                            ? styles.vegIndicatorVeg
                            : styles.vegIndicatorNonVeg,
                        ]}
                      >
                        <View
                          style={[
                            styles.vegDot,
                            item._isVegetarian
                              ? styles.vegDotVeg
                              : styles.vegDotNonVeg,
                          ]}
                        />
                      </View>
                    </View>

                    {item._isPopular && (
                      <View style={styles.popularBadge}>
                        <Ionicons name="star" size={12} color="#ffffff" />
                      </View>
                    )}

                    {(item._isSpicy || item._isQuick) && (
                      <View style={styles.tagsContainer}>
                        {item._isSpicy && (
                          <Text style={styles.tagIcon}>🌶️</Text>
                        )}
                        {item._isQuick && (
                          <Text style={styles.tagIcon}>⚡</Text>
                        )}
                      </View>
                    )}

                    {!item._isAvailable && (
                      <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableText}>Out of Stock</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemDetails}>
                    <Text
                      style={[styles.itemName, { color: '#0F172A' }]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    {/* Price with price tag support */}
                    <View style={styles.priceContainer}>
                      {item.activePriceTag ? (
                        <>
                          <Text
                            style={[styles.itemPriceOld, { color: '#64748B' }]}
                          >
                            {formatCurrency(item.pricing.amount)}
                          </Text>
                          <Text
                            style={[styles.itemPrice, { color: '#0F172A' }]}
                          >
                            {formatCurrency(getEffectivePrice(item))}
                          </Text>
                          <View style={styles.priceTagBadge}>
                            <Text style={styles.priceTagText}>OFFER</Text>
                          </View>
                        </>
                      ) : (
                        <Text style={[styles.itemPrice, { color: '#0F172A' }]}>
                          {formatCurrency(item.pricing.amount)}
                        </Text>
                      )}
                    </View>

                    {/* Modifier indicator */}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <View style={styles.modifierIndicator}>
                        <Ionicons name="options" size={10} color='#64748B' />
                        <Text
                          style={[styles.modifierText, { color: '#64748B' }]}
                        >
                          Customizable
                        </Text>
                      </View>
                    )}

                    {!item._isAvailable ? (
                      <View
                        style={[
                          styles.disabledButton,
                          { backgroundColor: '#e5e5e5' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.disabledButtonText,
                            { color: '#64748B' },
                          ]}
                        >
                          Unavailable
                        </Text>
                      </View>
                    ) : entry ? (
                      <View
                        style={[
                          styles.quantityControls,
                          { backgroundColor: '#4910bc' },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleRemove(item.id)}
                        >
                          <Ionicons name="remove" size={14} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>
                          {entry.quantity}
                        </Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            handleAdd(
                              item.id,
                              item.name,
                              item.pricing,
                              item.modifiers,
                              item.activePriceTag
                            )
                          }
                        >
                          <Ionicons name="add" size={14} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.addButton,
                          { backgroundColor: '#4910bc' },
                        ]}
                        onPress={() =>
                          handleAdd(
                            item.id,
                            item.name,
                            item.pricing,
                            item.modifiers,
                            item.activePriceTag
                          )
                        }
                      >
                        <Text style={styles.addButtonText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <View style={styles.floatingCart}>
          <TouchableOpacity
            style={[styles.cartButton, { backgroundColor: '#4910bc' }]}
            onPress={handlePlaceOrder}
            disabled={isPlacingOrder || isCalculating}
          >
            <View style={styles.cartButtonContent}>
              <View style={styles.cartInfo}>
                <View style={styles.cartIconContainer}>
                  <Ionicons name="bag" size={24} color="#ffffff" />
                </View>
                <View style={styles.cartDetails}>
                  <Text style={styles.cartItems}>{totalItems} items</Text>
                  <Text style={styles.cartTotal}>
                    {isCalculating
                      ? 'Calculating...'
                      : formatCurrency(
                          calculatedCart?.totalAmount || totalAmount
                        )}
                  </Text>
                </View>
              </View>
              <View style={styles.placeOrderContainer}>
                <Text style={styles.placeOrderText}>
                  {isPlacingOrder ? 'Placing...' : 'Place Order'}
                </Text>
                {!isPlacingOrder && (
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Item Popover Modal */}
      <Modal
        visible={showItemPopover !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowItemPopover(null);
          setSelectedItemForPopover(null);
        }}
      >
        <View style={styles.popoverOverlay}>
          <View
            style={[
              styles.popoverContent,
              { backgroundColor: '#FFFFFF' },
            ]}
          >
            {selectedItemForPopover && (
              <>
                <Text style={[styles.popoverTitle, { color: '#0F172A' }]}>
                  {selectedItemForPopover.name}
                </Text>
                <View style={styles.popoverActions}>
                  <TouchableOpacity
                    style={[
                      styles.availabilityToggleButton,
                      selectedItemForPopover._isAvailable
                        ? styles.markUnavailableButton
                        : styles.markAvailableButton,
                    ]}
                    onPress={() => {
                      const itemId = selectedItemForPopover.id;
                      const itemName = selectedItemForPopover.name;
                      const currentAvailability =
                        selectedItemForPopover._isAvailable;

                      setShowItemPopover(null);
                      setSelectedItemForPopover(null);

                      handleToggleAvailability(
                        itemId,
                        itemName,
                        currentAvailability
                      );
                    }}
                    disabled={
                      updatingAvailability === selectedItemForPopover.id
                    }
                  >
                    {updatingAvailability === selectedItemForPopover.id ? (
                      <ActivityIndicator size={16} color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons
                          name={
                            selectedItemForPopover._isAvailable
                              ? 'close-circle'
                              : 'checkmark-circle'
                          }
                          size={16}
                          color="#ffffff"
                        />
                        <Text style={styles.toggleButtonText}>
                          {selectedItemForPopover._isAvailable
                            ? 'Mark Unavailable'
                            : 'Mark Available'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.popoverCloseButton}
                  onPress={() => {
                    setShowItemPopover(null);
                    setSelectedItemForPopover(null);
                  }}
                >
                  <Text
                    style={[styles.popoverCloseText, { color: '#64748B' }]}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirmation Dialog Modal */}
      <Modal
        visible={showConfirmDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={styles.confirmOverlay}>
          <View
            style={[
              styles.confirmDialog,
              { backgroundColor: '#FFFFFF' },
            ]}
          >
            {confirmDialogData && (
              <>
                <Text style={[styles.confirmTitle, { color: '#0F172A' }]}>
                  Confirm Action
                </Text>
                <Text style={[styles.confirmMessage, { color: '#64748B' }]}>
                  Are you sure you want to mark "{confirmDialogData.itemName}"
                  as{' '}
                  {confirmDialogData.currentAvailability
                    ? 'unavailable'
                    : 'available'}
                  ?
                </Text>
                <View style={styles.confirmButtons}>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      styles.cancelButtonStyle,
                      {
                        backgroundColor: '#f3f4f6',
                        borderColor: '#d1d5db',
                      },
                    ]}
                    onPress={() => {
                      setShowConfirmDialog(false);
                      setConfirmDialogData(null);
                    }}
                  >
                    <Text
                      style={[styles.cancelButtonText, { color: '#0F172A' }]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      styles.confirmButtonPrimary,
                      { backgroundColor: '#4910bc' },
                    ]}
                    onPress={handleConfirmToggle}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        visible={showCancelOrderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelOrderModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <View
            style={[
              styles.confirmDialog,
              { backgroundColor: '#FFFFFF' },
            ]}
          >
            <Text style={[styles.confirmTitle, { color: '#0F172A' }]}>
              Cancel Order
            </Text>
            <Text style={[styles.confirmMessage, { color: '#64748B' }]}>
              Are you sure you want to cancel Order #
              {selectedOrderForCancel?.orderNumber}?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  styles.cancelButtonStyle,
                  {
                    backgroundColor: '#f3f4f6',
                    borderColor: '#d1d5db',
                  },
                ]}
                onPress={() => {
                  setShowCancelOrderModal(false);
                  setSelectedOrderForCancel(null);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: '#0F172A' }]}>
                  No
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: '#dc2626' }]}
                onPress={handleConfirmCancelOrder}
              >
                <Text style={[styles.confirmButtonText, { color: '#ffffff' }]}>
                  Yes, Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success/Error Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <View
            style={[
              styles.confirmDialog,
              { backgroundColor: '#FFFFFF' },
            ]}
          >
            {successModalData && (
              <>
                <Text style={[styles.confirmTitle, { color: '#0F172A' }]}>
                  {successModalData.title}
                </Text>
                <Text style={[styles.confirmMessage, { color: '#64748B' }]}>
                  {successModalData.message}
                </Text>
                <View style={styles.confirmButtons}>
                  {successModalData.title === 'Order placed! 🎉' ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.confirmButton,
                          styles.cancelButtonStyle,
                          {
                            backgroundColor: '#f3f4f6',
                            borderColor: '#d1d5db',
                          },
                        ]}
                        onPress={() => {
                          setShowSuccessModal(false);
                          setSuccessModalData(null);
                          router.back();
                        }}
                      >
                        <Text
                          style={[
                            styles.cancelButtonText,
                            { color: '#0F172A' },
                          ]}
                        >
                          Back to Tables
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.confirmButton,
                          { backgroundColor: '#4910bc' },
                        ]}
                        onPress={() => {
                          setShowSuccessModal(false);
                          setSuccessModalData(null);
                          router.push({
                            pathname: '/(service)/payment',
                            params: {
                              sessionId: resolvedSessionId ?? undefined,
                              tableId: selectedTable?.id,
                            },
                          });
                        }}
                      >
                        <Text style={styles.confirmButtonText}>
                          Go to Payment
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.confirmButton,
                        { backgroundColor: '#4910bc', flex: 1 },
                      ]}
                      onPress={() => {
                        setShowSuccessModal(false);
                        setSuccessModalData(null);
                      }}
                    >
                      <Text style={styles.confirmButtonText}>OK</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modifier Selection Modal */}
      {selectedMenuItem && (
        <ModifierSelectionModal
          visible={modifierModalVisible}
          onClose={() => {
            setModifierModalVisible(false);
            setSelectedMenuItem(null);
          }}
          menuItemId={selectedMenuItem.id}
          menuItemName={selectedMenuItem.name}
          basePrice={selectedMenuItem.price}
          modifiers={selectedMenuItem.modifiers}
          onConfirm={handleModifierConfirm}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 12,
    padding: 6,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  tableInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 2,
    gap: 2,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionText: {
    fontSize: 11,
  },
  orderCountText: {
    fontSize: 11,
  },
  tableMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableCapacityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tableCapacityText: {
    fontSize: 11,
  },
  tableZoneText: {
    fontSize: 11,
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  existingOrderAlert: {
    borderWidth: 1.5,
    margin: 12,
    padding: 10,
    borderRadius: 10,
  },
  existingOrderContent: {
    gap: 10,
  },
  orderHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  existingOrderTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalBillAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  ordersContainer: {
    gap: 6,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  orderAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  orderButtonsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  individualStatusButton: {
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusAdvanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#4910bc',
    minWidth: 60,
    justifyContent: 'center',
  },
  statusAdvanceBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  existingOrderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  existingOrderStatus: {
    fontSize: 11,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  paymentButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoryContainer: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  categoryContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    gap: 5,
  },
  menuItemCard: {
    width: '32%',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
  },
  itemImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderIcon: {
    fontSize: 28,
    opacity: 0.3,
  },
  vegIndicatorContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  vegIndicator: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegIndicatorVeg: {
    borderColor: '#16a34a',
  },
  vegIndicatorNonVeg: {
    borderColor: '#dc2626',
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  vegDotVeg: {
    backgroundColor: '#16a34a',
  },
  vegDotNonVeg: {
    backgroundColor: '#dc2626',
  },
  popularBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#eab308',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    gap: 4,
  },
  tagIcon: {
    fontSize: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  itemDetails: {
    paddingHorizontal: 4,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 16,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    borderRadius: 20,
    paddingVertical: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  floatingCart: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
  },
  cartButton: {
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  cartButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 8,
  },
  cartDetails: {
    alignItems: 'flex-start',
  },
  cartItems: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cartTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  placeOrderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  placeOrderText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 10,
  },
  modalContent: {
    flex: 1,
    padding: 14,
  },
  currentStatusText: {
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  currentStatusValue: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusOptionsContainer: {
    gap: 10,
  },
  statusOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 10,
  },
  statusOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptionContent: {
    flex: 1,
  },
  statusOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  statusOptionDescription: {
    fontSize: 13,
  },
  updatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  updatingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  unavailableItemCard: {
    opacity: 0.6,
  },
  unavailableBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unavailableText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
  },
  disabledButton: {
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  disabledButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popoverContent: {
    borderRadius: 14,
    padding: 20,
    minWidth: 260,
  },
  popoverTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  popoverActions: {
    marginBottom: 12,
  },
  availabilityToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  markAvailableButton: {
    backgroundColor: '#16a34a',
  },
  markUnavailableButton: {
    backgroundColor: '#dc2626',
  },
  toggleButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  popoverCloseButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  popoverCloseText: {
    fontSize: 15,
    fontWeight: '500',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmDialog: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonStyle: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  confirmButtonPrimary: {},
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // New styles for price tags and modifiers
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 6,
  },
  itemPriceOld: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  priceTagBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  priceTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modifierIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  modifierText: {
    fontSize: 10,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
