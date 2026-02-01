import { Colors } from "@/constants/theme";
import { useOrdersSSE } from "@/hooks/useOrdersSSE";
import { useFCMToken } from "@/hooks/useFCMToken";
import {
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
  useListServiceTablesQuery,
} from "@/store/api/restaurantsApi";
import type { EnhancedRestaurantTable } from "@/store/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearAuthState,
  selectActiveRestaurantId,
  selectAuthSession,
} from "@/store/slices/authSlice";
import { Ionicons } from "@expo/vector-icons";
import { skipToken } from "@reduxjs/toolkit/query";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
} from "react-native";
import logo_white from "../../assets/images/logo_white.png";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getTableStatus = (table: EnhancedRestaurantTable) => {
  if (table.currentStatus) {
    return table.currentStatus.status;
  }

  const activeOrder = table.activeOrder;
  if (!activeOrder) return "available";
  if (activeOrder.status === "ready") return "ready";
  if (["pending", "accepted", "in_progress"].includes(activeOrder.status))
    return "occupied";
  return "available";
};

const getStatusConfig = (status: string, isDark: boolean) => {
  const configs = {
    available: {
      color: isDark ? "#34D399" : "#10B981",
      bg: isDark ? "#064E3B" : "#ECFDF5",
      label: "Available",
      icon: "checkmark-circle",
    },
    occupied: {
      color: isDark ? "#FBBF24" : "#F59E0B",
      bg: isDark ? "#78350F" : "#FEF3C7",
      label: "Occupied",
      icon: "time",
    },
    ready: {
      color: isDark ? "#60A5FA" : "#3B82F6",
      bg: isDark ? "#1E3A8A" : "#DBEAFE",
      label: "Ready",
      icon: "restaurant",
    },
    cleaning: {
      color: isDark ? "#9CA3AF" : "#6B7280",
      bg: isDark ? "#374151" : "#F3F4F6",
      label: "Cleaning",
      icon: "brush",
    },
    reserved: {
      color: isDark ? "#A78BFA" : "#8B5CF6",
      bg: isDark ? "#5B21B6" : "#F3E8FF",
      label: "Reserved",
      icon: "calendar",
    },
  };

  return configs[status as keyof typeof configs] || configs.available;
};

