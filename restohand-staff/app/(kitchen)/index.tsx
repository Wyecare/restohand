import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import logo_white from '../../assets/images/logo_black.png';
import newOrderSound from '../../assets/audio/new-order.mp3';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearAuthState,
  selectActiveRestaurantId,
} from '@/store/slices/authSlice';
import { useFCMToken } from '@/hooks/useFCMToken';
import {
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
} from '@/store/api/ordersApi';
import { useOrdersSSE } from '@/hooks/useOrdersSSE';
import type { Order, OrderItem } from '@/store/api/types';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive breakpoints
const isTablet = SCREEN_WIDTH >= 768;
const isDesktop = SCREEN_WIDTH >= 1024;

// Modern Color System
const colors = {
  primary: '#1D4ED8',
  primaryLight: '#3B82F6',
  success: '#059669',
  successLight: '#10B981',
  warning: '#F59E0B',
  warningLight: '#FCD34D',
  danger: '#DC2626',
  dangerLight: '#EF4444',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  white: '#FFFFFF',
};

const cookingStatuses: Order['status'][] = [
  'pending',
  'accepted',
  'in_progress',
];

interface ModifierOption {
  optionId: string;
  optionName: string;
  quantity?: number;
  priceAdjustment: number;
}

interface SelectedModifier {
  modifierId: string;
  modifierName: string;
  selectedOptions: ModifierOption[];
}

