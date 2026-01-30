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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BRAND_COLOR = '#4910bc';
const BRAND_COLOR_LIGHT = '#6B2FDB';
const BRAND_COLOR_LIGHTER = '#E9E0FF';
const BRAND_COLOR_PALE = '#F5F1FF';

const cookingStatuses: Order['status'][] = [
  'pending',
  'accepted',
  'in_progress',
];

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

  // Split orders into two columns:
  // LEFT = cooking queue (pending/accepted/in_progress) - stays here until marked "ready"
  // RIGHT = ready orders - move here when marked ready, can be marked as delivered/complete to remove
  const { cookingOrders, readyOrders } = useMemo(() => {
    if (!data?.data) return { cookingOrders: [], readyOrders: [] };

    const cooking: Order[] = [];
    const ready: Order[] = [];

    data.data.forEach((order) => {
      // LEFT COLUMN: All orders being worked on
      if (cookingStatuses.includes(order.status)) {
        cooking.push(order);
      }
      // RIGHT COLUMN: Only ready orders waiting to be picked up
      else if (order.status === 'ready') {
        ready.push(order);
      }
      // Orders with other statuses (delivered, completed, etc.) are filtered out
    });

    // Sort cooking orders by time (oldest first - most urgent)
    cooking.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    // Sort ready orders by time (oldest first)
    ready.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    return { cookingOrders: cooking, readyOrders: ready };
  }, [data?.data]);

  // Status counts for summary
  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      accepted: 0,
      in_progress: 0,
      ready: 0,
    };
    data?.data?.forEach((order) => {
      if (counts.hasOwnProperty(order.status)) {
        counts[order.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [data?.data]);

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

  const getTimeMinutes = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / 60000);
  };

  const getUrgencyLevel = (dateString: string) => {
    const mins = getTimeMinutes(dateString);
    if (mins > 15) return 'critical';
    if (mins > 10) return 'warning';
    if (mins > 5) return 'normal';
    return 'fresh';
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'New';
      case 'accepted':
        return 'Accepted';
      case 'in_progress':
        return 'Cooking';
      case 'ready':
        return 'Ready';
      default:
        return status;
    }
  };

  const OrderCard = ({
    order,
    isReady = false,
  }: {
    order: Order;
    isReady?: boolean;
  }) => {
    const urgencyLevel = getUrgencyLevel(order.createdAt || '');
    const timeMinutes = getTimeMinutes(order.createdAt || '');

    const urgencyStyles = {
      critical: {
        borderColor: '#DC2626',
        timeBg: '#FEE2E2',
        timeColor: '#DC2626',
        showPulse: true,
      },
      warning: {
        borderColor: '#F59E0B',
        timeBg: '#FEF3C7',
        timeColor: '#D97706',
        showPulse: false,
      },
      normal: {
        borderColor: '#E5E7EB',
        timeBg: '#F3F4F6',
        timeColor: '#6B7280',
        showPulse: false,
      },
      fresh: {
        borderColor: BRAND_COLOR_LIGHTER,
        timeBg: BRAND_COLOR_PALE,
        timeColor: BRAND_COLOR,
        showPulse: false,
      },
    };

    const style = isReady
      ? {
          borderColor: '#10B981',
          timeBg: '#D1FAE5',
          timeColor: '#059669',
          showPulse: false,
        }
      : urgencyStyles[urgencyLevel];

    return (
      <View style={[styles.orderCard, { borderColor: style.borderColor }]}>
        {/* Urgency Pulse Indicator */}
        {style.showPulse && (
          <View style={styles.criticalPulse}>
            <View style={[styles.pulseRing, { backgroundColor: '#DC2626' }]} />
          </View>
        )}

        {/* Header: Order Number, Table, Status */}
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>

            {order.tableNumber && (
              <View style={styles.tableBadge}>
                <Ionicons name="restaurant-outline" size={14} color="#374151" />
                <Text style={styles.tableText}>T{order.tableNumber}</Text>
              </View>
            )}
          </View>

          <View style={styles.statusTag}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isReady ? '#10B981' : BRAND_COLOR },
              ]}
            />
            <Text style={styles.statusText}>
              {getStatusLabel(order.status)}
            </Text>
          </View>
        </View>

        {/* Time Badge */}
        {order.createdAt && (
          <View style={[styles.timeBadge, { backgroundColor: style.timeBg }]}>
            <Ionicons name="time-outline" size={16} color={style.timeColor} />
            <Text style={[styles.timeText, { color: style.timeColor }]}>
              {formatTime(order.createdAt)}
            </Text>
          </View>
        )}

        {/* Customer Name */}
        {order.customerName && (
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={14} color="#6B7280" />
            <Text style={styles.customerName}>{order.customerName}</Text>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.itemsSection}>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>{item.quantity}x</Text>
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Total Amount */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>
            ₹{order.totalAmount.toFixed(0)}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {/* LEFT COLUMN ACTIONS - Cooking Queue */}
          {!isReady && (
            <>
              {order.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() =>
                      handleUpdate(order.id, 'accepted', order.progress ?? 0)
                    }
                    disabled={isUpdating}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.startBtn]}
                    onPress={() => handleUpdate(order.id, 'in_progress', 40)}
                    disabled={isUpdating}
                  >
                    <Ionicons name="flame" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Start</Text>
                  </TouchableOpacity>
                </>
              )}

              {order.status === 'accepted' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.startBtn, { flex: 1 }]}
                  onPress={() => handleUpdate(order.id, 'in_progress', 40)}
                  disabled={isUpdating}
                >
                  <Ionicons name="flame" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Start Cooking</Text>
                </TouchableOpacity>
              )}

              {order.status === 'in_progress' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.readyBtn, { flex: 1 }]}
                  onPress={() => handleUpdate(order.id, 'ready', 100)}
                  disabled={isUpdating}
                >
                  <Ionicons
                    name="checkmark-done-circle"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionBtnText}>Mark Ready</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* RIGHT COLUMN ACTIONS - Ready Orders */}
          {isReady && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn, { flex: 1 }]}
              onPress={() => handleUpdate(order.id, 'delivered', 100)}
              disabled={isUpdating}
            >
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLOR} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={logo_white} style={styles.logo} />
          <View style={styles.headerInfo}>
            <Text style={styles.subtitle}>
              {cookingOrders.length + readyOrders.length} active order
              {cookingOrders.length + readyOrders.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={playNewOrderSound}
            style={[styles.headerBtn, styles.soundBtn]}
          >
            <Ionicons name="volume-high" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRefresh}
            style={[styles.headerBtn, styles.refreshBtn]}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh"
              size={22}
              color={BRAND_COLOR}
              style={refreshing ? styles.rotating : undefined}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#DC2626' }]} />
          <Text style={styles.summaryLabel}>New</Text>
          <Text style={styles.summaryCount}>{statusCounts.pending}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.summaryLabel}>Accepted</Text>
          <Text style={styles.summaryCount}>{statusCounts.accepted}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: BRAND_COLOR }]} />
          <Text style={styles.summaryLabel}>Cooking</Text>
          <Text style={styles.summaryCount}>{statusCounts.in_progress}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.summaryLabel}>Ready</Text>
          <Text style={styles.summaryCount}>{statusCounts.ready}</Text>
        </View>
      </View>

      {/* Two Column Layout */}
      <View style={styles.columnsContainer}>
        {/* LEFT COLUMN: Cooking Queue */}
        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <Ionicons name="flame" size={22} color={BRAND_COLOR} />
            <Text style={styles.columnTitle}>Cooking Queue</Text>
            <View
              style={[styles.columnBadge, { backgroundColor: BRAND_COLOR }]}
            >
              <Text style={styles.columnBadgeText}>{cookingOrders.length}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.columnScroll}
            contentContainerStyle={styles.columnContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {cookingOrders.length > 0 ? (
              cookingOrders.map((order) => (
                <OrderCard key={order.id} order={order} isReady={false} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={56}
                  color="#D1D5DB"
                />
                <Text style={styles.emptyText}>No orders cooking</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* RIGHT COLUMN: Ready to Serve */}
        <View style={[styles.column, styles.readyColumn]}>
          <View style={[styles.columnHeader, styles.readyColumnHeader]}>
            <Ionicons name="checkmark-done-circle" size={22} color="#10B981" />
            <Text style={styles.columnTitle}>Ready to Serve</Text>
            <View style={[styles.columnBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.columnBadgeText}>{readyOrders.length}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.columnScroll}
            contentContainerStyle={styles.columnContent}
            showsVerticalScrollIndicator={false}
          >
            {readyOrders.length > 0 ? (
              readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} isReady={true} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="hourglass-outline" size={56} color="#D1D5DB" />
                <Text style={styles.emptyText}>Nothing ready yet</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  rotating: {
    // Add rotation animation if needed
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: 140,
    height: 45,
    resizeMode: 'contain',
  },
  headerInfo: {
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundBtn: {
    backgroundColor: '#10B981',
  },
  refreshBtn: {
    backgroundColor: BRAND_COLOR_PALE,
  },

  // Summary Bar
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryCount: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },

  // Two Column Layout
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  column: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  readyColumn: {
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: BRAND_COLOR_PALE,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  readyColumnHeader: {
    backgroundColor: '#D1FAE5',
  },
  columnTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  columnBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  columnBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  columnScroll: {
    flex: 1,
  },
  columnContent: {
    padding: 16,
    gap: 16,
  },

  // Order Card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  criticalPulse: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    zIndex: 10,
  },
  pulseRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  tableText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerName: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Items Section
  itemsSection: {
    marginBottom: 12,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  quantityBadge: {
    minWidth: 36,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: BRAND_COLOR_PALE,
    borderRadius: 6,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLOR,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Total Row
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  // Action Buttons
  actionsRow: {
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
    minHeight: 48,
  },
  acceptBtn: {
    backgroundColor: '#F59E0B',
  },
  startBtn: {
    backgroundColor: BRAND_COLOR,
  },
  readyBtn: {
    backgroundColor: '#10B981',
  },
  completeBtn: {
    backgroundColor: '#6B7280',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