export default function ServiceTablesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  StatusBar.setBarStyle(isDark ? "light-content" : "dark-content", true);

  const dispatch = useAppDispatch();
  const { refreshToken } = useFCMToken();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const session = useAppSelector(selectAuthSession);
  const [searchTerm, setSearchTerm] = useState("");
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
    { skip: !restaurantId },
  );

  const isLoading = enhancedTablesLoading || serviceTablesLoading;
  const tables = useMemo(() => enhancedTables || [], [enhancedTables]);
  const stats = serviceTablesData?.stats;

  const isTableAssignedToMe = useCallback(
    (table: EnhancedRestaurantTable): boolean => {
      return table.currentStatus?.assignedServerId === session?.userId;
    },
    [session?.userId],
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
      const zone = table.zone || "No Zone";
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
      const zone = table.zone || "No Zone";
      if (!grouped.has(zone)) {
        grouped.set(zone, []);
      }
      grouped.get(zone)?.push(table);
    });
    return grouped;
  }, [unassignedTables]);

  const handleTableClick = (table: EnhancedRestaurantTable) => {
    router.push({
      pathname: "/(service)/menu",
      params: { tableId: table.id, restaurant_slug: restaurant?.slug },
    });
  };

  const handleViewBill = (table: EnhancedRestaurantTable) => {
    if (table.activeOrder) {
      if (table.activeOrder.paymentStatus === "paid") {
        router.push({
          pathname: "/(service)/bill",
          params: {
            orderId: table.activeOrder.id,
            orderData: JSON.stringify(table.activeOrder),
          },
        });
      } else {
        router.push({
          pathname: "/(service)/payment",
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
      // Refresh FCM token in background
      refreshToken().catch((error) => {
        console.warn('FCM token refresh failed:', error);
      })
    ]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    dispatch(clearAuthState());
    router.replace("/(auth)/login");
  };

  const handleSocketEvent = useCallback(() => {
    refetchTables();
  }, [refetchTables]);

  useOrdersSSE({ onEvent: handleSocketEvent, enabled: !!restaurantId });

  useFocusEffect(
    useCallback(() => {
      refetchTables();
    }, [refetchTables]),
  );

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
            backgroundColor: theme.background,
            borderColor: isDark ? "#374151" : "#F3F4F6",
          },
          isAssigned && {
            borderColor: theme.brand,
            borderWidth: 2,
          },
        ]}
        onPress={() => handleTableClick(table)}
        activeOpacity={0.7}
      >
        {/* Top Section */}
        <View style={styles.tableCardTop}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableNumber, { color: theme.text }]}>
              {table.displayName || table.tableNumber}
            </Text>
            {isAssigned && (
              <View
                style={[styles.myTableBadge, { backgroundColor: theme.brand }]}
              >
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

          {table.capacity && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={14} color={theme.icon} />
              <Text style={[styles.infoText, { color: theme.icon }]}>
                {table.capacity} seats
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Section - Order Info */}
        {hasOrder && (
          <View
            style={[
              styles.tableCardBottom,
              {
                backgroundColor: isDark ? "#1F2937" : "#FAFAFA",
                borderTopColor: isDark ? "#374151" : "#F3F4F6",
              },
            ]}
          >
            <View style={styles.orderInfo}>
              <Text style={[styles.orderLabel, { color: theme.icon }]}>
                Order Amount
              </Text>
              <Text style={[styles.orderAmount, { color: theme.text }]}>
                ₹{activeOrder.totalAmount.toFixed(0)}
              </Text>
            </View>

            {(activeOrder.status === "ready" ||
              activeOrder.paymentStatus === "paid") && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.brand }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleViewBill(table);
                }}
              >
                <Ionicons name="receipt-outline" size={14} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {activeOrder.paymentStatus === "paid"
                    ? "View Bill"
                    : "Payment"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Server Badge for unassigned tables */}
        {!isAssigned && table.currentStatus?.assignedServerName && (
          <View
            style={[
              styles.serverBadge,
              {
                backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
                borderTopColor: isDark ? "#374151" : "#F3F4F6",
              },
            ]}
          >
            <Ionicons name="person-outline" size={10} color={theme.icon} />
            <Text style={[styles.serverText, { color: theme.icon }]}>
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

      {/* Header with Brand Color */}
      <View style={[styles.header, { backgroundColor: theme.brand }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Image source={logo_white} style={styles.logo} />
            {restaurant && (
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
            )}
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.background,
            borderColor: isDark ? "#374151" : "#E5E7EB",
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
          <TouchableOpacity onPress={() => setSearchTerm("")}>
            <Ionicons name="close-circle" size={18} color={theme.icon} />
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
            <View
              style={[
                styles.sectionHeader,
                {
                  backgroundColor: isDark
                    ? theme.brandPale
                    : "rgba(73, 16, 188, 0.03)",
                },
              ]}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={theme.brand}
                />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  My Tables
                </Text>
              </View>
              <View
                style={[
                  styles.sectionBadge,
                  { backgroundColor: theme.brandPale },
                ]}
              >
                <Text style={[styles.sectionBadgeText, { color: theme.brand }]}>
                  {assignedTables.length}
                </Text>
              </View>
            </View>

            {Array.from(assignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`assigned-${zone}`}>
                  {assignedTablesByZone.size > 1 && (
                    <View style={styles.zoneHeader}>
                      <Text style={[styles.zoneTitle, { color: theme.icon }]}>
                        {zone}
                      </Text>
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
              ),
            )}
          </View>
        )}

        {/* Other Tables Section */}
        {unassignedTables.length > 0 && (
          <View style={styles.section}>
            <View
              style={[
                styles.sectionHeader,
                {
                  backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
                },
              ]}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="grid-outline" size={20} color={theme.icon} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Other Tables
                </Text>
              </View>
              <View
                style={[
                  styles.sectionBadge,
                  { backgroundColor: isDark ? "#374151" : "#F3F4F6" },
                ]}
              >
                <Text style={[styles.sectionBadgeText, { color: theme.icon }]}>
                  {unassignedTables.length}
                </Text>
              </View>
            </View>

            {Array.from(unassignedTablesByZone.entries()).map(
              ([zone, zoneTables]) => (
                <View key={`unassigned-${zone}`}>
                  {unassignedTablesByZone.size > 1 && (
                    <View style={styles.zoneHeader}>
                      <Text style={[styles.zoneTitle, { color: theme.icon }]}>
                        {zone}
                      </Text>
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
              ),
            )}
          </View>
        )}

        {/* Empty State */}
        {filteredTables.length === 0 && (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: isDark ? "#1F2937" : "#F9FAFB" },
              ]}
            >
              <Ionicons
                name="restaurant-outline"
                size={40}
                color={theme.icon}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchTerm ? "No tables found" : "No tables available"}
            </Text>
            <Text style={[styles.emptyText, { color: theme.icon }]}>
              {searchTerm
                ? "Try adjusting your search"
                : "Contact your manager to set up tables"}
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
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Header
  header: {
    paddingTop: 30,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  logo: {
    width: 120,
    height: 32,
    resizeMode: "contain",
    left: -4,
  },
  restaurantName: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
    marginTop: 0,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats Bar
  statsBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  statItem: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 28,
    alignItems: "center",
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Zone Header
  zoneHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  zoneTitle: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Tables Grid
  tablesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },

  // Table Card
  tableCard: {
    width: (SCREEN_WIDTH - 32 - 24) / 3,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tableCardTop: {
    padding: 12,
    gap: 8,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  myTableBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Table Card Bottom
  tableCardBottom: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
  orderInfo: {
    gap: 3,
  },
  orderLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orderAmount: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // Server Badge
  serverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  serverText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