export default function ModernKitchenScreen() {
  const dispatch = useAppDispatch();
  const { refreshToken } = useFCMToken();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'new' | 'cooking' | 'ready'
  >('all');
  const previousOrdersRef = useRef<Order[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const { data, isLoading, refetch } = useListOrdersQuery(
    restaurantId ? { restaurantId, limit: 50, page: 1 } : { restaurantId: '' },
    { skip: !restaurantId, pollingInterval: 10000 } // Faster polling for kitchen
  );

  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();

  // Enhanced SSE for real-time updates
  useOrdersSSE(restaurantId || '');

  // Load audio on component mount
  useEffect(() => {
    const loadAudio = async () => {
      try {
        console.log('Loading new order sound...');
        const { sound: newSound } = await Audio.Sound.createAsync(
          newOrderSound
        );
        setSound(newSound);
        console.log('New order sound loaded successfully');
      } catch (error) {
        console.warn('Failed to load audio:', error);
      }
    };

    loadAudio();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        console.log('Unloading sound');
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Function to play new order notification sound
  const playNewOrderSound = useCallback(async () => {
    try {
      if (sound) {
        console.log('Playing new order sound...');
        await sound.replayAsync();
        console.log('New order sound played successfully');
      }
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }, [sound]);

  // Enhanced order filtering and sorting
  const { readyOrders, allOrders } = useMemo(() => {
    const orders = data?.data || [];

    const cooking = orders.filter((order: Order) =>
      cookingStatuses.includes(order.status)
    );
    const ready = orders.filter((order: Order) => order.status === 'ready');

    // Sort by urgency (time since created)
    const sortByUrgency = (a: Order, b: Order) => {
      const timeA = new Date(a.createdAt || '').getTime();
      const timeB = new Date(b.createdAt || '').getTime();
      return timeA - timeB; // Older orders first (more urgent)
    };

    cooking.sort(sortByUrgency);
    ready.sort(sortByUrgency);

    const all = [...cooking, ...ready];

    return {
      readyOrders: ready,
      allOrders: all,
    };
  }, [data]);

  // Filter orders based on selected filter
  const filteredOrders = useMemo(() => {
    switch (selectedFilter) {
      case 'new':
        return allOrders.filter((order) => order.status === 'pending');
      case 'cooking':
        return allOrders.filter((order) =>
          ['accepted', 'in_progress'].includes(order.status)
        );
      case 'ready':
        return readyOrders;
      default:
        return allOrders;
    }
  }, [allOrders, readyOrders, selectedFilter]);

  // Check for new orders and play sound
  useEffect(() => {
    if (data?.data) {
      const currentOrders = data.data;
      const previousOrders = previousOrdersRef.current;

      // Find new orders (orders that weren't in the previous fetch)
      const newOrders = currentOrders.filter(
        (current: Order) =>
          !previousOrders.some((prev) => prev.id === current.id)
      );

      // Play sound for any new orders
      if (newOrders.length > 0 && previousOrders.length > 0) {
        console.log(`🔔 ${newOrders.length} new order(s) received!`);
        playNewOrderSound();
      }

      previousOrdersRef.current = currentOrders;
    }
  }, [data?.data, playNewOrderSound]);

  const handleUpdate = async (
    orderId: string,
    status: Order['status'],
    progress?: number
  ) => {
    if (!restaurantId) return;

    try {
      await updateStatus({
        restaurantId,
        orderId,
        status,
        progress,
      }).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      refreshToken().catch((error) => {
        console.warn('FCM token refresh failed:', error);
      }),
    ]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    dispatch(clearAuthState());
    router.replace('/(auth)/login');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${hours}h ${remainingMins}m ago`;
  };

  const getTimeMinutes = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / 60000);
  };

  const getUrgencyLevel = (dateString: string) => {
    const mins = getTimeMinutes(dateString);
    if (mins > 20) return 'critical';
    if (mins > 15) return 'urgent';
    if (mins > 10) return 'warning';
    if (mins > 5) return 'normal';
    return 'fresh';
  };

  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: 'New Order',
          color: colors.primary,
          icon: 'alert-circle',
        };
      case 'accepted':
        return {
          label: 'Accepted',
          color: colors.warning,
          icon: 'checkmark-circle',
        };
      case 'in_progress':
        return { label: 'Cooking', color: colors.success, icon: 'flame' };
      case 'ready':
        return {
          label: 'Ready',
          color: colors.successLight,
          icon: 'checkmark-done-circle',
        };
      default:
        return { label: status, color: colors.gray500, icon: 'help-circle' };
    }
  };

  const renderModifiers = (modifiers: SelectedModifier[]) => {
    if (!modifiers || modifiers.length === 0) return null;

    return (
      <View style={styles.modifiersSection}>
        <Text style={styles.modifiersTitle}>Customizations:</Text>
        {modifiers.map((modifier, modIndex) => (
          <View key={modIndex} style={styles.modifierGroup}>
            <Text style={styles.modifierName}>{modifier.modifierName}:</Text>
            {modifier.selectedOptions.map((option, optIndex) => (
              <View key={optIndex} style={styles.modifierOption}>
                <Text style={styles.modifierOptionText}>
                  {option.quantity || 1}x {option.optionName}
                  {option.priceAdjustment !== 0 && (
                    <Text style={styles.modifierPrice}>
                      {option.priceAdjustment > 0 ? '+' : ''}₹
                      {option.priceAdjustment}
                    </Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderOrderItem = (item: OrderItem) => (
    <View style={styles.orderItem}>
      <View style={styles.itemHeader}>
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>{item.quantity}x</Text>
        </View>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>
          ₹{((item.pricing?.unitAmount || 0) * item.quantity).toFixed(0)}
        </Text>
      </View>

      {item.selectedModifiers && renderModifiers(item.selectedModifiers)}

      {item.notes && (
        <View style={styles.notesSection}>
          <Ionicons
            name="chatbubble-outline"
            size={14}
            color={colors.gray500}
          />
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
    </View>
  );

  const ModernOrderCard = ({
    order,
    isReady = false,
  }: {
    order: Order;
    isReady?: boolean;
  }) => {
    const urgencyLevel = getUrgencyLevel(order.createdAt || '');
    const timeMinutes = getTimeMinutes(order.createdAt || '');
    const statusInfo = getStatusInfo(order.status);

    const urgencyStyles = {
      critical: { borderColor: colors.danger, backgroundColor: '#FEF2F2' },
      urgent: { borderColor: colors.dangerLight, backgroundColor: '#FEF7F0' },
      warning: { borderColor: colors.warning, backgroundColor: '#FFFBEB' },
      normal: { borderColor: colors.gray200, backgroundColor: colors.white },
      fresh: { borderColor: colors.success, backgroundColor: '#F0FDF4' },
    };

    return (
      <View
        style={[
          styles.modernOrderCard,
          urgencyStyles[urgencyLevel],
          {
            borderLeftColor: urgencyStyles[urgencyLevel].borderColor,
            borderLeftWidth: 4,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          </View>
          <View
            style={[
              styles.timeBadge,
              {
                backgroundColor:
                  urgencyLevel === 'critical'
                    ? colors.danger
                    : urgencyLevel === 'urgent'
                    ? colors.dangerLight
                    : urgencyLevel === 'warning'
                    ? colors.warning
                    : colors.gray400,
              },
            ]}
          >
            <Ionicons name="time-outline" size={14} color={colors.white} />
            <Text style={[styles.timeText, { color: colors.white }]}>
              {timeMinutes}m
            </Text>
          </View>
        </View>

        {/* Customer & Table Info */}
        <View style={styles.customerInfo}>
          {order.tableNumber && (
            <View style={styles.infoItem}>
              <Ionicons
                name="restaurant-outline"
                size={16}
                color={colors.gray600}
              />
              <Text style={styles.infoText}>Table {order.tableNumber}</Text>
            </View>
          )}
          {order.customerName && (
            <View style={styles.infoItem}>
              <Ionicons
                name="person-outline"
                size={16}
                color={colors.gray600}
              />
              <Text style={styles.infoText}>{order.customerName}</Text>
            </View>
          )}
        </View>

        {/* Order Items with Modifiers */}
        <View style={styles.itemsContainer}>
          {order.items.map((item, index) => (
            <View key={index}>{renderOrderItem(item)}</View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>
            ₹{order.totalAmount.toFixed(0)}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!isReady && (
            <>
              {order.status === 'pending' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.modernBtn, styles.acceptBtn]}
                    onPress={() =>
                      handleUpdate(order.id, 'accepted', order.progress ?? 0)
                    }
                    disabled={isUpdating}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.white}
                    />
                    <Text style={styles.btnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modernBtn, styles.startBtn]}
                    onPress={() => handleUpdate(order.id, 'in_progress', 40)}
                    disabled={isUpdating}
                  >
                    <Ionicons name="flame" size={18} color={colors.white} />
                    <Text style={styles.btnText}>Start Now</Text>
                  </TouchableOpacity>
                </View>
              )}

              {order.status === 'accepted' && (
                <TouchableOpacity
                  style={[styles.modernBtn, styles.startBtn, styles.fullWidth]}
                  onPress={() => handleUpdate(order.id, 'in_progress', 40)}
                  disabled={isUpdating}
                >
                  <Ionicons name="flame" size={18} color={colors.white} />
                  <Text style={styles.btnText}>Start Cooking</Text>
                </TouchableOpacity>
              )}

              {order.status === 'in_progress' && (
                <TouchableOpacity
                  style={[styles.modernBtn, styles.readyBtn, styles.fullWidth]}
                  onPress={() => handleUpdate(order.id, 'ready', 100)}
                  disabled={isUpdating}
                >
                  <Ionicons
                    name="checkmark-done-circle"
                    size={18}
                    color={colors.white}
                  />
                  <Text style={styles.btnText}>Mark as Ready</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {isReady && (
            <View
              style={[
                styles.modernBtn,
                styles.readyIndicator,
                styles.fullWidth,
              ]}
            >
              <Ionicons
                name="checkmark-done-circle"
                size={18}
                color={colors.success}
              />
              <Text style={[styles.btnText, { color: colors.success }]}>
                Order Ready for Service
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const FilterButton = ({
    title,
    count,
    isActive,
    onPress,
  }: {
    title: string;
    count: number;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.filterBtn, isActive && styles.filterBtnActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.filterBtnText, isActive && styles.filterBtnTextActive]}
      >
        {title}
      </Text>
      {count > 0 && (
        <View
          style={[styles.filterBadge, isActive && styles.filterBadgeActive]}
        >
          <Text
            style={[
              styles.filterBadgeText,
              isActive && styles.filterBadgeTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading kitchen orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerLeft}>
          <Image source={logo_white} style={styles.logo} />
          <View style={styles.headerInfo}>
            <Text style={styles.appTitle}>Kitchen Display</Text>
            <Text style={styles.subtitle}>
              {filteredOrders.length} active order
              {filteredOrders.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={playNewOrderSound} style={styles.soundBtn}>
            <Ionicons name="volume-high" size={20} color={colors.gray600} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.gray600} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Kanban Columns for Tablets/Desktops */}
      {isTablet ? (
        <View style={styles.kanbanContainer}>
          {/* New Orders Column */}
          <View style={styles.kanbanColumn}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnTitle}>New Orders</Text>
              <View style={styles.columnBadge}>
                <Text style={styles.columnBadgeText}>
                  {allOrders.filter((o) => o.status === 'pending').length}
                </Text>
              </View>
            </View>
            <ScrollView
              style={styles.columnScrollView}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {allOrders
                .filter((o) => o.status === 'pending')
                .map((order: Order) => (
                  <View key={order.id} style={styles.kanbanCard}>
                    <ModernOrderCard order={order} isReady={false} />
                  </View>
                ))}
              {allOrders.filter((o) => o.status === 'pending').length === 0 && (
                <View style={styles.emptyColumn}>
                  <Ionicons
                    name="time-outline"
                    size={32}
                    color={colors.gray300}
                  />
                  <Text style={styles.emptyColumnText}>No new orders</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Cooking Orders Column */}
          <View style={styles.kanbanColumn}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnTitle}>Cooking</Text>
              <View style={styles.columnBadge}>
                <Text style={styles.columnBadgeText}>
                  {
                    allOrders.filter((o) =>
                      ['accepted', 'in_progress'].includes(o.status)
                    ).length
                  }
                </Text>
              </View>
            </View>
            <ScrollView
              style={styles.columnScrollView}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {allOrders
                .filter((o) => ['accepted', 'in_progress'].includes(o.status))
                .map((order: Order) => (
                  <View key={order.id} style={styles.kanbanCard}>
                    <ModernOrderCard order={order} isReady={false} />
                  </View>
                ))}
              {allOrders.filter((o) =>
                ['accepted', 'in_progress'].includes(o.status)
              ).length === 0 && (
                <View style={styles.emptyColumn}>
                  <Ionicons
                    name="flame-outline"
                    size={32}
                    color={colors.gray300}
                  />
                  <Text style={styles.emptyColumnText}>No orders cooking</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Ready Orders Column */}
          <View style={styles.kanbanColumn}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnTitle}>Ready</Text>
              <View style={styles.columnBadge}>
                <Text style={styles.columnBadgeText}>{readyOrders.length}</Text>
              </View>
            </View>
            <ScrollView
              style={styles.columnScrollView}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {readyOrders.map((order: Order) => (
                <View key={order.id} style={styles.kanbanCard}>
                  <ModernOrderCard order={order} isReady={true} />
                </View>
              ))}
              {readyOrders.length === 0 && (
                <View style={styles.emptyColumn}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={32}
                    color={colors.gray300}
                  />
                  <Text style={styles.emptyColumnText}>No orders ready</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        <>
          {/* Filter Tabs for Mobile */}
          <View style={styles.filtersContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScroll}
            >
              <FilterButton
                title="All Orders"
                count={allOrders.length}
                isActive={selectedFilter === 'all'}
                onPress={() => setSelectedFilter('all')}
              />
              <FilterButton
                title="New"
                count={allOrders.filter((o) => o.status === 'pending').length}
                isActive={selectedFilter === 'new'}
                onPress={() => setSelectedFilter('new')}
              />
              <FilterButton
                title="Cooking"
                count={
                  allOrders.filter((o) =>
                    ['accepted', 'in_progress'].includes(o.status)
                  ).length
                }
                isActive={selectedFilter === 'cooking'}
                onPress={() => setSelectedFilter('cooking')}
              />
              <FilterButton
                title="Ready"
                count={readyOrders.length}
                isActive={selectedFilter === 'ready'}
                onPress={() => setSelectedFilter('ready')}
              />
            </ScrollView>
          </View>

          {/* Mobile Orders List */}
          <ScrollView
            style={styles.ordersContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="restaurant-outline"
                  size={64}
                  color={colors.gray300}
                />
                <Text style={styles.emptyTitle}>No orders found</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedFilter === 'all'
                    ? 'All orders will appear here when received'
                    : `No ${selectedFilter} orders at the moment`}
                </Text>
              </View>
            ) : (
              <View style={styles.ordersList}>
                {filteredOrders.map((order: Order) => (
                  <ModernOrderCard
                    key={order.id}
                    order={order}
                    isReady={order.status === 'ready'}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray600,
    fontWeight: '500',
  },
  modernHeader: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    ...Platform.select({
      ios: {
        shadowColor: colors.gray900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  headerInfo: {
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soundBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  filtersContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    gap: 8,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
  },
  filterBtnTextActive: {
    color: colors.white,
  },
  filterBadge: {
    backgroundColor: colors.gray300,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: colors.white,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray700,
  },
  filterBadgeTextActive: {
    color: colors.primary,
  },
  ordersContainer: {
    flex: 1,
  },
  ordersList: {
    padding: 20,
    gap: 16,
  },
  // Kanban Board Layout
  kanbanContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.gray50,
    justifyContent: 'space-between',
  },
  kanbanColumn: {
    width: '31%', // 3 columns with space for gaps
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: '1.5%', // Creates gaps between columns
    minHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray800,
  },
  columnBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  columnBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  columnScrollView: {
    flex: 1,
  },
  kanbanCard: {
    marginBottom: 12,
  },
  emptyColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyColumnText: {
    fontSize: 14,
    color: colors.gray400,
    marginTop: 8,
    textAlign: 'center',
  },
  modernOrderCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: isTablet ? 12 : 20,
    borderWidth: 1,
    borderColor: colors.gray200,
    width: '100%',
    minHeight: isTablet ? 220 : 'auto',
    ...Platform.select({
      ios: {
        shadowColor: colors.gray900,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: isTablet ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isTablet ? 'flex-start' : 'center',
    marginBottom: isTablet ? 10 : 16,
    gap: isTablet ? 6 : 0,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTablet ? 8 : 12,
    flex: 1,
  },
  orderNumber: {
    fontSize: isTablet ? 16 : 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 6 : 8,
    paddingVertical: isTablet ? 2 : 4,
    borderRadius: 16,
    gap: isTablet ? 3 : 4,
  },
  statusText: {
    fontSize: isTablet ? 10 : 12,
    fontWeight: '600',
    color: colors.white,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 6 : 8,
    paddingVertical: isTablet ? 2 : 4,
    borderRadius: 12,
    gap: isTablet ? 3 : 4,
  },
  timeText: {
    fontSize: isTablet ? 10 : 12,
    fontWeight: '600',
  },
  customerInfo: {
    flexDirection: 'row',
    gap: isTablet ? 8 : 16,
    marginBottom: isTablet ? 10 : 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTablet ? 4 : 6,
    flex: 1,
  },
  infoText: {
    fontSize: isTablet ? 12 : 14,
    color: colors.gray600,
    fontWeight: '500',
    flex: 1,
  },
  itemsContainer: {
    marginBottom: isTablet ? 10 : 16,
  },
  orderItem: {
    marginBottom: isTablet ? 8 : 12,
    paddingBottom: isTablet ? 8 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isTablet ? 6 : 8,
  },
  quantityBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: isTablet ? 6 : 8,
    paddingVertical: isTablet ? 2 : 4,
    marginRight: isTablet ? 8 : 12,
  },
  quantityText: {
    fontSize: isTablet ? 10 : 12,
    fontWeight: '700',
    color: colors.white,
  },
  itemName: {
    flex: 1,
    fontSize: isTablet ? 14 : 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  itemPrice: {
    fontSize: isTablet ? 12 : 14,
    fontWeight: '600',
    color: colors.gray700,
  },
  modifiersSection: {
    backgroundColor: colors.gray50,
    borderRadius: 8,
    padding: isTablet ? 8 : 12,
    marginTop: isTablet ? 6 : 8,
  },
  modifiersTitle: {
    fontSize: isTablet ? 11 : 13,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: isTablet ? 4 : 6,
  },
  modifierGroup: {
    marginBottom: isTablet ? 6 : 8,
  },
  modifierName: {
    fontSize: isTablet ? 11 : 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: isTablet ? 2 : 4,
  },
  modifierOption: {
    marginLeft: 8,
    marginBottom: 2,
  },
  modifierOptionText: {
    fontSize: isTablet ? 11 : 13,
    color: colors.gray600,
  },
  modifierPrice: {
    color: colors.success,
    fontWeight: '600',
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: colors.warning + '15',
    padding: 8,
    borderRadius: 6,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: colors.gray700,
    fontStyle: 'italic',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: isTablet ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    marginBottom: isTablet ? 10 : 16,
  },
  totalLabel: {
    fontSize: isTablet ? 14 : 16,
    fontWeight: '600',
    color: colors.gray700,
  },
  totalAmount: {
    fontSize: isTablet ? 16 : 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  actionsContainer: {
    gap: isTablet ? 6 : 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: isTablet ? 6 : 8,
  },
  modernBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isTablet ? 12 : 16,
    paddingVertical: isTablet ? 10 : 12,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  acceptBtn: {
    backgroundColor: colors.primary,
  },
  startBtn: {
    backgroundColor: colors.warning,
  },
  readyBtn: {
    backgroundColor: colors.success,
  },
  completeBtn: {
    backgroundColor: colors.gray700,
  },
  readyIndicator: {
    backgroundColor: colors.gray50,
    borderWidth: 2,
    borderColor: colors.success,
  },
  btnText: {
    fontSize: isTablet ? 12 : 14,
    fontWeight: '600',
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray700,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.gray500,
    marginTop: 8,
    textAlign: 'center',
  },
});
