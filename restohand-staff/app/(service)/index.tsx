import { Colors } from '@/constants/theme';
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
  Dimensions,
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
import logo_white from '../../assets/images/logo_white.png';

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

const getStatusConfig = (status: string, isDark: boolean) => {
  const configs = {
    available: {
      color: isDark ? '#34D399' : '#10B981',
      bg: isDark ? '#064E3B' : '#ECFDF5',
      label: 'Available',
      icon: 'checkmark-circle',
    },
    occupied: {
      color: isDark ? '#FBBF24' : '#F59E0B',
      bg: isDark ? '#78350F' : '#FEF3C7',
      label: 'Occupied',
      icon: 'time',
    },
    ready: {
      color: isDark ? '#60A5FA' : '#3B82F6',
      bg: isDark ? '#1E3A8A' : '#DBEAFE',
      label: 'Ready',
      icon: 'restaurant',
    },
    cleaning: {
      color: isDark ? '#9CA3AF' : '#6B7280',
      bg: isDark ? '#374151' : '#F3F4F6',
      label: 'Cleaning',
      icon: 'brush',
    },
    reserved: {
      color: isDark ? '#A78BFA' : '#8B5CF6',
      bg: isDark ? '#5B21B6' : '#F3E8FF',
      label: 'Reserved',
      icon: 'calendar',
    },
  };

  return configs[status as keyof typeof configs] || configs.available;
};

export default function ServiceTablesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { width, height } = useWindowDimensions();

  // Determine if tablet based on width
  const isTablet = width >= 768;
  const isLandscape = width > height;

  StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);

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
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            No restaurant selected
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand} />
          <Text style={[styles.loadingText, { color: theme.icon }]}>
            Loading tables...
          </Text>
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
    const statusConfig = getStatusConfig(status, isDark);
    const activeOrder = table.activeOrder;
    const hasOrder = !!activeOrder;

    return (
      <TouchableOpacity
        style={[
          styles.tableCard,
          {
            width: cardWidth,
            backgroundColor: theme.background,
            borderColor: isDark ? '#374151' : '#F3F4F6',
          },
          isAssigned && {
            borderColor: theme.brand,
            borderWidth: 2,
          },
        ]}
        onPress={() => handleTableClick(table)}
        activeOpacity={0.7}
      >
        {/* Compact Header */}
        <View style={styles.tableCardHeader}>
          <View style={styles.tableNumberRow}>
            <Text style={[styles.tableNumber, { color: theme.text }]}>
              {table.displayName || table.tableNumber}
            </Text>
            {isAssigned && (
              <View style={[styles.myBadge, { backgroundColor: theme.brand }]}>
                <Ionicons name="person" size={10} color="#FFF" />
              </View>
            )}
          </View>

          {/* Status dot - more compact */}
          <View
            style={[styles.statusDot, { backgroundColor: statusConfig.color }]}
          />
        </View>

        {/* Order info or empty state */}
        {hasOrder ? (
          <View style={styles.orderSection}>
            <Text style={[styles.orderAmount, { color: theme.text }]}>
              ₹{activeOrder.totalAmount}
            </Text>

            {(activeOrder.status === 'ready' ||
              activeOrder.paymentStatus === 'paid') && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.brand }]}
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
            <Text style={[styles.emptyText, { color: theme.icon }]}>
              {statusConfig.label}
            </Text>
          </View>
        )}

        {/* Server name for unassigned */}
        {!isAssigned && table.currentStatus?.assignedServerName && (
          <View style={styles.serverRow}>
            <Ionicons name="person" size={10} color={theme.icon} />
            <Text
              style={[styles.serverText, { color: theme.icon }]}
              numberOfLines={1}
            >
              {table.currentStatus.assignedServerName}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar backgroundColor={theme.brand} barStyle="light-content" />

      {/* Compact Header */}
      <View style={[styles.header, { backgroundColor: theme.brand }]}>
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
              <Ionicons name="time-outline" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.headerBtn}>
              <Ionicons name="refresh" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
              <Ionicons name="log-out-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Compact Stats Row */}
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
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.background,
            borderColor: isDark ? '#374151' : '#E5E7EB',
          },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.icon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search tables..."
          placeholderTextColor={theme.icon}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color={theme.icon} />
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
            <View
              style={[
                styles.sectionHeader,
                {
                  backgroundColor: isDark
                    ? theme.brandPale
                    : 'rgba(73, 16, 188, 0.03)',
                },
              ]}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color={theme.brand}
                />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  My Tables ({assignedTables.length})
                </Text>
              </View>
            </View>

            {Array.from(assignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`assigned-${zone}`}>
                  {assignedTablesByZone.size > 1 && (
                    <Text style={[styles.zoneTitle, { color: theme.icon }]}>
                      {zone}
                    </Text>
                  )}
                  <View style={[styles.tablesGrid, { gap: 12 }]}>
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

        {/* Other Tables */}
        {unassignedTables.length > 0 && (
          <View style={styles.section}>
            <View
              style={[
                styles.sectionHeader,
                { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' },
              ]}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="grid-outline" size={18} color={theme.icon} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Other Tables ({unassignedTables.length})
                </Text>
              </View>
            </View>

            {Array.from(unassignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`unassigned-${zone}`}>
                  {unassignedTablesByZone.size > 1 && (
                    <Text style={[styles.zoneTitle, { color: theme.icon }]}>
                      {zone}
                    </Text>
                  )}
                  <View style={[styles.tablesGrid, { gap: 12 }]}>
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
            <Ionicons name="restaurant-outline" size={40} color={theme.icon} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchTerm ? 'No tables found' : 'No tables available'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.icon }]}>
              {searchTerm
                ? 'Try adjusting your search'
                : 'Contact your manager'}
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
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
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
    color: 'rgba(255, 255, 255, 0.8)',
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
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  zoneTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },

  // Grid
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Compact Card
  tableCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
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
  },
  myBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
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
  },

  // Server
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  serverText: {
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
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
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
});
