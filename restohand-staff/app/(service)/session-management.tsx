import { useFindSessionsQuery } from '@/store/api/customerSessionsApi';
import {
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
} from '@/store/api/restaurantsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { skipToken } from '@reduxjs/toolkit/query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const BRAND = '#4910bc';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const BORDER = '#E2E8F0';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const TEXT_TERTIARY = '#94A3B8';
const SUCCESS = '#10B981';
const SUCCESS_BG = '#DCFCE7';
const WARNING = '#F59E0B';
const WARNING_BG = '#FEF3C7';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const getTimeDuration = (startTime: string) => {
  const diffMins = Math.floor(
    (Date.now() - new Date(startTime).getTime()) / 60000
  );
  if (diffMins < 60) return `${diffMins}m`;
  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
};

export default function SessionManagementScreen() {
  const { tableId } = useLocalSearchParams();
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const { data: restaurant } = useGetRestaurantQuery(
    restaurantId ?? skipToken,
    { skip: !restaurantId }
  );

  const { data: enhancedTables } = useListEnhancedTablesQuery(
    restaurantId ? { restaurantId } : skipToken,
    { skip: !restaurantId }
  );

  const selectedTable = useMemo(
    () => enhancedTables?.find((t) => t.id === tableId) ?? null,
    [enhancedTables, tableId]
  );

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useFindSessionsQuery(
    restaurantId && tableId
      ? {
          restaurantId,
          tableId: tableId as string,
          status: 'active',
          returnEmpty: true,
          limit: 10,
        }
      : skipToken,
    { skip: !restaurantId || !tableId }
  );

  const activeSessions = sessionsData?.sessions || [];

  // Navigate directly to menu — session is created atomically on first order
  const handleStartNewOrder = () => {
    if (!selectedTable) return;
    router.push({
      pathname: '/(service)/menu',
      params: {
        tableId: selectedTable.id,
        restaurant_slug: restaurant?.slug,
      },
    });
  };

  const handleResumeSession = (sessionId: string) => {
    if (!selectedTable || !restaurant) return;
    router.push({
      pathname: '/(service)/menu',
      params: {
        sessionId,
        tableId: selectedTable.id,
        restaurant_slug: restaurant.slug,
      },
    });
  };

  const tableNumber =
    selectedTable?.displayName ||
    selectedTable?.tableNumber ||
    `Table ${tableId}`;

  if (sessionsLoading && !selectedTable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.loadingText}>Loading sessions…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{tableNumber}</Text>
          <Text style={styles.headerSubtitle}>Table Sessions</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => refetchSessions()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh-outline" size={19} color={TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Start New Order CTA ── */}
        <TouchableOpacity
          style={styles.newOrderCard}
          onPress={handleStartNewOrder}
          activeOpacity={0.88}
        >
          <View style={styles.newOrderLeft}>
            <View style={styles.newOrderIconWrap}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.newOrderTitle}>Start New Order</Text>
              <Text style={styles.newOrderSub}>
                Seat a new group at this table
              </Text>
            </View>
          </View>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="rgba(255,255,255,0.8)"
          />
        </TouchableOpacity>

        {/* ── Active Sessions ── */}
        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Active Sessions</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeSessions.length}</Text>
              </View>
            </View>

            {activeSessions.map((session, index) => (
              <View key={session.sessionId} style={styles.sessionCard}>
                {/* Top Row */}
                <View style={styles.cardTopRow}>
                  <View>
                    <Text style={styles.sessionLabel}>Group {index + 1}</Text>
                    <View style={styles.timeRow}>
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={TEXT_SECONDARY}
                      />
                      <Text style={styles.timeText}>
                        Since {formatTime(session.startedAt)} ·{' '}
                        {getTimeDuration(session.startedAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.activePill}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{session.totalOrders}</Text>
                    <Text style={styles.statLabel}>Orders</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {formatCurrency(session.totalAmount)}
                    </Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color: session.allOrdersPaid ? SUCCESS : WARNING,
                        },
                      ]}
                    >
                      {session.allOrdersPaid ? 'Paid' : 'Unpaid'}
                    </Text>
                    <Text style={styles.statLabel}>Payment</Text>
                  </View>
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={() => handleResumeSession(session.sessionId)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="restaurant-outline" size={15} color="#fff" />
                  <Text style={styles.continueBtnText}>Continue Order</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Empty State ── */}
        {activeSessions.length === 0 && !sessionsLoading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No Active Sessions</Text>
            <Text style={styles.emptyDesc}>
              This table is currently free. Tap "Start New Order" above to
              begin serving customers.
            </Text>
          </View>
        )}

        {/* ── Hint ── */}
        <View style={styles.hint}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={TEXT_TERTIARY}
          />
          <Text style={styles.hintText}>
            Sessions are created automatically when you place the first order
          </Text>
        </View>
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
    color: TEXT_SECONDARY,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  headerContent: { flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 1,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },

  // New Order CTA
  newOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    backgroundColor: BRAND,
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  newOrderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  newOrderIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  newOrderSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },

  // Section
  section: { gap: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  // Session Card
  sessionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: SUCCESS_BG,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SUCCESS,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: BORDER,
  },

  // Continue Button
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: BRAND,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty State
  emptyCard: {
    backgroundColor: CARD_BG,
    alignItems: 'center',
    padding: 36,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  emptyDesc: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Hint
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  hintText: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    textAlign: 'center',
    flex: 1,
  },
});
