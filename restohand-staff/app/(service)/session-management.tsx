import { Colors } from '@/constants/theme';
import {
  useFindSessionsQuery,
  useCreateCustomerSessionMutation,
} from '@/store/api/customerSessionsApi';
import {
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
} from '@/store/api/restaurantsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { skipToken } from '@reduxjs/toolkit/query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

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
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { tableId } = useLocalSearchParams();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

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

  const [createCustomerSession] = useCreateCustomerSessionMutation();
  const activeSessions = sessionsData?.sessions || [];

  const handleCreateNewSession = async () => {
    if (!restaurant || !selectedTable) {
      Alert.alert('Error', 'Missing restaurant or table data');
      return;
    }
    setIsCreatingSession(true);
    try {
      const sessionResponse = await createCustomerSession({
        restaurantSlug: restaurant.slug,
        tableId: selectedTable.id,
      }).unwrap();

      router.push({
        pathname: '/(service)/menu',
        params: {
          sessionId: sessionResponse.sessionId,
          tableId: selectedTable.id,
          restaurant_slug: restaurant.slug,
          isNewSession: 'true',
        },
      });
    } catch (error: any) {
      Alert.alert(
        'Session Creation Failed',
        error?.message || 'Failed to create session'
      );
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleResumeSession = (sessionId: string) => {
    if (!selectedTable || !restaurant) return;
    router.push({
      pathname: '/(service)/menu',
      params: {
        sessionId,
        tableId: selectedTable.id,
        restaurant_slug: restaurant.slug,
        isNewSession: 'false',
      },
    });
  };

  const tableNumber =
    selectedTable?.displayName ||
    selectedTable?.tableNumber ||
    `Table ${tableId}`;

  if (sessionsLoading && !selectedTable) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading table sessions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#0f172a' : '#f8fafc' },
      ]}
    >
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderBottomColor: isDark ? '#334155' : '#e2e8f0',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.text }]}>
            {tableNumber}
          </Text>
          <Text
            style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}
          >
            Session Management
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.refreshButton,
            { backgroundColor: isDark ? '#334155' : '#f1f5f9' },
          ]}
          onPress={() => refetchSessions()}
        >
          <Ionicons
            name="refresh-outline"
            size={19}
            color={isDark ? '#94a3b8' : '#64748b'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── New Session CTA ── */}
        <TouchableOpacity
          style={[
            styles.newSessionCard,
            {
              backgroundColor: theme.brand,
              opacity: isCreatingSession ? 0.85 : 1,
            },
          ]}
          onPress={handleCreateNewSession}
          disabled={isCreatingSession}
          activeOpacity={0.88}
        >
          <View style={styles.newSessionLeft}>
            <View style={styles.newSessionIconWrap}>
              {isCreatingSession ? (
                <ActivityIndicator size={22} color="#fff" />
              ) : (
                <Ionicons name="add" size={22} color="#fff" />
              )}
            </View>
            <View>
              <Text style={styles.newSessionTitle}>
                {isCreatingSession ? 'Creating Session…' : 'Start New Order'}
              </Text>
              <Text style={styles.newSessionSub}>
                {isCreatingSession
                  ? 'Please wait'
                  : 'Seat a new group at this table'}
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
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Active Sessions
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' },
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    { color: isDark ? '#93c5fd' : '#1d4ed8' },
                  ]}
                >
                  {activeSessions.length}
                </Text>
              </View>
            </View>

            {activeSessions.map((session, index) => (
              <View
                key={session.sessionId}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                  },
                ]}
              >
                {/* Card Top Row */}
                <View style={styles.cardTopRow}>
                  <View>
                    <Text style={[styles.sessionName, { color: theme.text }]}>
                      Group {index + 1}
                    </Text>
                    <View style={styles.timeRow}>
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={isDark ? '#94a3b8' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.timeText,
                          { color: isDark ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        Since {formatTime(session.startedAt)} ·{' '}
                        {getTimeDuration(session.startedAt)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.activePill,
                      { backgroundColor: isDark ? '#052e16' : '#dcfce7' },
                    ]}
                  >
                    <View style={styles.activeDot} />
                    <Text style={[styles.activePillText, { color: '#16a34a' }]}>
                      Active
                    </Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View
                  style={[
                    styles.statsRow,
                    { borderColor: isDark ? '#334155' : '#f1f5f9' },
                  ]}
                >
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {session.totalOrders}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: isDark ? '#94a3b8' : '#64748b' },
                      ]}
                    >
                      Orders
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {formatCurrency(session.totalAmount)}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: isDark ? '#94a3b8' : '#64748b' },
                      ]}
                    >
                      Total
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color: session.allOrdersPaid ? '#16a34a' : '#f59e0b',
                        },
                      ]}
                    >
                      {session.allOrdersPaid ? 'Paid' : 'Unpaid'}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: isDark ? '#94a3b8' : '#64748b' },
                      ]}
                    >
                      Payment
                    </Text>
                  </View>
                </View>

                {/* Action */}
                <TouchableOpacity
                  style={[styles.continueBtn, { backgroundColor: theme.brand }]}
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
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No Active Sessions
            </Text>
            <Text
              style={[
                styles.emptyDesc,
                { color: isDark ? '#94a3b8' : '#64748b' },
              ]}
            >
              This table is currently free. Start a new order above to begin
              serving customers.
            </Text>
          </View>
        )}

        {/* ── Hint ── */}
        <View style={styles.hint}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={isDark ? '#475569' : '#94a3b8'}
          />
          <Text
            style={[styles.hintText, { color: isDark ? '#475569' : '#94a3b8' }]}
          >
            Multiple sessions can run simultaneously at the same table
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 6, marginRight: 10 },
  headerContent: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 1 },
  refreshButton: { padding: 9, borderRadius: 10 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },

  // New Session CTA
  newSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
  },
  newSessionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  newSessionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSessionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  newSessionSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },

  // Section
  sectionBlock: { gap: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countBadgeText: { fontSize: 12, fontWeight: '700' },

  // Session Card
  sessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionName: { fontSize: 15, fontWeight: '600', marginBottom: 5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  activePillText: { fontSize: 11, fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 32 },

  // Continue Button
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
  },
  continueBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    padding: 36,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Hint
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  hintText: { fontSize: 12, textAlign: 'center' },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
});
