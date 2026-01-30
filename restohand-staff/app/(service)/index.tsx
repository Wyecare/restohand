import logo_white from '../../assets/images/logo_white.png';
import { useOrdersSSE } from '@/hooks/useOrdersSSE';
import {
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
  useListServiceTablesQuery,
} from '@/store/api/restaurantsApi';
import type { EnhancedRestaurantTable } from '@/store/api/types';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { skipToken } from '@reduxjs/toolkit/query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND_COLOR = '#4910bc';
const BRAND_COLOR_LIGHT = '#6B2FDB';
const BRAND_COLOR_PALE = '#F5F1FF';

const getTableStatus = (table: EnhancedRestaurantTable) => {
  if (table.currentStatus) {
    return table.currentStatus.status;
  }

  const activeOrder = table.activeOrder;
  if (!activeOrder) return 'available';
  if (activeOrder.status === 'ready') return 'ready';
  if (['pending', 'accepted', 'in_progress'].includes(activeOrder.status))
    return 'occupied';
  return 'available';
};

const getStatusConfig = (status: string, isAssignedToMe = false) => {
  const configs = {
    available: {
      color: '#10B981',
      bg: '#ECFDF5',
      label: 'Available',
      icon: 'checkmark-circle',
    },
    occupied: {
      color: '#F59E0B',
      bg: '#FEF3C7',
      label: 'Occupied',
      icon: 'time',
    },
    ready: {
      color: '#3B82F6',
      bg: '#DBEAFE',
      label: 'Ready',
      icon: 'restaurant',
    },
    cleaning: {
      color: '#6B7280',
      bg: '#F3F4F6',
      label: 'Cleaning',
      icon: 'brush',
    },
    reserved: {
      color: '#8B5CF6',
      bg: '#F3E8FF',
      label: 'Reserved',
      icon: 'calendar',
    },
  };

  return configs[status as keyof typeof configs] || configs.available;
};

