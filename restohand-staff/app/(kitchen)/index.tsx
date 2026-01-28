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
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
} from '@/store/api/ordersApi';
import { useOrdersSSE } from '@/hooks/useOrdersSSE';
import type { Order } from '@/store/api/types';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';

const statusesInKitchen: Order['status'][] = [
  'pending',
  'accepted',
  'in_progress',
];

const statusConfig = {
  pending: {
    label: 'New Orders',
    icon: 'notifications-outline',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    accentColor: '#B91C1C',
  },
  accepted: {
    label: 'Preparing',
    icon: 'checkbox-outline',
    color: '#D97706',
    bgColor: '#FED7AA',
    borderColor: '#FDBA74',
    accentColor: '#B45309',
  },
  in_progress: {
    label: 'Cooking',
    icon: 'flame-outline',
    color: '#059669',
    bgColor: '#A7F3D0',
    borderColor: '#6EE7B7',
    accentColor: '#047857',
  },
};

export default function KitchenOrdersScreen() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [refreshing, setRefreshing] = useState(false);
  const previousOrdersRef = useRef<Order[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const { data, isLoading, refetch } = useListOrdersQuery(
    restaurantId ? { restaurantId, limit: 20, page: 1 } : { restaurantId: '' },
    { skip: !restaurantId, pollingInterval: 30000 }
  );

  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();

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
  }, []); // Only run on mount

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
      } else {
        console.warn('Sound not loaded yet');
      }
    } catch (error) {
      console.warn('Failed to play new order sound:', error);
    }
  }, [sound]);

  // Real-time updates via SSE with audio notifications
  const handleSSEEvent = useCallback(
    async (eventData?: any) => {
      console.log('Kitchen SSE event received:', eventData);

      // Check if this is specifically a new order event
      const isNewOrderEvent =
        eventData?.type &&
        (eventData.type === 'order.created' ||
          eventData.type === 'order-created' ||
          eventData.type === 'new.order' ||
          eventData.type === 'new-order');

      if (isNewOrderEvent) {
        console.log('New order detected via SSE - playing sound');
        playNewOrderSound();
      } else {
        console.log('Non-new-order SSE event - no sound:', eventData?.type);
      }

      // Always refetch orders to get latest data
      await refetch();

      // Update previous orders for next comparison
      if (data?.data) {
        previousOrdersRef.current = data.data;
      }
    },
    [refetch, playNewOrderSound, data?.data]
  );

  useOrdersSSE({ onEvent: handleSSEEvent, enabled: !!restaurantId });

  const filteredOrders = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((order) =>
      statusesInKitchen.includes(order.status)
    );
  }, [data?.data]);

  const grouped = useMemo(() => {
    const map: Record<string, Order[]> = {
      pending: [],
      accepted: [],
      in_progress: [],
    };
    filteredOrders.forEach((order) => {
      map[order.status]?.push(order);
    });
    return map;
  }, [filteredOrders]);

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
    await refetch();
    setRefreshing(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getUrgencyColor = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMins > 15) return '#DC2626';
    if (diffMins > 10) return '#F59E0B';
    return '#6B7280';
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const urgencyColor = getUrgencyColor(order.createdAt || '');
    const config = statusConfig[order.status as keyof typeof statusConfig];

    return (
      <View style={[styles.orderCard, { borderLeftColor: config.accentColor }]}>
        {/* Order Header */}
        <View style={styles.cardHeader}>
          <View style={styles.orderMeta}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
            {order.tableNumber && (
              <View
                style={[styles.tableTag, { backgroundColor: config.bgColor }]}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={12}
                  color={config.color}
                />
                <Text style={[styles.tableText, { color: config.color }]}>
                  Table {order.tableNumber}
                </Text>
              </View>
            )}
          </View>

          {order.createdAt && (
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color={urgencyColor} />
              <Text style={[styles.timeText, { color: urgencyColor }]}>
                {formatTime(order.createdAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Customer Name */}
        {order.customerName && (
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={14} color="#6B7280" />
            <Text style={styles.customerName}>{order.customerName}</Text>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.itemsContainer}>
          {order.items.slice(0, 4).map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>{item.quantity}</Text>
              </View>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          ))}
          {order.items.length > 4 && (
            <Text style={styles.moreItems}>
              + {order.items.length - 4} more item
              {order.items.length - 4 > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Total Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>
            ₹{order.totalAmount.toFixed(0)}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {order.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() =>
                  handleUpdate(order.id, 'accepted', order.progress ?? 0)
                }
                disabled={isUpdating}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#F59E0B"
                />
                <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>
                  Accept
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={() => handleUpdate(order.id, 'in_progress', 40)}
                disabled={isUpdating}
              >
                <Ionicons name="flame" size={18} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                  Start
                </Text>
              </TouchableOpacity>
            </>
          )}

          {order.status === 'accepted' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={() => handleUpdate(order.id, 'in_progress', 40)}
                disabled={isUpdating}
              >
                <Ionicons name="flame" size={18} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                  Start Cooking
                </Text>
              </TouchableOpacity>
            </>
          )}

          {order.status === 'in_progress' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() => handleUpdate(order.id, 'in_progress', 80)}
                disabled={isUpdating}
              >
                <Ionicons name="hourglass-outline" size={18} color="#10B981" />
                <Text style={[styles.actionBtnText, { color: '#10B981' }]}>
                  Almost Done
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.successBtn]}
                onPress={() => handleUpdate(order.id, 'ready', 100)}
                disabled={isUpdating}
              >
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                  Ready
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <View style={styles.headerLeft}>
              <Image source={logo_white} style={styles.logo} />
            </View>
            <Text style={styles.subtitle}>
              {filteredOrders.length} active order
              {filteredOrders.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={playNewOrderSound}
            style={[styles.refreshBtn, { backgroundColor: '#10B981' }]}
          >
            <Ionicons name="volume-high" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshBtn}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh"
              size={24}
              color="#2563EB"
              style={refreshing ? styles.rotating : undefined}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Summary */}
      <View style={styles.summaryContainer}>
        {statusesInKitchen.map((status) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const count = grouped[status]?.length || 0;

          return (
            <View
              key={status}
              style={[
                styles.summaryCard,
                {
                  backgroundColor: config.bgColor,
                  borderColor: config.borderColor,
                },
              ]}
            >
              <Ionicons
                name={config.icon as any}
                size={24}
                color={config.color}
              />
              <Text
                style={[styles.summaryCount, { color: config.accentColor }]}
              >
                {count}
              </Text>
              <Text style={styles.summaryLabel}>{config.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Orders Grid */}
      <ScrollView
        horizontal
        style={styles.columnsContainer}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.columnsContent}
        centerContent={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {statusesInKitchen.map((status) => {
          const statusOrders = grouped[status] || [];
          const config = statusConfig[status as keyof typeof statusConfig];

          return (
            <View key={status} style={styles.column}>
              {/* Column Header */}
              <View
                style={[
                  styles.columnHeader,
                  { backgroundColor: config.bgColor },
                ]}
              >
                <View style={styles.columnHeaderLeft}>
                  <Ionicons
                    name={config.icon as any}
                    size={20}
                    color={config.color}
                  />
                  <Text
                    style={[styles.columnTitle, { color: config.accentColor }]}
                  >
                    {config.label}
                  </Text>
                </View>
                <View
                  style={[styles.countBadge, { backgroundColor: config.color }]}
                >
                  <Text style={styles.countBadgeText}>
                    {statusOrders.length}
                  </Text>
                </View>
              </View>

              {/* Orders List */}
              <ScrollView
                style={styles.columnScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.columnContent}
              >
                {statusOrders.length > 0 ? (
                  statusOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name={config.icon as any}
                      size={48}
                      color={config.color}
                      style={{ opacity: 0.3 }}
                    />
                    <Text style={styles.emptyText}>
                      No {config.label.toLowerCase()}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  rotating: {
    // Add rotation animation if needed
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 140,
    height: 45,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
  },

  // Summary Cards
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Columns Container
  columnsContainer: {
    flex: 1,
  },
  columnsContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 16,
    minWidth: '100%',
    justifyContent: 'center',
  },
  column: {
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  columnHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  columnScroll: {
    flex: 1,
  },
  columnContent: {
    padding: 12,
    gap: 12,
  },

  // Order Card Styles
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  tableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tableText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  customerName: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },

  // Items Section
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  quantityBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  moreItems: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginLeft: 38,
  },

  // Amount Section
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  successBtn: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    fontWeight: '500',
  },
});
