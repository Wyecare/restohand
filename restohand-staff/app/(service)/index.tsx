import { useOrdersSSE } from '@/hooks/useOrdersSSE';
import { useFCMToken } from '@/hooks/useFCMToken';
import {
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
  useListServiceTablesQuery,
} from '@/store/api/restaurantsApi';
import type { EnhancedRestaurantTable } from '@/store/api/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearAuthState,
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { skipToken } from '@reduxjs/toolkit/query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import logo_white from '../../assets/images/logo_black.png';

const BRAND = '#4910bc';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const BORDER = '#E2E8F0';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const STATUS_AVAILABLE = '#10B981';
const STATUS_OCCUPIED = '#F59E0B';
const STATUS_READY = '#3B82F6';
const STATUS_OTHER = '#6B7280';

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

const getStatusConfig = (status: string) => {
  const configs = {
    available: {
      color: STATUS_AVAILABLE,
      bg: '#ECFDF5',
      label: 'Available',
      icon: 'checkmark-circle',
    },
    occupied: {
      color: STATUS_OCCUPIED,
      bg: '#FEF3C7',
      label: 'Occupied',
      icon: 'time',
    },
    ready: {
      color: STATUS_READY,
      bg: '#DBEAFE',
      label: 'Ready',
      icon: 'restaurant',
    },
    cleaning: {
      color: STATUS_OTHER,
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
  const { width, height } = useWindowDimensions();

  // Determine if tablet based on width
  const isTablet = width >= 768;
  const isLandscape = width > height;

  StatusBar.setBarStyle('light-content', true);

  const dispatch = useAppDispatch();
  const { refreshToken } = useFCMToken();
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
      pathname: '/(service)/session-management',
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
    await Promise.all([
      refetchEnhanced(),
      refetchService(),
      refreshToken().catch((error) => {
        console.warn('FCM token refresh failed:', error);
      }),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    onRefresh();
  }, [restaurantId]);

  const handleLogout = () => {
    dispatch(clearAuthState());
    router.replace('/(auth)/login');
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

  // Calculate columns based on device
  const columns = useMemo(() => {
    if (isTablet) {
      return isLandscape ? 6 : 4;
    }
    return 2; // Phone always 2 columns
  }, [isTablet, isLandscape]);

  // Calculate card width
  const cardWidth = useMemo(() => {
    const padding = isTablet ? 24 : 16;
    const gap = 12;
    const totalGaps = (columns - 1) * gap;
    const totalPadding = padding * 2;
    return (width - totalPadding - totalGaps) / columns;
  }, [width, columns, isTablet]);

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
          <ActivityIndicator size="large" color={BRAND} />
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
    const statusConfig = getStatusConfig(status);
    const activeOrder = table.activeOrder;
    const hasOrder = !!activeOrder;

    return (
      <TouchableOpacity
        style={[
          styles.tableCard,
          { width: cardWidth },
          isAssigned && styles.tableCardAssigned,
        ]}
        onPress={() => handleTableClick(table)}
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={styles.tableCardHeader}>
          <View style={styles.tableNumberRow}>
            <Text style={styles.tableNumber}>
              {table.displayName || table.tableNumber}
            </Text>
            {isAssigned && (
              <View style={styles.myBadge}>
                <Ionicons name="person" size={10} color="#FFF" />
              </View>
            )}
          </View>
          <View
            style={[styles.statusDot, { backgroundColor: statusConfig.color }]}
          />
        </View>

        {/* Order info or empty state */}
        {hasOrder ? (
          <View style={styles.orderSection}>
            <Text style={styles.orderAmount}>₹{activeOrder.totalAmount}</Text>

            {(activeOrder.status === 'ready' ||
              activeOrder.paymentStatus === 'paid') && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleViewBill(table);
                }}
              >
                <Ionicons name="receipt" size={12} color="#FFF" />
                <Text style={styles.actionText}>
                  {activeOrder.paymentStatus === 'paid' ? 'Bill' : 'Pay'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>{statusConfig.label}</Text>
          </View>
        )}

        {/* Server name for unassigned */}
        {!isAssigned && table.currentStatus?.assignedServerName && (
          <View style={styles.serverRow}>
            <Ionicons name="person" size={10} color={TEXT_SECONDARY} />
            <Text style={styles.serverText} numberOfLines={1}>
              {table.currentStatus.assignedServerName}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={BRAND} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image source={logo_white} style={styles.logo} />
            {restaurant && (
              <Text style={styles.restaurantName} numberOfLines={1}>
                {restaurant.name}
              </Text>
            )}
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => router.push('/(service)/history')}
              style={styles.headerBtn}
            >
              <Ionicons name="time-outline" size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.headerBtn}>
              <Ionicons name="refresh" size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
              <Ionicons name="log-out-outline" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{stats.totalTables}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{stats.availableTables}</Text>
              <Text style={styles.statLabel}>Free</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{stats.occupiedTables}</Text>
              <Text style={styles.statLabel}>Busy</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{stats.readyTables}</Text>
              <Text style={styles.statLabel}>Ready</Text>
            </View>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={TEXT_SECONDARY} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tables..."
          placeholderTextColor={TEXT_SECONDARY}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tables Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isTablet ? 24 : 16 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* My Tables */}
        {assignedTables.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, styles.sectionHeaderMyTables]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color={BRAND}
                />
                <Text style={styles.sectionTitle}>
                  My Tables ({assignedTables.length})
                </Text>
              </View>
            </View>

            {Array.from(assignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`assigned-${zone}`}>
                  {assignedTablesByZone.size > 1 && (
                    <Text style={styles.zoneTitle}>{zone}</Text>
                  )}
                  <View style={[styles.tablesGrid, { gap: 12 }]}>
                    {zoneTables.map((table) => (
                      <TableCard key={table.id} table={table} isAssigned={true} />
                    ))}
                  </View>
                </View>
              )
            )}
          </View>
        )}

        {/* Other Tables */}
        {unassignedTables.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, styles.sectionHeaderOther]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="grid-outline" size={18} color={TEXT_SECONDARY} />
                <Text style={styles.sectionTitle}>
                  Other Tables ({unassignedTables.length})
                </Text>
              </View>
            </View>

            {Array.from(unassignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`unassigned-${zone}`}>
                  {unassignedTablesByZone.size > 1 && (
                    <Text style={styles.zoneTitle}>{zone}</Text>
                  )}
                  <View style={[styles.tablesGrid, { gap: 12 }]}>
                    {zoneTables.map((table) => (
                      <TableCard key={table.id} table={table} isAssigned={false} />
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
            <Ionicons name="restaurant-outline" size={40} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>
              {searchTerm ? 'No tables found' : 'No tables available'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchTerm ? 'Try adjusting your search' : 'Contact your manager'}
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
    backgroundColor: PAGE_BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },

  // Compact Header
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 100,
    height: 28,
    resizeMode: 'contain',
  },
  restaurantName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 6,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Compact Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderMyTables: {
    backgroundColor: 'rgba(73, 16, 188, 0.04)',
  },
  sectionHeaderOther: {
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  zoneTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: TEXT_SECONDARY,
  },

  // Grid
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Card
  tableCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: CARD_BG,
    padding: 10,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  tableCardAssigned: {
    borderColor: BRAND,
    borderWidth: 2,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  myBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Order section
  orderSection: {
    gap: 6,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: BRAND,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },

  // Empty section
  emptySection: {
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },

  // Server
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  serverText: {
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
    color: TEXT_SECONDARY,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    color: TEXT_SECONDARY,
  },
});