export default function ServiceTablesScreen() {
  StatusBar.setBarStyle('dark-content', true);
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const session = useAppSelector(selectAuthSession);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: enhancedTables,
    isLoading: enhancedTablesLoading,
    refetch: refetchEnhanced,
  } = useListEnhancedTablesQuery(restaurantId ? { restaurantId } : skipToken, {
    skip: !restaurantId,
  });

  const {
    data: serviceTablesData,
    isLoading: serviceTablesLoading,
    refetch: refetchService,
  } = useListServiceTablesQuery(restaurantId ? { restaurantId } : skipToken, {
    skip: !restaurantId,
  });

  const { data: restaurant } = useGetRestaurantQuery(
    restaurantId ?? skipToken,
    { skip: !restaurantId }
  );

  const isLoading = enhancedTablesLoading || serviceTablesLoading;
  const tables = useMemo(() => enhancedTables || [], [enhancedTables]);
  const stats = serviceTablesData?.stats;

  const isTableAssignedToMe = useCallback(
    (table: EnhancedRestaurantTable): boolean => {
      return table.currentStatus?.assignedServerId === session?.userId;
    },
    [session?.userId]
  );

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      return (
        table.tableNumber.toLowerCase().includes(search) ||
        table.displayName?.toLowerCase().includes(search) ||
        table.zone?.toLowerCase().includes(search)
      );
    });
  }, [tables, searchTerm]);

  const { assignedTables, unassignedTables } = useMemo(() => {
    const assigned: EnhancedRestaurantTable[] = [];
    const unassigned: EnhancedRestaurantTable[] = [];

    filteredTables.forEach((table) => {
      if (isTableAssignedToMe(table)) {
        assigned.push(table);
      } else {
        unassigned.push(table);
      }
    });

    return { assignedTables: assigned, unassignedTables: unassigned };
  }, [filteredTables, isTableAssignedToMe]);

  const assignedTablesByZone = useMemo(() => {
    const grouped = new Map<string, EnhancedRestaurantTable[]>();
    assignedTables.forEach((table) => {
      const zone = table.zone || 'No Zone';
      if (!grouped.has(zone)) {
        grouped.set(zone, []);
      }
      grouped.get(zone)?.push(table);
    });
    return grouped;
  }, [assignedTables]);

  const unassignedTablesByZone = useMemo(() => {
    const grouped = new Map<string, EnhancedRestaurantTable[]>();
    unassignedTables.forEach((table) => {
      const zone = table.zone || 'No Zone';
      if (!grouped.has(zone)) {
        grouped.set(zone, []);
      }
      grouped.get(zone)?.push(table);
    });
    return grouped;
  }, [unassignedTables]);

  const handleTableClick = (table: EnhancedRestaurantTable) => {
    router.push({
      pathname: '/(service)/menu',
      params: { tableId: table.id, restaurant_slug: restaurant?.slug },
    });
  };

  const handleViewBill = (table: EnhancedRestaurantTable) => {
    if (table.activeOrder) {
      if (table.activeOrder.paymentStatus === 'paid') {
        router.push({
          pathname: '/(service)/bill',
          params: {
            orderId: table.activeOrder.id,
            orderData: JSON.stringify(table.activeOrder),
          },
        });
      } else {
        router.push({
          pathname: '/(service)/payment',
          params: {
            orderId: table.activeOrder.id,
            tableId: table.id,
            orderData: JSON.stringify(table.activeOrder),
          },
        });
      }
    }
  };

  const refetchTables = useCallback(() => {
    refetchService();
    refetchEnhanced();
  }, [refetchService, refetchEnhanced]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEnhanced(), refetchService()]);
    setRefreshing(false);
  };

  const handleSocketEvent = useCallback(() => {
    refetchTables();
  }, [refetchTables]);

  useOrdersSSE({ onEvent: handleSocketEvent, enabled: !!restaurantId });

  useFocusEffect(
    useCallback(() => {
      refetchTables();
    }, [refetchTables])
  );

  if (!restaurantId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No restaurant selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR} />
          <Text style={styles.loadingText}>Loading tables...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const TableCard = ({
    table,
    isAssigned,
  }: {
    table: EnhancedRestaurantTable;
    isAssigned: boolean;
  }) => {
    const status = getTableStatus(table);
    const statusConfig = getStatusConfig(status, isAssigned);
    const activeOrder = table.activeOrder;
    const hasOrder = !!activeOrder;

    return (
      <TouchableOpacity
        style={[styles.tableCard, isAssigned && styles.assignedTableCard]}
        onPress={() => handleTableClick(table)}
        activeOpacity={0.7}
      >
        {/* Top Section - Always visible */}
        <View style={styles.tableCardTop}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableNumber}>
              {table.displayName || table.tableNumber}
            </Text>
            {isAssigned && (
              <View style={styles.myTableBadge}>
                <Ionicons name="person" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusConfig.color },
              ]}
            />
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          <View style={styles.tableInfo}>
            {table.capacity && (
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>{table.capacity} seats</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Section - Only when there's an order */}
        {hasOrder && (
          <View style={styles.tableCardBottom}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderLabel}>Order Amount</Text>
              <Text style={styles.orderAmount}>
                ₹{activeOrder.totalAmount.toFixed(0)}
              </Text>
            </View>

            {(activeOrder.status === 'ready' ||
              activeOrder.paymentStatus === 'paid') && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleViewBill(table);
                }}
              >
                <Ionicons name="receipt-outline" size={14} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {activeOrder.paymentStatus === 'paid'
                    ? 'View Bill'
                    : 'Payment'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Server name for unassigned tables */}
        {!isAssigned && table.currentStatus?.assignedServerName && (
          <View style={styles.serverBadge}>
            <Ionicons name="person-outline" size={10} color="#6B7280" />
            <Text style={styles.serverText}>
              {table.currentStatus.assignedServerName}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Brand Color Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Image source={logo_white} style={styles.logo} />
            {restaurant && (
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
            )}
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalTables}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.availableTables}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.occupiedTables}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.readyTables}</Text>
              <Text style={styles.statLabel}>Ready</Text>
            </View>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#9CA3AF"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tables..."
          placeholderTextColor="#9CA3AF"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tables Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* My Tables Section */}
        {assignedTables.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={BRAND_COLOR}
                />
                <Text style={styles.sectionTitle}>My Tables</Text>
              </View>
              <View
                style={[
                  styles.sectionBadge,
                  { backgroundColor: BRAND_COLOR_PALE },
                ]}
              >
                <Text style={[styles.sectionBadgeText, { color: BRAND_COLOR }]}>
                  {assignedTables.length}
                </Text>
              </View>
            </View>

            {Array.from(assignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`assigned-${zone}`}>
                  {assignedTablesByZone.size > 1 && (
                    <View style={styles.zoneHeader}>
                      <Text style={styles.zoneTitle}>{zone}</Text>
                    </View>
                  )}
                  <View style={styles.tablesGrid}>
                    {zoneTables.map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        isAssigned={true}
                      />
                    ))}
                  </View>
                </View>
              )
            )}
          </View>
        )}

        {/* Other Tables Section */}
        {unassignedTables.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="grid-outline" size={20} color="#6B7280" />
                <Text style={styles.sectionTitle}>Other Tables</Text>
              </View>
              <View
                style={[styles.sectionBadge, { backgroundColor: '#F3F4F6' }]}
              >
                <Text style={[styles.sectionBadgeText, { color: '#6B7280' }]}>
                  {unassignedTables.length}
                </Text>
              </View>
            </View>

            {Array.from(unassignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`unassigned-${zone}`}>
                  {unassignedTablesByZone.size > 1 && (
                    <View style={styles.zoneHeader}>
                      <Text style={styles.zoneTitle}>{zone}</Text>
                    </View>
                  )}
                  <View style={styles.tablesGrid}>
                    {zoneTables.map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        isAssigned={false}
                      />
                    ))}
                  </View>
                </View>
              )
            )}
          </View>
        )}

        {/* Empty State */}
        {filteredTables.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="restaurant-outline" size={40} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchTerm ? 'No tables found' : 'No tables available'}
            </Text>
            <Text style={styles.emptyText}>
              {searchTerm
                ? 'Try adjusting your search'
                : 'Contact your manager to set up tables'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: BRAND_COLOR,
    paddingTop: 12,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 36,
    resizeMode: 'contain',
    left: -4,
  },
  restaurantName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 0,
    gap: 10,
    backgroundColor: BRAND_COLOR,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    display: 'none',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },

  // Scroll View
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(73, 16, 188, 0.03)',
    marginHorizontal: 20,
    borderRadius: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  sectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 32,
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Zone Header
  zoneHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  zoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Tables Grid - Proper 3 Column Layout
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 14,
  },

  // Table Card - Fixed Height
  tableCard: {
    width: (SCREEN_WIDTH - 40 - 28) / 3, // 3 columns with proper spacing
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F3F4F6',
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
  assignedTableCard: {
    borderColor: BRAND_COLOR,
    borderWidth: 2.5,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tableCardTop: {
    padding: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tableNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  myTableBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tableInfo: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  // Table Card Bottom (for orders)
  tableCardBottom: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 14,
    backgroundColor: '#FAFAFA',
    gap: 10,
  },
  orderInfo: {
    gap: 4,
  },
  orderLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: BRAND_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Server Badge
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  serverText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
