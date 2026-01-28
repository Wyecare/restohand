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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

const getStatusColor = (status: string, isAssignedToMe = false) => {
  const colors = {
    available: { bg: '#f0fdf4', text: '#16a34a', border: '#22c55e' },
    occupied: { bg: '#fff7ed', text: '#ea580c', border: '#f97316' },
    ready: { bg: '#eff6ff', text: '#2563eb', border: '#3b82f6' },
    cleaning: { bg: '#f8fafc', text: '#64748b', border: '#94a3b8' },
    reserved: { bg: '#faf5ff', text: '#9333ea', border: '#a855f7' },
  };

  const statusColors =
    colors[status as keyof typeof colors] || colors.available;

  return {
    ...statusColors,
    border: isAssignedToMe ? '#2563eb' : statusColors.border,
    borderWidth: isAssignedToMe ? 2 : 1,
  };
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'available':
      return 'checkmark-circle';
    case 'occupied':
      return 'time';
    case 'ready':
      return 'restaurant';
    case 'cleaning':
      return 'brush';
    case 'reserved':
      return 'calendar';
    default:
      return 'help-circle';
  }
};

export default function ServiceTablesScreen() {
  // Set status bar style
  StatusBar.setBarStyle('light-content', true);
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
        // Go directly to bill if already paid
        router.push({
          pathname: '/(service)/bill',
          params: {
            orderId: table.activeOrder.id,
            orderData: JSON.stringify(table.activeOrder),
          },
        });
      } else {
        // Go to payment screen if order is ready but not paid
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

  // Refresh data when screen comes into focus (e.g., after payment)
  useFocusEffect(
    useCallback(() => {
      refetchTables();
    }, [refetchTables])
  );

  // Early return after all hooks
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
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1e40af" barStyle="light-content" />

      {/* Header with Gradient */}
      <SafeAreaView style={styles.headerContent}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Image source={logo_white} style={styles.logo} />
            {restaurant && (
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
            )}
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Enhanced Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="restaurant" size={20} color="#ffffff" />
              </View>
              <Text style={styles.statValue}>{stats.totalTables}</Text>
              <Text style={styles.statLabel}>Total Tables</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: '#10b981' },
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              </View>
              <Text style={[styles.statValue, { color: '#10b981' }]}>
                {stats.availableTables}
              </Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: '#f59e0b' },
                ]}
              >
                <Ionicons name="time" size={20} color="#ffffff" />
              </View>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                {stats.occupiedTables}
              </Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: '#3b82f6' },
                ]}
              >
                <Ionicons name="restaurant" size={20} color="#ffffff" />
              </View>
              <Text style={[styles.statValue, { color: '#3b82f6' }]}>
                {stats.readyTables}
              </Text>
              <Text style={styles.statLabel}>Ready</Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Enhanced Search */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#6b7280"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tables, zones, or servers..."
            placeholderTextColor="#9ca3af"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchTerm('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Assigned Tables */}
        {assignedTables.length > 0 && (
          <View style={styles.section}>
            <LinearGradient
              colors={['#1e40af', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sectionHeaderGradient}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="person-circle" size={24} color="#ffffff" />
                  <Text style={styles.sectionTitle}>My Tables</Text>
                </View>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {assignedTables.length}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {Array.from(assignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`assigned-${zone}`} style={styles.zoneContainer}>
                  {assignedTablesByZone.size > 1 && (
                    <View style={styles.zoneHeader}>
                      <Text style={styles.zoneTitle}>{zone}</Text>
                      <View style={styles.zoneBadge}>
                        <Text style={styles.zoneBadgeText}>
                          {zoneTables.length}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.tablesGrid}>
                    {zoneTables.map((table) => {
                      const status = getTableStatus(table);
                      const statusStyle = getStatusColor(status, true);
                      const activeOrder = table.activeOrder;

                      return (
                        <TouchableOpacity
                          key={table.id}
                          style={[
                            styles.tableCard,
                            styles.assignedTableCard,
                            {
                              backgroundColor: statusStyle.bg,
                              borderColor: statusStyle.border,
                              borderWidth: statusStyle.borderWidth,
                            },
                          ]}
                          onPress={() => handleTableClick(table)}
                        >
                          <View style={styles.tableCardHeader}>
                            <Text
                              style={[
                                styles.tableNumber,
                                { color: statusStyle.text },
                              ]}
                            >
                              {table.displayName || table.tableNumber}
                            </Text>
                            <View style={styles.assignedIndicator}>
                              <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color="#3b82f6"
                              />
                            </View>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusStyle.text },
                            ]}
                          >
                            <Ionicons
                              name={getStatusIcon(status) as any}
                              size={12}
                              color="#ffffff"
                            />
                            <Text style={styles.statusText}>{status}</Text>
                          </View>

                          <View style={styles.tableDetails}>
                            {table.capacity && (
                              <View style={styles.tableCapacity}>
                                <Ionicons
                                  name="people"
                                  size={14}
                                  color="#6b7280"
                                />
                                <Text style={styles.capacityText}>
                                  {table.capacity} seats
                                </Text>
                              </View>
                            )}

                            {activeOrder && (
                              <View style={styles.orderAmountContainer}>
                                <Text style={styles.orderAmount}>
                                  ₹{activeOrder.totalAmount.toFixed(0)}
                                </Text>
                              </View>
                            )}

                            {/* Bill Button for Ready/Paid Orders */}
                            {activeOrder &&
                              (activeOrder.status === 'ready' ||
                                activeOrder.paymentStatus === 'paid') && (
                                <TouchableOpacity
                                  style={styles.billButton}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleViewBill(table);
                                  }}
                                >
                                  <Ionicons
                                    name="receipt"
                                    size={12}
                                    color="#ffffff"
                                  />
                                  <Text style={styles.billButtonText}>
                                    {activeOrder.paymentStatus === 'paid'
                                      ? 'View Bill'
                                      : 'Payment'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )
            )}
          </View>
        )}

        {/* Other Tables */}
        {unassignedTables.length > 0 && (
          <View style={styles.section}>
            <LinearGradient
              colors={['#6b7280', '#9ca3af']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sectionHeaderGradient}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="grid" size={24} color="#ffffff" />
                  <Text style={styles.sectionTitle}>Other Tables</Text>
                </View>
                <View
                  style={[
                    styles.sectionBadge,
                    { backgroundColor: 'rgba(255,255,255,0.2)' },
                  ]}
                >
                  <Text style={styles.sectionBadgeText}>
                    {unassignedTables.length}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {Array.from(unassignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`unassigned-${zone}`} style={styles.zoneContainer}>
                  {unassignedTablesByZone.size > 1 && (
                    <View style={styles.zoneHeader}>
                      <Text style={styles.zoneTitle}>{zone}</Text>
                      <View style={styles.zoneBadge}>
                        <Text style={styles.zoneBadgeText}>
                          {zoneTables.length}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.tablesGrid}>
                    {zoneTables.map((table) => {
                      const status = getTableStatus(table);
                      const statusStyle = getStatusColor(status, false);
                      const activeOrder = table.activeOrder;

                      return (
                        <TouchableOpacity
                          key={table.id}
                          style={[
                            styles.tableCard,
                            styles.unassignedTableCard,
                            {
                              backgroundColor: statusStyle.bg,
                              borderColor: statusStyle.border,
                              borderWidth: statusStyle.borderWidth,
                            },
                          ]}
                          onPress={() => handleTableClick(table)}
                        >
                          <View style={styles.tableCardHeader}>
                            <Text
                              style={[
                                styles.tableNumber,
                                { color: statusStyle.text },
                              ]}
                            >
                              {table.displayName || table.tableNumber}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusStyle.text },
                            ]}
                          >
                            <Ionicons
                              name={getStatusIcon(status) as any}
                              size={12}
                              color="#ffffff"
                            />
                            <Text style={styles.statusText}>{status}</Text>
                          </View>

                          <View style={styles.tableDetails}>
                            {table.capacity && (
                              <View style={styles.tableCapacity}>
                                <Ionicons
                                  name="people"
                                  size={14}
                                  color="#6b7280"
                                />
                                <Text style={styles.capacityText}>
                                  {table.capacity} seats
                                </Text>
                              </View>
                            )}

                            {activeOrder && (
                              <View style={styles.orderAmountContainer}>
                                <Text style={styles.orderAmount}>
                                  ₹{activeOrder.totalAmount.toFixed(0)}
                                </Text>
                              </View>
                            )}

                            {table.currentStatus?.assignedServerName && (
                              <View style={styles.serverContainer}>
                                <Ionicons
                                  name="person"
                                  size={12}
                                  color="#6b7280"
                                />
                                <Text style={styles.serverName}>
                                  {table.currentStatus.assignedServerName}
                                </Text>
                              </View>
                            )}

                            {/* Bill Button for Ready/Paid Orders */}
                            {activeOrder &&
                              (activeOrder.status === 'ready' ||
                                activeOrder.paymentStatus === 'paid') && (
                                <TouchableOpacity
                                  style={styles.billButton}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleViewBill(table);
                                  }}
                                >
                                  <Ionicons
                                    name="receipt"
                                    size={12}
                                    color="#ffffff"
                                  />
                                  <Text style={styles.billButtonText}>
                                    {activeOrder.paymentStatus === 'paid'
                                      ? 'View Bill'
                                      : 'Payment'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )
            )}
          </View>
        )}

        {filteredTables.length === 0 && (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#f8fafc', '#e2e8f0']}
              style={styles.emptyContent}
            >
              <View style={styles.emptyIconContainer}>
                <Ionicons name="restaurant" size={48} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchTerm ? 'No tables found' : 'No tables available'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Contact your manager to set up tables for your restaurant'}
              </Text>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    backgroundColor: '#1e40af',
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 140,
    height: 45,
    resizeMode: 'contain',
  },
  restaurantName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderGradient: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
  },
  sectionBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  zoneContainer: {
    marginBottom: 20,
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  zoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  zoneBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  zoneBadgeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
  },
  tableCard: {
    width: '30%',
    minWidth: 110,
    borderRadius: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  assignedTableCard: {
    padding: 16,
  },
  unassignedTableCard: {
    padding: 16,
    opacity: 0.85,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
  },
  assignedIndicator: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tableDetails: {
    gap: 6,
  },
  tableCapacity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  orderAmountContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  serverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serverName: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContent: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyIconContainer: {
    backgroundColor: '#f1f5f9',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  billButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  billButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});
